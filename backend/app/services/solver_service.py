"""Google OR-Tools Mathematical Optimization Solver Service for ReliefOpt.

Formulates and solves the multi-commodity, urgency-prioritized, cost-minimizing
emergency supply distribution Mixed-Integer Linear Program (MILP).
"""

import time
from typing import Dict, List, Tuple, Any, Optional
from ortools.linear_solver import pywraplp

from app.schemas.optimization import (
    AllocationDetail,
    DemandFulfilmentDetail,
    WarehouseStockUsageDetail,
    FairnessMetrics,
    VillageFairnessItem,
    UrgencyTierMetric,
    OptimizationSolveResponse,
)


class ReliefOptimizationSolver:
    """Operations Research solver orchestrating supply allocations using Google OR-Tools."""

    def __init__(
        self,
        warehouses: List[Dict[str, Any]],
        villages: List[Dict[str, Any]],
        supplies: List[Dict[str, Any]],
        inventories: Dict[Tuple[int, int], float],
        demands: List[Dict[str, Any]],
        costs: Dict[Tuple[int, int], float],
        scenario_name: Optional[str] = None,
        is_scenario: bool = False,
    ):
        self.warehouses = warehouses
        self.villages = villages
        self.supplies = supplies
        self.inventories = inventories  # (warehouse_id, supply_id) -> float
        self.demands = demands  # list of {village_id, supply_id, required_quantity, urgency_level}
        self.costs = costs  # (warehouse_id, village_id) -> cost_per_unit
        self.scenario_name = scenario_name
        self.is_scenario = is_scenario

        # Fast lookups
        self.warehouse_map = {w["id"]: w for w in warehouses}
        self.village_map = {v["id"]: v for v in villages}
        self.supply_map = {s["id"]: s for s in supplies}

    def validate_inputs(self) -> Tuple[bool, Optional[str]]:
        """Validate input consistency and identify missing cost routes."""
        if not self.villages:
            return False, "No active affected villages found in the database."

        if not self.demands:
            return False, "No emergency demands recorded for active villages."

        # Check for missing transportation costs where both warehouse has inventory and village has demand
        active_demand_supplies = {d["supply_id"] for d in self.demands if d["required_quantity"] > 0}
        active_demand_villages = {d["village_id"] for d in self.demands if d["required_quantity"] > 0}

        warehouses_with_stock = {
            wh_id
            for (wh_id, sup_id), qty in self.inventories.items()
            if qty > 0 and sup_id in active_demand_supplies
        }

        missing_routes = []
        for wh_id in warehouses_with_stock:
            for vil_id in active_demand_villages:
                if (wh_id, vil_id) not in self.costs:
                    wh_name = self.warehouse_map.get(wh_id, {}).get("name", f"WH #{wh_id}")
                    vil_name = self.village_map.get(vil_id, {}).get("name", f"Village #{vil_id}")
                    missing_routes.append(f"{wh_name} -> {vil_name}")

        if missing_routes:
            return False, (
                f"Missing transportation cost entries for {len(missing_routes)} route(s): "
                f"{', '.join(missing_routes[:5])}{'...' if len(missing_routes) > 5 else ''}. "
                "Please configure unit costs for these routes before solving."
            )

        return True, None

    def solve(self, run_id: str) -> OptimizationSolveResponse:
        """Build and execute the OR-Tools optimization model."""
        start_time = time.perf_counter()

        # Handle zero available stock edge case gracefully
        total_available_stock = sum(self.inventories.values())
        if total_available_stock <= 0:
            return self._build_zero_allocation_response(
                run_id=run_id,
                status="NO_INVENTORY",
                message="Zero available inventory across all warehouses. 100% of demand unmet.",
                solver_time_ms=(time.perf_counter() - start_time) * 1000,
            )

        # Initialize Google OR-Tools MIP Solver
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            solver = pywraplp.Solver.CreateSolver("SCIP")
        if not solver:
            raise RuntimeError("Neither CBC nor SCIP MIP solver is available in Google OR-Tools.")

        # Determine integrality: if all inventories and demands are integers, use discrete IntVar
        is_integer_model = all(
            qty.is_integer() for qty in self.inventories.values()
        ) and all(
            float(d["required_quantity"]).is_integer() for d in self.demands
        )

        # -------------------------------------------------------------
        # Decision Variables:
        # x[w, v, s]: quantity of supply s shipped from warehouse w to village v
        # u[v, s]: unmet demand for supply s at village v
        # -------------------------------------------------------------
        x: Dict[Tuple[int, int, int], Any] = {}
        u: Dict[Tuple[int, int], Any] = {}

        # Precompute candidate routes to keep problem size tight
        # Only create variables for valid (w, v, s) where warehouse has stock and village has demand
        for demand in self.demands:
            vil_id = demand["village_id"]
            sup_id = demand["supply_id"]
            req_qty = float(demand["required_quantity"])

            if req_qty <= 0:
                continue

            # Unmet demand slack variable
            if is_integer_model:
                u[(vil_id, sup_id)] = solver.IntVar(
                    0, int(req_qty), f"unmet_{vil_id}_{sup_id}"
                )
            else:
                u[(vil_id, sup_id)] = solver.NumVar(
                    0.0, req_qty, f"unmet_{vil_id}_{sup_id}"
                )

            # Route shipment variables
            for wh in self.warehouses:
                wh_id = wh["id"]
                avail_stock = self.inventories.get((wh_id, sup_id), 0.0)
                if avail_stock > 0 and (wh_id, vil_id) in self.costs:
                    var_bound = min(avail_stock, req_qty)
                    if is_integer_model:
                        x[(wh_id, vil_id, sup_id)] = solver.IntVar(
                            0, int(var_bound), f"x_{wh_id}_{vil_id}_{sup_id}"
                        )
                    else:
                        x[(wh_id, vil_id, sup_id)] = solver.NumVar(
                            0.0, var_bound, f"x_{wh_id}_{vil_id}_{sup_id}"
                        )

        # -------------------------------------------------------------
        # Constraint A: Warehouse Inventory Upper Bounds
        # Sum_v x[w, v, s] <= AvailableInventory[w, s]
        # -------------------------------------------------------------
        for wh in self.warehouses:
            wh_id = wh["id"]
            for sup in self.supplies:
                sup_id = sup["id"]
                stock = self.inventories.get((wh_id, sup_id), 0.0)
                relevant_vars = [
                    x[(wh_id, vil_id, sup_id)]
                    for vil_id in self.village_map
                    if (wh_id, vil_id, sup_id) in x
                ]
                if relevant_vars:
                    solver.Add(solver.Sum(relevant_vars) <= stock)

        # -------------------------------------------------------------
        # Constraint B: Village Demand Conservation & Unmet Slack
        # Sum_w x[w, v, s] + u[v, s] == RequiredDemand[v, s]
        # -------------------------------------------------------------
        for demand in self.demands:
            vil_id = demand["village_id"]
            sup_id = demand["supply_id"]
            req_qty = float(demand["required_quantity"])

            if (vil_id, sup_id) in u:
                incoming_shipments = [
                    x[(wh_id, vil_id, sup_id)]
                    for wh_id in self.warehouse_map
                    if (wh_id, vil_id, sup_id) in x
                ]
                solver.Add(solver.Sum(incoming_shipments) + u[(vil_id, sup_id)] == req_qty)

        # -------------------------------------------------------------
        # Objective Function:
        # Hierarchical Penalty: Critical >> High >> Medium >> Low >> Transportation Cost
        # -------------------------------------------------------------
        max_cost = max(self.costs.values(), default=1.0)
        c_scale = max(1.0, max_cost)

        # Strictly calibrated penalty hierarchy
        penalty_map = {
            "Critical": 1_000_000.0 * c_scale,
            "High": 100_000.0 * c_scale,
            "Medium": 10_000.0 * c_scale,
            "Low": 1_000.0 * c_scale,
        }

        objective = solver.Objective()
        objective.SetMinimization()

        # Penalize unmet demand according to urgency
        for demand in self.demands:
            vil_id = demand["village_id"]
            sup_id = demand["supply_id"]
            urgency = demand.get("urgency_level", "Medium")
            penalty = penalty_map.get(urgency, 10_000.0 * c_scale)

            if (vil_id, sup_id) in u:
                objective.SetCoefficient(u[(vil_id, sup_id)], penalty)

        # Add unit transportation costs for each shipment
        for (wh_id, vil_id, sup_id), var in x.items():
            unit_cost = self.costs.get((wh_id, vil_id), 0.0)
            objective.SetCoefficient(var, unit_cost)

        # Solve the model
        solver.SetTimeLimit(10_000)  # 10 seconds max time limit
        result_status = solver.Solve()

        solve_time_ms = (time.perf_counter() - start_time) * 1000

        status_str = "UNKNOWN"
        if result_status == pywraplp.Solver.OPTIMAL:
            status_str = "OPTIMAL"
        elif result_status == pywraplp.Solver.FEASIBLE:
            status_str = "FEASIBLE"
        elif result_status == pywraplp.Solver.INFEASIBLE:
            status_str = "INFEASIBLE"
        elif result_status == pywraplp.Solver.ABNORMAL:
            status_str = "ERROR"

        if status_str not in ("OPTIMAL", "FEASIBLE"):
            return self._build_infeasible_response(
                run_id=run_id,
                status=status_str,
                message=f"Solver stopped with status: {status_str}",
                solver_time_ms=solve_time_ms,
            )

        # Extract solution values
        allocations_list: List[AllocationDetail] = []
        total_transport_cost = 0.0
        total_allocated = 0.0

        for (wh_id, vil_id, sup_id), var in x.items():
            val = var.solution_value()
            if val > 1e-4:
                allocated_val = round(val, 2)
                unit_cost = self.costs.get((wh_id, vil_id), 0.0)
                line_cost = round(allocated_val * unit_cost, 2)

                wh_obj = self.warehouse_map.get(wh_id, {})
                vil_obj = self.village_map.get(vil_id, {})
                sup_obj = self.supply_map.get(sup_id, {})

                allocations_list.append(
                    AllocationDetail(
                        warehouse_id=wh_id,
                        warehouse_name=wh_obj.get("name", f"Warehouse #{wh_id}"),
                        village_id=vil_id,
                        village_name=vil_obj.get("name", f"Village #{vil_id}"),
                        supply_id=sup_id,
                        supply_name=sup_obj.get("name", f"Supply #{sup_id}"),
                        supply_category=sup_obj.get("category", "General"),
                        supply_unit=sup_obj.get("unit", "units"),
                        allocated_quantity=allocated_val,
                        unit_transport_cost=unit_cost,
                        total_transport_cost=line_cost,
                    )
                )
                total_allocated += allocated_val
                total_transport_cost += line_cost

        # Extract demand fulfilment analysis
        demand_fulfilment_list: List[DemandFulfilmentDetail] = []
        total_requested = 0.0
        total_unmet = 0.0

        for demand in self.demands:
            vil_id = demand["village_id"]
            sup_id = demand["supply_id"]
            req_qty = float(demand["required_quantity"])
            urgency = demand.get("urgency_level", "Medium")

            unmet_val = u[(vil_id, sup_id)].solution_value() if (vil_id, sup_id) in u else req_qty
            unmet_val = max(0.0, round(unmet_val, 2))
            alloc_val = max(0.0, round(req_qty - unmet_val, 2))

            total_requested += req_qty
            total_unmet += unmet_val

            fulfil_pct = round((alloc_val / req_qty * 100.0), 1) if req_qty > 0 else 100.0

            vil_obj = self.village_map.get(vil_id, {})
            sup_obj = self.supply_map.get(sup_id, {})

            demand_fulfilment_list.append(
                DemandFulfilmentDetail(
                    village_id=vil_id,
                    village_name=vil_obj.get("name", f"Village #{vil_id}"),
                    village_district=vil_obj.get("district"),
                    supply_id=sup_id,
                    supply_name=sup_obj.get("name", f"Supply #{sup_id}"),
                    supply_unit=sup_obj.get("unit", "units"),
                    required_quantity=req_qty,
                    allocated_quantity=alloc_val,
                    unmet_quantity=unmet_val,
                    urgency_level=urgency,
                    fulfilment_pct=fulfil_pct,
                )
            )

        # Extract warehouse stock usage and remaining inventory
        stock_usage_list: List[WarehouseStockUsageDetail] = []
        for wh in self.warehouses:
            wh_id = wh["id"]
            for sup in self.supplies:
                sup_id = sup["id"]
                initial = self.inventories.get((wh_id, sup_id), 0.0)
                if initial <= 0:
                    continue

                allocated_from_wh = sum(
                    item.allocated_quantity
                    for item in allocations_list
                    if item.warehouse_id == wh_id and item.supply_id == sup_id
                )
                remaining = max(0.0, round(initial - allocated_from_wh, 2))
                utilization = round((allocated_from_wh / initial * 100.0), 1) if initial > 0 else 0.0

                stock_usage_list.append(
                    WarehouseStockUsageDetail(
                        warehouse_id=wh_id,
                        warehouse_name=wh.get("name", f"Warehouse #{wh_id}"),
                        supply_id=sup_id,
                        supply_name=sup.get("name", f"Supply #{sup_id}"),
                        supply_unit=sup.get("unit", "units"),
                        initial_available=initial,
                        allocated_quantity=round(allocated_from_wh, 2),
                        remaining_stock=remaining,
                        utilization_pct=utilization,
                    )
                )

        # Compute fairness and urgency indicators
        fairness = self._compute_fairness_metrics(demand_fulfilment_list)

        overall_fulfilment_pct = (
            round((total_allocated / total_requested * 100.0), 1)
            if total_requested > 0
            else 100.0
        )
        critical_metric = fairness.urgency_breakdown.get("Critical")
        critical_fulfilment_pct = critical_metric.fulfilment_pct if critical_metric else 100.0

        return OptimizationSolveResponse(
            run_id=run_id,
            status=status_str,
            solver_name=f"Google OR-Tools ({solver.SolverVersion()})",
            solver_status_message=(
                "Optimal allocation plan calculated successfully."
                if status_str == "OPTIMAL"
                else "Feasible allocation plan calculated."
            ),
            solver_time_ms=round(solve_time_ms, 2),
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            total_requested=round(total_requested, 2),
            total_allocated=round(total_allocated, 2),
            total_unmet=round(total_unmet, 2),
            total_transport_cost=round(total_transport_cost, 2),
            overall_fulfilment_pct=overall_fulfilment_pct,
            critical_fulfilment_pct=critical_fulfilment_pct,
            is_scenario=self.is_scenario,
            scenario_name=self.scenario_name,
            allocations=allocations_list,
            demand_fulfilment=demand_fulfilment_list,
            stock_usage=stock_usage_list,
            fairness=fairness,
        )

    def _compute_fairness_metrics(
        self, demand_items: List[DemandFulfilmentDetail]
    ) -> FairnessMetrics:
        """Calculate village-wise equity, average fulfilment, disparity gap and urgency breakdown."""
        village_totals: Dict[str, Dict[str, Any]] = {}
        urgency_totals: Dict[str, Dict[str, float]] = {
            level: {"demanded": 0.0, "allocated": 0.0, "unmet": 0.0}
            for level in ("Critical", "High", "Medium", "Low")
        }

        for item in demand_items:
            # Per village aggregation
            key = item.village_name
            if key not in village_totals:
                village_totals[key] = {
                    "village_id": item.village_id,
                    "village_name": item.village_name,
                    "demanded": 0.0,
                    "allocated": 0.0,
                }
            village_totals[key]["demanded"] += item.required_quantity
            village_totals[key]["allocated"] += item.allocated_quantity

            # Per urgency aggregation
            urg = item.urgency_level if item.urgency_level in urgency_totals else "Medium"
            urgency_totals[urg]["demanded"] += item.required_quantity
            urgency_totals[urg]["allocated"] += item.allocated_quantity
            urgency_totals[urg]["unmet"] += item.unmet_quantity

        village_fairness_items: List[VillageFairnessItem] = []
        fulfil_percentages = []

        for v_data in village_totals.values():
            dem = v_data["demanded"]
            alloc = v_data["allocated"]
            pct = round((alloc / dem * 100.0), 1) if dem > 0 else 100.0
            fulfil_percentages.append(pct)
            village_fairness_items.append(
                VillageFairnessItem(
                    village_id=v_data["village_id"],
                    village_name=v_data["village_name"],
                    total_demanded=round(dem, 2),
                    total_allocated=round(alloc, 2),
                    fulfilment_pct=pct,
                )
            )

        if fulfil_percentages:
            avg_pct = round(sum(fulfil_percentages) / len(fulfil_percentages), 1)
            min_pct = min(fulfil_percentages)
            max_pct = max(fulfil_percentages)
            disparity = round(max_pct - min_pct, 1)
        else:
            avg_pct = min_pct = max_pct = disparity = 100.0

        urgency_breakdown: Dict[str, UrgencyTierMetric] = {}
        for level, stats in urgency_totals.items():
            dem = stats["demanded"]
            alloc = stats["allocated"]
            unmet = stats["unmet"]
            pct = round((alloc / dem * 100.0), 1) if dem > 0 else 100.0
            urgency_breakdown[level] = UrgencyTierMetric(
                urgency_level=level,
                demanded=round(dem, 2),
                allocated=round(alloc, 2),
                unmet=round(unmet, 2),
                fulfilment_pct=pct,
            )

        return FairnessMetrics(
            village_fulfilments=village_fairness_items,
            average_fulfilment_pct=avg_pct,
            min_fulfilment_pct=min_pct,
            max_fulfilment_pct=max_pct,
            disparity_gap_pct=disparity,
            urgency_breakdown=urgency_breakdown,
        )

    def _build_zero_allocation_response(
        self, run_id: str, status: str, message: str, solver_time_ms: float
    ) -> OptimizationSolveResponse:
        """Handle zero-inventory state without failing."""
        demand_fulfilment_list = [
            DemandFulfilmentDetail(
                village_id=d["village_id"],
                village_name=self.village_map.get(d["village_id"], {}).get("name", "Village"),
                village_district=self.village_map.get(d["village_id"], {}).get("district"),
                supply_id=d["supply_id"],
                supply_name=self.supply_map.get(d["supply_id"], {}).get("name", "Supply"),
                supply_unit=self.supply_map.get(d["supply_id"], {}).get("unit", "units"),
                required_quantity=float(d["required_quantity"]),
                allocated_quantity=0.0,
                unmet_quantity=float(d["required_quantity"]),
                urgency_level=d.get("urgency_level", "Medium"),
                fulfilment_pct=0.0,
            )
            for d in self.demands
        ]
        total_requested = sum(float(d["required_quantity"]) for d in self.demands)
        fairness = self._compute_fairness_metrics(demand_fulfilment_list)

        return OptimizationSolveResponse(
            run_id=run_id,
            status=status,
            solver_name="Google OR-Tools",
            solver_status_message=message,
            solver_time_ms=round(solver_time_ms, 2),
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            total_requested=round(total_requested, 2),
            total_allocated=0.0,
            total_unmet=round(total_requested, 2),
            total_transport_cost=0.0,
            overall_fulfilment_pct=0.0,
            critical_fulfilment_pct=0.0,
            is_scenario=self.is_scenario,
            scenario_name=self.scenario_name,
            allocations=[],
            demand_fulfilment=demand_fulfilment_list,
            stock_usage=[],
            fairness=fairness,
        )

    def _build_infeasible_response(
        self, run_id: str, status: str, message: str, solver_time_ms: float
    ) -> OptimizationSolveResponse:
        """Handle solver infeasibility or abnormal termination."""
        return OptimizationSolveResponse(
            run_id=run_id,
            status=status,
            solver_name="Google OR-Tools",
            solver_status_message=message,
            solver_time_ms=round(solver_time_ms, 2),
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            total_requested=sum(float(d["required_quantity"]) for d in self.demands),
            total_allocated=0.0,
            total_unmet=sum(float(d["required_quantity"]) for d in self.demands),
            total_transport_cost=0.0,
            overall_fulfilment_pct=0.0,
            critical_fulfilment_pct=0.0,
            is_scenario=self.is_scenario,
            scenario_name=self.scenario_name,
            allocations=[],
            demand_fulfilment=[],
            stock_usage=[],
            fairness=FairnessMetrics(
                village_fulfilments=[],
                average_fulfilment_pct=0.0,
                min_fulfilment_pct=0.0,
                max_fulfilment_pct=0.0,
                disparity_gap_pct=0.0,
                urgency_breakdown={},
            ),
        )

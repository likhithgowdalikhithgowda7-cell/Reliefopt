"""High-level optimization service reading database state, invoking solver, and persisting results."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.transport_cost import TransportationCost
from app.models.optimization import (
    OptimizationRun,
    OptimizationAllocation,
    OptimizationUnmetDemand,
)
from app.schemas.optimization import (
    OptimizationOverviewResponse,
    OptimizationSolveResponse,
    OptimizationRunSummary,
    ScenarioSimulateRequest,
    ScenarioComparisonResponse,
    AllocationDetail,
    DemandFulfilmentDetail,
    WarehouseStockUsageDetail,
    FairnessMetrics,
    VillageFairnessItem,
    UrgencyTierMetric,
)
from app.services.solver_service import ReliefOptimizationSolver
from app.services.analytics_service import _is_valid_coordinate


def get_optimization_overview(db: Session) -> OptimizationOverviewResponse:
    """Audit system readiness before solver execution, excluding locations with invalid coordinates."""
    all_active_wh = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    valid_whs = [w for w in all_active_wh if _is_valid_coordinate(w.latitude, w.longitude)]
    valid_wh_ids = {w.id for w in valid_whs}
    invalid_whs = [w for w in all_active_wh if not _is_valid_coordinate(w.latitude, w.longitude)]

    all_active_vil = db.query(AffectedVillage).filter(AffectedVillage.is_active == True).all()
    valid_vils = [v for v in all_active_vil if _is_valid_coordinate(v.latitude, v.longitude)]
    valid_vil_ids = {v.id for v in valid_vils}
    invalid_vils = [v for v in all_active_vil if not _is_valid_coordinate(v.latitude, v.longitude)]

    active_wh_count = len(valid_whs)
    active_vil_count = len(valid_vils)
    supply_count = db.query(func.count(ReliefSupply.id)).scalar() or 0

    total_inv = (
        db.query(func.coalesce(func.sum(WarehouseInventory.available_quantity), 0.0))
        .filter(WarehouseInventory.warehouse_id.in_(valid_wh_ids))
        .scalar()
        if valid_wh_ids
        else 0.0
    ) or 0.0

    total_dem = (
        db.query(func.coalesce(func.sum(VillageDemand.required_quantity), 0.0))
        .filter(VillageDemand.village_id.in_(valid_vil_ids))
        .scalar()
        if valid_vil_ids
        else 0.0
    ) or 0.0

    crit_count = (
        db.query(func.count(VillageDemand.id))
        .filter(VillageDemand.village_id.in_(valid_vil_ids), VillageDemand.urgency_level == "Critical")
        .scalar()
        if valid_vil_ids
        else 0
    ) or 0

    total_pairs = active_wh_count * active_vil_count
    configured_costs = (
        db.query(func.count(TransportationCost.id))
        .filter(
            TransportationCost.warehouse_id.in_(valid_wh_ids),
            TransportationCost.village_id.in_(valid_vil_ids),
        )
        .scalar()
        if valid_wh_ids and valid_vil_ids
        else 0
    ) or 0
    missing_costs = max(0, total_pairs - configured_costs)

    notes = []
    is_ready = True

    if invalid_vils:
        notes.append(
            f"{len(invalid_vils)} active village(s) ({', '.join(v.name for v in invalid_vils)}) "
            f"have coordinates outside the operational region and are excluded from allocation calculations."
        )
    if invalid_whs:
        notes.append(
            f"{len(invalid_whs)} active warehouse(s) ({', '.join(w.name for w in invalid_whs)}) "
            f"have coordinates outside the operational region and are excluded from allocation calculations."
        )

    if active_wh_count == 0:
        notes.append("No active warehouses with valid coordinates registered.")
        is_ready = False
    if active_vil_count == 0:
        notes.append("No active affected villages with valid coordinates registered.")
        is_ready = False
    if total_dem == 0 and active_vil_count > 0:
        notes.append("No recorded relief demands found for valid villages.")
        is_ready = False
    if total_inv == 0 and active_wh_count > 0:
        notes.append("Total available inventory is 0. Solver can run, but all demands will be unmet.")
    if missing_costs > 0 and total_pairs > 0:
        notes.append(f"{missing_costs} of {total_pairs} transportation cost routes are unconfigured.")
        is_ready = False

    if is_ready:
        notes.append("System is fully ready to generate an optimal relief allocation plan.")

    return OptimizationOverviewResponse(
        total_available_inventory=round(total_inv, 2),
        total_recorded_demand=round(total_dem, 2),
        active_warehouses_count=active_wh_count,
        active_villages_count=active_vil_count,
        supply_types_count=supply_count,
        critical_demands_count=crit_count,
        total_pairs_count=total_pairs,
        configured_costs_count=configured_costs,
        missing_costs_count=missing_costs,
        is_ready_to_solve=is_ready,
        readiness_notes=notes,
    )


def _load_solver_inputs(db: Session):
    """Load and format active entities, inventories, demands, and costs from DB, excluding invalid locations."""
    valid_warehouses = [
        {"id": w.id, "name": w.name, "latitude": w.latitude, "longitude": w.longitude}
        for w in db.query(Warehouse).filter(Warehouse.is_active == True).all()
        if _is_valid_coordinate(w.latitude, w.longitude)
    ]
    valid_villages = [
        {"id": v.id, "name": v.name, "district": v.district, "population": v.population}
        for v in db.query(AffectedVillage).filter(AffectedVillage.is_active == True).all()
        if _is_valid_coordinate(v.latitude, v.longitude)
    ]
    valid_wh_ids = {w["id"] for w in valid_warehouses}
    valid_vil_ids = {v["id"] for v in valid_villages}

    supplies = [
        {"id": s.id, "name": s.name, "category": s.category, "unit": s.unit}
        for s in db.query(ReliefSupply).all()
    ]

    inv_records = db.query(WarehouseInventory).all()
    inventories = {
        (inv.warehouse_id, inv.supply_id): float(inv.available_quantity)
        for inv in inv_records
        if inv.warehouse_id in valid_wh_ids
    }

    dem_records = db.query(VillageDemand).all()
    demands = [
        {
            "village_id": d.village_id,
            "supply_id": d.supply_id,
            "required_quantity": float(d.required_quantity),
            "urgency_level": d.urgency_level,
        }
        for d in dem_records
        if d.village_id in valid_vil_ids
    ]

    cost_records = db.query(TransportationCost).all()
    costs = {
        (c.warehouse_id, c.village_id): float(c.cost_per_unit)
        for c in cost_records
        if c.warehouse_id in valid_wh_ids and c.village_id in valid_vil_ids
    }

    return valid_warehouses, valid_villages, supplies, inventories, demands, costs


def solve_and_persist(
    db: Session,
    scenario_name: Optional[str] = None,
    is_scenario: bool = False,
) -> OptimizationSolveResponse:
    """Run Google OR-Tools solver on current PostgreSQL state and persist the run.
    
    IMPORTANT: Generates recommendations only. Does NOT modify warehouse_inventories.
    """
    warehouses, villages, supplies, inventories, demands, costs = _load_solver_inputs(db)

    solver = ReliefOptimizationSolver(
        warehouses=warehouses,
        villages=villages,
        supplies=supplies,
        inventories=inventories,
        demands=demands,
        costs=costs,
        scenario_name=scenario_name,
        is_scenario=is_scenario,
    )

    valid, err_msg = solver.validate_inputs()
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    # Generate unique run ID
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    rand_suffix = uuid.uuid4().hex[:6]
    prefix = "scen" if is_scenario else "run"
    run_id = f"{prefix}_{timestamp_str}_{rand_suffix}"

    result = solver.solve(run_id=run_id)

    # Persist run and allocations in PostgreSQL
    run_model = OptimizationRun(
        run_id=result.run_id,
        status=result.status,
        total_requested=result.total_requested,
        total_allocated=result.total_allocated,
        total_unmet=result.total_unmet,
        total_transport_cost=result.total_transport_cost,
        overall_fulfilment_pct=result.overall_fulfilment_pct,
        critical_fulfilment_pct=result.critical_fulfilment_pct,
        is_scenario=result.is_scenario,
        scenario_name=result.scenario_name,
        solver_name=result.solver_name,
        solver_status_message=result.solver_status_message,
        solver_time_ms=result.solver_time_ms,
        summary_metrics=result.model_dump(mode="json"),
        input_snapshot={
            "warehouses_count": len(warehouses),
            "villages_count": len(villages),
            "supplies_count": len(supplies),
            "total_inventory": sum(inventories.values()),
            "total_demand": sum(d["required_quantity"] for d in demands),
        },
    )
    db.add(run_model)
    db.flush()

    # Save detailed allocations
    for alloc in result.allocations:
        db.add(
            OptimizationAllocation(
                run_id=run_model.id,
                warehouse_id=alloc.warehouse_id,
                village_id=alloc.village_id,
                supply_id=alloc.supply_id,
                warehouse_name=alloc.warehouse_name,
                village_name=alloc.village_name,
                supply_name=alloc.supply_name,
                supply_category=alloc.supply_category,
                supply_unit=alloc.supply_unit,
                allocated_quantity=alloc.allocated_quantity,
                unit_transport_cost=alloc.unit_transport_cost,
                total_transport_cost=alloc.total_transport_cost,
            )
        )

    # Save detailed unmet demands
    for dem in result.demand_fulfilment:
        db.add(
            OptimizationUnmetDemand(
                run_id=run_model.id,
                village_id=dem.village_id,
                village_name=dem.village_name,
                supply_id=dem.supply_id,
                supply_name=dem.supply_name,
                required_quantity=dem.required_quantity,
                allocated_quantity=dem.allocated_quantity,
                unmet_quantity=dem.unmet_quantity,
                urgency_level=dem.urgency_level,
                fulfilment_pct=dem.fulfilment_pct,
            )
        )

    db.commit()
    db.refresh(run_model)

    result.id = run_model.id
    return result


def simulate_scenario(
    db: Session, request: ScenarioSimulateRequest
) -> OptimizationSolveResponse:
    """Run a What-If scenario with temporary overrides without mutating database records."""
    warehouses, villages, supplies, inventories, demands, costs = _load_solver_inputs(db)

    # Apply inventory overrides
    if request.inventory_overrides:
        for ovr in request.inventory_overrides:
            inventories[(ovr.warehouse_id, ovr.supply_id)] = float(ovr.available_quantity)

    # Apply demand overrides
    if request.demand_overrides:
        # Create map for fast lookup
        demand_map = {(d["village_id"], d["supply_id"]): d for d in demands}
        for ovr in request.demand_overrides:
            key = (ovr.village_id, ovr.supply_id)
            if key in demand_map:
                demand_map[key]["required_quantity"] = float(ovr.required_quantity)
                if ovr.urgency_level:
                    demand_map[key]["urgency_level"] = ovr.urgency_level
            else:
                demands.append(
                    {
                        "village_id": ovr.village_id,
                        "supply_id": ovr.supply_id,
                        "required_quantity": float(ovr.required_quantity),
                        "urgency_level": ovr.urgency_level or "Medium",
                    }
                )

    # Apply cost overrides
    if request.cost_overrides:
        for ovr in request.cost_overrides:
            costs[(ovr.warehouse_id, ovr.village_id)] = float(ovr.cost_per_unit)

    solver = ReliefOptimizationSolver(
        warehouses=warehouses,
        villages=villages,
        supplies=supplies,
        inventories=inventories,
        demands=demands,
        costs=costs,
        scenario_name=request.scenario_name or "What-If Simulation",
        is_scenario=True,
    )

    valid, err_msg = solver.validate_inputs()
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    run_id = f"scen_{timestamp_str}_{uuid.uuid4().hex[:6]}"

    result = solver.solve(run_id=run_id)

    # Persist scenario run as historical snapshot
    run_model = OptimizationRun(
        run_id=result.run_id,
        status=result.status,
        total_requested=result.total_requested,
        total_allocated=result.total_allocated,
        total_unmet=result.total_unmet,
        total_transport_cost=result.total_transport_cost,
        overall_fulfilment_pct=result.overall_fulfilment_pct,
        critical_fulfilment_pct=result.critical_fulfilment_pct,
        is_scenario=True,
        scenario_name=result.scenario_name,
        solver_name=result.solver_name,
        solver_status_message=result.solver_status_message,
        solver_time_ms=result.solver_time_ms,
        summary_metrics=result.model_dump(mode="json"),
        input_snapshot={
            "is_scenario": True,
            "scenario_name": result.scenario_name,
            "overrides_applied": {
                "inventory": len(request.inventory_overrides or []),
                "demand": len(request.demand_overrides or []),
                "costs": len(request.cost_overrides or []),
            },
        },
    )
    db.add(run_model)
    db.flush()

    for alloc in result.allocations:
        db.add(
            OptimizationAllocation(
                run_id=run_model.id,
                warehouse_id=alloc.warehouse_id,
                village_id=alloc.village_id,
                supply_id=alloc.supply_id,
                warehouse_name=alloc.warehouse_name,
                village_name=alloc.village_name,
                supply_name=alloc.supply_name,
                supply_category=alloc.supply_category,
                supply_unit=alloc.supply_unit,
                allocated_quantity=alloc.allocated_quantity,
                unit_transport_cost=alloc.unit_transport_cost,
                total_transport_cost=alloc.total_transport_cost,
            )
        )

    for dem in result.demand_fulfilment:
        db.add(
            OptimizationUnmetDemand(
                run_id=run_model.id,
                village_id=dem.village_id,
                village_name=dem.village_name,
                supply_id=dem.supply_id,
                supply_name=dem.supply_name,
                required_quantity=dem.required_quantity,
                allocated_quantity=dem.allocated_quantity,
                unmet_quantity=dem.unmet_quantity,
                urgency_level=dem.urgency_level,
                fulfilment_pct=dem.fulfilment_pct,
            )
        )

    db.commit()
    db.refresh(run_model)

    result.id = run_model.id
    return result


def list_optimization_runs(
    db: Session, limit: int = 50, is_scenario: Optional[bool] = None
) -> List[OptimizationRunSummary]:
    """List historical optimization runs and scenarios."""
    query = db.query(OptimizationRun)
    if is_scenario is not None:
        query = query.filter(OptimizationRun.is_scenario == is_scenario)

    records = query.order_by(OptimizationRun.id.desc()).limit(limit).all()
    return [
        OptimizationRunSummary(
            id=r.id,
            run_id=r.run_id,
            status=r.status,
            created_at=r.created_at,
            total_requested=r.total_requested,
            total_allocated=r.total_allocated,
            total_unmet=r.total_unmet,
            total_transport_cost=r.total_transport_cost,
            overall_fulfilment_pct=r.overall_fulfilment_pct,
            critical_fulfilment_pct=r.critical_fulfilment_pct,
            is_scenario=r.is_scenario,
            scenario_name=r.scenario_name,
            solver_time_ms=r.solver_time_ms,
        )
        for r in records
    ]


def get_optimization_run(db: Session, run_id_or_id: str) -> OptimizationSolveResponse:
    """Fetch complete historical optimization result."""
    if run_id_or_id.isdigit():
        run = db.query(OptimizationRun).filter(OptimizationRun.id == int(run_id_or_id)).first()
    else:
        run = db.query(OptimizationRun).filter(OptimizationRun.run_id == run_id_or_id).first()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization run '{run_id_or_id}' not found",
        )

    # Reconstruct from summary metrics if available, or fetch relational rows
    if run.summary_metrics:
        data = dict(run.summary_metrics)
        data["id"] = run.id
        return OptimizationSolveResponse(**data)

    # Fallback to rebuilding from relational rows
    alloc_rows = db.query(OptimizationAllocation).filter(OptimizationAllocation.run_id == run.id).all()
    dem_rows = db.query(OptimizationUnmetDemand).filter(OptimizationUnmetDemand.run_id == run.id).all()

    allocations = [
        AllocationDetail(
            warehouse_id=a.warehouse_id,
            warehouse_name=a.warehouse_name,
            village_id=a.village_id,
            village_name=a.village_name,
            supply_id=a.supply_id,
            supply_name=a.supply_name,
            supply_category=a.supply_category,
            supply_unit=a.supply_unit,
            allocated_quantity=a.allocated_quantity,
            unit_transport_cost=a.unit_transport_cost,
            total_transport_cost=a.total_transport_cost,
        )
        for a in alloc_rows
    ]

    demand_fulfilment = [
        DemandFulfilmentDetail(
            village_id=d.village_id,
            village_name=d.village_name,
            supply_id=d.supply_id,
            supply_name=d.supply_name,
            supply_unit="units",
            required_quantity=d.required_quantity,
            allocated_quantity=d.allocated_quantity,
            unmet_quantity=d.unmet_quantity,
            urgency_level=d.urgency_level,
            fulfilment_pct=d.fulfilment_pct,
        )
        for d in dem_rows
    ]

    return OptimizationSolveResponse(
        id=run.id,
        run_id=run.run_id,
        status=run.status,
        solver_name=run.solver_name,
        solver_status_message=run.solver_status_message or "Historical Plan",
        solver_time_ms=run.solver_time_ms,
        created_at=run.created_at,
        total_requested=run.total_requested,
        total_allocated=run.total_allocated,
        total_unmet=run.total_unmet,
        total_transport_cost=run.total_transport_cost,
        overall_fulfilment_pct=run.overall_fulfilment_pct,
        critical_fulfilment_pct=run.critical_fulfilment_pct,
        is_scenario=run.is_scenario,
        scenario_name=run.scenario_name,
        allocations=allocations,
        demand_fulfilment=demand_fulfilment,
        stock_usage=[],
        fairness=FairnessMetrics(
            village_fulfilments=[],
            average_fulfilment_pct=run.overall_fulfilment_pct,
            min_fulfilment_pct=0.0,
            max_fulfilment_pct=100.0,
            disparity_gap_pct=0.0,
            urgency_breakdown={},
        ),
    )


def delete_optimization_run(db: Session, run_id_or_id: str) -> None:
    """Delete an optimization run record."""
    if run_id_or_id.isdigit():
        run = db.query(OptimizationRun).filter(OptimizationRun.id == int(run_id_or_id)).first()
    else:
        run = db.query(OptimizationRun).filter(OptimizationRun.run_id == run_id_or_id).first()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Optimization run '{run_id_or_id}' not found",
        )

    db.delete(run)
    db.commit()


def compare_runs(
    db: Session, run_a_id: int, run_b_id: int
) -> ScenarioComparisonResponse:
    """Compare two optimization runs or scenarios side-by-side."""
    run_a = db.query(OptimizationRun).filter(OptimizationRun.id == run_a_id).first()
    run_b = db.query(OptimizationRun).filter(OptimizationRun.id == run_b_id).first()

    if not run_a or not run_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both optimization runs for comparison were not found.",
        )

    summary_a = OptimizationRunSummary(
        id=run_a.id,
        run_id=run_a.run_id,
        status=run_a.status,
        created_at=run_a.created_at,
        total_requested=run_a.total_requested,
        total_allocated=run_a.total_allocated,
        total_unmet=run_a.total_unmet,
        total_transport_cost=run_a.total_transport_cost,
        overall_fulfilment_pct=run_a.overall_fulfilment_pct,
        critical_fulfilment_pct=run_a.critical_fulfilment_pct,
        is_scenario=run_a.is_scenario,
        scenario_name=run_a.scenario_name,
        solver_time_ms=run_a.solver_time_ms,
    )

    summary_b = OptimizationRunSummary(
        id=run_b.id,
        run_id=run_b.run_id,
        status=run_b.status,
        created_at=run_b.created_at,
        total_requested=run_b.total_requested,
        total_allocated=run_b.total_allocated,
        total_unmet=run_b.total_unmet,
        total_transport_cost=run_b.total_transport_cost,
        overall_fulfilment_pct=run_b.overall_fulfilment_pct,
        critical_fulfilment_pct=run_b.critical_fulfilment_pct,
        is_scenario=run_b.is_scenario,
        scenario_name=run_b.scenario_name,
        solver_time_ms=run_b.solver_time_ms,
    )

    delta_alloc = round(run_b.total_allocated - run_a.total_allocated, 2)
    delta_unmet = round(run_b.total_unmet - run_a.total_unmet, 2)
    delta_cost = round(run_b.total_transport_cost - run_a.total_transport_cost, 2)
    delta_overall = round(run_b.overall_fulfilment_pct - run_a.overall_fulfilment_pct, 1)
    delta_crit = round(run_b.critical_fulfilment_pct - run_a.critical_fulfilment_pct, 1)

    fairness_a = (run_a.summary_metrics or {}).get("fairness", {})
    fairness_b = (run_b.summary_metrics or {}).get("fairness", {})

    gini_a = float(fairness_a.get("gini_coefficient", 0.0))
    gini_b = float(fairness_b.get("gini_coefficient", 0.0))
    gap_a = float(fairness_a.get("disparity_gap_pct", 0.0))
    gap_b = float(fairness_b.get("disparity_gap_pct", 0.0))
    underserved_a = int(fairness_a.get("underserved_villages_count", 0))
    underserved_b = int(fairness_b.get("underserved_villages_count", 0))

    delta_gini = round(gini_b - gini_a, 3)
    delta_gap = round(gap_b - gap_a, 1)
    delta_underserved = underserved_b - underserved_a
    rating_a = fairness_a.get("fairness_score_rating", "N/A")
    rating_b = fairness_b.get("fairness_score_rating", "N/A")

    fairness_summary = (
        f"Gini coefficient shifted by {delta_gini:+} (from {gini_a:.3f} to {gini_b:.3f}); "
        f"max-min disparity gap changed by {delta_gap:+}%; "
        f"underserved locations count shifted by {delta_underserved:+}. "
        f"Equity rating: '{rating_a}' -> '{rating_b}'."
    )

    narrative = (
        f"Comparing '{run_b.scenario_name or run_b.run_id}' against baseline '{run_a.scenario_name or run_a.run_id}': "
        f"Allocated supplies changed by {delta_alloc:+} units, unmet demand changed by {delta_unmet:+} units, "
        f"and total transportation cost changed by ₹{delta_cost:+}. "
        f"Overall demand fulfilment changed by {delta_overall:+} percentage points. {fairness_summary}"
    )

    return ScenarioComparisonResponse(
        baseline_run=summary_a,
        comparison_run=summary_b,
        delta_allocated=delta_alloc,
        delta_unmet=delta_unmet,
        delta_transport_cost=delta_cost,
        delta_overall_fulfilment_pct=delta_overall,
        delta_critical_fulfilment_pct=delta_crit,
        delta_disparity_gap_pct=delta_gap,
        delta_gini_coefficient=delta_gini,
        delta_underserved_count=delta_underserved,
        baseline_fairness_rating=rating_a,
        comparison_fairness_rating=rating_b,
        fairness_comparison_summary=fairness_summary,
        narrative_summary=narrative,
    )

"""Pydantic schemas for Optimization Engine validation, execution and results."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class OptimizationOverviewResponse(BaseModel):
    """System readiness audit before running optimization."""

    total_available_inventory: float
    total_recorded_demand: float
    active_warehouses_count: int
    active_villages_count: int
    supply_types_count: int
    critical_demands_count: int
    total_pairs_count: int
    configured_costs_count: int
    missing_costs_count: int
    is_ready_to_solve: bool
    readiness_notes: List[str]


class AllocationDetail(BaseModel):
    """Recommended dispatch from warehouse to village."""

    warehouse_id: Optional[int]
    warehouse_name: str
    village_id: Optional[int]
    village_name: str
    supply_id: Optional[int]
    supply_name: str
    supply_category: str
    supply_unit: str
    allocated_quantity: float
    unit_transport_cost: float
    total_transport_cost: float


class DemandFulfilmentDetail(BaseModel):
    """Demand satisfaction analysis per village and relief item."""

    village_id: Optional[int]
    village_name: str
    village_district: Optional[str] = None
    supply_id: Optional[int]
    supply_name: str
    supply_unit: str
    required_quantity: float
    allocated_quantity: float
    unmet_quantity: float
    urgency_level: str
    fulfilment_pct: float


class WarehouseStockUsageDetail(BaseModel):
    """Warehouse inventory utilization and remaining stock analysis."""

    warehouse_id: Optional[int]
    warehouse_name: str
    supply_id: Optional[int]
    supply_name: str
    supply_unit: str
    initial_available: float
    allocated_quantity: float
    remaining_stock: float
    utilization_pct: float


class VillageFairnessItem(BaseModel):
    """Per-village aggregate demand satisfaction for fairness review."""

    village_id: Optional[int]
    village_name: str
    total_demanded: float
    total_allocated: float
    fulfilment_pct: float


class UrgencyTierMetric(BaseModel):
    """Fulfilment metrics within an urgency tier."""

    urgency_level: str
    demanded: float
    allocated: float
    unmet: float
    fulfilment_pct: float


class FairnessMetrics(BaseModel):
    """Distribution equity and urgency fulfilment indicators."""

    village_fulfilments: List[VillageFairnessItem]
    average_fulfilment_pct: float
    min_fulfilment_pct: float
    max_fulfilment_pct: float
    disparity_gap_pct: float
    urgency_breakdown: Dict[str, UrgencyTierMetric]


class OptimizationSolveResponse(BaseModel):
    """Full optimization result plan returned by OR-Tools solver."""

    id: Optional[int] = None
    run_id: str
    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, NO_SOLUTION, ERROR
    solver_name: str
    solver_status_message: str
    solver_time_ms: float
    created_at: datetime

    total_requested: float
    total_allocated: float
    total_unmet: float
    total_transport_cost: float
    overall_fulfilment_pct: float
    critical_fulfilment_pct: float

    is_scenario: bool = False
    scenario_name: Optional[str] = None

    allocations: List[AllocationDetail]
    demand_fulfilment: List[DemandFulfilmentDetail]
    stock_usage: List[WarehouseStockUsageDetail]
    fairness: FairnessMetrics

    model_config = ConfigDict(from_attributes=True)


class OptimizationRunSummary(BaseModel):
    """Compact summary of a historical optimization run."""

    id: int
    run_id: str
    status: str
    created_at: datetime
    total_requested: float
    total_allocated: float
    total_unmet: float
    total_transport_cost: float
    overall_fulfilment_pct: float
    critical_fulfilment_pct: float
    is_scenario: bool
    scenario_name: Optional[str]
    solver_time_ms: float

    model_config = ConfigDict(from_attributes=True)


class InventoryOverride(BaseModel):
    """Temporary inventory override for scenario simulation."""

    warehouse_id: int
    supply_id: int
    available_quantity: float = Field(..., ge=0.0)


class DemandOverride(BaseModel):
    """Temporary demand override for scenario simulation."""

    village_id: int
    supply_id: int
    required_quantity: float = Field(..., ge=0.0)
    urgency_level: Optional[str] = None


class CostOverride(BaseModel):
    """Temporary transportation cost override for scenario simulation."""

    warehouse_id: int
    village_id: int
    cost_per_unit: float = Field(..., ge=0.0)


class ScenarioSimulateRequest(BaseModel):
    """What-if scenario parameters that do NOT mutate real inventory."""

    scenario_name: Optional[str] = "What-If Simulation"
    inventory_overrides: Optional[List[InventoryOverride]] = None
    demand_overrides: Optional[List[DemandOverride]] = None
    cost_overrides: Optional[List[CostOverride]] = None


class ScenarioComparisonResponse(BaseModel):
    """Side-by-side comparison between baseline and scenario runs."""

    baseline_run: OptimizationRunSummary
    comparison_run: OptimizationRunSummary
    delta_allocated: float
    delta_unmet: float
    delta_transport_cost: float
    delta_overall_fulfilment_pct: float
    delta_critical_fulfilment_pct: float
    narrative_summary: str

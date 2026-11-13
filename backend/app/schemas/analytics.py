"""Pydantic schemas for ReliefOpt Analytics and Leaflet Geospatial Mapping."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class WarehouseMapPoint(BaseModel):
    """Geographical marker data for a registered warehouse."""

    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    contact_info: Optional[str] = None
    is_active: bool = True
    total_stock: float = 0.0
    supply_types_count: int = 0
    stock_by_supply: Dict[str, float] = Field(default_factory=dict)
    has_valid_coordinates: bool = True


class VillageDemandItem(BaseModel):
    """Line-item demand summary for an affected village."""

    supply_id: int
    supply_name: str
    supply_category: str
    supply_unit: str
    required_quantity: float
    allocated_quantity: float = 0.0
    unmet_quantity: float = 0.0
    urgency_level: str


class VillageMapPoint(BaseModel):
    """Geographical marker data for a flood-affected village."""

    id: int
    name: str
    district: str
    state: str
    latitude: float
    longitude: float
    population: int
    is_active: bool = True
    total_demanded: float = 0.0
    total_allocated: float = 0.0
    total_unmet: float = 0.0
    highest_urgency: str = "None"
    demands_summary: List[VillageDemandItem] = Field(default_factory=list)
    has_valid_coordinates: bool = True


class DistributionRoutePoint(BaseModel):
    """Straight-line geographical allocation link connecting warehouse to village."""

    id: str
    warehouse_id: int
    warehouse_name: str
    warehouse_lat: float
    warehouse_lng: float
    village_id: int
    village_name: str
    village_lat: float
    village_lng: float
    supply_id: int
    supply_name: str
    supply_category: str
    supply_unit: str
    allocated_quantity: float
    unit_cost: float
    total_transit_cost: float
    is_geographical_link: bool = True
    disclaimer: str = "Geographical allocation connection (straight-line); does not represent road navigation route."


class InvalidCoordinateWarning(BaseModel):
    """Notification for entities with invalid or missing GPS coordinates."""

    entity_type: str  # "warehouse" or "village"
    id: int
    name: str
    latitude: Optional[float]
    longitude: Optional[float]
    reason: str


class AnalyticsKPIs(BaseModel):
    """High-level distribution efficiency indicators."""

    total_demand: float
    total_allocated: float
    total_unmet: float
    demand_fulfilment_pct: float
    critical_fulfilment_pct: float
    total_transport_cost: float
    total_warehouses_count: int
    total_villages_count: int
    active_distribution_routes_count: int


class UrgencyDistributionItem(BaseModel):
    """Demand count and volume aggregated per urgency tier."""

    urgency_level: str
    demands_count: int
    total_quantity: float
    percentage_of_total_demand: float


class WarehouseStockBreakdown(BaseModel):
    """Warehouse inventory distribution for Plotly charts."""

    warehouse_id: int
    warehouse_name: str
    supplies: Dict[str, float]
    total_quantity: float


class VillageAllocationChartItem(BaseModel):
    """Per-village demand, allocation and unmet status for Chart 1 and Chart 4."""

    village_id: int
    village_name: str
    district: str
    requested_quantity: float
    allocated_quantity: float
    unmet_quantity: float
    fulfilment_pct: float


class PlanCostComparisonItem(BaseModel):
    """Historical optimization run cost comparison for Chart 5."""

    run_id: str
    scenario_name: str
    status: str
    total_cost: float
    total_allocated: float
    overall_fulfilment_pct: float
    created_at: str


class FilterOption(BaseModel):
    """Generic ID-Name filter option."""

    id: int
    name: str
    extra: Optional[str] = None


class AnalyticsOverviewResponse(BaseModel):
    """Consolidated payload for Leaflet maps and Plotly analytics dashboard."""

    kpis: AnalyticsKPIs
    warehouses_geo: List[WarehouseMapPoint]
    villages_geo: List[VillageMapPoint]
    distribution_routes: List[DistributionRoutePoint]
    invalid_coordinates: List[InvalidCoordinateWarning]

    # Chart datasets
    urgency_distribution: List[UrgencyDistributionItem]
    warehouse_stock: List[WarehouseStockBreakdown]
    village_allocations: List[VillageAllocationChartItem]
    plan_cost_comparisons: List[PlanCostComparisonItem]

    # Filter metadata
    selected_plan_id: Optional[int] = None
    selected_plan_name: Optional[str] = None
    available_plans: List[Dict[str, Any]]
    available_warehouses: List[FilterOption]
    available_villages: List[FilterOption]
    available_supplies: List[FilterOption]

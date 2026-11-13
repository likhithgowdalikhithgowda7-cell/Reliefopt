"""Pydantic schemas for Dashboard metrics."""

from typing import Dict
from pydantic import BaseModel, ConfigDict


class DashboardSummary(BaseModel):
    """Real database metrics aggregated for the ReliefOpt dashboard."""

    total_warehouses: int
    total_active_villages: int
    total_supply_types: int
    total_available_inventory: float
    total_recorded_demand: float
    critical_urgency_demands: int
    demand_by_urgency: Dict[str, int]
    is_empty: bool

    model_config = ConfigDict(from_attributes=True)

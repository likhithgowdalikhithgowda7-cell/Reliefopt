"""Dashboard summary service computing live database aggregations."""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.schemas.dashboard import DashboardSummary


def get_dashboard_summary(db: Session) -> DashboardSummary:
    """Compute real database-backed metrics for the ReliefOpt dashboard."""
    total_warehouses = db.query(func.count(Warehouse.id)).scalar() or 0
    total_active_villages = (
        db.query(func.count(AffectedVillage.id))
        .filter(AffectedVillage.is_active == True)
        .scalar()
        or 0
    )
    total_supply_types = db.query(func.count(ReliefSupply.id)).scalar() or 0

    total_available_inventory = (
        db.query(func.coalesce(func.sum(WarehouseInventory.available_quantity), 0.0)).scalar()
        or 0.0
    )

    total_recorded_demand = (
        db.query(func.coalesce(func.sum(VillageDemand.required_quantity), 0.0)).scalar()
        or 0.0
    )

    critical_demands = (
        db.query(func.count(VillageDemand.id))
        .filter(VillageDemand.urgency_level == "Critical")
        .scalar()
        or 0
    )

    # Breakdown by all urgency levels
    urgency_rows = (
        db.query(VillageDemand.urgency_level, func.count(VillageDemand.id))
        .group_by(VillageDemand.urgency_level)
        .all()
    )
    demand_by_urgency = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for level, count in urgency_rows:
        if level in demand_by_urgency:
            demand_by_urgency[level] = count

    is_empty = (
        total_warehouses == 0
        and total_active_villages == 0
        and total_supply_types == 0
        and total_recorded_demand == 0
    )

    return DashboardSummary(
        total_warehouses=total_warehouses,
        total_active_villages=total_active_villages,
        total_supply_types=total_supply_types,
        total_available_inventory=float(total_available_inventory),
        total_recorded_demand=float(total_recorded_demand),
        critical_urgency_demands=critical_demands,
        demand_by_urgency=demand_by_urgency,
        is_empty=is_empty,
    )

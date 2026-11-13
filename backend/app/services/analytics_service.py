"""Service computing live analytics and geospatial map data for ReliefOpt."""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.optimization import (
    OptimizationRun,
    OptimizationAllocation,
    OptimizationUnmetDemand,
)
from app.schemas.analytics import (
    WarehouseMapPoint,
    VillageMapPoint,
    VillageDemandItem,
    DistributionRoutePoint,
    InvalidCoordinateWarning,
    AnalyticsKPIs,
    UrgencyDistributionItem,
    WarehouseStockBreakdown,
    VillageAllocationChartItem,
    PlanCostComparisonItem,
    FilterOption,
    AnalyticsOverviewResponse,
)


# Regional operational boundaries for Indian disaster relief operations
OPERATIONAL_MIN_LAT = 6.0
OPERATIONAL_MAX_LAT = 38.0
OPERATIONAL_MIN_LNG = 68.0
OPERATIONAL_MAX_LNG = 99.0


def _is_valid_coordinate(lat: Optional[float], lng: Optional[float]) -> bool:
    """Validate latitude and longitude ranges and verify within operational boundaries."""
    if lat is None or lng is None:
        return False
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (ValueError, TypeError):
        return False

    if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
        return False

    if not (OPERATIONAL_MIN_LAT <= lat_f <= OPERATIONAL_MAX_LAT and OPERATIONAL_MIN_LNG <= lng_f <= OPERATIONAL_MAX_LNG):
        return False

    return True


def _get_coordinate_error_reason(lat: Optional[float], lng: Optional[float]) -> str:
    """Provide descriptive reason why coordinates are invalid or out of boundary."""
    if lat is None or lng is None:
        return "Latitude and longitude coordinates are required but missing."
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (ValueError, TypeError):
        return f"Coordinates must be valid numbers, got lat={lat}, lng={lng}"

    if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
        return "Latitude must be in [-90, 90] and longitude in [-180, 180]"

    if not (OPERATIONAL_MIN_LAT <= lat_f <= OPERATIONAL_MAX_LAT and OPERATIONAL_MIN_LNG <= lng_f <= OPERATIONAL_MAX_LNG):
        return (
            f"Latitude must be in [-90, 90] and within operational relief boundaries "
            f"({OPERATIONAL_MIN_LAT}°N–{OPERATIONAL_MAX_LAT}°N, {OPERATIONAL_MIN_LNG}°E–{OPERATIONAL_MAX_LNG}°E). "
            f"Point ({lat_f}, {lng_f}) lies outside the operational region."
        )

    return "Latitude must be in [-90, 90] and longitude in [-180, 180]"


def _get_urgency_rank(urgency: str) -> int:
    """Rank urgency tiers for finding the highest urgency in a village."""
    ranks = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    return ranks.get(urgency, 0)


def get_analytics_overview(
    db: Session,
    plan_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    village_id: Optional[int] = None,
    supply_id: Optional[int] = None,
    urgency: Optional[str] = None,
) -> AnalyticsOverviewResponse:
    """Consolidate PostgreSQL data into map geometries, KPIs and Plotly datasets."""
    # 1. Fetch Entities
    warehouses = db.query(Warehouse).order_by(Warehouse.id).all()
    villages = db.query(AffectedVillage).filter(AffectedVillage.is_active == True).order_by(AffectedVillage.id).all()
    supplies = db.query(ReliefSupply).order_by(ReliefSupply.id).all()
    all_demands = db.query(VillageDemand).all()
    all_inventories = db.query(WarehouseInventory).all()

    # Lookups
    warehouse_dict: Dict[int, Warehouse] = {w.id: w for w in warehouses}
    village_dict: Dict[int, AffectedVillage] = {v.id: v for v in villages}
    supply_dict: Dict[int, ReliefSupply] = {s.id: s for s in supplies}

    invalid_coords: List[InvalidCoordinateWarning] = []

    # 2. Process Warehouses Map Points & Stock
    warehouse_stock_map: Dict[int, Dict[str, float]] = {w.id: {} for w in warehouses}
    for inv in all_inventories:
        if inv.warehouse_id in warehouse_stock_map:
            s_name = supply_dict[inv.supply_id].name if inv.supply_id in supply_dict else f"Supply #{inv.supply_id}"
            warehouse_stock_map[inv.warehouse_id][s_name] = (
                warehouse_stock_map[inv.warehouse_id].get(s_name, 0.0) + float(inv.available_quantity)
            )

    warehouses_geo: List[WarehouseMapPoint] = []
    for w in warehouses:
        is_valid = _is_valid_coordinate(w.latitude, w.longitude)
        if not is_valid:
            invalid_coords.append(
                InvalidCoordinateWarning(
                    entity_type="warehouse",
                    id=w.id,
                    name=w.name,
                    latitude=w.latitude,
                    longitude=w.longitude,
                    reason=_get_coordinate_error_reason(w.latitude, w.longitude),
                )
            )

        stock_dict = warehouse_stock_map.get(w.id, {})
        total_stock = sum(stock_dict.values())
        warehouses_geo.append(
            WarehouseMapPoint(
                id=w.id,
                name=w.name,
                address=w.address,
                latitude=w.latitude,
                longitude=w.longitude,
                contact_info=w.contact_info,
                is_active=w.is_active,
                total_stock=total_stock,
                supply_types_count=len(stock_dict),
                stock_by_supply=stock_dict,
                has_valid_coordinates=is_valid,
            )
        )

    # 3. Determine Selected Optimization Run
    selected_run: Optional[OptimizationRun] = None
    if plan_id is not None:
        selected_run = db.query(OptimizationRun).filter(OptimizationRun.id == plan_id).first()
    else:
        # Default to latest non-scenario or latest run
        selected_run = (
            db.query(OptimizationRun)
            .filter(OptimizationRun.status.in_(["OPTIMAL", "FEASIBLE"]))
            .order_by(desc(OptimizationRun.id))
            .first()
        )

    # Allocations and Unmet Demand from the selected run
    allocations_for_run: List[OptimizationAllocation] = []
    unmet_for_run: List[OptimizationUnmetDemand] = []
    if selected_run:
        allocations_for_run = (
            db.query(OptimizationAllocation)
            .filter(OptimizationAllocation.run_id == selected_run.id)
            .all()
        )
        unmet_for_run = (
            db.query(OptimizationUnmetDemand)
            .filter(OptimizationUnmetDemand.run_id == selected_run.id)
            .all()
        )

    # Maps for allocations and unfulfilled quantities per (village_id, supply_id)
    alloc_lookup: Dict[Tuple[int, int], float] = {}
    for alloc in allocations_for_run:
        key = (alloc.village_id, alloc.supply_id)
        alloc_lookup[key] = alloc_lookup.get(key, 0.0) + float(alloc.allocated_quantity)

    unmet_lookup: Dict[Tuple[int, int], float] = {}
    for unmet in unmet_for_run:
        key = (unmet.village_id, unmet.supply_id)
        unmet_lookup[key] = float(unmet.unmet_quantity)

    # 4. Process Villages Map Points & Demands
    village_demands_map: Dict[int, List[VillageDemandItem]] = {v.id: [] for v in villages}
    village_totals_map: Dict[int, Dict[str, float]] = {
        v.id: {"demanded": 0.0, "allocated": 0.0, "unmet": 0.0, "highest_urgency_rank": 0}
        for v in villages
    }

    for d in all_demands:
        if d.village_id not in village_totals_map:
            continue
        s = supply_dict.get(d.supply_id)
        s_name = s.name if s else f"Supply #{d.supply_id}"
        s_cat = s.category if s else "General"
        s_unit = s.unit if s else "Units"

        req_qty = float(d.required_quantity)
        alloc_qty = alloc_lookup.get((d.village_id, d.supply_id), 0.0)
        unmet_qty = max(0.0, req_qty - alloc_qty) if selected_run else req_qty

        village_demands_map[d.village_id].append(
            VillageDemandItem(
                supply_id=d.supply_id,
                supply_name=s_name,
                supply_category=s_cat,
                supply_unit=s_unit,
                required_quantity=req_qty,
                allocated_quantity=alloc_qty,
                unmet_quantity=unmet_qty,
                urgency_level=d.urgency_level,
            )
        )

        village_totals_map[d.village_id]["demanded"] += req_qty
        village_totals_map[d.village_id]["allocated"] += alloc_qty
        village_totals_map[d.village_id]["unmet"] += unmet_qty

        u_rank = _get_urgency_rank(d.urgency_level)
        if u_rank > village_totals_map[d.village_id]["highest_urgency_rank"]:
            village_totals_map[d.village_id]["highest_urgency_rank"] = u_rank

    rank_to_urgency = {4: "Critical", 3: "High", 2: "Medium", 1: "Low", 0: "None"}
    villages_geo: List[VillageMapPoint] = []
    for v in villages:
        is_valid = _is_valid_coordinate(v.latitude, v.longitude)
        if not is_valid:
            invalid_coords.append(
                InvalidCoordinateWarning(
                    entity_type="village",
                    id=v.id,
                    name=v.name,
                    latitude=v.latitude,
                    longitude=v.longitude,
                    reason=_get_coordinate_error_reason(v.latitude, v.longitude),
                )
            )

        v_summary = village_totals_map.get(v.id, {"demanded": 0.0, "allocated": 0.0, "unmet": 0.0, "highest_urgency_rank": 0})
        villages_geo.append(
            VillageMapPoint(
                id=v.id,
                name=v.name,
                district=v.district,
                state=v.state,
                latitude=v.latitude,
                longitude=v.longitude,
                population=v.population,
                is_active=v.is_active,
                total_demanded=v_summary["demanded"],
                total_allocated=v_summary["allocated"],
                total_unmet=v_summary["unmet"],
                highest_urgency=rank_to_urgency.get(v_summary["highest_urgency_rank"], "None"),
                demands_summary=village_demands_map.get(v.id, []),
                has_valid_coordinates=is_valid,
            )
        )

    # 5. Build Distribution Route Points
    distribution_routes: List[DistributionRoutePoint] = []
    for alloc in allocations_for_run:
        w = warehouse_dict.get(alloc.warehouse_id)
        v = village_dict.get(alloc.village_id)
        s = supply_dict.get(alloc.supply_id)

        if not w or not v or not s:
            continue

        if not _is_valid_coordinate(w.latitude, w.longitude) or not _is_valid_coordinate(v.latitude, v.longitude):
            continue

        if alloc.allocated_quantity <= 0:
            continue

        # Check filters
        if warehouse_id is not None and w.id != warehouse_id:
            continue
        if village_id is not None and v.id != village_id:
            continue
        if supply_id is not None and s.id != supply_id:
            continue

        route_id = f"route_{alloc.id}_{w.id}_{v.id}_{s.id}"
        distribution_routes.append(
            DistributionRoutePoint(
                id=route_id,
                warehouse_id=w.id,
                warehouse_name=w.name,
                warehouse_lat=w.latitude,
                warehouse_lng=w.longitude,
                village_id=v.id,
                village_name=v.name,
                village_lat=v.latitude,
                village_lng=v.longitude,
                supply_id=s.id,
                supply_name=s.name,
                supply_category=s.category,
                supply_unit=s.unit,
                allocated_quantity=float(alloc.allocated_quantity),
                unit_cost=float(alloc.unit_transport_cost),
                total_transit_cost=float(alloc.total_transport_cost),
            )
        )

    # 6. Compute Chart Datasets
    # Chart 1 & 4: Village-wise demand vs allocated
    village_allocations: List[VillageAllocationChartItem] = []
    for v in villages:
        if village_id is not None and v.id != village_id:
            continue
        v_metrics = village_totals_map.get(v.id, {"demanded": 0.0, "allocated": 0.0, "unmet": 0.0})
        req = v_metrics["demanded"]
        alc = v_metrics["allocated"]
        unm = v_metrics["unmet"]
        fulfil_pct = (alc / req * 100.0) if req > 0 else (100.0 if alc >= 0 else 0.0)

        village_allocations.append(
            VillageAllocationChartItem(
                village_id=v.id,
                village_name=v.name,
                district=v.district,
                requested_quantity=req,
                allocated_quantity=alc,
                unmet_quantity=unm,
                fulfilment_pct=round(fulfil_pct, 1),
            )
        )

    # Chart 2: Urgency Distribution
    urgency_counts: Dict[str, Dict[str, float]] = {
        "Critical": {"count": 0, "quantity": 0.0},
        "High": {"count": 0, "quantity": 0.0},
        "Medium": {"count": 0, "quantity": 0.0},
        "Low": {"count": 0, "quantity": 0.0},
    }
    total_demanded_all = 0.0
    for d in all_demands:
        if d.urgency_level in urgency_counts:
            urgency_counts[d.urgency_level]["count"] += 1
            urgency_counts[d.urgency_level]["quantity"] += float(d.required_quantity)
            total_demanded_all += float(d.required_quantity)

    urgency_distribution: List[UrgencyDistributionItem] = []
    for u_level in ["Critical", "High", "Medium", "Low"]:
        u_qty = urgency_counts[u_level]["quantity"]
        pct = (u_qty / total_demanded_all * 100.0) if total_demanded_all > 0 else 0.0
        urgency_distribution.append(
            UrgencyDistributionItem(
                urgency_level=u_level,
                demands_count=urgency_counts[u_level]["count"],
                total_quantity=u_qty,
                percentage_of_total_demand=round(pct, 1),
            )
        )

    # Chart 3: Warehouse Inventory Distribution
    warehouse_stock: List[WarehouseStockBreakdown] = []
    for w in warehouses:
        if warehouse_id is not None and w.id != warehouse_id:
            continue
        stock_dict = warehouse_stock_map.get(w.id, {})
        # Filter by supply if needed
        if supply_id is not None:
            s_obj = supply_dict.get(supply_id)
            if s_obj and s_obj.name in stock_dict:
                filtered_stock = {s_obj.name: stock_dict[s_obj.name]}
            else:
                filtered_stock = {}
        else:
            filtered_stock = stock_dict

        warehouse_stock.append(
            WarehouseStockBreakdown(
                warehouse_id=w.id,
                warehouse_name=w.name,
                supplies=filtered_stock,
                total_quantity=sum(filtered_stock.values()),
            )
        )

    # Chart 5: Historical Plan Cost Comparisons
    all_runs = db.query(OptimizationRun).order_by(OptimizationRun.id).limit(10).all()
    plan_cost_comparisons: List[PlanCostComparisonItem] = [
        PlanCostComparisonItem(
            run_id=str(r.id),
            scenario_name=r.scenario_name or f"Plan #{r.id}",
            status=r.status,
            total_cost=float(r.total_transport_cost),
            total_allocated=float(r.total_allocated),
            overall_fulfilment_pct=float(r.overall_fulfilment_pct),
            created_at=r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        )
        for r in all_runs
    ]

    # 7. Compute High-Level KPIs
    tot_req = sum(v["demanded"] for v in village_totals_map.values())
    tot_alc = sum(v["allocated"] for v in village_totals_map.values())
    tot_unm = sum(v["unmet"] for v in village_totals_map.values())
    tot_cost = sum(r.total_transit_cost for r in distribution_routes)

    # Fulfillment percentages
    fulfilment_pct = (tot_alc / tot_req * 100.0) if tot_req > 0 else (100.0 if tot_alc >= 0 else 0.0)

    # Critical urgency fulfilment
    crit_demanded = urgency_counts["Critical"]["quantity"]
    crit_allocated = 0.0
    for alloc in allocations_for_run:
        # Find if this allocation fulfilled a critical demand
        # Check demand for this village and supply
        for d in all_demands:
            if d.village_id == alloc.village_id and d.supply_id == alloc.supply_id and d.urgency_level == "Critical":
                crit_allocated += min(float(alloc.allocated_quantity), float(d.required_quantity))
                break

    crit_fulfil_pct = (crit_allocated / crit_demanded * 100.0) if crit_demanded > 0 else (100.0 if crit_allocated >= 0 else 0.0)

    kpis = AnalyticsKPIs(
        total_demand=tot_req,
        total_allocated=tot_alc,
        total_unmet=tot_unm,
        demand_fulfilment_pct=round(fulfilment_pct, 1),
        critical_fulfilment_pct=round(crit_fulfil_pct, 1),
        total_transport_cost=round(tot_cost, 2),
        total_warehouses_count=len(warehouses),
        total_villages_count=len(villages),
        active_distribution_routes_count=len(distribution_routes),
    )

    # 8. Available Filters
    available_plans = [
        {
            "id": r.id,
            "scenario_name": r.scenario_name or f"Plan #{r.id}",
            "status": r.status,
            "created_at": r.created_at.strftime("%b %d, %H:%M") if r.created_at else "",
            "total_allocated": float(r.total_allocated),
        }
        for r in all_runs
    ]

    return AnalyticsOverviewResponse(
        kpis=kpis,
        warehouses_geo=warehouses_geo,
        villages_geo=villages_geo,
        distribution_routes=distribution_routes,
        invalid_coordinates=invalid_coords,
        urgency_distribution=urgency_distribution,
        warehouse_stock=warehouse_stock,
        village_allocations=village_allocations,
        plan_cost_comparisons=plan_cost_comparisons,
        selected_plan_id=selected_run.id if selected_run else None,
        selected_plan_name=selected_run.scenario_name if selected_run else None,
        available_plans=available_plans,
        available_warehouses=[FilterOption(id=w.id, name=w.name, extra=w.address) for w in warehouses],
        available_villages=[FilterOption(id=v.id, name=v.name, extra=v.district) for v in villages],
        available_supplies=[FilterOption(id=s.id, name=s.name, extra=f"{s.category} ({s.unit})") for s in supplies],
    )

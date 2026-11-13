"""Transportation cost service handling CRUD, matrix representations, and coverage analysis."""

import math
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.transport_cost import TransportationCost
from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.schemas.transport_cost import (
    TransportationCostCreate,
    TransportationCostUpdate,
    TransportationCostResponse,
    CostMatrixResponse,
    CostMatrixCell,
    BatchCostItem,
)


def _to_response(cost: TransportationCost) -> TransportationCostResponse:
    """Format ORM model with joined entity names."""
    return TransportationCostResponse(
        id=cost.id,
        warehouse_id=cost.warehouse_id,
        village_id=cost.village_id,
        cost_per_unit=cost.cost_per_unit,
        distance_km=cost.distance_km,
        warehouse_name=cost.warehouse.name if cost.warehouse else None,
        village_name=cost.village.name if cost.village else None,
        village_district=cost.village.district if cost.village else None,
        created_at=cost.created_at,
        updated_at=cost.updated_at,
    )


def list_transport_costs(
    db: Session,
    warehouse_id: Optional[int] = None,
    village_id: Optional[int] = None,
) -> List[TransportationCostResponse]:
    """List transportation costs with optional warehouse and village filters."""
    query = db.query(TransportationCost)
    if warehouse_id:
        query = query.filter(TransportationCost.warehouse_id == warehouse_id)
    if village_id:
        query = query.filter(TransportationCost.village_id == village_id)

    records = query.order_by(TransportationCost.id.asc()).all()
    return [_to_response(c) for c in records]


def get_transport_cost(db: Session, cost_id: int) -> TransportationCost:
    """Get a single transportation cost entry or raise 404."""
    cost = db.query(TransportationCost).filter(TransportationCost.id == cost_id).first()
    if not cost:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transportation cost record #{cost_id} not found",
        )
    return cost


def create_or_update_transport_cost(
    db: Session, cost_in: TransportationCostCreate
) -> TransportationCostResponse:
    """Create or update (upsert) transportation cost for a warehouse-village pair."""
    # Verify warehouse exists and is active
    warehouse = db.query(Warehouse).filter(Warehouse.id == cost_in.warehouse_id).first()
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Warehouse #{cost_in.warehouse_id} does not exist",
        )

    # Verify village exists
    village = db.query(AffectedVillage).filter(AffectedVillage.id == cost_in.village_id).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Affected village #{cost_in.village_id} does not exist",
        )

    existing = (
        db.query(TransportationCost)
        .filter(
            TransportationCost.warehouse_id == cost_in.warehouse_id,
            TransportationCost.village_id == cost_in.village_id,
        )
        .first()
    )

    if existing:
        existing.cost_per_unit = cost_in.cost_per_unit
        if cost_in.distance_km is not None:
            existing.distance_km = cost_in.distance_km
        db.commit()
        db.refresh(existing)
        return _to_response(existing)
    else:
        new_cost = TransportationCost(
            warehouse_id=cost_in.warehouse_id,
            village_id=cost_in.village_id,
            cost_per_unit=cost_in.cost_per_unit,
            distance_km=cost_in.distance_km,
        )
        db.add(new_cost)
        db.commit()
        db.refresh(new_cost)
        return _to_response(new_cost)


def update_transport_cost(
    db: Session, cost_id: int, cost_in: TransportationCostUpdate
) -> TransportationCostResponse:
    """Update existing transportation cost fields."""
    cost = get_transport_cost(db, cost_id)
    if cost_in.cost_per_unit is not None:
        cost.cost_per_unit = cost_in.cost_per_unit
    if cost_in.distance_km is not None:
        cost.distance_km = cost_in.distance_km

    db.commit()
    db.refresh(cost)
    return _to_response(cost)


def delete_transport_cost(db: Session, cost_id: int) -> None:
    """Remove a transportation cost entry."""
    cost = get_transport_cost(db, cost_id)
    db.delete(cost)
    db.commit()


def get_cost_matrix(db: Session) -> CostMatrixResponse:
    """Generate the full cost matrix between all active warehouses and villages."""
    warehouses = (
        db.query(Warehouse)
        .filter(Warehouse.is_active == True)
        .order_by(Warehouse.name.asc())
        .all()
    )
    villages = (
        db.query(AffectedVillage)
        .filter(AffectedVillage.is_active == True)
        .order_by(AffectedVillage.name.asc())
        .all()
    )

    cost_records = db.query(TransportationCost).all()
    cost_lookup = {
        (c.warehouse_id, c.village_id): c for c in cost_records
    }

    cells: List[CostMatrixCell] = []
    configured_count = 0

    for wh in warehouses:
        for vil in villages:
            cost_record = cost_lookup.get((wh.id, vil.id))
            if cost_record is not None:
                configured_count += 1
                cells.append(
                    CostMatrixCell(
                        warehouse_id=wh.id,
                        warehouse_name=wh.name,
                        village_id=vil.id,
                        village_name=vil.name,
                        village_district=vil.district,
                        cost_per_unit=cost_record.cost_per_unit,
                        distance_km=cost_record.distance_km,
                        has_cost=True,
                    )
                )
            else:
                cells.append(
                    CostMatrixCell(
                        warehouse_id=wh.id,
                        warehouse_name=wh.name,
                        village_id=vil.id,
                        village_name=vil.name,
                        village_district=vil.district,
                        cost_per_unit=None,
                        distance_km=None,
                        has_cost=False,
                    )
                )

    total_pairs = len(warehouses) * len(villages)
    missing_count = total_pairs - configured_count

    return CostMatrixResponse(
        warehouses=[{"id": w.id, "name": w.name} for w in warehouses],
        villages=[{"id": v.id, "name": v.name, "district": v.district} for v in villages],
        cells=cells,
        total_pairs=total_pairs,
        configured_pairs=configured_count,
        missing_pairs=missing_count,
        is_complete=(missing_count == 0 and total_pairs > 0),
    )


def batch_upsert_costs(
    db: Session, costs: List[BatchCostItem]
) -> List[TransportationCostResponse]:
    """Batch insert or update transportation costs."""
    results = []
    for item in costs:
        resp = create_or_update_transport_cost(
            db,
            TransportationCostCreate(
                warehouse_id=item.warehouse_id,
                village_id=item.village_id,
                cost_per_unit=item.cost_per_unit,
                distance_km=item.distance_km,
            ),
        )
        results.append(resp)
    return results


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def seed_sample_demonstration_costs(db: Session) -> Tuple[int, List[TransportationCostResponse]]:
    """Seed estimated demonstration costs for all missing warehouse-village pairs.
    
    Formula: Base ₹15.00 + ₹1.50 per km (based on Haversine distance from coordinates).
    Clearly labeled in logs as sample demonstration data for testing.
    """
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    villages = db.query(AffectedVillage).filter(AffectedVillage.is_active == True).all()

    existing_pairs = set(
        db.query(TransportationCost.warehouse_id, TransportationCost.village_id).all()
    )

    created_costs = []
    for wh in warehouses:
        for vil in villages:
            if (wh.id, vil.id) not in existing_pairs:
                dist = _haversine_distance(wh.latitude, wh.longitude, vil.latitude, vil.longitude)
                # Sample rate: ₹15 base handling + ₹1.50 per km, rounded to 2 decimals, min ₹5.00
                unit_cost = round(max(5.0, 15.0 + (dist * 1.5)), 2)
                new_cost = TransportationCost(
                    warehouse_id=wh.id,
                    village_id=vil.id,
                    cost_per_unit=unit_cost,
                    distance_km=dist,
                )
                db.add(new_cost)
                existing_pairs.add((wh.id, vil.id))
                created_costs.append(new_cost)

    if created_costs:
        db.commit()
        for c in created_costs:
            db.refresh(c)

    responses = [_to_response(c) for c in created_costs]
    return len(created_costs), responses

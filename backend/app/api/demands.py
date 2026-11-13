"""Village Demand API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.demand import DemandCreate, DemandUpdate, DemandResponse
import app.services.demand_service as demand_service
import app.services.village_service as village_service
import app.services.supply_service as supply_service

router = APIRouter(prefix="/demands", tags=["Village Demand"])


def _to_response(d) -> DemandResponse:
    """Helper to transform Demand entity into populated response."""
    return DemandResponse(
        id=d.id,
        village_id=d.village_id,
        supply_id=d.supply_id,
        required_quantity=d.required_quantity,
        urgency_level=d.urgency_level,
        remarks=d.remarks,
        created_at=d.created_at,
        updated_at=d.updated_at,
        village_name=d.village.name if d.village else None,
        village_district=d.village.district if d.village else None,
        supply_name=d.supply.name if d.supply else None,
        supply_unit=d.supply.unit if d.supply else None,
        supply_category=d.supply.category if d.supply else None,
    )


@router.post(
    "",
    response_model=DemandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record relief demand for a village",
)
def create_demand(
    data: DemandCreate,
    db: Session = Depends(get_db),
):
    """Record relief demand with an urgency level (Low, Medium, High, Critical)."""
    village = village_service.get_village_by_id(db, data.village_id)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Affected village with ID {data.village_id} not found.",
        )

    supply = supply_service.get_supply_by_id(db, data.supply_id)
    if not supply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relief supply with ID {data.supply_id} not found.",
        )

    try:
        demand = demand_service.create_demand(db, data)
        return _to_response(demand)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.get(
    "",
    response_model=List[DemandResponse],
    summary="List all recorded demands",
)
def list_demands(
    village_id: Optional[int] = Query(None, description="Filter demands for a specific village"),
    urgency: Optional[str] = Query(None, description="Filter by urgency: Low, Medium, High, or Critical"),
    db: Session = Depends(get_db),
):
    """Retrieve all demand records, optionally filtering by village or urgency."""
    demands = demand_service.get_all_demands(db, village_id=village_id, urgency_level=urgency)
    return [_to_response(d) for d in demands]


@router.get(
    "/{demand_id}",
    response_model=DemandResponse,
    summary="Get single demand record",
)
def get_demand(
    demand_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single demand record."""
    demand = demand_service.get_demand_by_id(db, demand_id)
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demand record with ID {demand_id} not found.",
        )
    return _to_response(demand)


@router.put(
    "/{demand_id}",
    response_model=DemandResponse,
    summary="Update demand record",
)
def update_demand(
    demand_id: int,
    data: DemandUpdate,
    db: Session = Depends(get_db),
):
    """Update required quantity, urgency level, or remarks for a demand record."""
    demand = demand_service.get_demand_by_id(db, demand_id)
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demand record with ID {demand_id} not found.",
        )

    updated = demand_service.update_demand(db, demand, data)
    return _to_response(updated)


@router.delete(
    "/{demand_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete demand record",
)
def delete_demand(
    demand_id: int,
    db: Session = Depends(get_db),
):
    """Remove a demand request."""
    demand = demand_service.get_demand_by_id(db, demand_id)
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demand record with ID {demand_id} not found.",
        )
    demand_service.delete_demand(db, demand)
    return None

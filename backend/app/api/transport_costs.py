"""API router for Transportation Cost management."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.transport_cost import (
    TransportationCostCreate,
    TransportationCostUpdate,
    TransportationCostResponse,
    CostMatrixResponse,
    BatchCostRequest,
)
from app.services import transport_cost_service

router = APIRouter(prefix="/transportation-costs", tags=["Transportation Costs"])


@router.get("", response_model=List[TransportationCostResponse])
def list_costs(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    village_id: Optional[int] = Query(None, description="Filter by affected village ID"),
    db: Session = Depends(get_db),
):
    """Retrieve transportation cost entries with optional filters."""
    return transport_cost_service.list_transport_costs(
        db, warehouse_id=warehouse_id, village_id=village_id
    )


@router.get("/matrix", response_model=CostMatrixResponse)
def get_matrix(db: Session = Depends(get_db)):
    """Retrieve full warehouse x village cost matrix and coverage statistics."""
    return transport_cost_service.get_cost_matrix(db)


@router.post("", response_model=TransportationCostResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_cost(
    cost_in: TransportationCostCreate,
    db: Session = Depends(get_db),
):
    """Create or update (upsert) a transportation cost for a warehouse-village route."""
    return transport_cost_service.create_or_update_transport_cost(db, cost_in)


@router.post("/batch", response_model=List[TransportationCostResponse])
def batch_update_costs(
    request: BatchCostRequest,
    db: Session = Depends(get_db),
):
    """Batch create or update transportation costs."""
    return transport_cost_service.batch_upsert_costs(db, request.costs)


@router.post("/seed-sample", response_model=dict)
def seed_sample_costs(db: Session = Depends(get_db)):
    """Populate sample demonstration costs based on GPS coordinate distances for all missing pairs."""
    count, _ = transport_cost_service.seed_sample_demonstration_costs(db)
    return {
        "message": f"Successfully configured {count} sample transportation cost routes based on coordinate distances.",
        "seeded_count": count,
    }


@router.get("/{id}", response_model=TransportationCostResponse)
def get_cost(id: int, db: Session = Depends(get_db)):
    """Get a specific transportation cost entry."""
    cost = transport_cost_service.get_transport_cost(db, id)
    return transport_cost_service._to_response(cost)


@router.put("/{id}", response_model=TransportationCostResponse)
def update_cost(
    id: int,
    cost_in: TransportationCostUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing transportation cost."""
    return transport_cost_service.update_transport_cost(db, id, cost_in)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost(id: int, db: Session = Depends(get_db)):
    """Delete a transportation cost entry."""
    transport_cost_service.delete_transport_cost(db, id)

"""Relief Supply API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.supply import ReliefSupplyCreate, ReliefSupplyUpdate, ReliefSupplyResponse
import app.services.supply_service as supply_service

router = APIRouter(prefix="/supplies", tags=["Relief Supplies"])


@router.post(
    "",
    response_model=ReliefSupplyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new relief supply type",
)
def create_supply(
    data: ReliefSupplyCreate,
    db: Session = Depends(get_db),
):
    """Create a new standardized relief supply type."""
    existing = supply_service.get_supply_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Relief supply '{data.name.strip()}' already exists.",
        )
    return supply_service.create_supply(db, data)


@router.get(
    "",
    response_model=List[ReliefSupplyResponse],
    summary="List all relief supplies",
)
def list_supplies(
    db: Session = Depends(get_db),
):
    """Retrieve all available relief supply definitions."""
    return supply_service.get_supplies(db)


@router.get(
    "/{supply_id}",
    response_model=ReliefSupplyResponse,
    summary="Get single relief supply details",
)
def get_supply(
    supply_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single supply type by ID."""
    supply = supply_service.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relief supply with ID {supply_id} not found.",
        )
    return supply


@router.put(
    "/{supply_id}",
    response_model=ReliefSupplyResponse,
    summary="Update relief supply details",
)
def update_supply(
    supply_id: int,
    data: ReliefSupplyUpdate,
    db: Session = Depends(get_db),
):
    """Update relief supply metadata."""
    supply = supply_service.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relief supply with ID {supply_id} not found.",
        )

    if data.name:
        existing = supply_service.get_supply_by_name(db, data.name)
        if existing and existing.id != supply_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another supply with name '{data.name.strip()}' already exists.",
            )

    return supply_service.update_supply(db, supply, data)


@router.delete(
    "/{supply_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete relief supply safely",
)
def delete_supply(
    supply_id: int,
    db: Session = Depends(get_db),
):
    """Safely delete a relief supply type if no inventory or demand records reference it."""
    supply = supply_service.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relief supply with ID {supply_id} not found.",
        )

    inv_count, dem_count = supply_service.check_supply_references(db, supply_id)
    if inv_count > 0 or dem_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot delete supply '{supply.name}': it is currently referenced by "
                f"{inv_count} warehouse inventory line(s) and {dem_count} village demand request(s). "
                f"Remove those references before deleting."
            ),
        )

    supply_service.delete_supply(db, supply)
    return None

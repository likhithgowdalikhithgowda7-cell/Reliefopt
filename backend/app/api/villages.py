"""Affected Villages API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.village import VillageCreate, VillageUpdate, VillageResponse
import app.services.village_service as village_service

router = APIRouter(prefix="/villages", tags=["Affected Villages"])


@router.post(
    "",
    response_model=VillageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new affected village",
)
def create_village(
    data: VillageCreate,
    db: Session = Depends(get_db),
):
    """Register an affected village with coordinates, district, and population."""
    existing = village_service.get_village_by_name_and_district(db, data.name, data.district)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Village '{data.name.strip()}' in district '{data.district.strip()}' is already registered.",
        )
    village = village_service.create_village(db, data)
    resp = VillageResponse.model_validate(village)
    resp.total_demands_count = len(village.demands)
    return resp


@router.get(
    "",
    response_model=List[VillageResponse],
    summary="List all affected villages",
)
def list_villages(
    active_only: bool = Query(False, description="Filter for active villages only"),
    db: Session = Depends(get_db),
):
    """Retrieve all affected villages."""
    villages = village_service.get_villages(db, active_only=active_only)
    results = []
    for v in villages:
        item = VillageResponse.model_validate(v)
        item.total_demands_count = len(v.demands)
        results.append(item)
    return results


@router.get(
    "/{village_id}",
    response_model=VillageResponse,
    summary="Get single village details",
)
def get_village(
    village_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single affected village by ID."""
    village = village_service.get_village_by_id(db, village_id)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with ID {village_id} not found.",
        )
    resp = VillageResponse.model_validate(village)
    resp.total_demands_count = len(village.demands)
    return resp


@router.put(
    "/{village_id}",
    response_model=VillageResponse,
    summary="Update village details",
)
def update_village(
    village_id: int,
    data: VillageUpdate,
    db: Session = Depends(get_db),
):
    """Update details for an affected village."""
    village = village_service.get_village_by_id(db, village_id)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with ID {village_id} not found.",
        )

    if data.name or data.district:
        check_name = data.name if data.name else village.name
        check_dist = data.district if data.district else village.district
        existing = village_service.get_village_by_name_and_district(db, check_name, check_dist)
        if existing and existing.id != village_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another village with name '{check_name}' already exists in district '{check_dist}'.",
            )

    updated = village_service.update_village(db, village, data)
    resp = VillageResponse.model_validate(updated)
    resp.total_demands_count = len(updated.demands)
    return resp


@router.delete(
    "/{village_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate or delete village",
)
def delete_village(
    village_id: int,
    hard_delete: bool = Query(False, description="Perform hard database deletion"),
    db: Session = Depends(get_db),
):
    """Deactivate or remove a village record."""
    village = village_service.get_village_by_id(db, village_id)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with ID {village_id} not found.",
        )
    village_service.delete_village(db, village, hard_delete=hard_delete)
    return None

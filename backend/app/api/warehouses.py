"""Warehouse API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
import app.services.warehouse_service as warehouse_service

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


@router.post(
    "",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new warehouse",
)
def create_warehouse(
    data: WarehouseCreate,
    db: Session = Depends(get_db),
):
    """Register a new relief warehouse with coordinates and address."""
    existing = warehouse_service.get_warehouse_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A warehouse with the name '{data.name.strip()}' already exists.",
        )
    warehouse = warehouse_service.create_warehouse(db, data)
    resp = WarehouseResponse.model_validate(warehouse)
    resp.total_inventory_items = len(warehouse.inventories)
    return resp


@router.get(
    "",
    response_model=List[WarehouseResponse],
    summary="List all warehouses",
)
def list_warehouses(
    active_only: bool = Query(False, description="Filter for active warehouses only"),
    db: Session = Depends(get_db),
):
    """Retrieve all warehouses stored in the database."""
    warehouses = warehouse_service.get_warehouses(db, active_only=active_only)
    results = []
    for w in warehouses:
        item = WarehouseResponse.model_validate(w)
        item.total_inventory_items = len(w.inventories)
        results.append(item)
    return results


@router.get(
    "/{warehouse_id}",
    response_model=WarehouseResponse,
    summary="Get single warehouse details",
)
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single warehouse by ID."""
    warehouse = warehouse_service.get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found.",
        )
    resp = WarehouseResponse.model_validate(warehouse)
    resp.total_inventory_items = len(warehouse.inventories)
    return resp


@router.put(
    "/{warehouse_id}",
    response_model=WarehouseResponse,
    summary="Update warehouse details",
)
def update_warehouse(
    warehouse_id: int,
    data: WarehouseUpdate,
    db: Session = Depends(get_db),
):
    """Update warehouse attributes."""
    warehouse = warehouse_service.get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found.",
        )

    if data.name:
        existing = warehouse_service.get_warehouse_by_name(db, data.name)
        if existing and existing.id != warehouse_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another warehouse with name '{data.name.strip()}' already exists.",
            )

    updated = warehouse_service.update_warehouse(db, warehouse, data)
    resp = WarehouseResponse.model_validate(updated)
    resp.total_inventory_items = len(updated.inventories)
    return resp


@router.delete(
    "/{warehouse_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate or delete warehouse",
)
def delete_warehouse(
    warehouse_id: int,
    hard_delete: bool = Query(False, description="Perform hard database deletion"),
    db: Session = Depends(get_db),
):
    """Deactivate or remove a warehouse."""
    warehouse = warehouse_service.get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found.",
        )
    warehouse_service.delete_warehouse(db, warehouse, hard_delete=hard_delete)
    return None

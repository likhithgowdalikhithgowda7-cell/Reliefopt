"""Warehouse Inventory API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.inventory import (
    InventoryCreate,
    InventoryUpdate,
    InventoryResponse,
    OverallStockSummary,
)
import app.services.inventory_service as inventory_service
import app.services.warehouse_service as warehouse_service
import app.services.supply_service as supply_service

router = APIRouter(prefix="/inventory", tags=["Warehouse Inventory"])


def _to_response(inv) -> InventoryResponse:
    """Helper to transform inventory ORM entity into populated response."""
    return InventoryResponse(
        id=inv.id,
        warehouse_id=inv.warehouse_id,
        supply_id=inv.supply_id,
        available_quantity=inv.available_quantity,
        updated_at=inv.updated_at,
        warehouse_name=inv.warehouse.name if inv.warehouse else None,
        supply_name=inv.supply.name if inv.supply else None,
        supply_category=inv.supply.category if inv.supply else None,
        supply_unit=inv.supply.unit if inv.supply else None,
    )


@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add inventory to warehouse",
)
def add_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
):
    """Add available inventory to a warehouse.

    If an inventory line for this warehouse + supply already exists,
    the quantity will be incremented.
    """
    warehouse = warehouse_service.get_warehouse_by_id(db, data.warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {data.warehouse_id} not found.",
        )

    supply = supply_service.get_supply_by_id(db, data.supply_id)
    if not supply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relief supply with ID {data.supply_id} not found.",
        )

    if data.available_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available inventory quantity cannot be negative.",
        )

    record = inventory_service.create_or_increment_inventory(db, data)
    return _to_response(record)


@router.get(
    "",
    response_model=List[InventoryResponse],
    summary="List all inventory records",
)
def list_all_inventory(
    db: Session = Depends(get_db),
):
    """Retrieve all inventory entries across all warehouses."""
    records = inventory_service.get_all_inventory(db)
    return [_to_response(r) for r in records]


@router.get(
    "/summary",
    response_model=List[OverallStockSummary],
    summary="Get aggregated stock per supply type",
)
def get_stock_summary(
    db: Session = Depends(get_db),
):
    """Retrieve overall available stock summarized per relief supply type."""
    return inventory_service.get_overall_stock_summary(db)


@router.get(
    "/warehouse/{warehouse_id}",
    response_model=List[InventoryResponse],
    summary="Get inventory for a specific warehouse",
)
def get_warehouse_inventory(
    warehouse_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve all inventory lines belonging to a particular warehouse."""
    warehouse = warehouse_service.get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found.",
        )
    records = inventory_service.get_inventory_for_warehouse(db, warehouse_id)
    return [_to_response(r) for r in records]


@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse,
    summary="Get single inventory record",
)
def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single inventory record."""
    inv = inventory_service.get_inventory_by_id(db, inventory_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found.",
        )
    return _to_response(inv)


@router.put(
    "/{inventory_id}",
    response_model=InventoryResponse,
    summary="Update inventory quantity",
)
def update_inventory(
    inventory_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
):
    """Set absolute inventory quantity for an existing record."""
    inv = inventory_service.get_inventory_by_id(db, inventory_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found.",
        )

    if data.available_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available inventory quantity cannot be negative.",
        )

    updated = inventory_service.update_inventory_quantity(db, inv, data.available_quantity)
    return _to_response(updated)


@router.delete(
    "/{inventory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete inventory record",
)
def delete_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
):
    """Remove an inventory line."""
    inv = inventory_service.get_inventory_by_id(db, inventory_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found.",
        )
    inventory_service.delete_inventory(db, inv)
    return None

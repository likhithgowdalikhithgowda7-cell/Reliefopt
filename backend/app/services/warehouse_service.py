"""Warehouse service handling business logic and queries."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.warehouse import Warehouse
from app.models.inventory import WarehouseInventory
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate


def get_warehouses(db: Session, active_only: bool = False) -> List[Warehouse]:
    """Retrieve all warehouses, optionally filtering by active status."""
    query = db.query(Warehouse)
    if active_only:
        query = query.filter(Warehouse.is_active == True)
    return query.order_by(Warehouse.id.asc()).all()


def get_warehouse_by_id(db: Session, warehouse_id: int) -> Optional[Warehouse]:
    """Retrieve a single warehouse by ID."""
    return db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()


def get_warehouse_by_name(db: Session, name: str) -> Optional[Warehouse]:
    """Retrieve warehouse by exact name (case-insensitive)."""
    return db.query(Warehouse).filter(func.lower(Warehouse.name) == name.strip().lower()).first()


def create_warehouse(db: Session, data: WarehouseCreate) -> Warehouse:
    """Create a new warehouse entity."""
    warehouse = Warehouse(
        name=data.name.strip(),
        address=data.address.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        contact_info=data.contact_info.strip() if data.contact_info else None,
        is_active=data.is_active,
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


def update_warehouse(db: Session, warehouse: Warehouse, data: WarehouseUpdate) -> Warehouse:
    """Update an existing warehouse."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(warehouse, field, value)

    db.commit()
    db.refresh(warehouse)
    return warehouse


def delete_warehouse(db: Session, warehouse: Warehouse, hard_delete: bool = False) -> None:
    """Deactivate or remove a warehouse."""
    if hard_delete:
        db.delete(warehouse)
    else:
        warehouse.is_active = False
    db.commit()

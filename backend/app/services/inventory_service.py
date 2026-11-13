"""Warehouse inventory service managing stock levels."""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.inventory import WarehouseInventory
from app.models.warehouse import Warehouse
from app.models.supply import ReliefSupply
from app.schemas.inventory import InventoryCreate, InventoryUpdate, OverallStockSummary


def get_all_inventory(db: Session) -> List[WarehouseInventory]:
    """Retrieve all inventory records with joined warehouse and supply details."""
    return (
        db.query(WarehouseInventory)
        .options(
            joinedload(WarehouseInventory.warehouse),
            joinedload(WarehouseInventory.supply),
        )
        .order_by(WarehouseInventory.id.asc())
        .all()
    )


def get_inventory_by_id(db: Session, inventory_id: int) -> Optional[WarehouseInventory]:
    """Retrieve single inventory record by ID with joined details."""
    return (
        db.query(WarehouseInventory)
        .options(
            joinedload(WarehouseInventory.warehouse),
            joinedload(WarehouseInventory.supply),
        )
        .filter(WarehouseInventory.id == inventory_id)
        .first()
    )


def get_inventory_by_warehouse_and_supply(
    db: Session, warehouse_id: int, supply_id: int
) -> Optional[WarehouseInventory]:
    """Check if an inventory line already exists for a warehouse + supply."""
    return (
        db.query(WarehouseInventory)
        .filter(
            WarehouseInventory.warehouse_id == warehouse_id,
            WarehouseInventory.supply_id == supply_id,
        )
        .first()
    )


def get_inventory_for_warehouse(db: Session, warehouse_id: int) -> List[WarehouseInventory]:
    """Retrieve all inventory lines for a given warehouse."""
    return (
        db.query(WarehouseInventory)
        .options(joinedload(WarehouseInventory.supply))
        .filter(WarehouseInventory.warehouse_id == warehouse_id)
        .order_by(WarehouseInventory.id.asc())
        .all()
    )


def get_inventory_for_supply(db: Session, supply_id: int) -> List[WarehouseInventory]:
    """Retrieve all warehouse records holding a specific supply."""
    return (
        db.query(WarehouseInventory)
        .options(joinedload(WarehouseInventory.warehouse))
        .filter(WarehouseInventory.supply_id == supply_id)
        .order_by(WarehouseInventory.id.asc())
        .all()
    )


def create_or_increment_inventory(db: Session, data: InventoryCreate) -> WarehouseInventory:
    """Add new inventory or increment existing record if present."""
    if data.available_quantity < 0:
        raise ValueError("Available inventory quantity cannot be negative")

    existing = get_inventory_by_warehouse_and_supply(db, data.warehouse_id, data.supply_id)
    if existing:
        existing.available_quantity += data.available_quantity
        db.commit()
        db.refresh(existing)
        return existing

    record = WarehouseInventory(
        warehouse_id=data.warehouse_id,
        supply_id=data.supply_id,
        available_quantity=data.available_quantity,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_inventory_quantity(
    db: Session, inventory: WarehouseInventory, new_quantity: float
) -> WarehouseInventory:
    """Set absolute inventory quantity."""
    if new_quantity < 0:
        raise ValueError("Available inventory quantity cannot be negative")

    inventory.available_quantity = new_quantity
    db.commit()
    db.refresh(inventory)
    return inventory


def delete_inventory(db: Session, inventory: WarehouseInventory) -> None:
    """Delete an inventory entry."""
    db.delete(inventory)
    db.commit()


def get_overall_stock_summary(db: Session) -> List[OverallStockSummary]:
    """Aggregate total stock per supply type across all active warehouses."""
    results = (
        db.query(
            ReliefSupply.id.label("supply_id"),
            ReliefSupply.name.label("supply_name"),
            ReliefSupply.category.label("category"),
            ReliefSupply.unit.label("unit"),
            func.coalesce(func.sum(WarehouseInventory.available_quantity), 0.0).label("total_available"),
            func.count(WarehouseInventory.id).label("warehouse_count"),
        )
        .outerjoin(WarehouseInventory, ReliefSupply.id == WarehouseInventory.supply_id)
        .group_by(ReliefSupply.id, ReliefSupply.name, ReliefSupply.category, ReliefSupply.unit)
        .order_by(ReliefSupply.category.asc(), ReliefSupply.name.asc())
        .all()
    )

    return [
        OverallStockSummary(
            supply_id=r.supply_id,
            supply_name=r.supply_name,
            category=r.category,
            unit=r.unit,
            total_available=float(r.total_available),
            warehouse_count=r.warehouse_count,
        )
        for r in results
    ]

"""Relief supply service handling database operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.schemas.supply import ReliefSupplyCreate, ReliefSupplyUpdate


def get_supplies(db: Session) -> List[ReliefSupply]:
    """Retrieve all relief supplies sorted by category and name."""
    return db.query(ReliefSupply).order_by(ReliefSupply.category.asc(), ReliefSupply.name.asc()).all()


def get_supply_by_id(db: Session, supply_id: int) -> Optional[ReliefSupply]:
    """Retrieve a single relief supply by ID."""
    return db.query(ReliefSupply).filter(ReliefSupply.id == supply_id).first()


def get_supply_by_name(db: Session, name: str) -> Optional[ReliefSupply]:
    """Retrieve relief supply by name (case-insensitive)."""
    return db.query(ReliefSupply).filter(func.lower(ReliefSupply.name) == name.strip().lower()).first()


def create_supply(db: Session, data: ReliefSupplyCreate) -> ReliefSupply:
    """Create a new relief supply type."""
    supply = ReliefSupply(
        name=data.name.strip(),
        category=data.category.strip(),
        unit=data.unit.strip(),
        description=data.description.strip() if data.description else None,
    )
    db.add(supply)
    db.commit()
    db.refresh(supply)
    return supply


def update_supply(db: Session, supply: ReliefSupply, data: ReliefSupplyUpdate) -> ReliefSupply:
    """Update an existing relief supply."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(supply, field, value)

    db.commit()
    db.refresh(supply)
    return supply


def check_supply_references(db: Session, supply_id: int) -> tuple[int, int]:
    """Check how many inventory and demand records reference this supply."""
    inv_count = db.query(func.count(WarehouseInventory.id)).filter(WarehouseInventory.supply_id == supply_id).scalar() or 0
    dem_count = db.query(func.count(VillageDemand.id)).filter(VillageDemand.supply_id == supply_id).scalar() or 0
    return inv_count, dem_count


def delete_supply(db: Session, supply: ReliefSupply) -> None:
    """Safely delete a relief supply type."""
    db.delete(supply)
    db.commit()

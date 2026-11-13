"""Affected Village service handling database operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.village import AffectedVillage
from app.schemas.village import VillageCreate, VillageUpdate


def get_villages(db: Session, active_only: bool = False) -> List[AffectedVillage]:
    """Retrieve all affected villages, optionally filtering for active ones."""
    query = db.query(AffectedVillage)
    if active_only:
        query = query.filter(AffectedVillage.is_active == True)
    return query.order_by(AffectedVillage.district.asc(), AffectedVillage.name.asc()).all()


def get_village_by_id(db: Session, village_id: int) -> Optional[AffectedVillage]:
    """Retrieve a single affected village by ID."""
    return db.query(AffectedVillage).filter(AffectedVillage.id == village_id).first()


def get_village_by_name_and_district(db: Session, name: str, district: str) -> Optional[AffectedVillage]:
    """Retrieve village by name and district."""
    return (
        db.query(AffectedVillage)
        .filter(
            func.lower(AffectedVillage.name) == name.strip().lower(),
            func.lower(AffectedVillage.district) == district.strip().lower(),
        )
        .first()
    )


def create_village(db: Session, data: VillageCreate) -> AffectedVillage:
    """Register a new flood-affected village."""
    village = AffectedVillage(
        name=data.name.strip(),
        district=data.district.strip(),
        state=data.state.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        population=data.population,
        is_active=data.is_active,
    )
    db.add(village)
    db.commit()
    db.refresh(village)
    return village


def update_village(db: Session, village: AffectedVillage, data: VillageUpdate) -> AffectedVillage:
    """Update an affected village record."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(village, field, value)

    db.commit()
    db.refresh(village)
    return village


def delete_village(db: Session, village: AffectedVillage, hard_delete: bool = False) -> None:
    """Deactivate or remove a village record."""
    if hard_delete:
        db.delete(village)
    else:
        village.is_active = False
    db.commit()

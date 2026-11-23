"""Village demand service managing relief requirements."""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.demand import VillageDemand
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.schemas.demand import DemandCreate, DemandUpdate


def get_all_demands(
    db: Session,
    village_id: Optional[int] = None,
    urgency_level: Optional[str] = None,
) -> List[VillageDemand]:
    """Retrieve demands with optional village or urgency filtering."""
    query = (
        db.query(VillageDemand)
        .options(
            joinedload(VillageDemand.village),
            joinedload(VillageDemand.supply),
        )
    )

    if village_id is not None:
        query = query.filter(VillageDemand.village_id == village_id)

    if urgency_level:
        query = query.filter(VillageDemand.urgency_level == urgency_level.capitalize())

    return query.order_by(VillageDemand.id.asc()).all()


def get_demand_by_id(db: Session, demand_id: int) -> Optional[VillageDemand]:
    """Retrieve single demand record by ID."""
    return (
        db.query(VillageDemand)
        .options(
            joinedload(VillageDemand.village),
            joinedload(VillageDemand.supply),
        )
        .filter(VillageDemand.id == demand_id)
        .first()
    )


def get_demand_by_village_and_supply(
    db: Session, village_id: int, supply_id: int
) -> Optional[VillageDemand]:
    """Check for existing demand record for a village + supply combination."""
    return (
        db.query(VillageDemand)
        .filter(
            VillageDemand.village_id == village_id,
            VillageDemand.supply_id == supply_id,
        )
        .first()
    )


def create_demand(db: Session, data: DemandCreate) -> VillageDemand:
    """Record a new relief demand for a village."""
    if data.required_quantity <= 0:
        raise ValueError("Required demand quantity must be positive")

    existing = get_demand_by_village_and_supply(db, data.village_id, data.supply_id)
    if existing:
        raise ValueError(
            f"Demand for supply ID {data.supply_id} already exists for village ID {data.village_id}."
        )

    demand = VillageDemand(
        village_id=data.village_id,
        supply_id=data.supply_id,
        required_quantity=data.required_quantity,
        urgency_level=data.urgency_level.capitalize(),
        remarks=data.remarks.strip() if data.remarks else None,
    )
    db.add(demand)
    db.commit()
    db.refresh(demand)
    return demand


def update_demand(db: Session, demand: VillageDemand, data: DemandUpdate) -> VillageDemand:
    """Update existing demand record with validation for village, supply, and quantity."""
    new_village_id = data.village_id if data.village_id is not None else demand.village_id
    new_supply_id = data.supply_id if data.supply_id is not None else demand.supply_id

    # If village_id changed, verify target village exists
    if data.village_id is not None and data.village_id != demand.village_id:
        target_village = db.query(AffectedVillage).filter(AffectedVillage.id == data.village_id).first()
        if not target_village:
            raise ValueError(f"Affected village with ID {data.village_id} not found.")

    # If supply_id changed, verify target supply exists
    if data.supply_id is not None and data.supply_id != demand.supply_id:
        target_supply = db.query(ReliefSupply).filter(ReliefSupply.id == data.supply_id).first()
        if not target_supply:
            raise ValueError(f"Relief supply with ID {data.supply_id} not found.")

    # Check for duplicate demand for this village + supply combination (excluding current record)
    if (new_village_id != demand.village_id) or (new_supply_id != demand.supply_id):
        existing = (
            db.query(VillageDemand)
            .filter(
                VillageDemand.village_id == new_village_id,
                VillageDemand.supply_id == new_supply_id,
                VillageDemand.id != demand.id,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"Demand for this village and supply combination already exists."
            )

    if data.required_quantity is not None:
        if data.required_quantity <= 0:
            raise ValueError("Required demand quantity must be positive")
        demand.required_quantity = data.required_quantity

    if data.village_id is not None:
        demand.village_id = data.village_id

    if data.supply_id is not None:
        demand.supply_id = data.supply_id

    if data.urgency_level is not None:
        demand.urgency_level = data.urgency_level.capitalize()

    if data.remarks is not None:
        demand.remarks = data.remarks.strip() if data.remarks.strip() else None

    db.commit()
    db.refresh(demand)
    return get_demand_by_id(db, demand.id)


def delete_demand(db: Session, demand: VillageDemand) -> None:
    """Delete a demand record."""
    db.delete(demand)
    db.commit()

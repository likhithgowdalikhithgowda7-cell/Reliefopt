"""Village demand SQLAlchemy ORM model."""

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class VillageDemand(Base):
    """Specific supply demand requested for an affected village with an urgency level."""

    __tablename__ = "village_demands"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    village_id = Column(
        Integer,
        ForeignKey("affected_villages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supply_id = Column(
        Integer,
        ForeignKey("relief_supplies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    required_quantity = Column(Float, nullable=False)
    urgency_level = Column(String(20), nullable=False)
    remarks = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    village = relationship("AffectedVillage", back_populates="demands")
    supply = relationship("ReliefSupply", back_populates="demands")

    __table_args__ = (
        UniqueConstraint("village_id", "supply_id", name="uq_village_supply_demand"),
        CheckConstraint("required_quantity > 0", name="ck_demand_quantity_positive"),
        CheckConstraint(
            "urgency_level IN ('Low', 'Medium', 'High', 'Critical')",
            name="ck_demand_urgency_level",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<VillageDemand id={self.id} village_id={self.village_id} "
            f"supply_id={self.supply_id} qty={self.required_quantity} urgency='{self.urgency_level}'>"
        )

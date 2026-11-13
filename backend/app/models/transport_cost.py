"""Transportation Cost SQLAlchemy ORM model."""

from sqlalchemy import (
    Column,
    Integer,
    Float,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class TransportationCost(Base):
    """Estimated per-unit transportation cost from a warehouse to an affected village."""

    __tablename__ = "transportation_costs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    village_id = Column(
        Integer,
        ForeignKey("affected_villages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cost_per_unit = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=True)

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
    warehouse = relationship("Warehouse", back_populates="transport_costs")
    village = relationship("AffectedVillage", back_populates="transport_costs")

    __table_args__ = (
        UniqueConstraint("warehouse_id", "village_id", name="uq_warehouse_village_cost"),
        CheckConstraint("cost_per_unit >= 0", name="ck_transport_cost_non_negative"),
        CheckConstraint("distance_km IS NULL OR distance_km >= 0", name="ck_transport_distance_non_negative"),
    )

    def __repr__(self) -> str:
        return (
            f"<TransportationCost id={self.id} warehouse_id={self.warehouse_id} "
            f"village_id={self.village_id} cost_per_unit={self.cost_per_unit}>"
        )

"""Affected Village SQLAlchemy ORM model."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class AffectedVillage(Base):
    """Flood-affected village requiring emergency relief supplies."""

    __tablename__ = "affected_villages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    population = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

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

    # Relationships: cascade deletes associated demand records if a village is removed
    demands = relationship(
        "VillageDemand",
        back_populates="village",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    transport_costs = relationship(
        "TransportationCost",
        back_populates="village",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="ck_village_latitude"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="ck_village_longitude"),
        CheckConstraint("population > 0", name="ck_village_population_positive"),
    )

    def __repr__(self) -> str:
        return f"<AffectedVillage id={self.id} name='{self.name}' population={self.population}>"

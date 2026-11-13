"""Warehouse SQLAlchemy ORM model."""

from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.database.session import Base


class Warehouse(Base):
    """Warehouse entity for storing relief supplies."""

    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_info = Column(String(150), nullable=True)
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

    # Relationships
    inventories = relationship(
        "WarehouseInventory",
        back_populates="warehouse",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    transport_costs = relationship(
        "TransportationCost",
        back_populates="warehouse",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="ck_warehouse_latitude"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="ck_warehouse_longitude"),
    )

    def __repr__(self) -> str:
        return f"<Warehouse id={self.id} name='{self.name}' active={self.is_active}>"

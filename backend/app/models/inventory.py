"""Warehouse inventory SQLAlchemy ORM model."""

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


class WarehouseInventory(Base):
    """Inventory mapping between a warehouse and a relief supply."""

    __tablename__ = "warehouse_inventories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supply_id = Column(
        Integer,
        ForeignKey("relief_supplies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    available_quantity = Column(Float, nullable=False, default=0.0)

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    warehouse = relationship("Warehouse", back_populates="inventories")
    supply = relationship("ReliefSupply", back_populates="inventories")

    __table_args__ = (
        UniqueConstraint("warehouse_id", "supply_id", name="uq_warehouse_supply"),
        CheckConstraint("available_quantity >= 0", name="ck_inventory_quantity_non_negative"),
    )

    def __repr__(self) -> str:
        return (
            f"<WarehouseInventory id={self.id} warehouse_id={self.warehouse_id} "
            f"supply_id={self.supply_id} qty={self.available_quantity}>"
        )

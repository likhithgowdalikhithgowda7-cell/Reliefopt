"""Relief supply type SQLAlchemy ORM model."""

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.database.session import Base


class ReliefSupply(Base):
    """Relief supply type entity (Food, Water, Medical kits, etc.)."""

    __tablename__ = "relief_supplies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    unit = Column(String(30), nullable=False)
    description = Column(Text, nullable=True)

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

    # Relationships: restricted deletion if associated inventory or demand exists
    inventories = relationship(
        "WarehouseInventory",
        back_populates="supply",
        passive_deletes="all",
    )
    demands = relationship(
        "VillageDemand",
        back_populates="supply",
        passive_deletes="all",
    )

    def __repr__(self) -> str:
        return f"<ReliefSupply id={self.id} name='{self.name}' category='{self.category}'>"

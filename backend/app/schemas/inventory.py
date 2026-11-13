"""Pydantic schemas for Warehouse Inventory."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class InventoryBase(BaseModel):
    """Base inventory schema."""

    warehouse_id: int = Field(..., gt=0, description="Target warehouse ID")
    supply_id: int = Field(..., gt=0, description="Target relief supply ID")
    available_quantity: float = Field(..., ge=0.0, description="Available stock (cannot be negative)")


class InventoryCreate(InventoryBase):
    """Schema for adding new inventory."""
    pass


class InventoryUpdate(BaseModel):
    """Schema for updating inventory quantity."""

    available_quantity: float = Field(..., ge=0.0, description="Updated available stock")


class InventoryResponse(InventoryBase):
    """Detailed response schema for an inventory entry."""

    id: int
    updated_at: datetime

    # Denormalized fields for convenient display in tables
    warehouse_name: Optional[str] = None
    supply_name: Optional[str] = None
    supply_category: Optional[str] = None
    supply_unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OverallStockSummary(BaseModel):
    """Aggregated available stock per relief supply across all warehouses."""

    supply_id: int
    supply_name: str
    category: str
    unit: str
    total_available: float
    warehouse_count: int

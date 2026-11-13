"""Pydantic schemas for Warehouse validation and serialization."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class WarehouseBase(BaseModel):
    """Base warehouse schema with field validation."""

    name: str = Field(..., min_length=2, max_length=100, description="Warehouse name")
    address: str = Field(..., min_length=3, description="Street address or location description")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    contact_info: Optional[str] = Field(None, max_length=150, description="Contact person or telephone")
    is_active: bool = Field(True, description="Active status")

    @field_validator("name", "address")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or only whitespace")
        return cleaned


class WarehouseCreate(WarehouseBase):
    """Schema for registering a new warehouse."""
    pass


class WarehouseUpdate(BaseModel):
    """Schema for updating an existing warehouse."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = Field(None, min_length=3)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    contact_info: Optional[str] = Field(None, max_length=150)
    is_active: Optional[bool] = None

    @field_validator("name", "address")
    @classmethod
    def strip_whitespace(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            cleaned = value.strip()
            if not cleaned:
                raise ValueError("Field cannot be empty or only whitespace")
            return cleaned
        return value


class WarehouseResponse(WarehouseBase):
    """Response schema representing a stored warehouse."""

    id: int
    created_at: datetime
    updated_at: datetime
    total_inventory_items: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

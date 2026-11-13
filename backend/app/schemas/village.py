"""Pydantic schemas for Affected Village."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class VillageBase(BaseModel):
    """Base affected village schema."""

    name: str = Field(..., min_length=2, max_length=100, description="Village name")
    district: str = Field(..., min_length=2, max_length=100, description="District name")
    state: str = Field(..., min_length=2, max_length=100, description="State / Province")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    population: int = Field(..., gt=0, description="Affected population count (positive integer)")
    is_active: bool = Field(True, description="Active status")

    @field_validator("name", "district", "state")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or only whitespace")
        return cleaned


class VillageCreate(VillageBase):
    """Schema for registering a new affected village."""
    pass


class VillageUpdate(BaseModel):
    """Schema for updating an affected village."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    district: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    population: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

    @field_validator("name", "district", "state")
    @classmethod
    def strip_whitespace(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            cleaned = value.strip()
            if not cleaned:
                raise ValueError("Field cannot be empty or only whitespace")
            return cleaned
        return value


class VillageResponse(VillageBase):
    """Response schema for an affected village record."""

    id: int
    created_at: datetime
    updated_at: datetime
    total_demands_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

"""Pydantic schemas for Relief Supply validation and serialization."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_CATEGORIES = (
    "Food",
    "Drinking Water",
    "Medical Supplies",
    "Clothing",
    "Shelter Materials",
    "Sanitation & Hygiene",
    "Other",
)


class ReliefSupplyBase(BaseModel):
    """Base relief supply schema."""

    name: str = Field(..., min_length=2, max_length=100, description="Unique supply name")
    category: str = Field(..., description="Supply category (e.g., Food, Drinking Water, Medical Supplies)")
    unit: str = Field(..., min_length=1, max_length=30, description="Unit of measurement (Kits, Litres, Boxes, etc.)")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")

    @field_validator("name", "unit")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or only whitespace")
        return cleaned

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in ALLOWED_CATEGORIES:
            raise ValueError(
                f"Category '{cleaned}' is not permitted. Allowed: {', '.join(ALLOWED_CATEGORIES)}"
            )
        return cleaned


class ReliefSupplyCreate(ReliefSupplyBase):
    """Schema for adding a relief supply."""
    pass


class ReliefSupplyUpdate(BaseModel):
    """Schema for updating a relief supply."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("name", "unit")
    @classmethod
    def strip_whitespace(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            cleaned = value.strip()
            if not cleaned:
                raise ValueError("Field cannot be empty or only whitespace")
            return cleaned
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            cleaned = value.strip()
            if cleaned not in ALLOWED_CATEGORIES:
                raise ValueError(
                    f"Category '{cleaned}' is not permitted. Allowed: {', '.join(ALLOWED_CATEGORIES)}"
                )
            return cleaned
        return value


class ReliefSupplyResponse(ReliefSupplyBase):
    """Response schema for a relief supply record."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

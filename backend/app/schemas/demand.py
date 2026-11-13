"""Pydantic schemas for Village Demand."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_URGENCY_LEVELS = ("Low", "Medium", "High", "Critical")


class DemandBase(BaseModel):
    """Base village demand schema."""

    village_id: int = Field(..., gt=0, description="Affected village ID")
    supply_id: int = Field(..., gt=0, description="Relief supply ID")
    required_quantity: float = Field(..., gt=0.0, description="Required quantity (must be positive)")
    urgency_level: str = Field(..., description="Urgency: Low, Medium, High, or Critical")
    remarks: Optional[str] = Field(None, max_length=500, description="Field coordinator remarks")

    @field_validator("urgency_level")
    @classmethod
    def validate_urgency(cls, value: str) -> str:
        cleaned = value.strip().capitalize()
        if cleaned not in ALLOWED_URGENCY_LEVELS:
            raise ValueError(
                f"Urgency '{value}' is invalid. Allowed: {', '.join(ALLOWED_URGENCY_LEVELS)}"
            )
        return cleaned


class DemandCreate(DemandBase):
    """Schema for recording new village demand."""
    pass


class DemandUpdate(BaseModel):
    """Schema for updating existing village demand."""

    required_quantity: Optional[float] = Field(None, gt=0.0)
    urgency_level: Optional[str] = None
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("urgency_level")
    @classmethod
    def validate_urgency(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            cleaned = value.strip().capitalize()
            if cleaned not in ALLOWED_URGENCY_LEVELS:
                raise ValueError(
                    f"Urgency '{value}' is invalid. Allowed: {', '.join(ALLOWED_URGENCY_LEVELS)}"
                )
            return cleaned
        return value


class DemandResponse(DemandBase):
    """Detailed response schema for a village demand entry."""

    id: int
    created_at: datetime
    updated_at: datetime

    # Denormalized fields for convenient table rendering
    village_name: Optional[str] = None
    village_district: Optional[str] = None
    supply_name: Optional[str] = None
    supply_unit: Optional[str] = None
    supply_category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

"""Pydantic schemas for Transportation Cost validation and serialization."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class TransportationCostBase(BaseModel):
    """Base transportation cost schema."""

    warehouse_id: int = Field(..., gt=0, description="Source warehouse ID")
    village_id: int = Field(..., gt=0, description="Destination village ID")
    cost_per_unit: float = Field(..., ge=0.0, description="Estimated transportation cost per unit (>= 0)")
    distance_km: Optional[float] = Field(None, ge=0.0, description="Optional road distance estimate in km")


class TransportationCostCreate(TransportationCostBase):
    """Schema for creating a transportation cost entry."""
    pass


class TransportationCostUpdate(BaseModel):
    """Schema for updating a transportation cost entry."""

    cost_per_unit: Optional[float] = Field(None, ge=0.0)
    distance_km: Optional[float] = Field(None, ge=0.0)


class TransportationCostResponse(TransportationCostBase):
    """Response schema for a single transportation cost entry."""

    id: int
    created_at: datetime
    updated_at: datetime

    warehouse_name: Optional[str] = None
    village_name: Optional[str] = None
    village_district: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CostMatrixCell(BaseModel):
    """Single cell in the warehouse x village cost matrix."""

    warehouse_id: int
    warehouse_name: str
    village_id: int
    village_name: str
    village_district: str
    cost_per_unit: Optional[float] = None
    distance_km: Optional[float] = None
    has_cost: bool = False


class CostMatrixResponse(BaseModel):
    """Full cost matrix representation with coverage diagnostics."""

    warehouses: List[dict]
    villages: List[dict]
    cells: List[CostMatrixCell]
    total_pairs: int
    configured_pairs: int
    missing_pairs: int
    is_complete: bool


class BatchCostItem(BaseModel):
    """Item for batch cost updates."""

    warehouse_id: int = Field(..., gt=0)
    village_id: int = Field(..., gt=0)
    cost_per_unit: float = Field(..., ge=0.0)
    distance_km: Optional[float] = Field(None, ge=0.0)


class BatchCostRequest(BaseModel):
    """Request payload for batch updating transportation costs."""

    costs: List[BatchCostItem]

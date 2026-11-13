"""API router for Leaflet maps and Plotly analytics."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & Maps"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    plan_id: Optional[int] = Query(None, description="Optional optimization run ID to filter allocations"),
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    village_id: Optional[int] = Query(None, description="Filter by village ID"),
    supply_id: Optional[int] = Query(None, description="Filter by supply ID"),
    urgency: Optional[str] = Query(None, description="Filter by urgency tier"),
    db: Session = Depends(get_db),
):
    """Retrieve consolidated analytics, geographical map data, and Plotly chart series."""
    return analytics_service.get_analytics_overview(
        db,
        plan_id=plan_id,
        warehouse_id=warehouse_id,
        village_id=village_id,
        supply_id=supply_id,
        urgency=urgency,
    )

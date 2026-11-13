"""Dashboard summary API endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.dashboard import DashboardSummary
import app.services.dashboard_service as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Get real-time database dashboard summary",
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    """Calculate and return real database-derived summary metrics.

    All counts, stock totals, demand quantities, and urgency numbers are computed
    directly from live PostgreSQL tables with zero hardcoded or fabricated values.
    """
    return dashboard_service.get_dashboard_summary(db)

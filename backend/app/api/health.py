"""Health check endpoint for ReliefOpt backend."""

from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter
from app.core.config import settings
from app.database.session import check_db_connection

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint.

    Returns the application status, name, version, stage, server timestamp,
    and PostgreSQL database connectivity status.
    """
    db_connected = check_db_connection()

    return {
        "status": "healthy" if db_connected else "degraded",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "stage": settings.STAGE,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_connected else "unavailable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

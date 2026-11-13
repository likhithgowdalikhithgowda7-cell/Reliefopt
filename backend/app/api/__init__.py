"""API routers package initialization."""

from app.api.health import router as health_router
from app.api.warehouses import router as warehouses_router
from app.api.supplies import router as supplies_router
from app.api.inventory import router as inventory_router
from app.api.villages import router as villages_router
from app.api.demands import router as demands_router
from app.api.dashboard import router as dashboard_router
from app.api.transport_costs import router as transport_costs_router
from app.api.optimization import router as optimization_router
from app.api.analytics import router as analytics_router

__all__ = [
    "health_router",
    "warehouses_router",
    "supplies_router",
    "inventory_router",
    "villages_router",
    "demands_router",
    "dashboard_router",
    "transport_costs_router",
    "optimization_router",
    "analytics_router",
]



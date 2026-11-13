"""FastAPI application entry point for ReliefOpt."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    # Startup: logging initialization
    print(f"[STARTUP] Starting {settings.PROJECT_NAME} (v{settings.VERSION})...")
    print(f"[STARTUP] CORS allowed origins: {settings.cors_origins}")
    yield
    # Shutdown
    print(f"[SHUTDOWN] Shutting down {settings.PROJECT_NAME}...")


def create_application() -> FastAPI:
    """Factory function to build and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS for local development
    # Allows React Vite frontend (running on http://localhost:5173 or http://127.0.0.1:5173)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Register routers
    # Root-level health check: GET /health
    app.include_router(health_router)
    # API-prefixed routers
    app.include_router(health_router, prefix="/api")
    app.include_router(warehouses_router, prefix="/api")
    app.include_router(supplies_router, prefix="/api")
    app.include_router(inventory_router, prefix="/api")
    app.include_router(villages_router, prefix="/api")
    app.include_router(demands_router, prefix="/api")
    app.include_router(dashboard_router, prefix="/api")
    app.include_router(transport_costs_router, prefix="/api")
    app.include_router(optimization_router, prefix="/api")
    app.include_router(analytics_router, prefix="/api")

    # Root welcome route
    @app.get("/", tags=["Root"])
    async def root():
        """Root endpoint with basic project information."""
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "stage": settings.STAGE,
            "documentation": "/docs",
            "health_check": "/health",
            "message": "ReliefOpt API is operational. Visit /health to verify status.",
        }

    # Global Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Standardized JSON error handler for uncaught server errors."""
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "path": request.url.path,
            },
        )

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )

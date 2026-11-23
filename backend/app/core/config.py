"""Application configuration settings for ReliefOpt backend."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for ReliefOpt FastAPI application."""

    PROJECT_NAME: str = "ReliefOpt API"
    PROJECT_DESCRIPTION: str = (
        "Backend API for ReliefOpt - Smart Emergency Relief Supply Distribution System"
    )
    VERSION: str = "1.0.0"
    STAGE: str = "Operational (v1.0.0)"
    ENVIRONMENT: str = "development"

    # Database configuration (PostgreSQL via psycopg v3)
    DATABASE_URL: str = (
        "postgresql+psycopg://localhost:5432/reliefopt_db"
    )
    TEST_DATABASE_URL: str = (
        "postgresql+psycopg://localhost:5432/reliefopt_test_db"
    )

    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Cross-Origin Resource Sharing (CORS)
    # Allows React Vite development server (default port 5173) to communicate with FastAPI
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Return allowed origins as a parsed list of clean URLs."""
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Singleton settings instance
settings = Settings()

"""Tests for the health check endpoint."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_status_code():
    """Verify GET /health returns 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_check_response_body():
    """Verify GET /health returns expected fields and values including database status."""
    response = client.get("/health")
    data = response.json()

    assert data["status"] == "healthy"
    assert "app_name" in data
    assert "version" in data
    assert "stage" in data
    assert "database" in data
    assert data["database"] == "connected"
    assert "timestamp" in data
    assert data["app_name"] == "ReliefOpt API"


def test_api_prefixed_health_check():
    """Verify GET /api/health also returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root_endpoint():
    """Verify GET / returns project welcome payload."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "health_check" in data

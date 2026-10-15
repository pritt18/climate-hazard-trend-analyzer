import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "mongodb_connected" in data


def test_presets_endpoint():
    """Verify presets list includes major cities."""
    response = client.get("/api/presets")
    assert response.status_code == 200
    data = response.json()
    assert "presets" in data
    assert len(data["presets"]) >= 5


def test_invalid_request_validation():
    """Test latitude and year range validation error handling."""
    # Latitude out of bounds
    res_bad_lat = client.post("/api/analyze", json={
        "latitude": 120.0,
        "longitude": 0.0,
        "hazard_type": "heatwave",
        "start_year": 1990,
        "end_year": 2020
    })
    assert res_bad_lat.status_code == 422

    # End year before start year
    res_bad_year = client.post("/api/analyze", json={
        "latitude": 33.45,
        "longitude": -112.07,
        "hazard_type": "heatwave",
        "start_year": 2020,
        "end_year": 1990
    })
    assert res_bad_year.status_code == 422

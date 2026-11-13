"""Automated tests for Affected Villages APIs."""


def test_create_village(client):
    """Test registering an affected village."""
    payload = {
        "name": "Rampur Flood Zone",
        "district": "Cachar",
        "state": "Assam",
        "latitude": 24.8333,
        "longitude": 92.7789,
        "population": 1250,
        "is_active": True,
    }
    response = client.post("/api/villages", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Rampur Flood Zone"
    assert data["population"] == 1250
    assert data["district"] == "Cachar"


def test_invalid_population_rejected(client):
    """Test that non-positive population count is rejected."""
    payload = {
        "name": "Zero Pop Village",
        "district": "Test District",
        "state": "Test State",
        "latitude": 20.0,
        "longitude": 80.0,
        "population": 0,  # Invalid: must be > 0
    }
    response = client.post("/api/villages", json=payload)
    assert response.status_code == 422


def test_duplicate_village_in_same_district_fails(client):
    """Test registering duplicate village name in same district returns 409."""
    payload = {
        "name": "Green Valley",
        "district": "Kamrup",
        "state": "Assam",
        "latitude": 26.1,
        "longitude": 91.7,
        "population": 400,
    }
    res1 = client.post("/api/villages", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/villages", json=payload)
    assert res2.status_code == 409


def test_deactivate_village(client):
    """Test deactivating a village."""
    payload = {
        "name": "Temporary Shelter Camp",
        "district": "Morigaon",
        "state": "Assam",
        "latitude": 26.2,
        "longitude": 92.3,
        "population": 250,
    }
    v_id = client.post("/api/villages", json=payload).json()["id"]

    del_res = client.delete(f"/api/villages/{v_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/api/villages/{v_id}")
    assert get_res.status_code == 200
    assert get_res.json()["is_active"] is False

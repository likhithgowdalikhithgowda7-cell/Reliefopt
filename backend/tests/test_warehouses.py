"""Automated tests for Warehouse APIs."""


def test_create_warehouse(client):
    """Test successful creation of a warehouse."""
    payload = {
        "name": "Central Hub Warehouse",
        "address": "123 Relief Road, Sector 4",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "contact_info": "+91 98765 43210",
        "is_active": True,
    }
    response = client.post("/api/warehouses", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Central Hub Warehouse"
    assert data["latitude"] == 12.9716
    assert data["longitude"] == 77.5946
    assert "id" in data


def test_create_duplicate_warehouse_name_fails(client):
    """Test that creating a warehouse with existing name returns 409 Conflict."""
    payload = {
        "name": "North Supply Depot",
        "address": "Depot Road",
        "latitude": 13.0,
        "longitude": 77.0,
    }
    res1 = client.post("/api/warehouses", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/warehouses", json=payload)
    assert res2.status_code == 409


def test_create_warehouse_invalid_coordinates(client):
    """Test that invalid latitude or longitude returns 422 Unprocessable Entity."""
    payload = {
        "name": "Invalid Warehouse",
        "address": "Bad Coordinates",
        "latitude": 95.0,  # Invalid: > 90
        "longitude": 77.0,
    }
    response = client.post("/api/warehouses", json=payload)
    assert response.status_code == 422


def test_list_and_update_warehouse(client):
    """Test listing warehouses and updating details."""
    payload = {
        "name": "South Storage Hub",
        "address": "South Zone",
        "latitude": 11.5,
        "longitude": 76.5,
    }
    create_res = client.post("/api/warehouses", json=payload)
    wh_id = create_res.json()["id"]

    # List
    list_res = client.get("/api/warehouses")
    assert list_res.status_code == 200
    assert any(w["id"] == wh_id for w in list_res.json())

    # Update
    update_res = client.put(f"/api/warehouses/{wh_id}", json={"name": "South Primary Storage"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "South Primary Storage"


def test_deactivate_warehouse(client):
    """Test soft-deleting / deactivating a warehouse."""
    payload = {
        "name": "Temporary Depot",
        "address": "Temp Area",
        "latitude": 12.0,
        "longitude": 77.0,
    }
    wh_id = client.post("/api/warehouses", json=payload).json()["id"]

    del_res = client.delete(f"/api/warehouses/{wh_id}")
    assert del_res.status_code == 204

    # Verify deactivated
    get_res = client.get(f"/api/warehouses/{wh_id}")
    assert get_res.status_code == 200
    assert get_res.json()["is_active"] is False

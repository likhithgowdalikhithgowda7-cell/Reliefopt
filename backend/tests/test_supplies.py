"""Automated tests for Relief Supplies APIs."""


def test_create_supply(client):
    """Test creating a valid relief supply."""
    payload = {
        "name": "Emergency Food Kits",
        "category": "Food",
        "unit": "Kits",
        "description": "Standard 7-day non-perishable ration packet",
    }
    response = client.post("/api/supplies", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Emergency Food Kits"
    assert data["category"] == "Food"
    assert data["unit"] == "Kits"
    assert "id" in data


def test_create_supply_invalid_category(client):
    """Test that unauthorized category returns 422."""
    payload = {
        "name": "Luxury Items",
        "category": "UnapprovedCategory",
        "unit": "Boxes",
    }
    response = client.post("/api/supplies", json=payload)
    assert response.status_code == 422


def test_duplicate_supply_name_fails(client):
    """Test duplicate supply name returns 409 Conflict."""
    payload = {
        "name": "Water Purification Tablets",
        "category": "Drinking Water",
        "unit": "Packs",
    }
    res1 = client.post("/api/supplies", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/supplies", json=payload)
    assert res2.status_code == 409


def test_delete_supply_safe(client):
    """Test safely deleting an unreferenced supply type."""
    payload = {
        "name": "Woolen Blankets",
        "category": "Shelter Materials",
        "unit": "Pieces",
    }
    supply_id = client.post("/api/supplies", json=payload).json()["id"]

    del_res = client.delete(f"/api/supplies/{supply_id}")
    assert del_res.status_code == 204

    # Confirm it is gone
    get_res = client.get(f"/api/supplies/{supply_id}")
    assert get_res.status_code == 404

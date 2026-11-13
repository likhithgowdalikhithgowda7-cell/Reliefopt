"""Automated tests for Warehouse Inventory APIs."""


def test_add_inventory_and_increment(client):
    """Test adding inventory and incrementing stock."""
    # Create warehouse
    wh = client.post("/api/warehouses", json={
        "name": "Inventory Test Hub",
        "address": "Hub Address",
        "latitude": 15.0,
        "longitude": 75.0,
    }).json()

    # Create supply
    sp = client.post("/api/supplies", json={
        "name": "Infant Formula",
        "category": "Food",
        "unit": "Tins",
    }).json()

    # Add initial stock: 50
    inv_res = client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": 50.0,
    })
    assert inv_res.status_code == 201
    assert inv_res.json()["available_quantity"] == 50.0
    assert inv_res.json()["warehouse_name"] == "Inventory Test Hub"
    assert inv_res.json()["supply_name"] == "Infant Formula"

    # Add again (should increment by 25 -> 75)
    inc_res = client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": 25.0,
    })
    assert inc_res.status_code == 201
    assert inc_res.json()["available_quantity"] == 75.0


def test_negative_quantity_rejected(client):
    """Test that negative available quantity is rejected."""
    wh = client.post("/api/warehouses", json={
        "name": "Negative Test Hub",
        "address": "Addr",
        "latitude": 10.0,
        "longitude": 70.0,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "ORS Sachets",
        "category": "Medical Supplies",
        "unit": "Packets",
    }).json()

    res = client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": -10.0,
    })
    assert res.status_code == 422 or res.status_code == 400


def test_update_inventory_quantity(client):
    """Test setting an exact inventory quantity."""
    wh = client.post("/api/warehouses", json={
        "name": "Update Hub",
        "address": "Addr",
        "latitude": 12.0,
        "longitude": 76.0,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "Bandages",
        "category": "Medical Supplies",
        "unit": "Rolls",
    }).json()

    inv = client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": 100.0,
    }).json()

    update_res = client.put(f"/api/inventory/{inv['id']}", json={"available_quantity": 120.0})
    assert update_res.status_code == 200
    assert update_res.json()["available_quantity"] == 120.0


def test_delete_supply_blocked_when_inventory_exists(client):
    """Test that deleting a supply with active inventory returns 409 Conflict."""
    wh = client.post("/api/warehouses", json={
        "name": "Cascade Check Hub",
        "address": "Addr",
        "latitude": 14.0,
        "longitude": 74.0,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "Antiseptic Liquid",
        "category": "Medical Supplies",
        "unit": "Bottles",
    }).json()

    client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": 30.0,
    })

    # Try to delete supply
    del_res = client.delete(f"/api/supplies/{sp['id']}")
    assert del_res.status_code == 409
    assert "currently referenced" in del_res.json()["detail"]

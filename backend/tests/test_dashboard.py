"""Automated tests for Dashboard Summary API."""


def test_dashboard_summary_real_database_metrics(client):
    """Test dashboard metrics dynamically reflect actual database state."""
    # Step 1: Query initial summary
    initial_res = client.get("/api/dashboard/summary")
    assert initial_res.status_code == 200
    initial = initial_res.json()
    assert initial["is_empty"] is True
    assert initial["total_warehouses"] == 0
    assert initial["total_active_villages"] == 0
    assert initial["total_available_inventory"] == 0.0

    # Step 2: Create a warehouse
    wh = client.post("/api/warehouses", json={
        "name": "Metrics Warehouse",
        "address": "Metrics Road",
        "latitude": 13.0,
        "longitude": 77.0,
    }).json()

    # Step 3: Create a supply
    sp = client.post("/api/supplies", json={
        "name": "Energy Bars",
        "category": "Food",
        "unit": "Boxes",
    }).json()

    # Step 4: Add 100 inventory
    client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sp["id"],
        "available_quantity": 100.0,
    })

    # Step 5: Register a village
    v = client.post("/api/villages", json={
        "name": "Metrics Village",
        "district": "Metrics District",
        "state": "Assam",
        "latitude": 25.0,
        "longitude": 90.0,
        "population": 500,
    }).json()

    # Step 6: Record Critical demand for 80
    client.post("/api/demands", json={
        "village_id": v["id"],
        "supply_id": sp["id"],
        "required_quantity": 80.0,
        "urgency_level": "Critical",
    })

    # Step 7: Check summary
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["is_empty"] is False
    assert data["total_warehouses"] == 1
    assert data["total_active_villages"] == 1
    assert data["total_supply_types"] == 1
    assert data["total_available_inventory"] == 100.0
    assert data["total_recorded_demand"] == 80.0
    assert data["critical_urgency_demands"] == 1
    assert data["demand_by_urgency"]["Critical"] == 1

"""Automated tests for Village Demands APIs."""


def test_create_demand(client):
    """Test recording demand with urgency levels."""
    v = client.post("/api/villages", json={
        "name": "Demand Test Village",
        "district": "Barpeta",
        "state": "Assam",
        "latitude": 26.3,
        "longitude": 91.0,
        "population": 800,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "Chlorine Tablets",
        "category": "Drinking Water",
        "unit": "Bottles",
    }).json()

    res = client.post("/api/demands", json={
        "village_id": v["id"],
        "supply_id": sp["id"],
        "required_quantity": 150.0,
        "urgency_level": "Critical",
        "remarks": "Submerged water pump, immediate need",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["required_quantity"] == 150.0
    assert data["urgency_level"] == "Critical"
    assert data["village_name"] == "Demand Test Village"
    assert data["supply_name"] == "Chlorine Tablets"


def test_duplicate_active_demand_rejected(client):
    """Test that duplicate active demand for same village+supply returns 409."""
    v = client.post("/api/villages", json={
        "name": "Unique Demand Village",
        "district": "Darrang",
        "state": "Assam",
        "latitude": 26.4,
        "longitude": 92.0,
        "population": 600,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "Tarp Sheets",
        "category": "Shelter Materials",
        "unit": "Sheets",
    }).json()

    payload = {
        "village_id": v["id"],
        "supply_id": sp["id"],
        "required_quantity": 50.0,
        "urgency_level": "High",
    }
    res1 = client.post("/api/demands", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/demands", json=payload)
    assert res2.status_code == 409


def test_invalid_urgency_rejected(client):
    """Test that unauthorized urgency level returns 422."""
    v = client.post("/api/villages", json={
        "name": "Urgency Test Village",
        "district": "Goalpara",
        "state": "Assam",
        "latitude": 26.1,
        "longitude": 90.6,
        "population": 300,
    }).json()

    sp = client.post("/api/supplies", json={
        "name": "First Aid Kit",
        "category": "Medical Supplies",
        "unit": "Boxes",
    }).json()

    res = client.post("/api/demands", json={
        "village_id": v["id"],
        "supply_id": sp["id"],
        "required_quantity": 20.0,
        "urgency_level": "Extreme",  # Invalid
    })
    assert res.status_code == 422


def test_filter_demands_by_urgency(client):
    """Test querying demands filtered by urgency level."""
    v = client.post("/api/villages", json={
        "name": "Filter Test Village",
        "district": "Nalbari",
        "state": "Assam",
        "latitude": 26.4,
        "longitude": 91.4,
        "population": 450,
    }).json()

    sp1 = client.post("/api/supplies", json={
        "name": "Biscuits",
        "category": "Food",
        "unit": "Cartons",
    }).json()

    sp2 = client.post("/api/supplies", json={
        "name": "Antibiotics",
        "category": "Medical Supplies",
        "unit": "Strips",
    }).json()

    client.post("/api/demands", json={
        "village_id": v["id"],
        "supply_id": sp1["id"],
        "required_quantity": 30.0,
        "urgency_level": "Low",
    })
    client.post("/api/demands", json={
        "village_id": v["id"],
        "supply_id": sp2["id"],
        "required_quantity": 10.0,
        "urgency_level": "Critical",
    })

    crit_res = client.get("/api/demands?urgency=Critical")
    assert crit_res.status_code == 200
    crit_demands = crit_res.json()
    assert all(d["urgency_level"] == "Critical" for d in crit_demands)
    assert any(d["supply_id"] == sp2["id"] for d in crit_demands)

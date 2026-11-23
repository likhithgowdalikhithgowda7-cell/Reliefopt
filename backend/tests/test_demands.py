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


def test_edit_demand_record_success(client):
    """Test updating all fields of an existing demand record."""
    v1 = client.post("/api/villages", json={
        "name": "Edit Test Village 1",
        "district": "Kamrup",
        "state": "Assam",
        "latitude": 26.1,
        "longitude": 91.7,
        "population": 500,
    }).json()

    v2 = client.post("/api/villages", json={
        "name": "Edit Test Village 2",
        "district": "Kamrup",
        "state": "Assam",
        "latitude": 26.2,
        "longitude": 91.8,
        "population": 750,
    }).json()

    s1 = client.post("/api/supplies", json={
        "name": "Blankets",
        "category": "Shelter Materials",
        "unit": "Packs",
    }).json()

    s2 = client.post("/api/supplies", json={
        "name": "Energy Bars",
        "category": "Food",
        "unit": "Boxes",
    }).json()

    # 1. Create initial demand (V1, S1)
    res_create = client.post("/api/demands", json={
        "village_id": v1["id"],
        "supply_id": s1["id"],
        "required_quantity": 80.0,
        "urgency_level": "Low",
        "remarks": "Initial assessment",
    })
    assert res_create.status_code == 201
    demand = res_create.json()
    demand_id = demand["id"]

    # 2. Update quantity, urgency, remarks, village, and supply
    update_payload = {
        "village_id": v2["id"],
        "supply_id": s2["id"],
        "required_quantity": 250.0,
        "urgency_level": "Critical",
        "remarks": "Urgent reassessment: road cut off",
    }
    res_update = client.put(f"/api/demands/{demand_id}", json=update_payload)
    assert res_update.status_code == 200
    updated = res_update.json()

    assert updated["id"] == demand_id
    assert updated["village_id"] == v2["id"]
    assert updated["supply_id"] == s2["id"]
    assert updated["required_quantity"] == 250.0
    assert updated["urgency_level"] == "Critical"
    assert updated["remarks"] == "Urgent reassessment: road cut off"
    assert updated["village_name"] == "Edit Test Village 2"
    assert updated["supply_name"] == "Energy Bars"

    # 3. Verify persistent DB fetch
    res_get = client.get(f"/api/demands/{demand_id}")
    assert res_get.status_code == 200
    fetched = res_get.json()
    assert fetched["required_quantity"] == 250.0
    assert fetched["urgency_level"] == "Critical"
    assert fetched["village_id"] == v2["id"]
    assert fetched["supply_id"] == s2["id"]


def test_edit_demand_validations(client):
    """Test validation errors when updating demand records."""
    v1 = client.post("/api/villages", json={
        "name": "Validation Village 1",
        "district": "Sonitpur",
        "state": "Assam",
        "latitude": 26.6,
        "longitude": 92.8,
        "population": 400,
    }).json()

    v2 = client.post("/api/villages", json={
        "name": "Validation Village 2",
        "district": "Sonitpur",
        "state": "Assam",
        "latitude": 26.7,
        "longitude": 92.9,
        "population": 400,
    }).json()

    s1 = client.post("/api/supplies", json={
        "name": "Water Cans",
        "category": "Drinking Water",
        "unit": "Cans",
    }).json()

    # Create demand 1 for V1 + S1
    d1 = client.post("/api/demands", json={
        "village_id": v1["id"],
        "supply_id": s1["id"],
        "required_quantity": 100.0,
        "urgency_level": "Medium",
    }).json()

    # Create demand 2 for V2 + S1
    d2 = client.post("/api/demands", json={
        "village_id": v2["id"],
        "supply_id": s1["id"],
        "required_quantity": 50.0,
        "urgency_level": "High",
    }).json()

    # 1. Negative or zero required quantity must return 422
    res_zero = client.put(f"/api/demands/{d1['id']}", json={"required_quantity": 0.0})
    assert res_zero.status_code == 422

    res_neg = client.put(f"/api/demands/{d1['id']}", json={"required_quantity": -20.0})
    assert res_neg.status_code == 422

    # 2. Updating d1's village to V2 (which already has S1 demand) should return 409 conflict
    res_dup = client.put(f"/api/demands/{d1['id']}", json={"village_id": v2["id"]})
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.json()["detail"].lower()

    # 3. Non-existent village returns 409
    res_no_vil = client.put(f"/api/demands/{d1['id']}", json={"village_id": 99999})
    assert res_no_vil.status_code == 409

    # 4. Non-existent supply returns 409
    res_no_sup = client.put(f"/api/demands/{d1['id']}", json={"supply_id": 99999})
    assert res_no_sup.status_code == 409

    # 5. Non-existent demand returns 404
    res_no_dem = client.put("/api/demands/99999", json={"required_quantity": 50.0})
    assert res_no_dem.status_code == 404


def test_create_edit_delete_lifecycle_and_optimization_reflection(client):
    """Test full create -> edit -> solve -> delete lifecycle and optimization reflection."""
    # 1. Setup warehouse, village, supply, inventory, transport cost
    wh = client.post("/api/warehouses", json={
        "name": "Lifecycle Depot",
        "address": "Guwahati Hub",
        "latitude": 26.18,
        "longitude": 91.74,
    }).json()

    vil = client.post("/api/villages", json={
        "name": "Lifecycle Village",
        "district": "Morigaon",
        "state": "Assam",
        "latitude": 26.25,
        "longitude": 92.34,
        "population": 900,
    }).json()

    sup = client.post("/api/supplies", json={
        "name": "Lifecycle Meals",
        "category": "Food",
        "unit": "Kits",
    }).json()

    # Available stock: 500 units
    client.post("/api/inventory", json={
        "warehouse_id": wh["id"],
        "supply_id": sup["id"],
        "available_quantity": 500.0,
    })

    # Transport cost: ₹15/unit
    client.post("/api/transportation-costs", json={
        "warehouse_id": wh["id"],
        "village_id": vil["id"],
        "cost_per_unit": 15.0,
    })

    # 2. CREATE initial demand: 100 units
    dem = client.post("/api/demands", json={
        "village_id": vil["id"],
        "supply_id": sup["id"],
        "required_quantity": 100.0,
        "urgency_level": "Medium",
    }).json()

    # Solve optimization: allocated should be 100
    solve1 = client.post("/api/optimization/solve").json()
    assert solve1["status"] in ("OPTIMAL", "FEASIBLE")
    assert solve1["total_allocated"] == 100.0

    # 3. EDIT demand: change required_quantity to 300, urgency to Critical
    res_edit = client.put(f"/api/demands/{dem['id']}", json={
        "required_quantity": 300.0,
        "urgency_level": "Critical",
        "remarks": "Surge demand following inundation",
    })
    assert res_edit.status_code == 200

    # Solve optimization again: allocation must reflect the updated 300 units!
    solve2 = client.post("/api/optimization/solve").json()
    assert solve2["status"] in ("OPTIMAL", "FEASIBLE")
    assert solve2["total_allocated"] == 300.0
    assert solve2["critical_fulfilment_pct"] == 100.0

    # 4. DELETE demand record
    del_res = client.delete(f"/api/demands/{dem['id']}")
    assert del_res.status_code == 204

    # Verify demand is gone
    get_res = client.get(f"/api/demands/{dem['id']}")
    assert get_res.status_code == 404

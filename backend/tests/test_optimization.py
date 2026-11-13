"""Automated tests for Google OR-Tools optimization engine and transportation costs."""

import pytest
from app.models.warehouse import Warehouse
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.village import AffectedVillage
from app.models.demand import VillageDemand
from app.models.transport_cost import TransportationCost
from app.models.optimization import OptimizationRun, OptimizationAllocation


def _seed_basic_entities(db_session):
    """Seed helper creating base warehouses, villages and supplies."""
    wh_a = Warehouse(
        name="Warehouse Alpha",
        address="Kamrup District, Assam",
        latitude=26.14,
        longitude=91.73,
        contact_info="+91-9876500001",
        is_active=True,
    )
    wh_b = Warehouse(
        name="Warehouse Beta",
        address="Nagaon District, Assam",
        latitude=26.34,
        longitude=92.68,
        contact_info="+91-9876500002",
        is_active=True,
    )
    db_session.add_all([wh_a, wh_b])
    db_session.flush()

    sup_food = ReliefSupply(name="Test Food Kits", category="Food", unit="Kits")
    sup_water = ReliefSupply(name="Test Water Pouches", category="Drinking Water", unit="Liters")
    sup_med = ReliefSupply(name="Test Medical Kits", category="Medical Supplies", unit="Kits")
    db_session.add_all([sup_food, sup_water, sup_med])
    db_session.flush()

    vil_a = AffectedVillage(
        name="Village Sonapur",
        district="Kamrup",
        state="Assam",
        latitude=26.11,
        longitude=91.97,
        population=450,
        is_active=True,
    )
    vil_b = AffectedVillage(
        name="Village Morigaon",
        district="Morigaon",
        state="Assam",
        latitude=26.25,
        longitude=92.34,
        population=600,
        is_active=True,
    )
    db_session.add_all([vil_a, vil_b])
    db_session.flush()

    return wh_a, wh_b, sup_food, sup_water, sup_med, vil_a, vil_b


# =====================================================================
# Test 1 — Sufficient Inventory
# =====================================================================
def test_sufficient_inventory(client, db_session):
    """Test 1: When stock is sufficient, demand is 100% fulfilled with 0 unmet and correct remaining stock."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    # Warehouse A: 100 Food Kits
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    # Village A: 60 Food Kits, Critical
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=60.0, urgency_level="Critical"))
    # Transportation Cost
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=12.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    assert data["status"] in ("OPTIMAL", "FEASIBLE")
    assert data["total_requested"] == 60.0
    assert data["total_allocated"] == 60.0
    assert data["total_unmet"] == 0.0
    assert data["overall_fulfilment_pct"] == 100.0
    assert data["critical_fulfilment_pct"] == 100.0

    # Remaining stock check
    stock_usage = data["stock_usage"]
    assert len(stock_usage) == 1
    assert stock_usage[0]["initial_available"] == 100.0
    assert stock_usage[0]["allocated_quantity"] == 60.0
    assert stock_usage[0]["remaining_stock"] == 40.0


# =====================================================================
# Test 2 — Insufficient Inventory & Urgency Prioritization
# =====================================================================
def test_insufficient_inventory_prioritization(client, db_session):
    """Test 2: Insufficient inventory must prioritize Critical over Low urgency."""
    wh_a, _, sup_food, _, _, vil_a, vil_b = _seed_basic_entities(db_session)

    # Warehouse A: only 50 Food Kits available
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=50.0))

    # Village A: 40 Food Kits, Critical
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=40.0, urgency_level="Critical"))
    # Village B: 40 Food Kits, Low
    db_session.add(VillageDemand(village_id=vil_b.id, supply_id=sup_food.id, required_quantity=40.0, urgency_level="Low"))

    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=10.0))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_b.id, cost_per_unit=10.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    # Total allocated cannot exceed available inventory (50)
    assert data["total_allocated"] <= 50.0
    assert data["total_requested"] == 80.0
    assert data["total_unmet"] == 30.0

    # Village A (Critical) must be 100% fulfilled (40 kits)
    vil_a_detail = next(d for d in data["demand_fulfilment"] if d["village_id"] == vil_a.id)
    assert vil_a_detail["allocated_quantity"] == 40.0
    assert vil_a_detail["unmet_quantity"] == 0.0

    # Village B (Low) receives the remaining 10 kits
    vil_b_detail = next(d for d in data["demand_fulfilment"] if d["village_id"] == vil_b.id)
    assert vil_b_detail["allocated_quantity"] == 10.0
    assert vil_b_detail["unmet_quantity"] == 30.0


# =====================================================================
# Test 3 — Multiple Warehouses Multi-Source Allocation
# =====================================================================
def test_multiple_warehouses_multi_source(client, db_session):
    """Test 3: Multiple warehouses combine to fulfill demand while respecting individual capacities."""
    wh_a, wh_b, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    # Warehouse A has 40 kits, Warehouse B has 60 kits
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=40.0))
    db_session.add(WarehouseInventory(warehouse_id=wh_b.id, supply_id=sup_food.id, available_quantity=60.0))

    # Village A demands 70 kits
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=70.0, urgency_level="High"))

    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=15.0))
    db_session.add(TransportationCost(warehouse_id=wh_b.id, village_id=vil_a.id, cost_per_unit=20.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    assert data["total_allocated"] == 70.0
    assert data["total_unmet"] == 0.0

    # Neither warehouse exceeds its stock
    for alloc in data["allocations"]:
        if alloc["warehouse_id"] == wh_a.id:
            assert alloc["allocated_quantity"] <= 40.0
        if alloc["warehouse_id"] == wh_b.id:
            assert alloc["allocated_quantity"] <= 60.0


# =====================================================================
# Test 4 — Transportation Cost Minimization
# =====================================================================
def test_transportation_cost_minimization(client, db_session):
    """Test 4: Solver prefers the lower-cost warehouse when urgency is equal."""
    wh_a, wh_b, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    # Both warehouses have 50 kits
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=50.0))
    db_session.add(WarehouseInventory(warehouse_id=wh_b.id, supply_id=sup_food.id, available_quantity=50.0))

    # Village demands 40 kits
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=40.0, urgency_level="High"))

    # Warehouse A is cheaper (₹10/unit) vs Warehouse B (₹30/unit)
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=10.0))
    db_session.add(TransportationCost(warehouse_id=wh_b.id, village_id=vil_a.id, cost_per_unit=30.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    assert data["total_allocated"] == 40.0
    assert len(data["allocations"]) == 1
    # Must allocate entirely from Warehouse A
    assert data["allocations"][0]["warehouse_id"] == wh_a.id
    assert data["allocations"][0]["allocated_quantity"] == 40.0
    assert data["total_transport_cost"] == 400.0  # 40 * 10


# =====================================================================
# Test 5 — Multiple Supply Types (No Mixing)
# =====================================================================
def test_multiple_supply_types(client, db_session):
    """Test 5: Different supply types are treated independently and never mixed."""
    wh_a, _, sup_food, sup_water, sup_med, vil_a, _ = _seed_basic_entities(db_session)

    # Add different stock for each supply
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_water.id, available_quantity=500.0))
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_med.id, available_quantity=25.0))

    # Village requests all three
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=50.0, urgency_level="High"))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_water.id, required_quantity=300.0, urgency_level="Critical"))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_med.id, required_quantity=20.0, urgency_level="Medium"))

    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=5.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    allocations = data["allocations"]
    food_alloc = next(a for a in allocations if a["supply_id"] == sup_food.id)
    water_alloc = next(a for a in allocations if a["supply_id"] == sup_water.id)
    med_alloc = next(a for a in allocations if a["supply_id"] == sup_med.id)

    assert food_alloc["allocated_quantity"] == 50.0
    assert water_alloc["allocated_quantity"] == 300.0
    assert med_alloc["allocated_quantity"] == 20.0


# =====================================================================
# Test 6 — Critical vs Low Urgency with Constrained Supply
# =====================================================================
def test_critical_vs_low_urgency_tradeoff(client, db_session):
    """Test 6: Critical demand receives all stock when supply can only fulfill one."""
    wh_a, _, sup_food, _, _, vil_a, vil_b = _seed_basic_entities(db_session)

    # 30 kits available
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=30.0))

    # Village A Critical: 30 kits; Village B Low: 30 kits
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=30.0, urgency_level="Critical"))
    db_session.add(VillageDemand(village_id=vil_b.id, supply_id=sup_food.id, required_quantity=30.0, urgency_level="Low"))

    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=15.0))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_b.id, cost_per_unit=5.0))  # Cheaper transport to Low!
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    # Even though Village B has lower transport cost (₹5 vs ₹15), Critical urgency MUST win
    vil_a_res = next(d for d in data["demand_fulfilment"] if d["village_id"] == vil_a.id)
    vil_b_res = next(d for d in data["demand_fulfilment"] if d["village_id"] == vil_b.id)

    assert vil_a_res["allocated_quantity"] == 30.0
    assert vil_b_res["allocated_quantity"] == 0.0


# =====================================================================
# Test 7 — Zero Inventory (All Demand Unmet)
# =====================================================================
def test_zero_inventory_graceful_handling(client, db_session):
    """Test 7: When inventory is zero, returns valid result with 0 allocations and 100% unmet demand."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    # Zero stock
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=0.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=80.0, urgency_level="High"))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=10.0))
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 201
    data = resp.json()

    assert data["total_allocated"] == 0.0
    assert data["total_unmet"] == 80.0
    assert data["overall_fulfilment_pct"] == 0.0
    assert len(data["allocations"]) == 0


# =====================================================================
# Test 8 — Missing Transportation Cost Validation
# =====================================================================
def test_missing_transportation_cost_validation(client, db_session):
    """Test 8: System prevents solving and gives clear 400 error when required route cost is missing."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=50.0, urgency_level="Critical"))
    # DO NOT ADD TRANSPORTATION COST!
    db_session.commit()

    resp = client.post("/api/optimization/solve")
    assert resp.status_code == 400
    assert "Missing transportation cost" in resp.json()["detail"]


# =====================================================================
# Test 9 — Database Persistence Across Queries
# =====================================================================
def test_optimization_database_persistence(client, db_session):
    """Test 9: Optimization runs are saved in PostgreSQL and retrievable via historical endpoints."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=60.0, urgency_level="Critical"))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=8.0))
    db_session.commit()

    post_resp = client.post("/api/optimization/solve?scenario_name=BaselinePlan")
    assert post_resp.status_code == 201
    run_data = post_resp.json()
    run_id = run_data["run_id"]
    db_id = run_data["id"]

    # Verify persisted in database model
    saved_run = db_session.query(OptimizationRun).filter(OptimizationRun.id == db_id).first()
    assert saved_run is not None
    assert saved_run.run_id == run_id
    assert saved_run.total_allocated == 60.0

    # Retrieve via API
    get_resp = client.get(f"/api/optimization/runs/{run_id}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["run_id"] == run_id
    assert retrieved["total_allocated"] == 60.0
    assert len(retrieved["allocations"]) == 1


# =====================================================================
# Test 10 — Inventory Safety (Recommendations Do Not Mutate Inventory)
# =====================================================================
def test_inventory_safety_non_mutation(client, db_session):
    """Test 10: Running optimization multiple times never deducts warehouse inventory."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=70.0, urgency_level="Critical"))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=12.0))
    db_session.commit()

    # Execute solve twice
    client.post("/api/optimization/solve")
    client.post("/api/optimization/solve")

    # Check warehouse_inventories table in DB
    inv_row = db_session.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == wh_a.id,
        WarehouseInventory.supply_id == sup_food.id,
    ).first()

    # Inventory MUST still be 100.0!
    assert inv_row.available_quantity == 100.0


# =====================================================================
# Test 11 — Scenario Simulation & What-If Non-Mutation
# =====================================================================
def test_scenario_simulation(client, db_session):
    """Test 11: What-If simulation with overrides runs correctly and does not change base DB."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=50.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=50.0, urgency_level="Critical"))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=10.0))
    db_session.commit()

    # Simulate scenario where inventory is boosted to 120
    sim_payload = {
        "scenario_name": "Surge Supply Scenario",
        "inventory_overrides": [
            {"warehouse_id": wh_a.id, "supply_id": sup_food.id, "available_quantity": 120.0}
        ],
        "demand_overrides": [
            {"village_id": vil_a.id, "supply_id": sup_food.id, "required_quantity": 100.0, "urgency_level": "Critical"}
        ],
    }

    resp = client.post("/api/optimization/simulate", json=sim_payload)
    assert resp.status_code == 201
    data = resp.json()

    assert data["is_scenario"] is True
    assert data["scenario_name"] == "Surge Supply Scenario"
    assert data["total_requested"] == 100.0
    assert data["total_allocated"] == 100.0

    # Ensure real DB was not altered
    inv_row = db_session.query(WarehouseInventory).filter(WarehouseInventory.warehouse_id == wh_a.id).first()
    assert inv_row.available_quantity == 50.0


# =====================================================================
# Test 12 — Scenario Comparison API
# =====================================================================
def test_scenario_comparison_endpoint(client, db_session):
    """Test 12: Comparing baseline and scenario returns accurate delta calculations."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=50.0))
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=80.0, urgency_level="Critical"))
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=10.0))
    db_session.commit()

    base_resp = client.post("/api/optimization/solve?scenario_name=Baseline")
    base_id = base_resp.json()["id"]

    sim_payload = {
        "scenario_name": "Doubled Stock",
        "inventory_overrides": [
            {"warehouse_id": wh_a.id, "supply_id": sup_food.id, "available_quantity": 100.0}
        ],
    }
    sim_resp = client.post("/api/optimization/simulate", json=sim_payload)
    sim_id = sim_resp.json()["id"]

    comp_resp = client.get(f"/api/optimization/compare?run_a_id={base_id}&run_b_id={sim_id}")
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()

    assert comp_data["delta_allocated"] == 30.0  # 80 vs 50
    assert comp_data["delta_unmet"] == -30.0    # 0 vs 30
    assert comp_data["delta_transport_cost"] == 300.0  # 800 vs 500


# =====================================================================
# Test 13 — Exclude Entities with Invalid Coordinates from Optimization
# =====================================================================
def test_optimization_excludes_invalid_coordinates(client, db_session):
    """Test 13: Villages with out-of-boundary coordinates are excluded from allocation calculations."""
    wh_a, _, sup_food, _, _, vil_a, _ = _seed_basic_entities(db_session)

    # Add an out-of-boundary village (e.g. Siberia: Lat 54.0, Lng 90.0)
    vil_siberia = AffectedVillage(
        name="Out-of-Region Siberian Village",
        district="Unknown",
        state="Outside",
        latitude=54.0,
        longitude=90.0,
        population=500,
        is_active=True,
    )
    db_session.add(vil_siberia)
    db_session.flush()

    # Inventories and demands
    db_session.add(WarehouseInventory(warehouse_id=wh_a.id, supply_id=sup_food.id, available_quantity=100.0))
    # Demand for valid Assam village
    db_session.add(VillageDemand(village_id=vil_a.id, supply_id=sup_food.id, required_quantity=40.0, urgency_level="High"))
    # Demand for invalid Siberian village
    db_session.add(VillageDemand(village_id=vil_siberia.id, supply_id=sup_food.id, required_quantity=60.0, urgency_level="Critical"))

    # Cost route for valid village only
    db_session.add(TransportationCost(warehouse_id=wh_a.id, village_id=vil_a.id, cost_per_unit=12.0))
    db_session.commit()

    # Overview check
    overview_resp = client.get("/api/optimization/overview")
    assert overview_resp.status_code == 200
    overview_data = overview_resp.json()
    assert overview_data["active_villages_count"] == 2  # vil_a and vil_b are valid; vil_siberia excluded
    # Note exists warning of out-of-region village
    assert any("outside the operational region" in note for note in overview_data["readiness_notes"])

    # Solve execution
    solve_resp = client.post("/api/optimization/solve")
    assert solve_resp.status_code == 201
    solve_data = solve_resp.json()

    # Only vil_a should receive allocations
    allocated_village_ids = [a["village_id"] for a in solve_data["allocations"]]
    assert vil_a.id in allocated_village_ids
    assert vil_siberia.id not in allocated_village_ids
    assert solve_data["total_allocated"] == 40.0  # Only vil_a's 40 units allocated

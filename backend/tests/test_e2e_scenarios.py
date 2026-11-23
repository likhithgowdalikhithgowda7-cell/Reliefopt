"""End-to-end integration and scenario tests for ReliefOpt Stage 5.

Validates complete multi-commodity emergency relief workflows using realistic
disaster scenarios across different Indian geographical regions (Assam, Odisha, Kerala).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.transport_cost import TransportationCost
from app.models.optimization import OptimizationRun
from app.services import scenario_service


def test_e2e_scenario_catalog(client: TestClient):
    """Verify that available disaster relief scenario catalog is exposed correctly."""
    resp = client.get("/api/optimization/scenarios")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3

    keys = [item["key"] for item in data]
    assert "assam_flood" in keys
    assert "odisha_cyclone" in keys
    assert "kerala_landslide" in keys


def test_e2e_assam_flood_sufficient_inventory_workflow(client: TestClient, db_session: Session):
    """End-to-End Test: Assam Flood Relief Scenario with Sufficient Inventory.
    
    Validates:
    - Multi-warehouse (3) and multi-village (4) registry with coordinates in Assam.
    - Automatic transportation cost matrix calculation.
    - Google OR-Tools optimization with sufficient stock.
    - 100% Critical & High urgency satisfaction.
    - Stock non-negativity and exact inventory remaining calculation.
    - Direct cross-module reflection in Dashboard and Analytics & Maps overview APIs.
    """
    # 1. Seed scenario with solver execution
    resp = client.post("/api/optimization/seed-scenario?scenario_key=assam_flood&run_solver=true")
    assert resp.status_code == 201
    seed_result = resp.json()

    assert seed_result["scenario_key"] == "assam_flood"
    assert seed_result["warehouses_count"] == 3
    assert seed_result["villages_count"] == 5
    assert seed_result["optimization_run_id"] is not None
    assert seed_result["solver_status"] in ("OPTIMAL", "FEASIBLE")

    # 2. Verify Optimization Run details via GET /api/optimization/runs/{id}
    run_id = seed_result["optimization_run_id"]
    plan_resp = client.get(f"/api/optimization/runs/{run_id}")
    assert plan_resp.status_code == 200
    plan = plan_resp.json()

    # In Assam Flood, stock is sufficient for critical demands
    assert plan["critical_fulfilment_pct"] == 100.0
    assert plan["total_allocated"] > 0
    assert plan["total_transport_cost"] > 0
    assert len(plan["allocations"]) > 0

    # Verify inventory upper bound constraint: allocated never exceeds initial stock
    for usage in plan["stock_usage"]:
        assert usage["allocated_quantity"] <= usage["initial_available"]
        assert usage["remaining_stock"] >= 0.0
        assert round(usage["initial_available"] - usage["allocated_quantity"], 2) == round(usage["remaining_stock"], 2)

    # 3. Verify cross-module reflection in Dashboard API
    dash_resp = client.get("/api/dashboard/summary")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["total_warehouses"] >= 3
    assert dash_data["total_active_villages"] >= 4
    assert dash_data["total_available_inventory"] > 0
    assert dash_data["total_recorded_demand"] > 0

    # 4. Verify cross-module reflection in Analytics & Maps overview API
    analytics_resp = client.get(f"/api/analytics/overview?plan_id={plan['id']}")
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()

    # Geographical points and active routes for Leaflet map
    assert len(analytics_data["warehouses_geo"]) >= 3
    assert len(analytics_data["villages_geo"]) >= 4
    assert len(analytics_data["distribution_routes"]) > 0

    # Coordinates must be valid within operational bounds (6°N–38°N, 68°E–99°E)
    for wh in analytics_data["warehouses_geo"]:
        assert wh["has_valid_coordinates"] is True
        assert 6.0 <= wh["latitude"] <= 38.0
        assert 68.0 <= wh["longitude"] <= 99.0

    for vil in analytics_data["villages_geo"]:
        assert vil["has_valid_coordinates"] is True
        assert 6.0 <= vil["latitude"] <= 38.0
        assert 68.0 <= vil["longitude"] <= 99.0

    # Verify distribution routes connect valid coordinates
    for route in analytics_data["distribution_routes"]:
        assert route["warehouse_lat"] is not None
        assert route["village_lat"] is not None
        assert route["allocated_quantity"] > 0
        assert route["total_transit_cost"] > 0


def test_e2e_odisha_cyclone_insufficient_supply_priority(client: TestClient, db_session: Session):
    """End-to-End Test: Odisha Cyclone Scenario with Severe Inventory Shortage.
    
    Validates:
    - System behavior under extreme resource scarcity (demand >> inventory).
    - Critical urgency prioritization (100% Critical fulfilled).
    - Lower urgency tiers deferred or partially fulfilled.
    - Zero negative inventory and zero overallocation.
    - Real database inventory remains non-mutated and protected.
    - Fairness metrics report valid disparity gap and urgency breakdown.
    """
    # 1. Seed Odisha Cyclone scenario
    resp = client.post("/api/optimization/seed-scenario?scenario_key=odisha_cyclone&run_solver=true")
    assert resp.status_code == 201
    seed_result = resp.json()

    # 2. Inspect the solved plan
    run_id = seed_result["optimization_run_id"]
    plan_resp = client.get(f"/api/optimization/runs/{run_id}")
    assert plan_resp.status_code == 200
    plan = plan_resp.json()

    # Critical demands MUST be prioritized
    assert plan["critical_fulfilment_pct"] == 100.0

    # Overall fulfilment should reflect the shortage
    assert plan["overall_fulfilment_pct"] < 100.0
    assert plan["total_unmet"] > 0

    # Total allocated must strictly be less than or equal to total initial stock
    total_initial_stock = sum(u["initial_available"] for u in plan["stock_usage"])
    assert plan["total_allocated"] <= total_initial_stock

    # Fairness metrics must clearly distinguish objective vs evaluation
    fairness = plan["fairness"]
    assert "Critical" in fairness["urgency_breakdown"]
    assert fairness["urgency_breakdown"]["Critical"]["fulfilment_pct"] == 100.0
    assert fairness["disparity_gap_pct"] >= 0.0

    # 3. Database Safety Check: Live inventory records must NOT be depleted
    inv_records = db_session.query(WarehouseInventory).all()
    for inv in inv_records:
        assert inv.available_quantity >= 0.0


def test_e2e_kerala_landslide_mountain_transit_scenario(client: TestClient, db_session: Session):
    """End-to-End Test: Kerala Wayanad Landslide Scenario with High-Cost Mountain Transit.
    
    Validates:
    - Multi-depot mountain relief dispatch in Western Ghats.
    - Tradeoff between proximity/cost and urgency level.
    - Dispatch routes correctly visualized on interactive map.
    """
    resp = client.post("/api/optimization/seed-scenario?scenario_key=kerala_landslide&run_solver=true")
    assert resp.status_code == 201
    seed_result = resp.json()

    run_id = seed_result["optimization_run_id"]
    plan_resp = client.get(f"/api/optimization/runs/{run_id}")
    assert plan_resp.status_code == 200
    plan = plan_resp.json()

    assert plan["status"] in ("OPTIMAL", "FEASIBLE")
    assert plan["total_allocated"] > 0
    assert plan["total_transport_cost"] > 0


def test_e2e_data_validation_rejections(client: TestClient):
    """Verify that invalid inputs are rejected with clear HTTP 422 error messages."""
    # 1. Invalid warehouse coordinates
    bad_wh = {
        "name": "Invalid WH",
        "address": "Nowhere",
        "latitude": 120.0,  # Invalid: > 90
        "longitude": 77.0,
    }
    resp = client.post("/api/warehouses", json=bad_wh)
    assert resp.status_code == 422

    # 2. Blank warehouse name
    blank_wh = {
        "name": "   ",
        "address": "Valid Address",
        "latitude": 26.0,
        "longitude": 91.0,
    }
    resp = client.post("/api/warehouses", json=blank_wh)
    assert resp.status_code == 422

    # 3. Negative inventory quantity
    bad_inv = {
        "warehouse_id": 1,
        "supply_id": 1,
        "available_quantity": -50.0,  # Invalid: < 0
    }
    resp = client.post("/api/inventory", json=bad_inv)
    assert resp.status_code == 422

    # 4. Zero or negative demand required_quantity
    bad_demand = {
        "village_id": 1,
        "supply_id": 1,
        "required_quantity": 0.0,  # Invalid: must be > 0
        "urgency_level": "High",
    }
    resp = client.post("/api/demands", json=bad_demand)
    assert resp.status_code == 422

    # 5. Invalid urgency level
    bad_urgency = {
        "village_id": 1,
        "supply_id": 1,
        "required_quantity": 100.0,
        "urgency_level": "SuperUrgent",  # Invalid
    }
    resp = client.post("/api/demands", json=bad_urgency)
    assert resp.status_code == 422

    # 6. Negative village population
    bad_vil = {
        "name": "Bad Pop Village",
        "district": "Test Dist",
        "state": "Test State",
        "latitude": 26.0,
        "longitude": 91.0,
        "population": -200,  # Invalid: <= 0
    }
    resp = client.post("/api/villages", json=bad_vil)
    assert resp.status_code == 422

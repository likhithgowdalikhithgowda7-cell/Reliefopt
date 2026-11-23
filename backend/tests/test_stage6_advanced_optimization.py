"""Stage 6: Advanced Relief Allocation Optimization & Realistic Disaster Scenarios Tests.

Validates:
1. Scenario catalog for Floods, Cyclones, and Landslides across Indian regions.
2. Demonstration data markings across all scenarios.
3. Multi-warehouse, multi-village, and multi-commodity inventory constraints (sum_v x <= stock).
4. Critical supply floor guarantees (u_{v,s} == 0 when stock >= critical demand).
5. Mathematical formulation strings and explicit fairness disclaimer.
6. Fairness evaluation metrics (Gini coefficient, Hoover index, Disparity gap, underserved locations).
7. Scenario comparison tradeoff endpoint with fairness delta indicators.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.optimization import OptimizationRun
from app.services import scenario_service


def test_stage6_scenario_catalog(client: TestClient):
    """Verify scenario catalog contains Floods, Cyclones, and Landslides across Indian regions."""
    resp = client.get("/api/optimization/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) >= 5

    scenario_keys = {s["key"] for s in scenarios}
    assert "assam_flood" in scenario_keys
    assert "odisha_cyclone" in scenario_keys
    assert "kerala_landslide" in scenario_keys
    assert "uttarakhand_flash_flood" in scenario_keys
    assert "gujarat_cyclone" in scenario_keys

    # Check disaster types
    disaster_types = {s["disaster_type"] for s in scenarios}
    assert "Flood" in disaster_types
    assert "Cyclone" in disaster_types
    assert "Landslide" in disaster_types

    # Verify northern and western scenarios exist
    regions = {s["region"] for s in scenarios}
    assert any("Northern" in r or "Himalayas" in r for r in regions)
    assert any("Western" in r or "Gujarat" in r or "Arabian" in r for r in regions)


def test_stage6_uttarakhand_flash_flood_seed_and_solve(client: TestClient, db_session: Session):
    """Test seeding and solving the Uttarakhand Himalayan Flash Flood & Landslide scenario.
    
    Validates:
    - Multi-warehouse (3: Dehradun, Rishikesh, Joshimath)
    - Multi-village (4: Rudraprayag, Joshimath, Karnaprayag, Badrinath)
    - High-altitude thermal supplies (Thermal Blankets, High-Calorie Rations, Potable Water)
    - Demo markings on all entities
    - Mathematical formulation strings returned
    - Fairness metrics calculated (Gini, Hoover, Disparity Gap)
    """
    resp = client.post("/api/optimization/seed-scenario?scenario_key=uttarakhand_flash_flood&run_solver=true")
    assert resp.status_code == 201
    data = resp.json()

    assert data["scenario_key"] == "uttarakhand_flash_flood"
    assert data["disaster_type"] == "Flood & Landslide"
    assert data["warehouses_count"] == 3
    assert data["villages_count"] == 4
    assert data["solver_status"].upper() in ("OPTIMAL", "FEASIBLE")

    # Verify demonstration naming in database
    warehouses = db_session.query(Warehouse).all()
    assert len(warehouses) == 3
    for wh in warehouses:
        assert "[DEMO]" in wh.name

    villages = db_session.query(AffectedVillage).all()
    assert len(villages) == 4
    for vil in villages:
        assert "[DEMO]" in vil.name

    # Inspect solver output
    run_id = data["optimization_run_id"]
    run_resp = client.get(f"/api/optimization/runs/{run_id}")
    assert run_resp.status_code == 200
    plan = run_resp.json()

    # Verify mathematical formulation is present
    assert "optimization_strategy" in plan
    assert "minimize" in plan["objective_formulation"].lower()
    assert len(plan["constraints_formulation"]) >= 4
    assert "fairness_disclaimer" in plan
    assert "does not automatically guarantee" in plan["fairness_disclaimer"]

    # Verify fairness metrics
    fairness = plan["fairness"]
    assert fairness is not None
    assert "gini_coefficient" in fairness
    assert 0.0 <= fairness["gini_coefficient"] <= 1.0
    assert "hoover_index" in fairness
    assert 0.0 <= fairness["hoover_index"] <= 100.0
    assert "underserved_villages_count" in fairness
    assert "underserved_villages" in fairness
    assert "fairness_score_rating" in fairness


def test_stage6_gujarat_cyclone_seed_and_solve(client: TestClient, db_session: Session):
    """Test seeding and solving the Gujarat Cyclone Biparjoy Coastal Surge scenario.
    
    Validates:
    - Multi-warehouse (3: Ahmedabad, Rajkot, Kandla Port)
    - Multi-village (4: Jakhau, Mandvi, Bhuj, Porbandar)
    - Coastal surge supplies (Potable Water, Food Rations, Tarpaulins, Hygiene Kits)
    - Feasible allocation plan with non-negative inventory protection
    """
    resp = client.post("/api/optimization/seed-scenario?scenario_key=gujarat_cyclone&run_solver=true")
    assert resp.status_code == 201
    data = resp.json()

    assert data["scenario_key"] == "gujarat_cyclone"
    assert data["disaster_type"] == "Cyclone"
    assert data["warehouses_count"] == 3
    assert data["villages_count"] == 4
    assert data["solver_status"].upper() in ("OPTIMAL", "FEASIBLE")
    assert data["overall_fulfilment_pct"] > 0

    # Fetch run details
    run_id = data["optimization_run_id"]
    plan = client.get(f"/api/optimization/runs/{run_id}").json()

    # Check that inventory constraints are strictly respected: sum_v x <= inventory
    allocations = plan["allocations"]
    wh_supply_dispatched = {}
    for alloc in allocations:
        key = (alloc["warehouse_id"], alloc["supply_id"])
        wh_supply_dispatched[key] = wh_supply_dispatched.get(key, 0.0) + alloc["allocated_quantity"]

    for (wh_id, sup_id), total_disp in wh_supply_dispatched.items():
        inv = (
            db_session.query(WarehouseInventory)
            .filter_by(warehouse_id=wh_id, supply_id=sup_id)
            .first()
        )
        assert inv is not None
        assert total_disp <= inv.available_quantity + 1e-4, (
            f"Over-allocation detected: dispatched {total_disp} > stock {inv.available_quantity}"
        )


def test_stage6_critical_supply_guarantee(client: TestClient, db_session: Session):
    """Verify that when total stock >= total critical demand, critical fulfillment is 100%."""
    # Assam flood scenario has abundant stock
    resp = client.post("/api/optimization/seed-scenario?scenario_key=assam_flood&run_solver=true")
    assert resp.status_code == 201
    data = resp.json()
    assert data["critical_fulfilment_pct"] == 100.0

    plan = client.get(f"/api/optimization/runs/{data['optimization_run_id']}").json()
    assert plan["critical_fulfilment_pct"] == 100.0

    # Verify all Critical demands have 0 unmet quantity and 100% fulfillment
    critical_demands = [d for d in plan["demand_fulfilment"] if d["urgency_level"] == "Critical"]
    assert len(critical_demands) > 0
    for d in critical_demands:
        assert d["unmet_quantity"] == 0.0, f"Critical demand {d['village_name']} - {d['supply_name']} has unmet quantity"
        assert d["fulfilment_pct"] == 100.0


def test_stage6_scenario_tradeoff_comparison_with_fairness(client: TestClient, db_session: Session):
    """Verify side-by-side scenario comparison endpoint calculates fairness deltas.
    
    Compares:
    - Run A: Assam Flood (Sufficient supply baseline)
    - Run B: Odisha Cyclone (Scarcity scenario)
    """
    # 1. Seed Assam Flood
    resp_a = client.post("/api/optimization/seed-scenario?scenario_key=assam_flood&run_solver=true")
    assert resp_a.status_code == 201
    run_a_code = resp_a.json()["optimization_run_id"]
    run_a_db = db_session.query(OptimizationRun).filter_by(run_id=run_a_code).first()

    # 2. Seed Odisha Cyclone
    resp_b = client.post("/api/optimization/seed-scenario?scenario_key=odisha_cyclone&run_solver=true")
    assert resp_b.status_code == 201
    run_b_code = resp_b.json()["optimization_run_id"]
    run_b_db = db_session.query(OptimizationRun).filter_by(run_id=run_b_code).first()

    # 3. Call Compare API
    resp_comp = client.get(f"/api/optimization/compare?run_a_id={run_a_db.id}&run_b_id={run_b_db.id}")
    assert resp_comp.status_code == 200
    comp = resp_comp.json()

    # Verify core deltas
    assert "delta_allocated" in comp
    assert "delta_unmet" in comp
    assert "delta_transport_cost" in comp
    assert "delta_overall_fulfilment_pct" in comp
    assert "delta_critical_fulfilment_pct" in comp

    # Verify Stage 6 fairness comparison indicators
    assert "delta_gini_coefficient" in comp
    assert "delta_disparity_gap_pct" in comp
    assert "delta_underserved_count" in comp
    assert "baseline_fairness_rating" in comp
    assert "comparison_fairness_rating" in comp
    assert "fairness_comparison_summary" in comp
    assert comp["fairness_comparison_summary"] != ""
    assert "narrative_summary" in comp

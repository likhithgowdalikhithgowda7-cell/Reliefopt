"""Automated tests for Stage 4 Analytics and Leaflet Geospatial Map Endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.transport_cost import TransportationCost


def test_analytics_overview_empty_database(client: TestClient, db_session: Session):
    """Test analytics overview when database has no records (graceful zero-handling)."""
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["kpis"]["total_demand"] == 0.0
    assert data["kpis"]["total_allocated"] == 0.0
    assert data["kpis"]["total_unmet"] == 0.0
    assert data["kpis"]["demand_fulfilment_pct"] == 100.0
    assert data["kpis"]["total_warehouses_count"] == 0
    assert data["kpis"]["total_villages_count"] == 0
    assert data["kpis"]["active_distribution_routes_count"] == 0
    assert len(data["warehouses_geo"]) == 0
    assert len(data["villages_geo"]) == 0
    assert len(data["distribution_routes"]) == 0
    assert len(data["invalid_coordinates"]) == 0


def test_analytics_with_data_and_urgency(client: TestClient, db_session: Session):
    """Test analytics overview correctly computes map points, stock, and urgency."""
    wh = Warehouse(
        name="Guwahati Central Depot",
        address="Paltan Bazaar, Guwahati",
        latitude=26.1856,
        longitude=91.7476,
        is_active=True,
    )
    v1 = AffectedVillage(
        name="Silchar Sadar",
        district="Cachar",
        state="Assam",
        latitude=24.8333,
        longitude=92.7789,
        population=1200,
        is_active=True,
    )
    v2 = AffectedVillage(
        name="Dhubri Ghat",
        district="Dhubri",
        state="Assam",
        latitude=26.0207,
        longitude=89.9742,
        population=800,
        is_active=True,
    )
    sup = ReliefSupply(name="Water Jerrycans", category="Drinking Water", unit="Cans")
    db_session.add_all([wh, v1, v2, sup])
    db_session.commit()

    inv = WarehouseInventory(warehouse_id=wh.id, supply_id=sup.id, available_quantity=150.0)
    d1 = VillageDemand(village_id=v1.id, supply_id=sup.id, required_quantity=80.0, urgency_level="Critical")
    d2 = VillageDemand(village_id=v2.id, supply_id=sup.id, required_quantity=50.0, urgency_level="Medium")
    db_session.add_all([inv, d1, d2])
    db_session.commit()

    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["kpis"]["total_demand"] == 130.0
    assert data["kpis"]["total_warehouses_count"] == 1
    assert data["kpis"]["total_villages_count"] == 2
    assert len(data["warehouses_geo"]) == 1
    assert data["warehouses_geo"][0]["total_stock"] == 150.0
    assert data["warehouses_geo"][0]["stock_by_supply"]["Water Jerrycans"] == 150.0

    assert len(data["villages_geo"]) == 2
    v1_map = next(v for v in data["villages_geo"] if v["id"] == v1.id)
    assert v1_map["highest_urgency"] == "Critical"
    assert v1_map["total_demanded"] == 80.0

    # Verify urgency distribution
    crit_item = next(u for u in data["urgency_distribution"] if u["urgency_level"] == "Critical")
    assert crit_item["demands_count"] == 1
    assert crit_item["total_quantity"] == 80.0


def test_analytics_with_optimization_run_and_routes(client: TestClient, db_session: Session):
    """Test distribution routes appear when an optimization plan is solved and selected."""
    wh = Warehouse(
        name="Jorhat Warehouse",
        address="Jorhat, Assam",
        latitude=26.7509,
        longitude=94.2037,
        is_active=True,
    )
    vil = AffectedVillage(
        name="Majuli River Village",
        district="Majuli",
        state="Assam",
        latitude=26.9634,
        longitude=94.2144,
        population=650,
        is_active=True,
    )
    sup = ReliefSupply(name="Emergency Food Pack", category="Food", unit="Packs")
    db_session.add_all([wh, vil, sup])
    db_session.commit()

    inv = WarehouseInventory(warehouse_id=wh.id, supply_id=sup.id, available_quantity=100.0)
    dem = VillageDemand(village_id=vil.id, supply_id=sup.id, required_quantity=70.0, urgency_level="Critical")
    cost = TransportationCost(
        warehouse_id=wh.id,
        village_id=vil.id,
        cost_per_unit=12.5,
        distance_km=45.0,
    )
    db_session.add_all([inv, dem, cost])
    db_session.commit()

    # Solve optimization run
    solve_resp = client.post("/api/optimization/solve?scenario_name=Stage4Baseline")
    assert solve_resp.status_code == 201
    run_id = solve_resp.json()["id"]

    # Query analytics overview
    response = client.get(f"/api/analytics/overview?plan_id={run_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["selected_plan_id"] == run_id
    assert data["kpis"]["total_allocated"] == 70.0
    assert data["kpis"]["total_unmet"] == 0.0
    assert data["kpis"]["demand_fulfilment_pct"] == 100.0
    assert data["kpis"]["active_distribution_routes_count"] == 1

    route = data["distribution_routes"][0]
    assert route["warehouse_name"] == "Jorhat Warehouse"
    assert route["village_name"] == "Majuli River Village"
    assert route["allocated_quantity"] == 70.0
    assert route["unit_cost"] == 12.5
    assert route["total_transit_cost"] == 875.0
    assert route["is_geographical_link"] is True


def test_analytics_invalid_coordinates_handling(client: TestClient, db_session: Session, monkeypatch):
    """Test that invalid coordinates are flagged in warnings and not plotted as valid."""
    wh_valid = Warehouse(
        name="Tezpur Warehouse",
        address="Tezpur, Assam",
        latitude=26.6338,
        longitude=92.8006,
        is_active=True,
    )
    v_invalid = AffectedVillage(
        name="Flagged Coordinates Village",
        district="Barpeta",
        state="Assam",
        latitude=26.0,
        longitude=91.0,
        population=300,
        is_active=True,
    )
    db_session.add_all([wh_valid, v_invalid])
    db_session.commit()

    # Monkeypatch coordinate validation to simulate an invalid coordinate for Flagged Coordinates Village
    from app.services import analytics_service

    orig_is_valid = analytics_service._is_valid_coordinate

    def mock_is_valid(lat, lng):
        if lat == 26.0 and lng == 91.0:
            return False
        return orig_is_valid(lat, lng)

    monkeypatch.setattr(analytics_service, "_is_valid_coordinate", mock_is_valid)

    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()

    # The flagged village should be reported in invalid_coordinates
    assert len(data["invalid_coordinates"]) >= 1
    warn = next(w for w in data["invalid_coordinates"] if w["name"] == "Flagged Coordinates Village")
    assert warn["entity_type"] == "village"
    assert "Latitude must be in [-90, 90]" in warn["reason"]


    v_map = next(v for v in data["villages_geo"] if v["name"] == "Flagged Coordinates Village")
    assert v_map["has_valid_coordinates"] is False


def test_analytics_filters(client: TestClient, db_session: Session):
    """Test filtering analytics data by warehouse and village."""
    wh1 = Warehouse(name="WH Alpha", address="Loc 1", latitude=26.1, longitude=91.7, is_active=True)
    wh2 = Warehouse(name="WH Beta", address="Loc 2", latitude=26.2, longitude=91.8, is_active=True)
    vil = AffectedVillage(name="Target Village", district="Dist", state="Assam", latitude=26.3, longitude=91.9, population=500, is_active=True)
    db_session.add_all([wh1, wh2, vil])
    db_session.commit()

    # Filter by WH Alpha
    resp = client.get(f"/api/analytics/overview?warehouse_id={wh1.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["warehouse_stock"]) == 1
    assert data["warehouse_stock"][0]["warehouse_name"] == "WH Alpha"


def test_analytics_out_of_boundary_coordinates(client: TestClient, db_session: Session):
    """Test that coordinates outside India/Assam operational boundaries are flagged and excluded."""
    # Siberian coordinates (e.g. Lat 54.0, Lng 90.0)
    v_siberia = AffectedVillage(
        name="Out-of-Region Village",
        district="Unknown",
        state="Outside",
        latitude=54.0,
        longitude=90.0,
        population=300,
        is_active=True,
    )
    # Valid Assam village
    v_assam = AffectedVillage(
        name="Valid Assam Village",
        district="Kamrup",
        state="Assam",
        latitude=26.1445,
        longitude=91.7362,
        population=1000,
        is_active=True,
    )
    db_session.add_all([v_siberia, v_assam])
    db_session.commit()

    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()

    # The out-of-region village must be in invalid_coordinates
    warn_names = [w["name"] for w in data["invalid_coordinates"]]
    assert "Out-of-Region Village" in warn_names

    siberia_warn = next(w for w in data["invalid_coordinates"] if w["name"] == "Out-of-Region Village")
    assert "operational relief boundaries" in siberia_warn["reason"]

    # Villages geo must flag has_valid_coordinates correctly
    v_sib_map = next(v for v in data["villages_geo"] if v["name"] == "Out-of-Region Village")
    assert v_sib_map["has_valid_coordinates"] is False

    v_ass_map = next(v for v in data["villages_geo"] if v["name"] == "Valid Assam Village")
    assert v_ass_map["has_valid_coordinates"] is True


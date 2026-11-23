"""Scenario management service for realistic multi-region Indian disaster relief test scenarios."""

from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from app.models.warehouse import Warehouse
from app.models.village import AffectedVillage
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.demand import VillageDemand
from app.models.transport_cost import TransportationCost
from app.services.transport_cost_service import _haversine_distance
from app.services.optimization_service import solve_and_persist


SCENARIOS_DATA: Dict[str, Dict[str, Any]] = {
    "assam_flood": {
        "title": "Assam Brahmaputra Basin Flood Relief",
        "disaster_type": "Flood",
        "region": "North-East India",
        "description": "Widespread monsoon flooding across the Brahmaputra valley. Tests sufficient inventory, multi-warehouse routing, and urgency satisfaction.",
        "warehouses": [
            {
                "name": "Guwahati Central Depot",
                "address": "G.S. Road, Guwahati, Assam",
                "latitude": 26.1445,
                "longitude": 91.7362,
                "contact_info": "+91-94350-11223",
            },
            {
                "name": "Tezpur Regional Hub",
                "address": "Mission Chariali, Tezpur, Assam",
                "latitude": 26.6528,
                "longitude": 92.7926,
                "contact_info": "+91-94351-44556",
            },
            {
                "name": "Silchar Transit Depot",
                "address": "Tarapur, Silchar, Assam",
                "latitude": 24.8333,
                "longitude": 92.7789,
                "contact_info": "+91-94352-77889",
            },
        ],
        "villages": [
            {
                "name": "Ahatguri Flood Relief Camp [SIMULATED]",
                "district": "Majuli",
                "state": "Assam",
                "latitude": 26.9612,
                "longitude": 94.1843,
                "population": 3850,
            },
            {
                "name": "Jonai Inundation Sector [SIMULATED]",
                "district": "Dhemaji",
                "state": "Assam",
                "latitude": 27.7812,
                "longitude": 95.1432,
                "population": 2950,
            },
            {
                "name": "Sarthebari Lowland Ward [SIMULATED]",
                "district": "Barpeta",
                "state": "Assam",
                "latitude": 26.3421,
                "longitude": 91.0214,
                "population": 4600,
            },
            {
                "name": "Laharighat Riverbank Shelter [SIMULATED]",
                "district": "Morigaon",
                "state": "Assam",
                "latitude": 26.3112,
                "longitude": 92.3845,
                "population": 3200,
            },
            {
                "name": "Barkhola Submerged Ward [SIMULATED]",
                "district": "Cachar",
                "state": "Assam",
                "latitude": 24.9312,
                "longitude": 92.7412,
                "population": 2750,
            },
        ],
        "supplies": [
            {"name": "Potable Drinking Water", "category": "Drinking Water", "unit": "Litres"},
            {"name": "Ready-to-Eat Food Kits", "category": "Food", "unit": "Kits"},
            {"name": "Emergency Medical Kits", "category": "Medical Supplies", "unit": "Kits"},
            {"name": "Shelter Tarpaulins", "category": "Shelter Materials", "unit": "Packs"},
        ],
        # (warehouse_index, supply_name) -> quantity
        "inventories": {
            ("Guwahati Central Depot", "Potable Drinking Water"): 1500.0,
            ("Guwahati Central Depot", "Ready-to-Eat Food Kits"): 800.0,
            ("Guwahati Central Depot", "Emergency Medical Kits"): 300.0,
            ("Guwahati Central Depot", "Shelter Tarpaulins"): 400.0,
            ("Tezpur Regional Hub", "Potable Drinking Water"): 1200.0,
            ("Tezpur Regional Hub", "Ready-to-Eat Food Kits"): 600.0,
            ("Tezpur Regional Hub", "Emergency Medical Kits"): 200.0,
            ("Silchar Transit Depot", "Potable Drinking Water"): 800.0,
            ("Silchar Transit Depot", "Ready-to-Eat Food Kits"): 400.0,
            ("Silchar Transit Depot", "Shelter Tarpaulins"): 250.0,
        },
        # (village_name, supply_name, required_quantity, urgency_level)
        "demands": [
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Potable Drinking Water", 600.0, "Critical"),
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Emergency Medical Kits", 120.0, "Critical"),
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Ready-to-Eat Food Kits", 400.0, "High"),
            ("Jonai Inundation Sector [SIMULATED]", "Shelter Tarpaulins", 200.0, "Critical"),
            ("Jonai Inundation Sector [SIMULATED]", "Ready-to-Eat Food Kits", 300.0, "High"),
            ("Jonai Inundation Sector [SIMULATED]", "Potable Drinking Water", 450.0, "High"),
            ("Sarthebari Lowland Ward [SIMULATED]", "Potable Drinking Water", 700.0, "Critical"),
            ("Sarthebari Lowland Ward [SIMULATED]", "Emergency Medical Kits", 150.0, "High"),
            ("Sarthebari Lowland Ward [SIMULATED]", "Ready-to-Eat Food Kits", 350.0, "Medium"),
            ("Laharighat Riverbank Shelter [SIMULATED]", "Shelter Tarpaulins", 180.0, "High"),
            ("Laharighat Riverbank Shelter [SIMULATED]", "Ready-to-Eat Food Kits", 280.0, "Medium"),
            ("Laharighat Riverbank Shelter [SIMULATED]", "Potable Drinking Water", 300.0, "Low"),
            ("Barkhola Submerged Ward [SIMULATED]", "Potable Drinking Water", 400.0, "High"),
            ("Barkhola Submerged Ward [SIMULATED]", "Emergency Medical Kits", 80.0, "High"),
            ("Barkhola Submerged Ward [SIMULATED]", "Ready-to-Eat Food Kits", 220.0, "Medium"),
        ],
    },
    "odisha_cyclone": {
        "title": "Odisha Coastal Cyclone Emergency",
        "disaster_type": "Cyclone",
        "region": "Eastern Coast of India",
        "description": "Severe tropical cyclone landfall along the coastal belt. Tests acute supply shortage, strict non-negative inventory protection, and critical prioritization.",
        "warehouses": [
            {
                "name": "Bhubaneswar State Relief Depot",
                "address": "Khandagiri, Bhubaneswar, Odisha",
                "latitude": 20.2961,
                "longitude": 85.8245,
                "contact_info": "+91-94370-99887",
            },
            {
                "name": "Cuttack Logistics Hub",
                "address": "Choudwar, Cuttack, Odisha",
                "latitude": 20.4625,
                "longitude": 85.8830,
                "contact_info": "+91-94371-66554",
            },
        ],
        "villages": [
            {
                "name": "Puri Coastal Settlement",
                "district": "Puri",
                "state": "Odisha",
                "latitude": 19.8135,
                "longitude": 85.8312,
                "population": 5200,
            },
            {
                "name": "Jagatsinghpur Inundation Ward",
                "district": "Jagatsinghpur",
                "state": "Odisha",
                "latitude": 20.2644,
                "longitude": 86.1719,
                "population": 3100,
            },
            {
                "name": "Kendrapara Tidal Zone",
                "district": "Kendrapara",
                "state": "Odisha",
                "latitude": 20.5015,
                "longitude": 86.4222,
                "population": 2800,
            },
        ],
        "supplies": [
            {"name": "Potable Drinking Water", "category": "Drinking Water", "unit": "Litres"},
            {"name": "Ready-to-Eat Food Kits", "category": "Food", "unit": "Kits"},
            {"name": "Emergency Medical Kits", "category": "Medical Supplies", "unit": "Kits"},
            {"name": "Shelter Tarpaulins", "category": "Shelter Materials", "unit": "Packs"},
        ],
        # Severe supply shortage: total demand = 1650 units, total inventory = 650 units
        "inventories": {
            ("Bhubaneswar State Relief Depot", "Potable Drinking Water"): 300.0,
            ("Bhubaneswar State Relief Depot", "Emergency Medical Kits"): 100.0,
            ("Bhubaneswar State Relief Depot", "Ready-to-Eat Food Kits"): 150.0,
            ("Cuttack Logistics Hub", "Potable Drinking Water"): 100.0,
            ("Cuttack Logistics Hub", "Shelter Tarpaulins"): 80.0,
        },
        "demands": [
            ("Puri Coastal Settlement", "Emergency Medical Kits", 100.0, "Critical"),
            ("Puri Coastal Settlement", "Potable Drinking Water", 350.0, "Critical"),
            ("Jagatsinghpur Inundation Ward", "Potable Drinking Water", 400.0, "High"),
            ("Jagatsinghpur Inundation Ward", "Ready-to-Eat Food Kits", 300.0, "High"),
            ("Kendrapara Tidal Zone", "Shelter Tarpaulins", 200.0, "Medium"),
            ("Kendrapara Tidal Zone", "Ready-to-Eat Food Kits", 300.0, "Low"),
        ],
    },
    "kerala_landslide": {
        "title": "Kerala Wayanad Landslide Crisis",
        "disaster_type": "Landslide",
        "region": "Southern India (Western Ghats)",
        "description": "Flash landslides and debris flows severing mountain road transit. Tests high-altitude transit costs, multiple source allocation, and fairness trade-offs.",
        "warehouses": [
            {
                "name": "Kozhikode Coastal Base [DEMO]",
                "address": "Mananchira, Kozhikode, Kerala (Demonstration Depot)",
                "latitude": 11.2588,
                "longitude": 75.7804,
                "contact_info": "+91-94470-33445 [DEMO]",
            },
            {
                "name": "Kalpetta Mountain Camp [DEMO]",
                "address": "Bypass Road, Kalpetta, Wayanad, Kerala (Demonstration Depot)",
                "latitude": 11.6103,
                "longitude": 76.0828,
                "contact_info": "+91-94471-55667 [DEMO]",
            },
        ],
        "villages": [
            {
                "name": "Meppadi Relief Ward [DEMO]",
                "district": "Wayanad",
                "state": "Kerala",
                "latitude": 11.5500,
                "longitude": 76.1264,
                "population": 1600,
            },
            {
                "name": "Chooralmala Hamlet [DEMO]",
                "district": "Wayanad",
                "state": "Kerala",
                "latitude": 11.5333,
                "longitude": 76.1750,
                "population": 1100,
            },
            {
                "name": "Mundakkai High Ground [DEMO]",
                "district": "Wayanad",
                "state": "Kerala",
                "latitude": 11.5450,
                "longitude": 76.2050,
                "population": 950,
            },
        ],
        "supplies": [
            {"name": "Emergency Medical Kits", "category": "Medical Supplies", "unit": "Kits"},
            {"name": "Potable Drinking Water", "category": "Drinking Water", "unit": "Litres"},
            {"name": "Ready-to-Eat Food Kits", "category": "Food", "unit": "Kits"},
            {"name": "Shelter Tarpaulins", "category": "Shelter Materials", "unit": "Packs"},
        ],
        "inventories": {
            ("Kalpetta Mountain Camp [DEMO]", "Emergency Medical Kits"): 200.0,
            ("Kalpetta Mountain Camp [DEMO]", "Potable Drinking Water"): 500.0,
            ("Kalpetta Mountain Camp [DEMO]", "Ready-to-Eat Food Kits"): 300.0,
            ("Kozhikode Coastal Base [DEMO]", "Potable Drinking Water"): 800.0,
            ("Kozhikode Coastal Base [DEMO]", "Shelter Tarpaulins"): 250.0,
            ("Kozhikode Coastal Base [DEMO]", "Ready-to-Eat Food Kits"): 400.0,
        },
        "demands": [
            ("Chooralmala Hamlet [DEMO]", "Emergency Medical Kits", 120.0, "Critical"),
            ("Chooralmala Hamlet [DEMO]", "Potable Drinking Water", 300.0, "Critical"),
            ("Meppadi Relief Ward [DEMO]", "Emergency Medical Kits", 80.0, "Critical"),
            ("Meppadi Relief Ward [DEMO]", "Ready-to-Eat Food Kits", 250.0, "High"),
            ("Mundakkai High Ground [DEMO]", "Shelter Tarpaulins", 150.0, "High"),
            ("Mundakkai High Ground [DEMO]", "Potable Drinking Water", 200.0, "Medium"),
        ],
    },
    "uttarakhand_flash_flood": {
        "title": "Uttarakhand Himalayan Flash Flood & Landslide",
        "disaster_type": "Flood & Landslide",
        "region": "Northern India (Garhwal Himalayas)",
        "description": "Cloudburst triggering flash floods and landslides along the Alaknanda and Mandakini rivers. Tests mountain pass transit bottlenecks and critical high-altitude thermal supply demand.",
        "warehouses": [
            {
                "name": "Dehradun Central Depot [DEMO]",
                "address": "Haridwar Road, Dehradun, Uttarakhand (Demonstration Depot)",
                "latitude": 30.3165,
                "longitude": 78.0322,
                "contact_info": "+91-94120-11223 [DEMO]",
            },
            {
                "name": "Rishikesh Transit Hub [DEMO]",
                "address": "Muni Ki Reti, Rishikesh, Uttarakhand (Demonstration Depot)",
                "latitude": 30.0869,
                "longitude": 78.2676,
                "contact_info": "+91-94121-44556 [DEMO]",
            },
            {
                "name": "Joshimath High-Altitude Base [DEMO]",
                "address": "Badrinath Marg, Joshimath, Uttarakhand (Demonstration Depot)",
                "latitude": 30.5574,
                "longitude": 79.5668,
                "contact_info": "+91-94122-77889 [DEMO]",
            },
        ],
        "villages": [
            {
                "name": "Rudraprayag Valley Sector [DEMO]",
                "district": "Rudraprayag",
                "state": "Uttarakhand",
                "latitude": 30.2844,
                "longitude": 78.9811,
                "population": 2900,
            },
            {
                "name": "Joshimath Enclave [DEMO]",
                "district": "Chamoli",
                "state": "Uttarakhand",
                "latitude": 30.5500,
                "longitude": 79.5600,
                "population": 1800,
            },
            {
                "name": "Karnaprayag Confluence [DEMO]",
                "district": "Chamoli",
                "state": "Uttarakhand",
                "latitude": 30.2600,
                "longitude": 79.2200,
                "population": 2400,
            },
            {
                "name": "Badrinath Isolation Ward [DEMO]",
                "district": "Chamoli",
                "state": "Uttarakhand",
                "latitude": 30.7433,
                "longitude": 79.4938,
                "population": 1200,
            },
        ],
        "supplies": [
            {"name": "Emergency Medical Kits", "category": "Medical Supplies", "unit": "Kits"},
            {"name": "Potable Drinking Water", "category": "Drinking Water", "unit": "Litres"},
            {"name": "Ready-to-Eat Food Kits", "category": "Food", "unit": "Kits"},
            {"name": "Shelter Tarpaulins", "category": "Shelter Materials", "unit": "Packs"},
        ],
        "inventories": {
            ("Joshimath High-Altitude Base [DEMO]", "Emergency Medical Kits"): 250.0,
            ("Joshimath High-Altitude Base [DEMO]", "Potable Drinking Water"): 600.0,
            ("Joshimath High-Altitude Base [DEMO]", "Ready-to-Eat Food Kits"): 350.0,
            ("Rishikesh Transit Hub [DEMO]", "Potable Drinking Water"): 1000.0,
            ("Rishikesh Transit Hub [DEMO]", "Shelter Tarpaulins"): 400.0,
            ("Rishikesh Transit Hub [DEMO]", "Ready-to-Eat Food Kits"): 600.0,
            ("Dehradun Central Depot [DEMO]", "Emergency Medical Kits"): 400.0,
            ("Dehradun Central Depot [DEMO]", "Potable Drinking Water"): 1200.0,
            ("Dehradun Central Depot [DEMO]", "Shelter Tarpaulins"): 500.0,
        },
        "demands": [
            ("Badrinath Isolation Ward [DEMO]", "Emergency Medical Kits", 150.0, "Critical"),
            ("Badrinath Isolation Ward [DEMO]", "Shelter Tarpaulins", 200.0, "Critical"),
            ("Joshimath Enclave [DEMO]", "Emergency Medical Kits", 100.0, "Critical"),
            ("Joshimath Enclave [DEMO]", "Potable Drinking Water", 400.0, "High"),
            ("Rudraprayag Valley Sector [DEMO]", "Ready-to-Eat Food Kits", 350.0, "High"),
            ("Rudraprayag Valley Sector [DEMO]", "Potable Drinking Water", 500.0, "Medium"),
            ("Karnaprayag Confluence [DEMO]", "Shelter Tarpaulins", 150.0, "Medium"),
            ("Karnaprayag Confluence [DEMO]", "Ready-to-Eat Food Kits", 200.0, "Low"),
        ],
    },
    "gujarat_cyclone": {
        "title": "Gujarat Kutch Coastal Cyclone Emergency",
        "disaster_type": "Cyclone",
        "region": "Western India (Arabian Sea Coast)",
        "description": "Very severe cyclonic storm making landfall along the Kutch coastline. Tests tidal surge inundation demand, multi-port warehousing, and severe drinking water deficit allocation.",
        "warehouses": [
            {
                "name": "Ahmedabad Logistics Hub [DEMO]",
                "address": "Sanand Road, Ahmedabad, Gujarat (Demonstration Depot)",
                "latitude": 23.0225,
                "longitude": 72.5714,
                "contact_info": "+91-94260-11223 [DEMO]",
            },
            {
                "name": "Rajkot Regional Depot [DEMO]",
                "address": "Aji GIDC, Rajkot, Gujarat (Demonstration Depot)",
                "latitude": 22.3039,
                "longitude": 70.8022,
                "contact_info": "+91-94261-44556 [DEMO]",
            },
            {
                "name": "Kandla Port Facility [DEMO]",
                "address": "Port Trust Road, Gandhidham, Gujarat (Demonstration Depot)",
                "latitude": 23.0131,
                "longitude": 70.2183,
                "contact_info": "+91-94262-77889 [DEMO]",
            },
        ],
        "villages": [
            {
                "name": "Jakhau Fishing Hamlet [DEMO]",
                "district": "Kutch",
                "state": "Gujarat",
                "latitude": 23.2383,
                "longitude": 68.6942,
                "population": 3400,
            },
            {
                "name": "Mandvi Coastal Settlement [DEMO]",
                "district": "Kutch",
                "state": "Gujarat",
                "latitude": 22.8333,
                "longitude": 69.3556,
                "population": 4600,
            },
            {
                "name": "Bhuj Rural Sector [DEMO]",
                "district": "Kutch",
                "state": "Gujarat",
                "latitude": 23.2420,
                "longitude": 69.6669,
                "population": 3800,
            },
            {
                "name": "Porbandar Lowlands [DEMO]",
                "district": "Porbandar",
                "state": "Gujarat",
                "latitude": 21.6417,
                "longitude": 69.6293,
                "population": 5100,
            },
        ],
        "supplies": [
            {"name": "Potable Drinking Water", "category": "Drinking Water", "unit": "Litres"},
            {"name": "Ready-to-Eat Food Kits", "category": "Food", "unit": "Kits"},
            {"name": "Emergency Medical Kits", "category": "Medical Supplies", "unit": "Kits"},
            {"name": "Shelter Tarpaulins", "category": "Shelter Materials", "unit": "Packs"},
        ],
        "inventories": {
            ("Kandla Port Facility [DEMO]", "Potable Drinking Water"): 600.0,
            ("Kandla Port Facility [DEMO]", "Shelter Tarpaulins"): 300.0,
            ("Kandla Port Facility [DEMO]", "Ready-to-Eat Food Kits"): 400.0,
            ("Rajkot Regional Depot [DEMO]", "Emergency Medical Kits"): 300.0,
            ("Rajkot Regional Depot [DEMO]", "Potable Drinking Water"): 800.0,
            ("Rajkot Regional Depot [DEMO]", "Ready-to-Eat Food Kits"): 500.0,
            ("Ahmedabad Logistics Hub [DEMO]", "Potable Drinking Water"): 1500.0,
            ("Ahmedabad Logistics Hub [DEMO]", "Shelter Tarpaulins"): 450.0,
            ("Ahmedabad Logistics Hub [DEMO]", "Emergency Medical Kits"): 350.0,
        },
        "demands": [
            ("Jakhau Fishing Hamlet [DEMO]", "Potable Drinking Water", 700.0, "Critical"),
            ("Jakhau Fishing Hamlet [DEMO]", "Emergency Medical Kits", 150.0, "Critical"),
            ("Mandvi Coastal Settlement [DEMO]", "Shelter Tarpaulins", 300.0, "Critical"),
            ("Mandvi Coastal Settlement [DEMO]", "Potable Drinking Water", 500.0, "High"),
            ("Bhuj Rural Sector [DEMO]", "Ready-to-Eat Food Kits", 450.0, "High"),
            ("Porbandar Lowlands [DEMO]", "Potable Drinking Water", 600.0, "Medium"),
            ("Porbandar Lowlands [DEMO]", "Ready-to-Eat Food Kits", 300.0, "Low"),
        ],
    },
}


def seed_scenario(
    db: Session,
    scenario_key: str,
    run_solver: bool = True,
) -> Dict[str, Any]:
    """Seed a realistic disaster relief scenario into the database and optionally execute optimization."""
    if scenario_key not in SCENARIOS_DATA:
        raise ValueError(
            f"Unknown scenario '{scenario_key}'. Available: {', '.join(SCENARIOS_DATA.keys())}"
        )

    config = SCENARIOS_DATA[scenario_key]

    # 1. Ensure Supplies exist
    supplies_map: Dict[str, ReliefSupply] = {}
    for s_data in config["supplies"]:
        existing = db.query(ReliefSupply).filter(ReliefSupply.name == s_data["name"]).first()
        if not existing:
            existing = ReliefSupply(**s_data)
            db.add(existing)
            db.flush()
        supplies_map[s_data["name"]] = existing

    # 2. Upsert Warehouses
    wh_map: Dict[str, Warehouse] = {}
    for w_data in config["warehouses"]:
        existing_wh = db.query(Warehouse).filter(Warehouse.name == w_data["name"]).first()
        if not existing_wh:
            existing_wh = Warehouse(**w_data, is_active=True)
            db.add(existing_wh)
            db.flush()
        else:
            existing_wh.latitude = w_data["latitude"]
            existing_wh.longitude = w_data["longitude"]
            existing_wh.address = w_data["address"]
            existing_wh.is_active = True
            db.flush()
        wh_map[w_data["name"]] = existing_wh

    # 3. Upsert Villages
    vil_map: Dict[str, AffectedVillage] = {}
    for v_data in config["villages"]:
        existing_v = (
            db.query(AffectedVillage)
            .filter(
                AffectedVillage.name == v_data["name"],
                AffectedVillage.district == v_data["district"],
            )
            .first()
        )
        if not existing_v:
            existing_v = AffectedVillage(**v_data, is_active=True)
            db.add(existing_v)
            db.flush()
        else:
            existing_v.latitude = v_data["latitude"]
            existing_v.longitude = v_data["longitude"]
            existing_v.population = v_data["population"]
            existing_v.is_active = True
            db.flush()
        vil_map[v_data["name"]] = existing_v

    # 4. Set Warehouse Inventory
    for (wh_name, sup_name), qty in config["inventories"].items():
        wh = wh_map.get(wh_name)
        sup = supplies_map.get(sup_name)
        if not wh or not sup:
            continue
        inv = (
            db.query(WarehouseInventory)
            .filter(
                WarehouseInventory.warehouse_id == wh.id,
                WarehouseInventory.supply_id == sup.id,
            )
            .first()
        )
        if not inv:
            inv = WarehouseInventory(
                warehouse_id=wh.id,
                supply_id=sup.id,
                available_quantity=float(qty),
            )
            db.add(inv)
        else:
            inv.available_quantity = float(qty)
    db.flush()

    # 5. Set Village Demands
    for vil_name, sup_name, qty, urgency in config["demands"]:
        vil = vil_map.get(vil_name)
        sup = supplies_map.get(sup_name)
        if not vil or not sup:
            continue
        demand = (
            db.query(VillageDemand)
            .filter(
                VillageDemand.village_id == vil.id,
                VillageDemand.supply_id == sup.id,
            )
            .first()
        )
        if not demand:
            demand = VillageDemand(
                village_id=vil.id,
                supply_id=sup.id,
                required_quantity=float(qty),
                urgency_level=urgency,
                remarks=f"Seeded for scenario: {config['title']}",
            )
            db.add(demand)
        else:
            demand.required_quantity = float(qty)
            demand.urgency_level = urgency
    db.flush()

    # 6. Auto-generate realistic Haversine Transportation Costs for all pairs in database
    from app.services.transport_cost_service import seed_sample_demonstration_costs
    seed_sample_demonstration_costs(db)
    db.commit()

    # 7. Optionally execute Google OR-Tools optimization run
    solve_result = None
    if run_solver:
        solve_result = solve_and_persist(
            db,
            scenario_name=f"{config['title']} (Baseline)",
            is_scenario=False,
        )

    return {
        "scenario_key": scenario_key,
        "title": config["title"],
        "disaster_type": config.get("disaster_type", "Disaster"),
        "region": config["region"],
        "description": config["description"],
        "warehouses_count": len(wh_map),
        "villages_count": len(vil_map),
        "supplies_count": len(supplies_map),
        "demands_count": len(config["demands"]),
        "optimization_run_id": solve_result.run_id if solve_result else None,
        "solver_status": solve_result.status if solve_result else None,
        "overall_fulfilment_pct": solve_result.overall_fulfilment_pct if solve_result else None,
        "critical_fulfilment_pct": solve_result.critical_fulfilment_pct if solve_result else None,
        "total_transport_cost": solve_result.total_transport_cost if solve_result else None,
    }


def list_available_scenarios() -> List[Dict[str, Any]]:
    """Return catalog of available Indian disaster relief scenarios."""
    return [
        {
            "key": key,
            "title": data["title"],
            "disaster_type": data.get("disaster_type", "Disaster"),
            "region": data["region"],
            "description": data["description"],
            "warehouses_count": len(data["warehouses"]),
            "villages_count": len(data["villages"]),
            "demands_count": len(data["demands"]),
        }
        for key, data in SCENARIOS_DATA.items()
    ]

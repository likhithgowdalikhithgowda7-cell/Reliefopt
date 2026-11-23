"""Script to replace sample demonstration villages (IDs 3-6) with realistic Assam flood disaster data.

Preserves:
- Village ID 1 (GLH) and Village ID 2 (ger)
- Existing Warehouses (IDs 1-5)
- Existing Supplies (IDs 1-7)
- Existing Inventories

Removes:
- Only Village IDs 3, 4, 5, 6 and their associated cascade records

Adds:
- Realistic Assam flood locations with authentic coordinates and populations:
  1. Ahatguri Flood Relief Camp [SIMULATED] (Majuli)
  2. Jonai Inundation Sector [SIMULATED] (Dhemaji)
  3. Sarthebari Lowland Ward [SIMULATED] (Barpeta)
  4. Laharighat Riverbank Shelter [SIMULATED] (Morigaon)
  5. Barkhola Submerged Ward [SIMULATED] (Cachar)
- Associated realistic demands connected to existing supplies
- Distance-based transportation costs to all active warehouses
"""

import sys
import os

# Ensure backend app is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.village import AffectedVillage
from app.models.demand import VillageDemand
from app.models.warehouse import Warehouse
from app.models.supply import ReliefSupply
from app.models.inventory import WarehouseInventory
from app.models.transport_cost import TransportationCost
from app.services.transport_cost_service import _haversine_distance


def run_replacement():
    db = SessionLocal()
    try:
        print("[1/5] Checking existing database state...")
        preserved_villages = db.query(AffectedVillage).filter(AffectedVillage.id.in_([1, 2])).all()
        print(f"  Found {len(preserved_villages)} manually registered villages to preserve:")
        for v in preserved_villages:
            print(f"    - ID={v.id}: {v.name} ({v.district}, {v.state})")

        # Verify target demonstration villages to remove
        target_ids = [3, 4, 5, 6]
        demo_villages = db.query(AffectedVillage).filter(AffectedVillage.id.in_(target_ids)).all()
        print(f"  Found {len(demo_villages)} sample demonstration villages to remove:")
        for v in demo_villages:
            print(f"    - ID={v.id}: {v.name} ({v.district}, {v.state})")

        if not demo_villages:
            print("  No demonstration villages found matching IDs 3-6. Checking by name...")
            demo_villages = db.query(AffectedVillage).filter(
                AffectedVillage.name.in_([
                    "Majuli River Island",
                    "Dhemaji North",
                    "Barpeta Lowlands",
                    "Morigaon Sector",
                ])
            ).all()

        # Step 2: Remove target demo villages and associated records
        print("\n[2/5] Removing sample demonstration villages (IDs 3-6)...")
        for v in demo_villages:
            # Delete dependent demands and transport costs first (to be clean and explicit)
            db.query(VillageDemand).filter(VillageDemand.village_id == v.id).delete()
            db.query(TransportationCost).filter(TransportationCost.village_id == v.id).delete()
            db.delete(v)
            print(f"  Removed demo village ID={v.id}: {v.name}")

        db.flush()

        # Step 3: Insert realistic Assam flood-affected locations
        print("\n[3/5] Inserting realistic Assam flood-affected locations [SIMULATED]...")
        new_villages_data = [
            {
                "name": "Ahatguri Flood Relief Camp [SIMULATED]",
                "district": "Majuli",
                "state": "Assam",
                "latitude": 26.9612,
                "longitude": 94.1843,
                "population": 3850,
                "is_active": True,
            },
            {
                "name": "Jonai Inundation Sector [SIMULATED]",
                "district": "Dhemaji",
                "state": "Assam",
                "latitude": 27.7812,
                "longitude": 95.1432,
                "population": 2950,
                "is_active": True,
            },
            {
                "name": "Sarthebari Lowland Ward [SIMULATED]",
                "district": "Barpeta",
                "state": "Assam",
                "latitude": 26.3421,
                "longitude": 91.0214,
                "population": 4600,
                "is_active": True,
            },
            {
                "name": "Laharighat Riverbank Shelter [SIMULATED]",
                "district": "Morigaon",
                "state": "Assam",
                "latitude": 26.3112,
                "longitude": 92.3845,
                "population": 3200,
                "is_active": True,
            },
            {
                "name": "Barkhola Submerged Ward [SIMULATED]",
                "district": "Cachar",
                "state": "Assam",
                "latitude": 24.9312,
                "longitude": 92.7412,
                "population": 2750,
                "is_active": True,
            },
        ]

        created_villages = {}
        for v_data in new_villages_data:
            v_obj = AffectedVillage(**v_data)
            db.add(v_obj)
            db.flush()
            created_villages[v_obj.name] = v_obj
            print(f"  Created village ID={v_obj.id}: {v_obj.name} ({v_obj.district}, Assam) - Pop: {v_obj.population}, Lat: {v_obj.latitude}, Lng: {v_obj.longitude}")

        # Step 4: Connect realistic demands to Demand Management System
        print("\n[4/5] Connecting realistic demands to existing supplies...")
        # Get supply references by name
        supplies_by_name = {s.name: s for s in db.query(ReliefSupply).all()}

        new_demands_data = [
            # Ahatguri (Majuli)
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Potable Drinking Water", 600.0, "Critical", "Brahmaputra surge cut off wells; acute water crisis"),
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Emergency Medical Kits", 120.0, "Critical", "Waterborne diseases reported in temporary camp"),
            ("Ahatguri Flood Relief Camp [SIMULATED]", "Ready-to-Eat Food Kits", 400.0, "High", "Island isolated; relief ferry supply needed"),

            # Jonai (Dhemaji)
            ("Jonai Inundation Sector [SIMULATED]", "Shelter Tarpaulins", 200.0, "Critical", "Embankment breach displaced 250 families"),
            ("Jonai Inundation Sector [SIMULATED]", "Ready-to-Eat Food Kits", 300.0, "High", "Road transit submerged along national highway"),
            ("Jonai Inundation Sector [SIMULATED]", "Potable Drinking Water", 450.0, "High", "Tube wells submerged under silt"),

            # Sarthebari (Barpeta)
            ("Sarthebari Lowland Ward [SIMULATED]", "Potable Drinking Water", 700.0, "Critical", "Beki river overflow contaminated supply sources"),
            ("Sarthebari Lowland Ward [SIMULATED]", "Emergency Medical Kits", 150.0, "High", "Community center housing displaced elderly and children"),
            ("Sarthebari Lowland Ward [SIMULATED]", "Ready-to-Eat Food Kits", 350.0, "Medium", "Dry ration support required for local shelters"),

            # Laharighat (Morigaon)
            ("Laharighat Riverbank Shelter [SIMULATED]", "Shelter Tarpaulins", 180.0, "High", "Riverbank erosion forced relocation to high bund"),
            ("Laharighat Riverbank Shelter [SIMULATED]", "Ready-to-Eat Food Kits", 280.0, "Medium", "Cooked food distributed; supplementary dry kits needed"),
            ("Laharighat Riverbank Shelter [SIMULATED]", "Potable Drinking Water", 300.0, "Low", "Temporary water tanker operational; standby reserves"),

            # Barkhola (Cachar)
            ("Barkhola Submerged Ward [SIMULATED]", "Potable Drinking Water", 400.0, "High", "Barak valley flood cutoff; direct water needed"),
            ("Barkhola Submerged Ward [SIMULATED]", "Emergency Medical Kits", 80.0, "High", "Anti-snake venom and water purification tablets"),
            ("Barkhola Submerged Ward [SIMULATED]", "Ready-to-Eat Food Kits", 220.0, "Medium", "Supplementary food ration for relief camps"),
        ]

        demands_created_count = 0
        for vil_name, sup_name, qty, urgency, remarks in new_demands_data:
            vil = created_villages.get(vil_name)
            sup = supplies_by_name.get(sup_name)
            if not vil or not sup:
                print(f"  [WARN] Skipping demand for {vil_name} - {sup_name}: village or supply not found.")
                continue

            demand = VillageDemand(
                village_id=vil.id,
                supply_id=sup.id,
                required_quantity=qty,
                urgency_level=urgency,
                remarks=remarks,
            )
            db.add(demand)
            demands_created_count += 1

        db.flush()
        print(f"  Created {demands_created_count} realistic demand records across new villages.")

        # Step 5: Connect transportation costs between existing warehouses and new villages
        print("\n[5/5] Calculating transportation cost routes to active warehouses...")
        warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
        routes_created = 0
        for wh in warehouses:
            for vil_name, vil in created_villages.items():
                existing_cost = db.query(TransportationCost).filter(
                    TransportationCost.warehouse_id == wh.id,
                    TransportationCost.village_id == vil.id,
                ).first()

                if not existing_cost:
                    dist_km = _haversine_distance(wh.latitude, wh.longitude, vil.latitude, vil.longitude)
                    cost_per_unit = max(5.0, round(dist_km * 0.15, 2))
                    tc = TransportationCost(
                        warehouse_id=wh.id,
                        village_id=vil.id,
                        cost_per_unit=cost_per_unit,
                        distance_km=round(dist_km, 2),
                    )
                    db.add(tc)
                    routes_created += 1

        db.commit()
        print(f"  Configured {routes_created} transportation cost routes based on Haversine distance.")

        print("\n[SUCCESS] Replacement completed successfully!")
        print("  - Preserved villages GLH (ID 1) and ger (ID 2).")
        print("  - Sample demonstration villages (IDs 3-6) replaced with 5 realistic Assam locations.")
        print("  - Connected all new villages to the Demand Management System.")
        print("  - Maintained all existing warehouses, supplies, and inventories.")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Transaction rolled back due to error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_replacement()

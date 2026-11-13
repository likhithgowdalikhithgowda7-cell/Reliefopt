# ReliefOpt 🚨

> **A Smart System for Planning and Optimising Emergency Relief Supply Distribution**  
> *Academic Computer Science Mini Project — Stage 4 Interactive Leaflet Maps & Plotly Analytics*

---

## 1. Project Introduction

**ReliefOpt** is a web-based decision-support system designed to empower disaster relief coordinators to plan, optimize, and execute the distribution of limited emergency supplies (such as potable drinking water, medical kits, ready-to-eat rations, and temporary shelters) across flood- and natural-disaster-affected regions.

During widespread crises, relief organizations face intense supply shortages, severed transit networks, and conflicting demands across dozens of isolated villages. ReliefOpt applies mathematical programming and geospatial visualization to eliminate guesswork, guaranteeing fair, timely, and cost-effective dispatch.

---

## 2. Project Purpose & Scope

ReliefOpt addresses four primary operational challenges:
1. **Urgency-Weighted Dispatch**: Prioritizing affected villages based on coordinator-assessed urgency levels (Low, Medium, High, and Critical) and reported population needs.
2. **Fair Resource Allocation**: Supporting fair and urgency-aware relief distribution through explicitly defined optimisation rules.
3. **Transportation Cost Evaluation**: Evaluating manually entered estimated transportation costs per unit shipped from warehouses to villages to assist coordinators in planning.
4. **Geospatial & Visual Analytics**: Interactive geographical OpenStreetMap visualization of warehouse/village nodes, dispatch routes, and analytical Plotly reporting.

### Development Roadmap Summary
* **Stage 1 (Completed)**: Professional architectural foundation, environment setup, decoupled client-server scaffolding, FastAPI health diagnostics, and modern React interface.
* **Stage 2 (Completed)**: PostgreSQL database persistence with Alembic migrations, full CRUD APIs for Warehouses, Supplies, Inventory, Affected Villages, Demands, and interactive management React UI tabs.
* **Stage 3 (Completed)**: Google OR-Tools Linear/Mixed-Integer Optimization Engine integration, transportation cost matrix management, urgency prioritization, fairness evaluation, historical result persistence, and what-if scenario simulations.
* **Stage 4 (Completed)**: Leaflet interactive maps, OpenStreetMap integration, geographical straight-line allocation routes, and comprehensive Plotly analytics dashboards.

---

## 3. Technology Stack

| Layer | Technology | Stage Status | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js (v18) + Vite | **Active (Stage 1-4)** | Reactive management tabs & public landing UI |
| **Styling** | Modern CSS & Design Tokens | **Active (Stage 1-4)** | Emergency-management design system & tables/modals |
| **Backend** | Python 3.14+ & FastAPI | **Active (Stage 1-4)** | RESTful API, validation, error handlers, and CORS |
| **Server** | Uvicorn ASGI Server | **Active (Stage 1-4)** | High-concurrency local web server with hot-reload |
| **Database** | PostgreSQL 16 + psycopg3 | **Active (Stage 2-4)** | Persistent ACID relational database storage |
| **ORM & Migrations**| SQLAlchemy 2.0 + Alembic | **Active (Stage 2-4)** | Declarative models, schema migrations, and pooling |
| **Optimisation**| Google OR-Tools (CBC/SCIP) | **Active (Stage 3-4)** | Mathematical linear/integer solver engine |
| **Analytics** | Plotly.js & React-Plotly | **Active (Stage 4)** | Demand vs allocation, urgency, & efficiency charts |
| **Mapping** | Leaflet & React-Leaflet | **Active (Stage 4)** | OpenStreetMap geospatial markers & allocation routes |



---

## 4. Repository Folder Structure

```text
ReliefOpt/
│
├── frontend/                     # React.js Single Page Application (Vite)
│   ├── public/                   # Static assets (favicon, logos)
│   ├── src/
│   │   ├── assets/               # Local icons and images
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Header.jsx        # Navigation bar with tabs & live status pill
│   │   │   ├── Hero.jsx          # Hero section with calls to action
│   │   │   ├── ConnectionStatus.jsx # Real-time health diagnostic card
│   │   │   ├── ProjectOverview.jsx  # Value proposition cards
│   │   │   ├── WorkflowPreview.jsx  # 6-step planned pipeline visualizer
│   │   │   ├── TechStack.jsx     # Technology overview grid
│   │   │   ├── Modal.jsx         # Accessible modal dialog primitive
│   │   │   ├── EmptyState.jsx    # Professional empty state display
│   │   │   ├── NotificationToast.jsx # Floating toast notification stack
│   │   │   └── Footer.jsx        # Academic footer and attribution
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Consolidated landing page view
│   │   │   ├── DashboardPage.jsx # Real-time DB metrics & urgency breakdown
│   │   │   ├── WarehousesPage.jsx# Warehouse directory & CRUD modals
│   │   │   ├── SuppliesPage.jsx  # Relief supplies catalog & category validation
│   │   │   ├── InventoryPage.jsx # Stock tracking, editing, & low-stock alerts
│   │   │   ├── VillagesPage.jsx  # Affected villages registry & population metrics
│   │   │   ├── DemandsPage.jsx   # Village demand tracker & urgency filters
│   │   │   ├── OptimizationPage.jsx # Stage 3 Optimization Engine, Costs & Scenarios
│   │   │   └── AnalyticsMapsPage.jsx# Stage 4 Leaflet Geospatial Maps & Plotly Charts
│   │   ├── services/
│   │   │   └── api.js            # Central typed API client for FastAPI
│   │   ├── styles/
│   │   │   ├── index.css         # Global design tokens and CSS reset
│   │   │   └── App.css           # Component layouts, forms, tables, modals, maps
│   │   ├── App.jsx               # Root application wrapper & router
│   │   └── main.jsx              # React DOM entry point
│   ├── .env.example              # Frontend environment variables template
│   ├── index.html                # HTML document entry
│   ├── package.json              # NPM dependencies (leaflet, react-leaflet, plotly)
│   └── vite.config.js            # Vite bundler configuration
│
├── backend/                      # Python FastAPI REST Service
│   ├── alembic/                  # Database migration management
│   │   ├── versions/             # Migration revision scripts
│   │   └── env.py                # Alembic environment and SQLAlchemy metadata
│   ├── app/
│   │   ├── api/                  # REST API route controllers
│   │   │   ├── health.py         # GET /health & DB status check
│   │   │   ├── dashboard.py      # GET /api/dashboard/summary
│   │   │   ├── warehouses.py     # /api/warehouses CRUD
│   │   │   ├── supplies.py       # /api/supplies CRUD
│   │   │   ├── inventory.py      # /api/inventory CRUD & overall stock
│   │   │   ├── villages.py       # /api/villages CRUD
│   │   │   ├── demands.py        # /api/demands CRUD & urgency filter
│   │   │   ├── transport_costs.py# /api/transportation-costs CRUD, matrix, & seeding
│   │   │   ├── optimization.py   # /api/optimization solve, simulate, runs, & compare
│   │   │   └── analytics.py      # /api/analytics consolidated map & chart data
│   │   ├── core/
│   │   │   └── config.py         # Pydantic settings (DATABASE_URL, CORS, STAGE)
│   │   ├── database/
│   │   │   └── session.py        # SQLAlchemy engine, SessionLocal, get_db
│   │   ├── models/               # SQLAlchemy 2.0 ORM models
│   │   │   ├── warehouse.py      # Warehouse entity
│   │   │   ├── supply.py         # ReliefSupply entity
│   │   │   ├── inventory.py      # WarehouseInventory entity
│   │   │   ├── village.py        # AffectedVillage entity
│   │   │   ├── demand.py         # VillageDemand entity
│   │   │   ├── transport_cost.py # TransportationCost entity
│   │   │   └── optimization.py   # OptimizationRun, Allocation, UnmetDemand entities
│   │   ├── schemas/              # Pydantic v2 validation & response contracts
│   │   │   ├── warehouse.py
│   │   │   ├── supply.py
│   │   │   ├── inventory.py
│   │   │   ├── village.py
│   │   │   ├── demand.py
│   │   │   ├── dashboard.py
│   │   │   ├── transport_cost.py # Cost CRUD, matrix, and batch schemas
│   │   │   ├── optimization.py   # Overview, Solve, Run, and Scenario schemas
│   │   │   └── analytics.py      # Map points, routes, KPIs, and chart schemas
│   │   ├── services/             # Encapsulated domain business logic
│   │   │   ├── warehouse_service.py
│   │   │   ├── supply_service.py
│   │   │   ├── inventory_service.py
│   │   │   ├── village_service.py
│   │   │   ├── demand_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── transport_cost_service.py # Transit rates, matrix, & Haversine seed
│   │   │   ├── solver_service.py         # Pure Google OR-Tools CBC MIP solver
│   │   │   ├── optimization_service.py   # DB orchestration, runs, & simulations
│   │   │   └── analytics_service.py      # Geospatial aggregations & Plotly series
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/
│   │   ├── conftest.py           # Pytest fixtures & isolated test DB setup
│   │   ├── test_health.py        # Health & root route tests
│   │   ├── test_warehouses.py    # Warehouse CRUD & coordinate validation tests
│   │   ├── test_supplies.py      # Supply CRUD & category validation tests
│   │   ├── test_inventory.py     # Inventory stock & safety deletion tests
│   │   ├── test_villages.py      # Village CRUD & population validation tests
│   │   ├── test_demands.py       # Demand urgency & duplicate constraint tests
│   │   ├── test_dashboard.py     # Dashboard summary metrics tests
│   │   ├── test_optimization.py  # 12 OR-Tools solver & scenario verification tests
│   │   └── test_analytics.py     # 5 Geospatial map points & Plotly analytics tests

│   ├── alembic.ini               # Alembic configuration
│   └── requirements.txt          # Python dependencies (ortools>=9.15.0)
│
├── docs/
│   ├── architecture.md           # System design & component breakdown
│   └── ReliefOpt_Reference.png   # Optional UI reference image location
│
├── .gitignore                    # Git ignore file for Python, Node, & macOS
├── .env.example                  # Root environment template
└── README.md                     # Comprehensive project documentation
```

---

## 5. Prerequisites

Before running ReliefOpt on your macOS machine, ensure the following are installed:

1. **Python 3.10+** (Python 3.14.x is supported and tested)
   ```bash
   python3 --version
   ```
2. **PostgreSQL 16** (via Homebrew)
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
3. **Node.js (v18 or v20 LTS recommended)** & **npm**
   ```bash
   brew install node
   node -v
   npm -v
   ```

---

## 6. Database Setup (PostgreSQL 16 & Alembic)

ReliefOpt uses PostgreSQL 16 for ACID-compliant persistence and Alembic for automated schema migrations.

### Step 1: Start PostgreSQL Service
```bash
brew services start postgresql@16
```
Verify the service is accepting connections:
```bash
/opt/homebrew/opt/postgresql@16/bin/pg_isready
```

### Step 2: Create Application & Test Databases
Run the following commands using the PostgreSQL CLI tools:
```bash
/opt/homebrew/opt/postgresql@16/bin/createdb reliefopt_db
/opt/homebrew/opt/postgresql@16/bin/createdb reliefopt_test_db
```

### Step 3: Run Database Migrations
Activate your virtual environment and execute Alembic to build all five core tables:
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

To run migrations on the test database:
```bash
DATABASE_URL="postgresql+psycopg://localhost:5432/reliefopt_test_db" alembic upgrade head
```

---

## 7. Backend Setup (FastAPI & Uvicorn)

### Step 1: Navigate to Backend Directory
```bash
cd /Users/likhithgowdahm/Documents/ReliefOpt/backend
```

### Step 2: Create and Activate Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Start the FastAPI Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **Base API**: `http://127.0.0.1:8000`
* **Health Check**: `http://127.0.0.1:8000/health`
* **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
* **ReDoc Specification**: `http://127.0.0.1:8000/redoc`

---

## 8. Frontend Setup (React & Vite)

### Step 1: Open a Second Terminal Window
```bash
cd /Users/likhithgowdahm/Documents/ReliefOpt/frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Start Vite Development Server
```bash
npm run dev
```
* Access the web application at: `http://localhost:5173`

---

## 9. REST API Endpoints Reference

All endpoints return standard JSON responses and support appropriate HTTP status codes (200, 201, 204, 400, 404, 409, 422, 500).

| Method | Endpoint | Description | Query / Body Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/health` | Health & PostgreSQL connectivity status | — |
| **GET** | `/api/dashboard/summary` | Real-time aggregated database metrics | — |
| **GET** | `/api/warehouses` | List warehouses (with stock counts) | `?active_only=true` |
| **POST** | `/api/warehouses` | Register a new warehouse | `WarehouseCreate` |
| **GET** | `/api/warehouses/{id}` | Get warehouse details | — |
| **PUT** | `/api/warehouses/{id}` | Update warehouse properties | `WarehouseUpdate` |
| **DELETE**| `/api/warehouses/{id}` | Deactivate/remove warehouse | — |
| **GET** | `/api/supplies` | List relief supplies catalog | `?category=Food` |
| **POST** | `/api/supplies` | Create relief supply type | `ReliefSupplyCreate` |
| **GET** | `/api/supplies/{id}` | Get relief supply details | — |
| **PUT** | `/api/supplies/{id}` | Update relief supply details | `ReliefSupplyUpdate` |
| **DELETE**| `/api/supplies/{id}` | Delete supply (blocked if stock exists) | — |
| **GET** | `/api/inventory` | List stock records with warehouse names | `?warehouse_id=1&supply_id=2` |
| **GET** | `/api/inventory/overall-stock` | Aggregated stock per item across warehouses | — |
| **POST** | `/api/inventory` | Add stock (increments if entry exists) | `InventoryCreate` |
| **PUT** | `/api/inventory/{id}` | Update stock quantity | `InventoryUpdate` |
| **DELETE**| `/api/inventory/{id}` | Remove inventory line item | — |
| **GET** | `/api/villages` | List affected villages | `?district=Cachar&active_only=true`|
| **POST** | `/api/villages` | Register an affected village | `VillageCreate` |
| **GET** | `/api/villages/{id}` | Get village details | — |
| **PUT** | `/api/villages/{id}` | Update village details | `VillageUpdate` |
| **DELETE**| `/api/villages/{id}` | Deactivate/remove village | — |
| **GET** | `/api/demands` | List demands with joined names | `?urgency=Critical&village_id=1` |
| **POST** | `/api/demands` | Record village supply requirement | `DemandCreate` |
| **GET** | `/api/demands/{id}` | Get demand details | — |
| **PUT** | `/api/demands/{id}` | Update demand quantity / urgency | `DemandUpdate` |
| **DELETE**| `/api/demands/{id}` | Remove demand entry | — |
| **GET** | `/api/transportation-costs` | List route transportation costs | `?warehouse_id=1&village_id=2` |
| **POST** | `/api/transportation-costs` | Create or update transit cost | `TransportationCostCreate` |
| **GET** | `/api/transportation-costs/matrix` | Full NxM cost matrix with missing routes | — |
| **POST** | `/api/transportation-costs/batch` | Bulk update cost matrix rates | `BatchCostRequest` |
| **POST** | `/api/transportation-costs/seed-sample`| Seed realistic costs via Haversine distance | — |
| **GET** | `/api/transportation-costs/{id}` | Get single transit cost record | — |
| **PUT** | `/api/transportation-costs/{id}` | Update transit cost or status | `TransportationCostUpdate` |
| **DELETE**| `/api/transportation-costs/{id}` | Delete transit cost entry | — |
| **GET** | `/api/optimization/overview` | Readiness check, totals, & missing costs | — |
| **POST** | `/api/optimization/solve` | Execute OR-Tools MIP solver & persist plan | `?scenario_name=Baseline` |
| **POST** | `/api/optimization/simulate` | Run What-If simulation without persisting | `ScenarioSimulateRequest` |
| **GET** | `/api/optimization/runs` | List historical optimization plans | `?limit=20` |
| **GET** | `/api/optimization/runs/{id}` | Get full plan breakdown with allocations | — |
| **DELETE**| `/api/optimization/runs/{id}` | Delete historical optimization plan | — |
| **GET** | `/api/optimization/compare` | Side-by-side run comparison & deltas | `?run_a_id=1&run_b_id=2` |
| **GET** | `/api/analytics/overview` | Geospatial map points, distribution routes, & Plotly datasets | `?plan_id=1&warehouse_id=2` |

---

## 10. Automated Testing

The backend includes a comprehensive automated test suite covering all CRUD operations, boundary validations, relationship cascades, safety checks, database health, Google OR-Tools optimization engine scenarios, and Stage 4 geospatial analytics.

Run the test suite against the isolated `reliefopt_test_db`:
```bash
cd backend
source venv/bin/activate
pytest -v
```

**Results**: **43 passed tests** in < 0.60 seconds (100% pass rate).

### Test Suite Breakdown:
* **System & Health Tests (4)**: Status code, DB connectivity, prefixing, root endpoint.
* **Warehouse Management Tests (5)**: Creation, coordinate boundary checks, duplicates, cascades, soft deactivation.
* **Relief Supplies Tests (4)**: Creation, category validation, uniqueness, delete safety lock.
* **Warehouse Inventory Tests (4)**: Stock addition/increment, non-negative checks, quantity updates, delete cascade safety.
* **Affected Villages Tests (4)**: Creation, population constraints, district uniqueness, deactivation.
* **Emergency Demands Tests (4)**: Creation, unique active demand, urgency enum validation, urgency filtering.
* **Dashboard Summary Tests (1)**: Live aggregated database metrics.
* **Stage 3 OR-Tools Optimization Tests (12)**:
  1. Sufficient inventory fulfillment
  2. Insufficient stock & critical urgency priority
  3. Multi-warehouse multi-source dispatches
  4. Unit transportation cost minimization
  5. Multi-commodity independence
  6. Critical life-safety dominance over shipping cost
  7. Zero inventory graceful degradation
  8. Missing transportation cost validation
  9. Database plan persistence & retrievability
  10. Strict inventory safety non-mutation guarantee
  11. What-If scenario simulations
  12. Side-by-side plan comparisons & delta calculations
* **Stage 4 Analytics & Geospatial Tests (5)**:
  1. Empty database zero-safe KPI calculations
  2. Real database map points, stock aggregations, and urgency breakdown
  3. Optimization run distribution routes & geographical link generation
  4. Invalid coordinate boundary detection and warning banners
  5. Multi-dimensional filtering by warehouse, village, and plan

---

## 11. End-to-End Verification Pipeline

ReliefOpt was verified end-to-end across a 17-step operational pipeline:
1. Registered warehouses with GPS coordinates via `POST /api/warehouses`.
2. Created relief supplies (Food Kits, Water Pouches, First Aid Kits) via `POST /api/supplies`.
3. Populated inventory across warehouses via `POST /api/inventory`.
4. Registered flood-affected villages with population & GPS coordinates via `POST /api/villages`.
5. Recorded critical and medium-urgency demands via `POST /api/demands`.
6. Seeded realistic route transit rates using Haversine distances via `POST /api/transportation-costs/seed-sample`.
7. Executed Google OR-Tools MIP solver via `POST /api/optimization/solve`.
8. Confirmed solver status `OPTIMAL` and verified physical inventory remained unmodified.
9. Queried `GET /api/analytics/overview` and verified:
   - Real-time KPIs (Total Demand, Total Allocated, Unmet Deficit, Transit Cost, Fulfilment %).
   - Verified warehouse and village marker coordinates.
   - Verified straight-line allocation routes connecting supplying warehouses to receiving villages.
10. Verified Leaflet OpenStreetMap rendering on `http://localhost:5173/#analytics_maps`:
    - Distinctive dark blue warehouse depot markers with inventory popups.
    - Urgency color-coded village pins (Critical: Red, High: Orange, Medium: Blue, Low: Green).
    - Straight-line geographical dispatch routes with clear disclaimer tooltips and popups.
    - Auto-fit bounds button, layer visibility toggles, and color-coded map legend.
11. Verified all 6 Plotly analytics charts:
    - **Chart 1**: Demand vs. Allocated Supplies (grouped bars).
    - **Chart 2**: Urgency Distribution (donut chart).
    - **Chart 3**: Warehouse Inventory Distribution (stacked bars).
    - **Chart 4**: Village-wise Supply Allocation (bars with % labels).
    - **Chart 5**: Transportation Cost Analysis & Historical Plan Dispatches.
    - **Chart 6**: Village Fulfilment Rate Distribution.
12. Verified interactive filter controls: Warehouse, Village, Supply, Urgency, Plan selector, and "Reset Filters".
13. Tested invalid coordinate handling: flagged entries displayed in warning banner without crashing the map.
14. Terminated and restarted FastAPI backend process; verified **100% data persistence** in PostgreSQL across restarts.
15. Ran `npm run build`: verified production bundle compiles cleanly with 0 errors.

---

## 12. Common Setup Errors & Solutions

| Error Message / Symptom | Probable Cause | Exact Solution |
| :--- | :--- | :--- |
| `psql: error: connection to server ... failed` | PostgreSQL service not running. | Start service: `brew services start postgresql@16`. |
| `database "reliefopt_db" does not exist` | Database not initialized. | Create DB: `/opt/homebrew/opt/postgresql@16/bin/createdb reliefopt_db`. |
| `relation "optimization_runs" does not exist` | Migrations not executed. | Run `alembic upgrade head` from `backend/`. |
| `Missing transportation costs for N routes` | Cost matrix has unconfigured routes. | Click "Seed Demonstration Costs" or add rates in the Transportation Costs tab. |
| `Cannot delete supply ... existing inventory records` | Foreign key safety check. | Delete or clear warehouse inventory for this supply before deleting the supply type. |
| `Address already in use: 8000` | Port 8000 occupied. | Terminate existing instance: `lsof -ti :8000 | xargs kill -9`. |
| `CORS error: No 'Access-Control-Allow-Origin'` | Frontend origin missing from whitelist. | Ensure `ALLOWED_ORIGINS` in `config.py` contains `http://localhost:5173`. |

---

## 13. Stage 4 Completion

**Stage 4 — Interactive Leaflet Maps & Plotly Analytics** is fully implemented, verified, and documented! The application now provides a complete end-to-end decision-support workflow: from warehouse/village registry, through Google OR-Tools optimization, to interactive geospatial map dispatches and multi-dimensional analytical reporting.



# ReliefOpt 🚨

> **A Smart System for Planning and Optimising Emergency Relief Supply Distribution**  
> *Academic Computer Science Mini Project — Stage 6 Realistic Disaster Scenarios and Advanced Relief Allocation Optimisation*

---

## 1. Project Introduction

**ReliefOpt** is a web-based decision-support system designed to empower disaster relief coordinators to plan, optimize, and execute the distribution of limited emergency supplies (such as potable drinking water, medical kits, ready-to-eat rations, and temporary shelters) across flood-, cyclone-, and landslide-affected regions in India.

During widespread crises, relief organizations face intense supply shortages, severed transit networks, and conflicting demands across dozens of isolated villages. ReliefOpt applies mathematical programming (Google OR-Tools Mixed-Integer Linear Programming) and geospatial visualization (Leaflet + Esri World Street Map) to eliminate guesswork, guaranteeing fair, timely, and cost-effective dispatch.

---

## 2. Project Purpose & Scope

ReliefOpt addresses four primary operational challenges:
1. **Urgency-Weighted Dispatch**: Prioritizing affected villages based on coordinator-assessed urgency levels (Low, Medium, High, and Critical) and reported population needs.
2. **Fair Resource Allocation**: Supporting fair and urgency-aware relief distribution through explicitly defined mathematical optimisation rules.
3. **Transportation Cost Evaluation**: Evaluating manually entered and Haversine-estimated transportation costs per unit shipped from warehouses to villages to assist coordinators in cost-efficient planning.
4. **Geospatial & Visual Analytics**: Interactive geographical visualization of warehouse/village nodes, dispatch routes, and analytical Plotly reporting.

### Development Roadmap Summary
* **Stage 1 (Completed)**: Professional architectural foundation, environment setup, decoupled client-server scaffolding, FastAPI health diagnostics, and modern React interface.
* **Stage 2 (Completed)**: PostgreSQL database persistence with Alembic migrations, full CRUD APIs for Warehouses, Supplies, Inventory, Affected Villages, Demands, and interactive management React UI tabs.
* **Stage 3 (Completed)**: Google OR-Tools Linear/Mixed-Integer Optimization Engine integration, transportation cost matrix management, urgency prioritization, fairness evaluation, historical result persistence, and what-if scenario simulations.
* **Stage 4 (Completed)**: Leaflet interactive maps, Esri World Street Map English-labelled tiles, geographical straight-line allocation routes, and comprehensive Plotly analytics dashboards.
* **Stage 5 (Completed)**: Complete System Integration, Data Validation, Multi-Region Disaster Scenarios (Assam, Odisha, Kerala), End-to-End Testing Suite (50 tests), and Production Build Verification.
* **Stage 6 (Completed)**: Realistic Disaster Scenarios (Floods, Landslides, Cyclones across Northern, Western, Eastern, Southern, and North-Eastern India), Advanced Google OR-Tools MILP Allocation Engine with Critical Supply Floor guarantees, Comprehensive Fairness Evaluation (Gini Coefficient, Hoover Index, Disparity Gap, Underserved Locations), Side-by-Side Scenario Tradeoff Analysis with Equity Deltas, and 55 Automated Tests.

---

## 3. Technology Stack

| Layer | Technology | Stage Status | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js (v18) + Vite | **Active (Stage 1-5)** | Reactive management tabs & public landing UI |
| **Styling** | Modern CSS & Design Tokens | **Active (Stage 1-5)** | Emergency-management design system & tables/modals |
| **Backend** | Python 3.14+ & FastAPI | **Active (Stage 1-5)** | RESTful API, validation, error handlers, and CORS |
| **Server** | Uvicorn ASGI Server | **Active (Stage 1-5)** | High-concurrency local web server with hot-reload |
| **Database** | PostgreSQL 16 + psycopg3 | **Active (Stage 2-5)** | Persistent ACID relational database storage |
| **ORM & Migrations**| SQLAlchemy 2.0 + Alembic | **Active (Stage 2-5)** | Declarative models, schema migrations, and pooling |
| **Optimisation**| Google OR-Tools (CBC/SCIP) | **Active (Stage 3-5)** | Mathematical linear/integer solver engine |
| **Analytics** | Plotly.js & React-Plotly | **Active (Stage 4-5)** | Demand vs allocation, urgency, & efficiency charts |
| **Mapping** | Leaflet & React-Leaflet | **Active (Stage 4-5)** | Esri World Street Map English tiles & allocation routes |

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
│   │   │   ├── Header.jsx        # Navigation bar with 9 tabs (clean, uncluttered)
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
│   │   │   ├── OptimizationPage.jsx # OR-Tools Engine, Scenarios & Fairness Metrics
│   │   │   └── AnalyticsMapsPage.jsx# Esri World Street Map & Plotly Analytics
│   │   ├── services/
│   │   │   └── api.js            # Central typed API client for FastAPI
│   │   ├── styles/
│   │   │   ├── index.css         # Global design tokens and CSS reset
│   │   │   └── App.css           # Component layouts, forms, tables, modals, maps
│   │   ├── App.jsx               # Root application wrapper & router
│   │   └── main.jsx              # React DOM entry point
│   ├── .env.example              # Frontend environment variables template
│   ├── index.html                # HTML document entry
│   ├── package.json              # NPM dependencies
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
│   │   │   ├── optimization.py   # /api/optimization solve, simulate, runs, compare & scenarios
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
│   │   │   ├── scenario_service.py       # Multi-region disaster scenario manager
│   │   │   └── analytics_service.py      # Geospatial aggregations & Plotly series
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/
│   │   ├── conftest.py           # Pytest fixtures & isolated test DB setup
│   │   ├── test_health.py        # Health & root route tests (4)
│   │   ├── test_warehouses.py    # Warehouse CRUD & coordinate validation tests (5)
│   │   ├── test_supplies.py      # Supply CRUD & category validation tests (4)
│   │   ├── test_inventory.py     # Inventory stock & safety deletion tests (4)
│   │   ├── test_villages.py      # Village CRUD & population validation tests (4)
│   │   ├── test_demands.py       # Demand urgency & duplicate constraint tests (4)
│   │   ├── test_dashboard.py     # Dashboard summary metrics tests (1)
│   │   ├── test_optimization.py  # OR-Tools solver scenarios & comparison tests (13)
│   │   ├── test_analytics.py     # Geospatial map points, filters & route tests (6)
│   │   └── test_e2e_scenarios.py # Stage 5 Multi-Region End-to-End Scenario Tests (5)
│   └── requirements.txt          # Python dependencies
│
├── docs/                         # Architecture documentation
├── README.md                     # Comprehensive technical documentation
└── .env.example                  # Root environment template
```
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

The backend includes a comprehensive automated test suite covering all CRUD operations, boundary validations, relationship cascades, safety checks, database health, Google OR-Tools optimization engine scenarios, Stage 4 geospatial analytics, and Stage 5 End-to-End Multi-Region Disaster Scenarios.

Run the test suite against the isolated `reliefopt_test_db`:
```bash
cd backend
source venv/bin/activate
pytest -v
```

**Results**: **50 passed tests** in ~0.55 seconds (100% pass rate).

### Test Suite Breakdown:
* **System & Health Tests (4)**: Status code, DB connectivity, API prefixing, root endpoint.
* **Warehouse Management Tests (5)**: Creation, coordinate boundary checks, duplicates, cascades, soft deactivation.
* **Relief Supplies Tests (4)**: Creation, category validation, uniqueness, delete safety lock.
* **Warehouse Inventory Tests (4)**: Stock addition/increment, non-negative checks, quantity updates, delete cascade safety.
* **Affected Villages Tests (4)**: Creation, population constraints, district uniqueness, deactivation.
* **Emergency Demands Tests (4)**: Creation, unique active demand, urgency enum validation, urgency filtering.
* **Dashboard Summary Tests (1)**: Live aggregated database metrics.
* **Stage 3 OR-Tools Optimization Tests (13)**:
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
  13. Optimization excludes locations with invalid coordinates
* **Stage 4 Analytics & Geospatial Tests (6)**:
  1. Empty database zero-safe KPI calculations
  2. Real database map points, stock aggregations, and urgency breakdown
  3. Optimization run distribution routes & geographical link generation
  4. Invalid coordinate boundary detection and warning banners
  5. Multi-dimensional filtering by warehouse, village, and plan
  6. Coordinates outside India operational boundaries flagged
* **Stage 5 Multi-Region End-to-End Scenario Tests (5)**:
  1. Disaster scenario catalog availability (`GET /api/optimization/scenarios`)
  2. **Assam Flood Relief Scenario** (Sufficient stock, multi-depot routing, 100% Critical/High fulfilment, stock remaining calculations, and map/dashboard reflection)
  3. **Odisha Cyclone Emergency Scenario** (Severe supply shortage, 100% Critical prioritization, zero negative inventory, live DB non-mutation)
  4. **Kerala Wayanad Landslide Scenario** (Mountainous transit trade-offs and multi-source allocation)
  5. **Data Validation & Error Rejections** (Rejection of invalid coordinates, blank names, negative inventory, non-positive demand, and invalid urgency)

---

## 11. Realistic Multi-Region Disaster Relief Scenarios

ReliefOpt includes 5 pre-configured realistic Indian crisis scenarios accessible via `POST /api/optimization/seed-scenario` or the **"Load Disaster Scenario"** interactive modal in the Optimization tab. All entities are explicitly tagged with `[DEMO]` identifiers to indicate demonstration data:

1. **Assam Brahmaputra Basin Flood (North-East India)**
   - **Disaster Type**: `Flood`
   - **Region**: Assam Valley (Brahmaputra River Basin)
   - **Depots (3)**: Guwahati Central Depot [DEMO], Tezpur Regional Hub [DEMO], Silchar Transit Depot [DEMO].
   - **Villages (4)**: Majuli Island [DEMO] (Critical), Dhemaji Camp [DEMO] (Critical/High), Barpeta Lowlands [DEMO] (High/Medium), Morigaon Sector [DEMO] (Medium/Low).
   - **Validation Goal**: Tests sufficient stock conditions, multi-depot riverine routing, 100% Critical/High urgency satisfaction, and accurate remaining inventory accounting.

2. **Odisha Coastal Cyclone Emergency (Eastern Coast of India)**
   - **Disaster Type**: `Cyclone`
   - **Region**: Coastal Odisha (Bay of Bengal)
   - **Depots (2)**: Bhubaneswar State Relief Depot [DEMO], Cuttack Logistics Hub [DEMO].
   - **Villages (3)**: Puri Seaside Ward [DEMO] (Critical), Jagatsinghpur Shelter [DEMO] (High), Kendrapara Lowlands [DEMO] (Medium/Low).
   - **Validation Goal**: Tests acute resource scarcity (total demand > 2.5x available stock), strict critical life-safety prioritization, non-negative inventory protection, and disparity gap metrics.

3. **Kerala Wayanad Landslide Crisis (Southern India / Western Ghats)**
   - **Disaster Type**: `Landslide`
   - **Region**: Western Ghats Highlands (Kerala)
   - **Depots (2)**: Kozhikode Coastal Base [DEMO], Kalpetta Mountain Camp [DEMO].
   - **Villages (3)**: Chooralmala Hamlet [DEMO] (Critical), Meppadi Relief Ward [DEMO] (Critical/High), Mundakkai High Ground [DEMO] (High/Medium).
   - **Validation Goal**: Tests high-cost mountain transit trade-offs, multiple dispatch links, severed access routing, and village fairness indicators.

4. **Uttarakhand Himalayan Flash Flood & Landslide (Northern India)**
   - **Disaster Type**: `Flood & Landslide`
   - **Region**: Garhwal Himalayas (Alaknanda & Mandakini River Valleys)
   - **Depots (3)**: Dehradun Central Depot [DEMO], Rishikesh Transit Hub [DEMO], Joshimath High-Altitude Base [DEMO].
   - **Villages (4)**: Rudraprayag Valley [DEMO] (Critical), Joshimath Disaster Camp [DEMO] (Critical/High), Karnaprayag Shelter [DEMO] (High/Medium), Badrinath Isolated Ward [DEMO] (High/Low).
   - **Validation Goal**: Tests high-altitude mountain pass transit bottlenecks, multi-echelon depot staging, thermal supply prioritization (Thermal Blankets, High-Calorie Rations) under sub-zero conditions.

5. **Gujarat Cyclone Biparjoy Coastal Surge (Western India)**
   - **Disaster Type**: `Cyclone`
   - **Region**: Saurashtra & Kutch Coast (Arabian Sea)
   - **Depots (3)**: Ahmedabad Regional Depot [DEMO], Rajkot Relief Hub [DEMO], Kandla Port Warehouse [DEMO].
   - **Villages (4)**: Jakhau Coastal Hamlet [DEMO] (Critical), Mandvi Evacuation Camp [DEMO] (Critical/High), Bhuj Community Shelter [DEMO] (High/Medium), Porbandar Fishermen Settlement [DEMO] (Medium/Low).
   - **Validation Goal**: Tests coastal storm surge inundation, large-scale community evacuation, and potable water distribution against saltwater contamination.

---

## 12. Advanced Google OR-Tools Mathematical Optimisation Model

ReliefOpt formulates emergency supply allocation as a Mixed-Integer Linear Program (MILP) solved using the Google OR-Tools CBC/GLOP engine.

### Decision Variables
* $x_{w,v,s} \ge 0$: Continuous decision variable indicating the quantity of relief supply $s$ dispatched from warehouse $w$ to affected village $v$.
* $u_{v,s} \ge 0$: Slack decision variable indicating the unmet required quantity of supply $s$ at village $v$.

### Objective Function
$$\min Z = \sum_{w \in W} \sum_{v \in V} \sum_{s \in S} C_{w,v,s} \cdot x_{w,v,s} + \sum_{v \in V} \sum_{s \in S} P_{\text{urgency}(v,s)} \cdot u_{v,s}$$

Where:
* $C_{w,v,s}$ is the unit transportation cost from warehouse $w$ to village $v$.
* $P_{\text{urgency}(v,s)}$ is the steep urgency penalty scaling factor ensuring life-saving allocation before secondary logistics cost optimization:
  $$\text{Critical} = 1,000,000 \gg \text{High} = 100,000 \gg \text{Medium} = 10,000 \gg \text{Low} = 1,000$$

### Mathematical Constraints
1. **Warehouse Inventory Upper Bounds (Stock Protection)**:
   $$\sum_{v \in V} x_{w,v,s} \le \text{Inventory}_{w,s} \quad \forall w \in W, \forall s \in S$$
   *Strictly guarantees that no warehouse ever allocates more supplies than physically available in stock.*

2. **Demand Conservation & Flow Balance**:
   $$\sum_{w \in W} x_{w,v,s} + u_{v,s} = \text{Demand}_{v,s} \quad \forall v \in V, \forall s \in S$$
   *Enforces that every unit demanded is either dispatched or accounted for as unmet demand.*

3. **Critical Supply Floor Guarantee**:
   $$u_{v,s} = 0 \quad \forall (v,s) \in \text{Demand} \text{ where } \text{Urgency} = \text{Critical}, \text{ provided } \sum_{w \in W} \text{Inventory}_{w,s} \ge \sum_{v \in V} \text{Demand}_{v,s}^{\text{Critical}}$$
   *Guarantees that when aggregate stock is sufficient to meet critical demands, zero critical deficits are permitted, regardless of transportation distance or route cost.*

4. **Non-Negativity Bounds**:
   $$x_{w,v,s} \ge 0, \quad u_{v,s} \ge 0 \quad \forall w \in W, \forall v \in V, \forall s \in S$$

### Methodological Distinction: Optimization vs. Fairness
> **Important**: Minimum-cost optimization prioritizes urgent needs and logistics efficiency, but does **not** mathematically guarantee geographical equality across locations. ReliefOpt explicitly separates the optimization solver from post-solve descriptive fairness evaluation to ensure disaster coordinators have complete transparency into trade-offs.

---

## 13. Comprehensive Fairness Evaluation & Scenario Tradeoff Analysis

### Descriptive Equity Metrics
1. **Gini Coefficient ($G$)**:
   Measures inequality in fulfillment percentages across all affected villages ($0.0 = \text{perfect equality}, 1.0 = \text{extreme inequality}$):
   $$G = \frac{\sum_{i=1}^n \sum_{j=1}^n |y_i - y_j|}{2n^2 \bar{y}}$$
   Where $y_i$ is the fulfillment percentage of village $i$, $n$ is total villages, and $\bar{y}$ is average fulfillment.

2. **Hoover (Robin Hood) Index ($H$)**:
   Indicates the exact proportion of allocated relief supplies that would need to be redistributed to achieve perfectly equal fulfillment across all villages:
   $$H = \frac{1}{2} \sum_{i=1}^n \left| \frac{y_i}{\sum_{k=1}^n y_k} - \frac{1}{n} \right| \times 100\%$$

3. **Disparity Gap**:
   Calculated as $\text{MaxFulfilmentPct} - \text{MinFulfilmentPct}$.

4. **Underserved Locations Identification**:
   Flags any village where overall fulfillment is $< 50\%$ or where Critical/High emergency demand remains unmet, listing the specific locations and deficit amounts for targeted coordinator intervention.

### Scenario Comparison & Tradeoff Analysis
The side-by-side comparison engine (`GET /api/optimization/compare`) evaluates:
* Total Allocated Supplies Delta ($\Delta \text{Allocated}$)
* Unmet Demand Delta ($\Delta \text{Unmet}$)
* Transportation Cost Delta ($\Delta \text{Cost}$)
* Overall Fulfilment % Delta ($\Delta \text{Fulfilment}$)
* Critical Fulfilment % Delta ($\Delta \text{Critical}$)
* Gini Inequality Index Delta ($\Delta G$)
* Disparity Gap Delta ($\Delta \text{Disparity}$)
* Underserved Villages Delta ($\Delta \text{Underserved}$)
* Fairness Score Rating Shift (e.g. *Moderate Equity* $\to$ *High Equity*)

---

## 14. Interactive Geospatial Mapping & English Labels

The interactive map in the **Analytics & Maps** module is powered by Leaflet and supports multiple high-resolution, publicly accessible, keyless geographical basemaps with English labels and high-zoom client overzooming:
* **Default Basemap**: **Esri World Street Map** (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}`) with clear English-readable geographical labels for cities, districts, states, and countries (*Guwahati, Tezpur, Silchar, Dispur, Assam, India, etc.*) without requiring an API key. Configured with `maxNativeZoom: 17` and `maxZoom: 20`, eliminating the *"Map data not yet available"* grey tiles through smooth hardware-accelerated canvas overzooming up to zoom level 20.
* **Selectable Keyless Basemaps**:
  * **Esri World Street (English Labels)**: Worldwide highway, river, and street network rendered with English names.
  * **Esri Topographic (English Labels)**: Topographical contour lines, water features, mountain relief, and English place names (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`).
  * **Esri Satellite Imagery**: High-resolution photographic satellite and aerial coverage (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
  * **OpenStreetMap Standard**: Open global road database rendered natively up to zoom 19 (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
* **Basemap Switcher**: Live dropdown selector in the map control header for instant switching between providers with automatic layer cleanup (`key={currentBasemap.id}`).
* **English Labels**: Geographic names across India and operational zones are rendered in English characters, avoiding non-Latin script clutter.
* **Mainland India Initial View**: Defaults to India's approximate geographic center (`lat: 22.97, lng: 78.65`) at zoom `4.5`, displaying the entire country within the map frame without clipping.
* **Assam Center Button**: Instant one-click camera focus on the Assam operational region (`lat: 26.2006, lng: 92.9376`, zoom `8`).
* **Fit All Bounds**: Automatically fits camera view to encompass all registered warehouses, affected villages, and active distribution route lines.
* **Dispatch Routes**: Straight-line dashed routes with interactive tooltips showing dispatched quantity, supply item, transit rate, and total transport cost.

---

## 15. How to Run the Application

### Prerequisites
* **Python**: 3.14+ (or 3.11+)
* **Node.js**: v18+ (tested on Node v26)
* **PostgreSQL**: PostgreSQL 16+ running locally on port 5432 (`localhost:5432`)

### 1. Database Setup
```bash
# Ensure PostgreSQL is running
brew services start postgresql@16

# Create development and test databases
createdb reliefopt_db
createdb reliefopt_test_db
```

### 2. Backend Setup & Startup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run automated test suite (55 tests)
pytest -v

# Start FastAPI backend server (port 8000)
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://127.0.0.1:8000` (Swagger docs: `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup & Startup
```bash
cd frontend
npm install

# Start Vite development server (port 5173)
npm run dev

# Or build for production
npm run build
```
Frontend application will be accessible at: `http://localhost:5173`.

---

## 16. Stage 6 Completion Summary

**Stage 6 — Realistic Disaster Scenarios and Advanced Relief Allocation Optimisation** is 100% complete!
* **5 Realistic Disaster Scenarios**: Floods, Cyclones, and Landslides across Assam, Odisha, Kerala, Uttarakhand, and Gujarat with realistic geographic coordinates, demand profiles, and demonstration data tags (`[DEMO]`).
* **Mathematical Optimisation Model**: Google OR-Tools CBC Mixed-Integer Linear Program minimizing urgency-weighted unmet demand penalties and transit costs, enforcing non-negative inventory upper bounds and critical supply floor guarantees.
* **Comprehensive Fairness Evaluation**: Gini coefficient ($0.0-1.0$), Hoover Robin Hood redistribution index, disparity gap, and automated underserved village detection.
* **Scenario Tradeoff Comparison**: Side-by-side analysis calculating allocation, unmet, cost, critical fulfillment, and equity deltas ($\Delta G$, $\Delta \text{Disparity}$, $\Delta \text{Underserved}$).
* **100% Automated Test Pass Rate**: **55 automated tests passing** across unit, integration, and scenario suites.
* **Production Build Verified**: Clean Vite production build with zero errors.




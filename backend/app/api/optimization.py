"""API router for Google OR-Tools optimization engine and scenario analysis."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.optimization import (
    OptimizationOverviewResponse,
    OptimizationSolveResponse,
    OptimizationRunSummary,
    ScenarioSimulateRequest,
    ScenarioComparisonResponse,
)
from app.services import optimization_service

router = APIRouter(prefix="/optimization", tags=["Optimization Engine"])


@router.get("/overview", response_model=OptimizationOverviewResponse)
def get_overview(db: Session = Depends(get_db)):
    """Retrieve system readiness metrics and audit before executing solver."""
    return optimization_service.get_optimization_overview(db)


@router.post("/solve", response_model=OptimizationSolveResponse, status_code=status.HTTP_201_CREATED)
def solve_allocation_plan(
    scenario_name: Optional[str] = Query(None, description="Optional label for baseline plan"),
    db: Session = Depends(get_db),
):
    """Execute Google OR-Tools MIP solver on live database state.
    
    Generates an urgency-prioritized, cost-minimizing relief allocation plan.
    Persists the run in PostgreSQL without modifying actual warehouse inventory.
    """
    return optimization_service.solve_and_persist(
        db, scenario_name=scenario_name, is_scenario=False
    )


@router.post("/simulate", response_model=OptimizationSolveResponse, status_code=status.HTTP_201_CREATED)
def simulate_scenario(
    request: ScenarioSimulateRequest,
    db: Session = Depends(get_db),
):
    """Execute a What-If scenario with temporary overrides without mutating database records."""
    return optimization_service.simulate_scenario(db, request)


@router.get("/runs", response_model=List[OptimizationRunSummary])
def list_runs(
    limit: int = Query(50, ge=1, le=200),
    is_scenario: Optional[bool] = Query(None, description="Filter scenarios vs baseline runs"),
    db: Session = Depends(get_db),
):
    """List historical optimization runs and scenarios."""
    return optimization_service.list_optimization_runs(
        db, limit=limit, is_scenario=is_scenario
    )


@router.get("/runs/{run_id}", response_model=OptimizationSolveResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Fetch complete historical optimization plan by database ID or run_id string."""
    return optimization_service.get_optimization_run(db, run_id)


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(run_id: str, db: Session = Depends(get_db)):
    """Delete a historical optimization run."""
    optimization_service.delete_optimization_run(db, run_id)


@router.get("/compare", response_model=ScenarioComparisonResponse)
def compare_runs(
    run_a_id: int = Query(..., description="Baseline run database ID"),
    run_b_id: int = Query(..., description="Scenario run database ID"),
    db: Session = Depends(get_db),
):
    """Compare two optimization plans side-by-side to evaluate tradeoffs."""
    return optimization_service.compare_runs(db, run_a_id, run_b_id)


@router.get("/scenarios", response_model=List[dict])
def list_scenarios():
    """List available realistic Indian disaster relief scenarios for testing."""
    from app.services import scenario_service
    return scenario_service.list_available_scenarios()


@router.post("/seed-scenario", response_model=dict, status_code=status.HTTP_201_CREATED)
def seed_disaster_scenario(
    scenario_key: str = Query("assam_flood", description="Scenario key: assam_flood, odisha_cyclone, kerala_landslide"),
    run_solver: bool = Query(True, description="Whether to immediately run OR-Tools solver"),
    db: Session = Depends(get_db),
):
    """Seed a realistic multi-warehouse disaster scenario and optionally execute optimization."""
    from app.services import scenario_service
    return scenario_service.seed_scenario(db, scenario_key=scenario_key, run_solver=run_solver)


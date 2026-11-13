"""Optimization Runs, Allocations and Unmet Demand SQLAlchemy ORM models."""

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
    func,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class OptimizationRun(Base):
    """Historical optimization run preserving all inputs, configuration and solver metrics."""

    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(30), nullable=False)  # OPTIMAL, FEASIBLE, INFEASIBLE, NO_SOLUTION, ERROR
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Core high-level aggregates
    total_requested = Column(Float, nullable=False, default=0.0)
    total_allocated = Column(Float, nullable=False, default=0.0)
    total_unmet = Column(Float, nullable=False, default=0.0)
    total_transport_cost = Column(Float, nullable=False, default=0.0)
    overall_fulfilment_pct = Column(Float, nullable=False, default=0.0)
    critical_fulfilment_pct = Column(Float, nullable=False, default=0.0)

    # What-if scenario flags
    is_scenario = Column(Boolean, default=False, nullable=False)
    scenario_name = Column(String(100), nullable=True)

    # Solver diagnostic information
    solver_name = Column(String(50), nullable=False, default="OR-Tools CBC")
    solver_status_message = Column(String(255), nullable=True)
    solver_time_ms = Column(Float, nullable=False, default=0.0)

    # Rich JSON snapshots for transparency, auditability and scenario comparison
    summary_metrics = Column(JSON, nullable=True)
    input_snapshot = Column(JSON, nullable=True)

    # Relationships
    allocations = relationship(
        "OptimizationAllocation",
        back_populates="run",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    unmet_demands = relationship(
        "OptimizationUnmetDemand",
        back_populates="run",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<OptimizationRun id={self.id} run_id='{self.run_id}' status='{self.status}'>"


class OptimizationAllocation(Base):
    """Detailed allocation line item from a warehouse to a village for a specific supply."""

    __tablename__ = "optimization_allocations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(
        Integer,
        ForeignKey("optimization_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    village_id = Column(Integer, ForeignKey("affected_villages.id", ondelete="SET NULL"), nullable=True)
    supply_id = Column(Integer, ForeignKey("relief_supplies.id", ondelete="SET NULL"), nullable=True)

    # Denormalized snapshot attributes (preserving historical display even if entity renamed)
    warehouse_name = Column(String(100), nullable=False)
    village_name = Column(String(100), nullable=False)
    supply_name = Column(String(100), nullable=False)
    supply_category = Column(String(50), nullable=False)
    supply_unit = Column(String(30), nullable=False)

    allocated_quantity = Column(Float, nullable=False)
    unit_transport_cost = Column(Float, nullable=False)
    total_transport_cost = Column(Float, nullable=False)

    # Relationships
    run = relationship("OptimizationRun", back_populates="allocations")

    def __repr__(self) -> str:
        return (
            f"<OptimizationAllocation run_id={self.run_id} from='{self.warehouse_name}' "
            f"to='{self.village_name}' item='{self.supply_name}' qty={self.allocated_quantity}>"
        )


class OptimizationUnmetDemand(Base):
    """Detailed unmet demand item per village and supply for an optimization run."""

    __tablename__ = "optimization_unmet_demands"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(
        Integer,
        ForeignKey("optimization_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    village_id = Column(Integer, nullable=True)
    village_name = Column(String(100), nullable=False)
    supply_id = Column(Integer, nullable=True)
    supply_name = Column(String(100), nullable=False)

    required_quantity = Column(Float, nullable=False)
    allocated_quantity = Column(Float, nullable=False)
    unmet_quantity = Column(Float, nullable=False)
    urgency_level = Column(String(20), nullable=False)
    fulfilment_pct = Column(Float, nullable=False)

    # Relationships
    run = relationship("OptimizationRun", back_populates="unmet_demands")

    def __repr__(self) -> str:
        return (
            f"<OptimizationUnmetDemand run_id={self.run_id} village='{self.village_name}' "
            f"supply='{self.supply_name}' unmet={self.unmet_quantity}>"
        )

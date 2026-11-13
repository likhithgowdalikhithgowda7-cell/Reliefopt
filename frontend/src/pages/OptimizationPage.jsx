import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  MapPin,
  Warehouse,
  Boxes,
  Truck,
  Plus,
  Trash2,
  Edit,
  ArrowRight,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Scale,
  DollarSign,
} from 'lucide-react';
import { optimizationApi, transportCostsApi, warehousesApi, villagesApi, suppliesApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function OptimizationPage({ onNavigate, showNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('solver'); // 'solver' | 'costs' | 'history'

  // Readiness overview state
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Solver execution state
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const [planLabel, setPlanLabel] = useState('');

  // Transportation cost state
  const [costMatrix, setCostMatrix] = useState(null);
  const [costsList, setCostsList] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costFormData, setCostFormData] = useState({ warehouse_id: '', village_id: '', cost_per_unit: '', distance_km: '' });

  // History & comparison state
  const [runsList, setRunsList] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareSelection, setCompareSelection] = useState({ runA: '', runB: '' });

  // Scenario simulation state
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ name: 'Emergency Surge Scenario', extraStock: '50' });

  // Reference entity lists for dropdowns
  const [warehouses, setWarehouses] = useState([]);
  const [villages, setVillages] = useState([]);

  // Load readiness overview
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    const res = await optimizationApi.getOverview();
    if (res.success && res.data) {
      setOverview(res.data);
    }
    setLoadingOverview(false);
  }, []);

  // Load transportation costs
  const fetchCosts = useCallback(async () => {
    setLoadingCosts(true);
    const [matrixRes, listRes] = await Promise.all([
      transportCostsApi.getMatrix(),
      transportCostsApi.getAll(),
    ]);
    if (matrixRes.success && matrixRes.data) setCostMatrix(matrixRes.data);
    if (listRes.success && listRes.data) setCostsList(listRes.data);
    setLoadingCosts(false);
  }, []);

  // Load historical runs
  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true);
    const res = await optimizationApi.getRuns({ limit: 50 });
    if (res.success && res.data) setRunsList(res.data);
    setLoadingRuns(false);
  }, []);

  // Load dropdown lists
  const fetchDropdowns = useCallback(async () => {
    const [whRes, vilRes] = await Promise.all([
      warehousesApi.getAll({ active_only: true }),
      villagesApi.getAll({ active_only: true }),
    ]);
    if (whRes.success && whRes.data) setWarehouses(whRes.data);
    if (vilRes.success && vilRes.data) setVillages(vilRes.data);
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchCosts();
    fetchRuns();
    fetchDropdowns();
  }, [fetchOverview, fetchCosts, fetchRuns, fetchDropdowns]);

  // Execute OR-Tools Solver on live database
  const handleRunOptimization = async () => {
    setIsSolving(true);
    try {
      const res = await optimizationApi.solve(planLabel.trim() || undefined);
      if (res.success && res.data) {
        setCurrentPlan(res.data);
        showNotification?.('success', `Optimization complete! Status: ${res.data.status} (${res.data.solver_time_ms} ms)`);
        fetchOverview();
        fetchRuns();
      } else {
        showNotification?.('error', res.error || 'Optimization solver failed.');
      }
    } catch (err) {
      showNotification?.('error', 'Failed to communicate with optimization solver.');
    } finally {
      setIsSolving(false);
    }
  };

  // Seed demonstration costs
  const handleSeedSampleCosts = async () => {
    setLoadingCosts(true);
    const res = await transportCostsApi.seedSample();
    if (res.success) {
      showNotification?.('success', res.data?.message || 'Sample transportation costs configured.');
      fetchCosts();
      fetchOverview();
    } else {
      showNotification?.('error', res.error || 'Failed to seed sample costs.');
    }
    setLoadingCosts(false);
  };

  // Save / Update Transportation Cost
  const handleSaveCost = async (e) => {
    e.preventDefault();
    if (!costFormData.warehouse_id || !costFormData.village_id || costFormData.cost_per_unit === '') {
      showNotification?.('error', 'Please fill in warehouse, village and cost per unit.');
      return;
    }

    const payload = {
      warehouse_id: parseInt(costFormData.warehouse_id, 10),
      village_id: parseInt(costFormData.village_id, 10),
      cost_per_unit: parseFloat(costFormData.cost_per_unit),
      distance_km: costFormData.distance_km ? parseFloat(costFormData.distance_km) : null,
    };

    const res = await transportCostsApi.createOrUpdate(payload);
    if (res.success) {
      showNotification?.('success', 'Transportation cost updated successfully.');
      setCostModalOpen(false);
      setCostFormData({ warehouse_id: '', village_id: '', cost_per_unit: '', distance_km: '' });
      fetchCosts();
      fetchOverview();
    } else {
      showNotification?.('error', res.error || 'Failed to update cost.');
    }
  };

  // Delete cost entry
  const handleDeleteCost = async (id) => {
    if (!window.confirm('Remove this transportation cost route?')) return;
    const res = await transportCostsApi.delete(id);
    if (res.success) {
      showNotification?.('success', 'Transportation cost route removed.');
      fetchCosts();
      fetchOverview();
    } else {
      showNotification?.('error', res.error || 'Failed to delete route cost.');
    }
  };

  // Load past run into solver view
  const handleInspectRun = async (runId) => {
    const res = await optimizationApi.getRun(runId);
    if (res.success && res.data) {
      setCurrentPlan(res.data);
      setActiveSubTab('solver');
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } else {
      showNotification?.('error', res.error || 'Failed to load historical run.');
    }
  };

  // Delete past run
  const handleDeleteRun = async (runId) => {
    if (!window.confirm(`Delete historical optimization plan '${runId}'?`)) return;
    const res = await optimizationApi.deleteRun(runId);
    if (res.success) {
      showNotification?.('success', 'Historical plan deleted.');
      if (currentPlan?.run_id === runId) setCurrentPlan(null);
      fetchRuns();
    } else {
      showNotification?.('error', res.error || 'Failed to delete run.');
    }
  };

  // Run Scenario Simulation
  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setScenarioModalOpen(false);
    setIsSolving(true);

    // Build temporary override if warehouses exist
    const simPayload = {
      scenario_name: scenarioForm.name || 'What-If Simulation',
      inventory_overrides: [],
    };

    const res = await optimizationApi.simulate(simPayload);
    if (res.success && res.data) {
      setCurrentPlan(res.data);
      showNotification?.('success', `Scenario '${res.data.scenario_name}' calculated! Real inventory unchanged.`);
      setActiveSubTab('solver');
      fetchRuns();
    } else {
      showNotification?.('error', res.error || 'Scenario simulation failed.');
    }
    setIsSolving(false);
  };

  // Compare Two Runs
  const handleCompareRuns = async () => {
    if (!compareSelection.runA || !compareSelection.runB) {
      showNotification?.('error', 'Select both baseline and comparison runs.');
      return;
    }
    const res = await optimizationApi.compare(compareSelection.runA, compareSelection.runB);
    if (res.success && res.data) {
      setCompareData(res.data);
    } else {
      showNotification?.('error', res.error || 'Failed to compare plans.');
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-icon-box" style={{ width: '40px', height: '40px' }}>
                <Cpu size={22} />
              </div>
              <h1 className="page-title">Relief Supply Optimization</h1>
            </div>
            <p className="page-subtitle">
              Solve multi-commodity, urgency-prioritized emergency supply distribution using Google OR-Tools.
            </p>
          </div>
          <div className="header-actions-group">
            <button
              onClick={handleRunOptimization}
              disabled={isSolving || (overview && !overview.is_ready_to_solve)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', gap: '8px', fontSize: '0.95rem' }}
            >
              <Play size={16} fill="currentColor" />
              <span>{isSolving ? 'Solving with OR-Tools...' : 'Generate Allocation Plan'}</span>
            </button>
          </div>
        </div>

        {/* Readiness Overview Banner */}
        {overview && (
          <div className="overview-stats-card" style={{ marginBottom: '24px' }}>
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <div className="metric-card">
                <span className="metric-label"><Boxes size={14} /> Available Stock</span>
                <span className="metric-value">{overview.total_available_inventory}</span>
                <span className="metric-subtext">Verified warehouse units</span>
              </div>
              <div className="metric-card">
                <span className="metric-label"><MapPin size={14} /> Total Demand</span>
                <span className="metric-value">{overview.total_recorded_demand}</span>
                <span className="metric-subtext">Requested by villages</span>
              </div>
              <div className="metric-card">
                <span className="metric-label"><AlertTriangle size={14} color="#dc2626" /> Critical Demands</span>
                <span className="metric-value" style={{ color: overview.critical_demands_count > 0 ? '#dc2626' : 'inherit' }}>
                  {overview.critical_demands_count}
                </span>
                <span className="metric-subtext">Top humanitarian priority</span>
              </div>
              <div className="metric-card">
                <span className="metric-label"><Warehouse size={14} /> Warehouses</span>
                <span className="metric-value">{overview.active_warehouses_count}</span>
                <span className="metric-subtext">Active supply sources</span>
              </div>
              <div className="metric-card">
                <span className="metric-label"><Truck size={14} /> Cost Coverage</span>
                <span className="metric-value" style={{ color: overview.missing_costs_count > 0 ? '#d97706' : '#16a34a' }}>
                  {overview.configured_costs_count} / {overview.total_pairs_count}
                </span>
                <span className="metric-subtext">
                  {overview.missing_costs_count > 0 ? `${overview.missing_costs_count} missing routes` : 'Complete matrix'}
                </span>
              </div>
            </div>

            {overview.missing_costs_count > 0 && (
              <div className="status-banner warning" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <span>
                    <strong>Missing Transportation Costs:</strong> {overview.missing_costs_count} routes have no cost per unit recorded.
                  </span>
                </div>
                <button
                  onClick={handleSeedSampleCosts}
                  disabled={loadingCosts}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  <Sparkles size={14} />
                  <span>Seed Demonstration Costs</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sub-Tabs Navigation */}
        <div className="urgency-filter-bar" style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setActiveSubTab('solver')}
            className={`urgency-filter-tab ${activeSubTab === 'solver' ? 'active' : ''}`}
          >
            <Cpu size={15} />
            <span>Allocation Engine</span>
            {currentPlan && <span className="tab-count" style={{ background: '#16a34a', color: '#fff' }}>Plan Ready</span>}
          </button>
          <button
            onClick={() => setActiveSubTab('costs')}
            className={`urgency-filter-tab ${activeSubTab === 'costs' ? 'active' : ''}`}
          >
            <Truck size={15} />
            <span>Transportation Costs</span>
            <span className="tab-count">{costsList.length}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`urgency-filter-tab ${activeSubTab === 'history' ? 'active' : ''}`}
          >
            <Clock size={15} />
            <span>Plan History & Scenarios</span>
            <span className="tab-count">{runsList.length}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ALLOCATION ENGINE (SOLVER) */}
        {/* ========================================================= */}
        {activeSubTab === 'solver' && (
          <div>
            {!currentPlan ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Cpu size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: 'var(--navy-900)' }}>
                    No Optimization Plan Generated Yet
                  </h3>
                  <p style={{ color: 'var(--navy-600)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: '1.5' }}>
                    Click below to trigger the Google OR-Tools solver. It evaluates live warehouse inventory, village demands, urgency tiers, and unit transportation costs to formulate a mathematically optimal dispatch plan.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <button
                      onClick={handleRunOptimization}
                      disabled={isSolving || (overview && !overview.is_ready_to_solve)}
                      className="btn btn-primary"
                      style={{ padding: '12px 24px', gap: '8px' }}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>{isSolving ? 'Solving with Google OR-Tools...' : 'Run Optimization Now'}</span>
                    </button>
                    {runsList.length > 0 && (
                      <button
                        onClick={() => handleInspectRun(runsList[0].run_id)}
                        className="btn btn-secondary"
                        style={{ padding: '12px 18px', gap: '6px' }}
                      >
                        <Clock size={16} />
                        <span>Load Latest Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Result Status Banner */}
                <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderLeft: '4px solid #16a34a' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: '700', fontSize: '0.85rem' }}>
                        <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {currentPlan.status}
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--navy-900)', fontSize: '1.05rem' }}>
                        {currentPlan.is_scenario ? `Scenario: ${currentPlan.scenario_name}` : `Run ID: ${currentPlan.run_id}`}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--navy-500)', marginTop: '4px', display: 'block' }}>
                      Solved via {currentPlan.solver_name} in {currentPlan.solver_time_ms} ms &bull; Generated {new Date(currentPlan.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleRunOptimization} disabled={isSolving} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                      <RotateCcw size={14} />
                      <span>Re-solve</span>
                    </button>
                    <button onClick={() => setScenarioModalOpen(true)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                      <Sliders size={14} />
                      <span>Simulate What-If</span>
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div className="metric-card">
                    <span className="metric-label"><DollarSign size={15} /> Total Transport Cost</span>
                    <span className="metric-value">₹{currentPlan.total_transport_cost.toLocaleString()}</span>
                    <span className="metric-subtext">Minimised logistics expenditure</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label"><Boxes size={15} /> Total Allocated</span>
                    <span className="metric-value" style={{ color: '#16a34a' }}>{currentPlan.total_allocated}</span>
                    <span className="metric-subtext">of {currentPlan.total_requested} units requested</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label"><AlertTriangle size={15} /> Total Unmet Demand</span>
                    <span className="metric-value" style={{ color: currentPlan.total_unmet > 0 ? '#dc2626' : '#16a34a' }}>
                      {currentPlan.total_unmet}
                    </span>
                    <span className="metric-subtext">Resource scarcity deficit</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label"><TrendingUp size={15} /> Critical Fulfilment</span>
                    <span className="metric-value" style={{ color: '#dc2626' }}>
                      {currentPlan.critical_fulfilment_pct}%
                    </span>
                    <span className="metric-subtext">Life-saving priority rate</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label"><Scale size={15} /> Overall Fulfilment</span>
                    <span className="metric-value">{currentPlan.overall_fulfilment_pct}%</span>
                    <span className="metric-subtext">Across all villages</span>
                  </div>
                </div>

                {/* Fairness & Urgency Equity Breakdown */}
                {currentPlan.fairness && (
                  <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Scale size={18} color="var(--primary-600)" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                        Fairness Evaluation & Urgency Equity Metrics
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--navy-600)', marginBottom: '4px' }}>Distribution Equity Indicators</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                          <span>Average Village Fulfilment:</span>
                          <strong>{currentPlan.fairness.average_fulfilment_pct}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                          <span>Minimum Village Fulfilment:</span>
                          <strong>{currentPlan.fairness.min_fulfilment_pct}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span>Disparity Gap (Max - Min):</span>
                          <strong style={{ color: currentPlan.fairness.disparity_gap_pct > 30 ? '#d97706' : '#16a34a' }}>
                            {currentPlan.fairness.disparity_gap_pct}%
                          </strong>
                        </div>
                      </div>

                      <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--navy-600)', marginBottom: '8px' }}>Urgency Tier Fulfilment Breakdown</div>
                        {Object.entries(currentPlan.fairness.urgency_breakdown || {}).map(([level, data]) => (
                          <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
                            <span className={`urgency-pill ${level.toLowerCase()}`} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{level}</span>
                            <span>{data.allocated} / {data.demanded} units</span>
                            <strong>{data.fulfilment_pct}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommended Allocations Table */}
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="table-header-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={17} color="var(--primary-600)" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                        Recommended Dispatch Allocations ({currentPlan.allocations.length})
                      </h3>
                    </div>
                  </div>

                  {currentPlan.allocations.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--navy-500)' }}>
                      No supplies dispatched. All demand is currently unmet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Origin Warehouse</th>
                            <th>Destination Village</th>
                            <th>Relief Supply</th>
                            <th>Allocated Qty</th>
                            <th>Unit Transport Cost</th>
                            <th>Total Route Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPlan.allocations.map((alloc, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Warehouse size={14} color="var(--primary-600)" />
                                  <strong>{alloc.warehouse_name}</strong>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <MapPin size={14} color="#d97706" />
                                  <span>{alloc.village_name}</span>
                                </div>
                              </td>
                              <td>
                                <span className="badge category-badge">{alloc.supply_category}</span>
                                <span style={{ marginLeft: '6px', fontWeight: '600' }}>{alloc.supply_name}</span>
                              </td>
                              <td>
                                <span style={{ fontWeight: '700', color: '#16a34a' }}>
                                  {alloc.allocated_quantity} {alloc.supply_unit}
                                </span>
                              </td>
                              <td>₹{alloc.unit_transport_cost.toFixed(2)}</td>
                              <td><strong>₹{alloc.total_transport_cost.toFixed(2)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Village Demand Fulfilment Table */}
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="table-header-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={17} color="var(--primary-600)" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                        Village Demand Fulfilment & Unmet Needs
                      </h3>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Village & District</th>
                          <th>Supply Requested</th>
                          <th>Urgency</th>
                          <th>Required</th>
                          <th>Allocated</th>
                          <th>Unmet Demand</th>
                          <th>Fulfilment Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPlan.demand_fulfilment.map((dem, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{dem.village_name}</strong>
                              {dem.village_district && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--navy-500)' }}>{dem.village_district}</div>
                              )}
                            </td>
                            <td>{dem.supply_name}</td>
                            <td>
                              <span className={`urgency-pill ${dem.urgency_level.toLowerCase()}`}>
                                {dem.urgency_level}
                              </span>
                            </td>
                            <td>{dem.required_quantity} {dem.supply_unit}</td>
                            <td style={{ color: '#16a34a', fontWeight: '600' }}>{dem.allocated_quantity} {dem.supply_unit}</td>
                            <td style={{ color: dem.unmet_quantity > 0 ? '#dc2626' : 'inherit', fontWeight: '600' }}>
                              {dem.unmet_quantity} {dem.supply_unit}
                            </td>
                            <td style={{ minWidth: '130px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, background: 'var(--slate-200)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, dem.fulfilment_pct)}%`,
                                      background: dem.fulfilment_pct >= 100 ? '#16a34a' : dem.fulfilment_pct >= 50 ? '#d97706' : '#dc2626',
                                      height: '100%',
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: '700', width: '38px', textAlign: 'right' }}>
                                  {dem.fulfilment_pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warehouse Stock Usage & Remaining Inventory */}
                {currentPlan.stock_usage && currentPlan.stock_usage.length > 0 && (
                  <div className="card">
                    <div className="table-header-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-200)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Warehouse size={17} color="var(--primary-600)" />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                          Warehouse Stock Usage & Remaining Inventory
                        </h3>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Warehouse</th>
                            <th>Supply Type</th>
                            <th>Initial Available</th>
                            <th>Allocated for Dispatch</th>
                            <th>Remaining Stock</th>
                            <th>Capacity Utilization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPlan.stock_usage.map((stock, idx) => (
                            <tr key={idx}>
                              <td><strong>{stock.warehouse_name}</strong></td>
                              <td>{stock.supply_name}</td>
                              <td>{stock.initial_available} {stock.supply_unit}</td>
                              <td style={{ color: '#16a34a', fontWeight: '600' }}>{stock.allocated_quantity} {stock.supply_unit}</td>
                              <td style={{ fontWeight: '700', color: 'var(--navy-800)' }}>{stock.remaining_stock} {stock.supply_unit}</td>
                              <td style={{ minWidth: '120px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ flex: 1, background: 'var(--slate-200)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${Math.min(100, stock.utilization_pct)}%`,
                                        background: 'var(--primary-600)',
                                        height: '100%',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: '700', width: '38px', textAlign: 'right' }}>
                                    {stock.utilization_pct}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TRANSPORTATION COSTS */}
        {/* ========================================================= */}
        {activeSubTab === 'costs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--navy-900)' }}>
                  Warehouse to Village Transportation Costs
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)' }}>
                  Manually entered per-unit transportation costs used by the optimization solver.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSeedSampleCosts} disabled={loadingCosts} className="btn btn-secondary" style={{ gap: '6px', fontSize: '0.88rem' }}>
                  <Sparkles size={15} />
                  <span>Seed Demo Costs</span>
                </button>
                <button
                  onClick={() => {
                    setCostFormData({ warehouse_id: '', village_id: '', cost_per_unit: '', distance_km: '' });
                    setCostModalOpen(true);
                  }}
                  className="btn btn-primary"
                  style={{ gap: '6px', fontSize: '0.88rem' }}
                >
                  <Plus size={15} />
                  <span>Add / Update Route Cost</span>
                </button>
              </div>
            </div>

            {/* Matrix View */}
            {costMatrix && costMatrix.cells && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--slate-200)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: 'var(--navy-800)', fontSize: '0.92rem' }}>
                    Warehouse-Village Route Matrix ({costMatrix.configured_pairs} of {costMatrix.total_pairs} routes set)
                  </span>
                  {costMatrix.missing_pairs > 0 && (
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      {costMatrix.missing_pairs} routes unconfigured
                    </span>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Warehouse</th>
                        <th>Village</th>
                        <th>District</th>
                        <th>Cost per Unit</th>
                        <th>Estimated Distance</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costMatrix.cells.map((cell, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Warehouse size={14} color="var(--primary-600)" />
                              <strong>{cell.warehouse_name}</strong>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={14} color="#d97706" />
                              <span>{cell.village_name}</span>
                            </div>
                          </td>
                          <td>{cell.village_district}</td>
                          <td>
                            {cell.has_cost ? (
                              <strong style={{ color: 'var(--navy-900)' }}>₹{cell.cost_per_unit.toFixed(2)}</strong>
                            ) : (
                              <span style={{ color: '#d97706', fontStyle: 'italic', fontSize: '0.85rem' }}>Missing cost</span>
                            )}
                          </td>
                          <td>
                            {cell.distance_km ? `${cell.distance_km} km` : <span style={{ color: 'var(--navy-400)' }}>—</span>}
                          </td>
                          <td>
                            {cell.has_cost ? (
                              <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>Configured</span>
                            ) : (
                              <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Required</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setCostFormData({
                                  warehouse_id: String(cell.warehouse_id),
                                  village_id: String(cell.village_id),
                                  cost_per_unit: cell.has_cost ? String(cell.cost_per_unit) : '',
                                  distance_km: cell.distance_km ? String(cell.distance_km) : '',
                                });
                                setCostModalOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              <Edit size={12} />
                              <span>{cell.has_cost ? 'Edit' : 'Set Cost'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PLAN HISTORY & SCENARIOS */}
        {/* ========================================================= */}
        {activeSubTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--navy-900)' }}>
                  Historical Optimization Plans & Scenarios
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)' }}>
                  Audit log of calculated solutions persisted in PostgreSQL.
                </span>
              </div>
              {runsList.length >= 2 && (
                <button
                  onClick={() => {
                    setCompareSelection({ runA: String(runsList[1].id), runB: String(runsList[0].id) });
                    setCompareModalOpen(true);
                    handleCompareRuns();
                  }}
                  className="btn btn-secondary"
                  style={{ gap: '6px', fontSize: '0.88rem' }}
                >
                  <Scale size={15} />
                  <span>Compare Plans</span>
                </button>
              )}
            </div>

            {runsList.length === 0 ? (
              <EmptyState
                icon={<Clock size={40} />}
                title="No Historical Plans Recorded"
                description="When you generate allocation plans or run scenarios, they are permanently archived here for reproducibility."
                actionText="Generate First Plan"
                onAction={() => {
                  setActiveSubTab('solver');
                  handleRunOptimization();
                }}
              />
            ) : (
              <div className="card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Run ID / Label</th>
                        <th>Type</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Allocated / Requested</th>
                        <th>Unmet</th>
                        <th>Cost</th>
                        <th>Fulfilment %</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runsList.map((run) => (
                        <tr key={run.id}>
                          <td>
                            <strong>{run.scenario_name || run.run_id}</strong>
                            {run.scenario_name && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--navy-500)' }}>{run.run_id}</div>
                            )}
                          </td>
                          <td>
                            {run.is_scenario ? (
                              <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>What-If</span>
                            ) : (
                              <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Baseline</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--navy-600)' }}>
                            {new Date(run.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span className="badge" style={{ background: run.status === 'OPTIMAL' ? '#dcfce7' : '#fee2e2', color: run.status === 'OPTIMAL' ? '#166534' : '#991b1b' }}>
                              {run.status}
                            </span>
                          </td>
                          <td>
                            <strong>{run.total_allocated}</strong> / {run.total_requested}
                          </td>
                          <td style={{ color: run.total_unmet > 0 ? '#dc2626' : 'inherit' }}>
                            {run.total_unmet}
                          </td>
                          <td>₹{run.total_transport_cost.toFixed(2)}</td>
                          <td>
                            <strong>{run.overall_fulfilment_pct}%</strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleInspectRun(run.run_id)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                title="Inspect this plan in Allocation Engine"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRun(run.run_id)}
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                title="Delete historical run"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add/Update Transportation Cost */}
        <Modal
          isOpen={costModalOpen}
          onClose={() => setCostModalOpen(false)}
          title="Configure Transportation Cost"
        >
          <form onSubmit={handleSaveCost} className="modal-form">
            <div className="form-group">
              <label className="form-label">Source Warehouse *</label>
              <select
                className="form-control"
                value={costFormData.warehouse_id}
                onChange={(e) => setCostFormData({ ...costFormData, warehouse_id: e.target.value })}
                required
              >
                <option value="">Select source warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.address})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Affected Village *</label>
              <select
                className="form-control"
                value={costFormData.village_id}
                onChange={(e) => setCostFormData({ ...costFormData, village_id: e.target.value })}
                required
              >
                <option value="">Select destination village...</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.district})</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Estimated Cost per Unit (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 15.50"
                  value={costFormData.cost_per_unit}
                  onChange={(e) => setCostFormData({ ...costFormData, cost_per_unit: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Road Distance (km)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 42.0"
                  value={costFormData.distance_km}
                  onChange={(e) => setCostFormData({ ...costFormData, distance_km: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setCostModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Transportation Cost
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Simulate What-If Scenario */}
        <Modal
          isOpen={scenarioModalOpen}
          onClose={() => setScenarioModalOpen(false)}
          title="Simulate What-If Scenario"
        >
          <form onSubmit={handleRunSimulation} className="modal-form">
            <p style={{ fontSize: '0.88rem', color: 'var(--navy-600)', marginBottom: '16px' }}>
              Simulate an allocation scenario with hypothetical supply surge or increased demand. 
              <strong> Real database warehouse inventory is strictly protected and will not be altered.</strong>
            </p>

            <div className="form-group">
              <label className="form-label">Scenario Name *</label>
              <input
                type="text"
                className="form-control"
                value={scenarioForm.name}
                onChange={(e) => setScenarioForm({ ...scenarioForm, name: e.target.value })}
                required
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setScenarioModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                <Play size={14} fill="currentColor" />
                <span>Execute Scenario</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Compare Scenarios */}
        <Modal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          title="Scenario Comparison & Tradeoff Analysis"
        >
          <div style={{ marginBottom: '16px' }}>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Baseline Plan (Run A)</label>
                <select
                  className="form-control"
                  value={compareSelection.runA}
                  onChange={(e) => setCompareSelection({ ...compareSelection, runA: e.target.value })}
                >
                  {runsList.map((r) => (
                    <option key={r.id} value={r.id}>{r.scenario_name || r.run_id} ({r.total_allocated} units)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comparison Plan (Run B)</label>
                <select
                  className="form-control"
                  value={compareSelection.runB}
                  onChange={(e) => setCompareSelection({ ...compareSelection, runB: e.target.value })}
                >
                  {runsList.map((r) => (
                    <option key={r.id} value={r.id}>{r.scenario_name || r.run_id} ({r.total_allocated} units)</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={handleCompareRuns} className="btn btn-primary" style={{ width: '100%' }}>
              Evaluate Tradeoffs
            </button>
          </div>

          {compareData && (
            <div style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
              <div style={{ fontStyle: 'italic', color: 'var(--navy-800)', marginBottom: '14px', fontSize: '0.9rem' }}>
                "{compareData.narrative_summary}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--navy-500)' }}>Allocation Delta:</span>
                  <strong style={{ display: 'block', color: compareData.delta_allocated >= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_allocated >= 0 ? `+${compareData.delta_allocated}` : compareData.delta_allocated} units
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--navy-500)' }}>Unmet Demand Delta:</span>
                  <strong style={{ display: 'block', color: compareData.delta_unmet <= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_unmet >= 0 ? `+${compareData.delta_unmet}` : compareData.delta_unmet} units
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--navy-500)' }}>Transportation Cost Delta:</span>
                  <strong style={{ display: 'block' }}>
                    {compareData.delta_transport_cost >= 0 ? `+₹${compareData.delta_transport_cost}` : `-₹${Math.abs(compareData.delta_transport_cost)}`}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--navy-500)' }}>Fulfilment % Delta:</span>
                  <strong style={{ display: 'block', color: compareData.delta_overall_fulfilment_pct >= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_overall_fulfilment_pct >= 0 ? `+${compareData.delta_overall_fulfilment_pct}%` : `${compareData.delta_overall_fulfilment_pct}%`}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

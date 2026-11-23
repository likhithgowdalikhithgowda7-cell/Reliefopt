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
  FileCode,
  ShieldCheck,
  Activity,
  Table,
  Save,
  X,
  Undo2,
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
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchGridRows, setBatchGridRows] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);

  // History & comparison state
  const [runsList, setRunsList] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareSelection, setCompareSelection] = useState({ runA: '', runB: '' });

  // Scenario simulation state
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ name: 'Emergency Surge Scenario', extraStock: '50' });

  // Disaster Scenario Seeding State
  const [sampleDisasterModalOpen, setSampleDisasterModalOpen] = useState(false);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('assam_flood');
  const [seedingScenario, setSeedingScenario] = useState(false);

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

  // Load historical runs and optionally auto-select the latest
  const fetchRuns = useCallback(async (autoSelectLatest = false) => {
    setLoadingRuns(true);
    const res = await optimizationApi.getRuns({ limit: 50 });
    if (res.success && res.data) {
      setRunsList(res.data);
      if (autoSelectLatest && res.data.length > 0) {
        const latestRunId = res.data[0].run_id;
        const planRes = await optimizationApi.getRun(latestRunId);
        if (planRes.success && planRes.data) {
          setCurrentPlan(planRes.data);
        }
      }
    }
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
    fetchRuns(true);
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

  // Seed realistic multi-region Indian disaster scenario
  const handleSeedDisasterScenario = async () => {
    setSeedingScenario(true);
    try {
      const res = await optimizationApi.seedScenario(selectedScenarioKey, true);
      if (res.success && res.data) {
        showNotification?.('success', `Scenario "${res.data.title}" loaded successfully! Allocation plan generated.`);
        setSampleDisasterModalOpen(false);
        fetchOverview();
        fetchCosts();
        fetchRuns();
        fetchDropdowns();
        if (res.data.optimization_run_id) {
          handleInspectRun(res.data.optimization_run_id);
        }
      } else {
        showNotification?.('error', res.error || 'Failed to seed disaster scenario.');
      }
    } catch (err) {
      showNotification?.('error', 'Error communicating with disaster scenario service.');
    } finally {
      setSeedingScenario(false);
    }
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

  // Batch Transportation Matrix Handlers
  const handleEnterBatchMode = () => {
    if (!costMatrix || !costMatrix.cells) {
      setBatchGridRows([]);
      setIsBatchMode(true);
      return;
    }
    const rows = costMatrix.cells.map((cell) => ({
      row_id: `existing-${cell.warehouse_id}-${cell.village_id}`,
      is_new: false,
      warehouse_id: cell.warehouse_id,
      warehouse_name: cell.warehouse_name,
      village_id: cell.village_id,
      village_name: cell.village_name,
      village_district: cell.village_district,
      cost_per_unit: cell.has_cost && cell.cost_per_unit != null ? String(cell.cost_per_unit) : '',
      original_cost: cell.has_cost && cell.cost_per_unit != null ? String(cell.cost_per_unit) : '',
      distance_km: cell.distance_km != null ? String(cell.distance_km) : '',
      original_distance: cell.distance_km != null ? String(cell.distance_km) : '',
      has_cost: cell.has_cost,
    }));
    setBatchGridRows(rows);
    setIsBatchMode(true);
  };

  const handleCancelBatch = () => {
    setIsBatchMode(false);
    setBatchGridRows([]);
  };

  const handleAddBatchRow = () => {
    const newRow = {
      row_id: `new-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      is_new: true,
      warehouse_id: '',
      warehouse_name: '',
      village_id: '',
      village_name: '',
      village_district: '',
      cost_per_unit: '',
      original_cost: '',
      distance_km: '',
      original_distance: '',
      has_cost: false,
    };
    setBatchGridRows((prev) => [newRow, ...prev]);
  };

  const handleRemoveBatchRow = (rowId) => {
    setBatchGridRows((prev) => prev.filter((r) => r.row_id !== rowId));
  };

  const handleRevertBatchRow = (rowId) => {
    setBatchGridRows((prev) =>
      prev.map((r) =>
        r.row_id === rowId
          ? {
              ...r,
              cost_per_unit: r.original_cost,
              distance_km: r.original_distance,
            }
          : r
      )
    );
  };

  const handleBatchRowChange = (rowId, field, value) => {
    setBatchGridRows((prevRows) =>
      prevRows.map((row) => {
        if (row.row_id !== rowId) return row;
        const updated = { ...row, [field]: value };
        if (field === 'warehouse_id') {
          const wh = warehouses.find((w) => String(w.id) === String(value));
          updated.warehouse_name = wh ? wh.name : '';
        }
        if (field === 'village_id') {
          const vil = villages.find((v) => String(v.id) === String(value));
          updated.village_name = vil ? vil.name : '';
          updated.village_district = vil ? vil.district : '';
        }
        return updated;
      })
    );
  };

  const handleSaveBatch = async () => {
    // 1. Check duplicate warehouse-village combinations
    const pairMap = {};
    for (const r of batchGridRows) {
      if (r.warehouse_id && r.village_id) {
        const key = `${r.warehouse_id}_${r.village_id}`;
        if (pairMap[key]) {
          showNotification?.(
            'error',
            `Duplicate route combination found: ${r.warehouse_name || 'Warehouse'} → ${r.village_name || 'Village'}. Each route pair must be unique.`
          );
          return;
        }
        pairMap[key] = true;
      }
    }

    // 2. Validate row inputs
    for (let i = 0; i < batchGridRows.length; i++) {
      const r = batchGridRows[i];
      if (r.is_new) {
        if (!r.warehouse_id || !r.village_id) {
          showNotification?.(
            'error',
            `Row #${i + 1}: Please select both a source warehouse and a destination village.`
          );
          return;
        }
        if (r.cost_per_unit === '' || isNaN(parseFloat(r.cost_per_unit)) || parseFloat(r.cost_per_unit) < 0) {
          showNotification?.(
            'error',
            `Row #${i + 1} (${r.warehouse_name || 'Warehouse'} → ${r.village_name || 'Village'}): Cost per unit must be a non-negative number.`
          );
          return;
        }
      }
      if (r.cost_per_unit !== '') {
        const c = parseFloat(r.cost_per_unit);
        if (isNaN(c) || c < 0) {
          showNotification?.('error', `Row #${i + 1}: Cost per unit must be a non-negative number.`);
          return;
        }
      }
      if (r.distance_km !== '') {
        const d = parseFloat(r.distance_km);
        if (isNaN(d) || d < 0) {
          showNotification?.('error', `Row #${i + 1}: Distance must be a non-negative number if specified.`);
          return;
        }
      }
    }

    // 3. Filter only modified or newly added routes
    const changedRows = batchGridRows.filter((r) => {
      if (r.is_new) return true;
      const costChanged = r.cost_per_unit !== r.original_cost;
      const distChanged = r.distance_km !== r.original_distance;
      return (costChanged || distChanged) && r.cost_per_unit !== '';
    });

    if (changedRows.length === 0) {
      showNotification?.('info', 'No modified or new route costs to save.');
      return;
    }

    const payload = changedRows.map((r) => ({
      warehouse_id: parseInt(r.warehouse_id, 10),
      village_id: parseInt(r.village_id, 10),
      cost_per_unit: parseFloat(r.cost_per_unit),
      distance_km: r.distance_km !== '' && r.distance_km != null ? parseFloat(r.distance_km) : null,
    }));

    setSavingBatch(true);
    try {
      const res = await transportCostsApi.batchUpdate(payload);
      if (res.success) {
        showNotification?.(
          'success',
          `Successfully saved ${payload.length} transportation route cost${payload.length > 1 ? 's' : ''} in batch.`
        );
        setIsBatchMode(false);
        fetchCosts();
        fetchOverview();
      } else {
        showNotification?.('error', res.error || 'Failed to save batch transportation costs.');
      }
    } catch (err) {
      showNotification?.('error', 'Error communicating with batch transportation costs API.');
    } finally {
      setSavingBatch(false);
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

  // Batch grid status computations
  const batchPairCounts = {};
  if (isBatchMode) {
    batchGridRows.forEach((r) => {
      if (r.warehouse_id && r.village_id) {
        const k = `${r.warehouse_id}_${r.village_id}`;
        batchPairCounts[k] = (batchPairCounts[k] || 0) + 1;
      }
    });
  }
  const batchDuplicateCount = Object.values(batchPairCounts).filter((c) => c > 1).length;
  const batchModifiedCount = batchGridRows.filter(
    (r) => !r.is_new && (r.cost_per_unit !== r.original_cost || r.distance_km !== r.original_distance)
  ).length;
  const batchNewCount = batchGridRows.filter((r) => r.is_new).length;

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
          <div className="header-actions-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setSampleDisasterModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', gap: '8px', fontSize: '0.9rem' }}
              title="Load realistic Indian disaster scenarios (Assam Flood, Odisha Cyclone, Kerala Landslide)"
            >
              <Sparkles size={16} color="var(--primary-600)" />
              <span>Load Disaster Scenario</span>
            </button>
            {currentPlan && (
              <button
                onClick={handleRunOptimization}
                disabled={isSolving || (overview && !overview.is_ready_to_solve)}
                className="btn btn-primary"
                style={{ padding: '10px 20px', gap: '8px', fontSize: '0.95rem' }}
              >
                <Play size={16} fill="currentColor" />
                <span>{isSolving ? 'Solving with OR-Tools...' : 'Generate Allocation Plan'}</span>
              </button>
            )}
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
        <div className="sub-tabs-nav">
          <button
            onClick={() => setActiveSubTab('solver')}
            className={`sub-tab-btn ${activeSubTab === 'solver' ? 'active' : ''}`}
          >
            <Cpu size={15} />
            <span>Allocation Engine</span>
            {currentPlan && <span className="tab-count" style={{ background: '#16a34a', color: '#fff' }}>Plan Ready</span>}
          </button>
          <button
            onClick={() => setActiveSubTab('costs')}
            className={`sub-tab-btn ${activeSubTab === 'costs' ? 'active' : ''}`}
          >
            <Truck size={15} />
            <span>Transportation Costs</span>
            <span className="tab-count">{costsList.length}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`sub-tab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
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
                      <span>{isSolving ? 'Solving with Google OR-Tools...' : 'Generate Allocation Plan'}</span>
                    </button>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Scale size={18} color="var(--primary-600)" />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                          Fairness Evaluation & Urgency Equity Metrics
                        </h3>
                      </div>
                      {currentPlan.fairness.fairness_score_rating && (
                        <span
                          className={`badge ${
                            currentPlan.fairness.fairness_score_rating.includes('High')
                              ? 'badge-success'
                              : currentPlan.fairness.fairness_score_rating.includes('Moderate')
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                          style={{ fontSize: '0.82rem', padding: '4px 10px' }}
                        >
                          {currentPlan.fairness.fairness_score_rating}
                        </span>
                      )}
                    </div>

                    {/* Methodological Distinction Callout */}
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #2563eb', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--navy-700)' }}>
                      <strong style={{ color: 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                        Methodological Distinction: Optimization Objective vs. Fairness Evaluation
                      </strong>
                      <div style={{ marginBottom: '4px', lineHeight: '1.45' }}>
                        • <strong>Mathematical Optimization Objective:</strong> The Google OR-Tools Mixed-Integer Linear Program (MILP) solver minimizes total unmet demand penalties scaled strictly by urgency (<code>Critical (1,000,000x) &gt;&gt; High (100,000x) &gt;&gt; Medium (10,000x) &gt;&gt; Low (1,000x)</code>) plus route transportation costs under warehouse inventory upper bounds, village demand conservation, and critical supply guarantees.
                      </div>
                      <div style={{ lineHeight: '1.45' }}>
                        • <strong>Post-Solve Fairness Evaluation:</strong> An independent descriptive evaluation that computes distribution equity indicators (Gini coefficient, Hoover Robin Hood index, average village satisfaction, minimum fulfilment, and disparity gap) across all affected villages to assist human coordinators in auditing fairness under resource scarcity.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--navy-600)', marginBottom: '8px', fontWeight: '600' }}>
                          Distribution Equity Indicators
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                          <span>Average Village Fulfilment:</span>
                          <strong>{currentPlan.fairness.average_fulfilment_pct}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                          <span>Minimum Village Fulfilment:</span>
                          <strong>{currentPlan.fairness.min_fulfilment_pct}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                          <span>Disparity Gap (Max - Min):</span>
                          <strong style={{ color: currentPlan.fairness.disparity_gap_pct > 30 ? '#d97706' : '#16a34a' }}>
                            {currentPlan.fairness.disparity_gap_pct}%
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                          <span>Gini Inequality Index:</span>
                          <strong style={{ color: (currentPlan.fairness.gini_coefficient || 0) > 0.35 ? '#d97706' : '#16a34a' }}>
                            {currentPlan.fairness.gini_coefficient != null ? currentPlan.fairness.gini_coefficient.toFixed(3) : '0.000'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                          <span>Hoover (Robin Hood) Index:</span>
                          <strong>{currentPlan.fairness.hoover_index != null ? `${currentPlan.fairness.hoover_index}%` : '0.0%'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span>Underserved Locations:</span>
                          <strong style={{ color: (currentPlan.fairness.underserved_villages_count || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                            {currentPlan.fairness.underserved_villages_count || 0} locations
                          </strong>
                        </div>
                      </div>

                      <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--navy-600)', marginBottom: '8px', fontWeight: '600' }}>
                          Urgency Tier Fulfilment Breakdown
                        </div>
                        {Object.entries(currentPlan.fairness.urgency_breakdown || {}).map(([level, data]) => (
                          <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
                            <span className={`urgency-pill ${level.toLowerCase()}`} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{level}</span>
                            <span>{data.allocated} / {data.demanded} units</span>
                            <strong>{data.fulfilment_pct}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Underserved Locations Alert Box */}
                    {currentPlan.fairness.underserved_villages && currentPlan.fairness.underserved_villages.length > 0 ? (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '0.85rem', color: '#991b1b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '6px' }}>
                          <AlertTriangle size={15} color="#dc2626" />
                          <span>Identified Underserved Locations ({currentPlan.fairness.underserved_villages.length})</span>
                        </div>
                        <div style={{ color: '#7f1d1d', marginBottom: '6px', lineHeight: '1.4' }}>
                          The following locations are in deficit (received &lt;50% overall fulfilment or have unmet Critical/High emergency demand):
                        </div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                          {currentPlan.fairness.underserved_villages.map((loc, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{loc}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.84rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <span>All affected locations received at least 50% fulfillment with no critical demand deficits.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mathematical Optimization Model (MILP Formulation) Card */}
                <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCode size={18} color="var(--primary-600)" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--navy-900)', margin: 0 }}>
                        Google OR-Tools Mathematical Model (MILP Formulation)
                      </h3>
                    </div>
                    <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      {currentPlan.optimization_strategy || 'Min-Cost Urgency-Weighted Penalty MILP'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.86rem', color: 'var(--navy-700)', lineHeight: '1.5', marginBottom: '14px' }}>
                    ReliefOpt formulates emergency supply allocation as a Mixed-Integer Linear Program (MILP) solved using the Google OR-Tools CBC/GLOP engine:
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-500)', fontWeight: '600', marginBottom: '6px' }}>
                      Objective Function
                    </div>
                    <code style={{ display: 'block', padding: '8px 12px', background: '#0f172a', color: '#38bdf8', borderRadius: '4px', fontSize: '0.84rem', overflowX: 'auto' }}>
                      {currentPlan.objective_formulation || 'min sum_{(w,v,s)} C_{w,v,s} * x_{w,v,s} + sum_{(v,s)} P_{urgency(v,s)} * u_{v,s}'}
                    </code>
                    <div style={{ fontSize: '0.8rem', color: 'var(--navy-600)', marginTop: '8px', lineHeight: '1.4' }}>
                      Where <code>x_{'{w,v,s}'} &gt;= 0</code> is the allocated quantity of supply <code>s</code> from warehouse <code>w</code> to village <code>v</code>, <code>u_{'{v,s}'} &gt;= 0</code> is unmet demand, <code>C_{'{w,v,s}'}</code> is unit transit cost, and <code>P_{'{urgency}'}</code> enforces urgency priority (<code>Critical: 1,000,000 &gt;&gt; High: 100,000 &gt;&gt; Medium: 10,000 &gt;&gt; Low: 1,000</code>).
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-500)', fontWeight: '600', marginBottom: '6px' }}>
                      Mathematically Valid Constraints
                    </div>
                    <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: '0.83rem', color: 'var(--navy-800)', lineHeight: '1.5' }}>
                      <li><strong>Warehouse Inventory Upper Bounds:</strong> <code>sum_v x_{'{w,v,s}'} &lt;= Inventory_{'{w,s}'}</code> — Strictly prevents allocations exceeding available warehouse stock.</li>
                      <li><strong>Demand Conservation:</strong> <code>sum_w x_{'{w,v,s}'} + u_{'{v,s}'} = Demand_{'{v,s}'}</code> — Guarantees accurate accounting of fulfilled and unmet quantities.</li>
                      <li><strong>Critical Supply Floor:</strong> <code>u_{'{v,s}'} == 0</code> for Critical demands whenever <code>TotalStock_s &gt;= TotalCriticalDemand_s</code> — Guarantees life-saving critical supplies cannot be sacrificed for routing cost savings.</li>
                      <li><strong>Non-negativity:</strong> <code>x_{'{w,v,s}'} &gt;= 0, u_{'{v,s}'} &gt;= 0</code> — Prohibits negative allocations and phantom shipments.</li>
                    </ul>
                  </div>

                  {/* Explicit Fairness Disclaimer */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: '#92400e', lineHeight: '1.45' }}>
                    <strong>Fairness Disclaimer:</strong> Minimum-cost optimization prioritizes urgency and logistics efficiency, but does NOT mathematically guarantee geographical equality across locations. Fairness metrics (Gini coefficient, Hoover index, Disparity Gap) provide post-solve descriptive evaluation to support human decision-making.
                  </div>
                </div>

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
                    <div className="table-responsive table-responsive-wrapper">
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

                  <div className="table-responsive table-responsive-wrapper">
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

                    <div className="table-responsive table-responsive-wrapper">
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
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!isBatchMode ? (
                  <>
                    <button
                      onClick={handleEnterBatchMode}
                      className="btn btn-primary"
                      style={{ gap: '6px', fontSize: '0.88rem' }}
                    >
                      <Table size={15} />
                      <span>Batch Edit Matrix</span>
                    </button>
                    <button
                      onClick={() => {
                        setCostFormData({ warehouse_id: '', village_id: '', cost_per_unit: '', distance_km: '' });
                        setCostModalOpen(true);
                      }}
                      className="btn btn-secondary"
                      style={{ gap: '6px', fontSize: '0.88rem' }}
                    >
                      <Plus size={15} />
                      <span>Add / Update Route Cost</span>
                    </button>
                    <button onClick={handleSeedSampleCosts} disabled={loadingCosts} className="btn btn-secondary" style={{ gap: '6px', fontSize: '0.88rem' }}>
                      <Sparkles size={15} />
                      <span>Seed Demo Costs</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleAddBatchRow}
                      className="btn btn-secondary"
                      style={{ gap: '6px', fontSize: '0.88rem' }}
                    >
                      <Plus size={15} />
                      <span>Add Route Row</span>
                    </button>
                    <button
                      onClick={handleCancelBatch}
                      disabled={savingBatch}
                      className="btn btn-secondary"
                      style={{ gap: '6px', fontSize: '0.88rem' }}
                    >
                      <X size={15} />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveBatch}
                      disabled={savingBatch || batchDuplicateCount > 0}
                      className="btn btn-primary"
                      style={{ gap: '6px', fontSize: '0.88rem' }}
                    >
                      <Save size={15} />
                      <span>{savingBatch ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BATCH GRID EDITOR VIEW */}
            {isBatchMode && (
              <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--primary-300)', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-200)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Table size={18} color="var(--primary-600)" />
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--navy-900)' }}>
                        Transportation Matrix Batch Grid
                      </h4>
                      <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)' }}>
                        {batchGridRows.length} total routes
                      </span>
                      {batchModifiedCount > 0 && (
                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                          {batchModifiedCount} modified
                        </span>
                      )}
                      {batchNewCount > 0 && (
                        <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                          {batchNewCount} new
                        </span>
                      )}
                      {batchDuplicateCount > 0 && (
                        <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          {batchDuplicateCount} duplicate combinations
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--navy-600)' }}>
                      Edit route costs and estimated distances inline, or configure new warehouse-village pairs. Save all changes together via batch API.
                    </p>
                  </div>
                </div>

                {batchDuplicateCount > 0 && (
                  <div style={{ padding: '10px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '0.86rem' }}>
                    <AlertTriangle size={16} />
                    <span>
                      <strong>Duplicate Route Combination Detected:</strong> Multiple rows have the exact same warehouse and affected village. Each route pair must be unique before saving.
                    </span>
                  </div>
                )}

                <div className="table-responsive table-responsive-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '190px' }}>Warehouse *</th>
                        <th style={{ minWidth: '190px' }}>Affected Village *</th>
                        <th style={{ minWidth: '120px' }}>District</th>
                        <th style={{ minWidth: '140px' }}>Cost per Unit (₹) *</th>
                        <th style={{ minWidth: '130px' }}>Distance (km)</th>
                        <th style={{ minWidth: '120px' }}>Configuration Status</th>
                        <th style={{ minWidth: '100px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchGridRows.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--navy-500)' }}>
                            No routes in batch grid. Click <strong>Add Route Row</strong> above to begin.
                          </td>
                        </tr>
                      ) : (
                        batchGridRows.map((row) => {
                          const isPairDuplicate = Boolean(
                            row.warehouse_id &&
                              row.village_id &&
                              batchPairCounts[`${row.warehouse_id}_${row.village_id}`] > 1
                          );
                          const cNum = parseFloat(row.cost_per_unit);
                          const isInvalidCost = row.cost_per_unit !== '' && (isNaN(cNum) || cNum < 0);
                          const dNum = parseFloat(row.distance_km);
                          const isInvalidDist = row.distance_km !== '' && (isNaN(dNum) || dNum < 0);
                          const isRowModified =
                            !row.is_new &&
                            (row.cost_per_unit !== row.original_cost ||
                              row.distance_km !== row.original_distance);

                          return (
                            <tr
                              key={row.row_id}
                              style={{
                                background: isPairDuplicate
                                  ? '#fef2f2'
                                  : isRowModified
                                  ? '#fffbeb'
                                  : row.is_new
                                  ? '#f0fdf4'
                                  : undefined,
                              }}
                            >
                              <td>
                                {row.is_new ? (
                                  <select
                                    aria-label="Select source warehouse"
                                    className="form-control"
                                    style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                                    value={row.warehouse_id}
                                    onChange={(e) =>
                                      handleBatchRowChange(row.row_id, 'warehouse_id', e.target.value)
                                    }
                                    required
                                  >
                                    <option value="">Select warehouse...</option>
                                    {warehouses.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Warehouse size={14} color="var(--primary-600)" />
                                    <strong>{row.warehouse_name}</strong>
                                  </div>
                                )}
                              </td>
                              <td>
                                {row.is_new ? (
                                  <select
                                    aria-label="Select destination village"
                                    className="form-control"
                                    style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                                    value={row.village_id}
                                    onChange={(e) =>
                                      handleBatchRowChange(row.row_id, 'village_id', e.target.value)
                                    }
                                    required
                                  >
                                    <option value="">Select village...</option>
                                    {villages.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name} ({v.district})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={14} color="#d97706" />
                                    <span>{row.village_name}</span>
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '0.85rem', color: 'var(--navy-700)' }}>
                                  {row.village_district || '—'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: 'var(--navy-500)', fontSize: '0.85rem' }}>₹</span>
                                  <input
                                    aria-label={`Cost per unit for ${row.warehouse_name || 'warehouse'} to ${row.village_name || 'village'}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={row.cost_per_unit}
                                    onChange={(e) =>
                                      handleBatchRowChange(row.row_id, 'cost_per_unit', e.target.value)
                                    }
                                    className="form-control"
                                    style={{
                                      padding: '6px 8px',
                                      fontSize: '0.85rem',
                                      borderColor: isInvalidCost ? '#dc2626' : undefined,
                                      width: '100%',
                                    }}
                                  />
                                </div>
                              </td>
                              <td>
                                <input
                                  aria-label={`Distance for ${row.warehouse_name || 'warehouse'} to ${row.village_name || 'village'}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Distance km"
                                  value={row.distance_km}
                                  onChange={(e) =>
                                    handleBatchRowChange(row.row_id, 'distance_km', e.target.value)
                                  }
                                  className="form-control"
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '0.85rem',
                                    borderColor: isInvalidDist ? '#dc2626' : undefined,
                                    width: '100%',
                                  }}
                                />
                              </td>
                              <td>
                                {isPairDuplicate ? (
                                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                    Duplicate
                                  </span>
                                ) : isInvalidCost || isInvalidDist ? (
                                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                    Invalid Value
                                  </span>
                                ) : row.is_new ? (
                                  <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                    New Route
                                  </span>
                                ) : isRowModified ? (
                                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                    Modified
                                  </span>
                                ) : row.has_cost ? (
                                  <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
                                    Configured
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                    Required
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {row.is_new ? (
                                  <button
                                    onClick={() => handleRemoveBatchRow(row.row_id)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 8px', color: '#dc2626' }}
                                    title="Remove this new row"
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                ) : isRowModified ? (
                                  <button
                                    onClick={() => handleRevertBatchRow(row.row_id)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '3px' }}
                                    title="Revert to original values"
                                  >
                                    <Undo2 size={12} />
                                    <span>Revert</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--navy-400)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Matrix View */}
            {!isBatchMode && costMatrix && costMatrix.cells && (
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

                <div className="table-responsive table-responsive-wrapper">
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
                <div className="table-responsive table-responsive-wrapper">
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
              <div style={{ fontStyle: 'italic', color: 'var(--navy-800)', marginBottom: '14px', fontSize: '0.9rem', lineHeight: '1.45' }}>
                "{compareData.narrative_summary}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.88rem', marginBottom: '14px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Total Allocated Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: compareData.delta_allocated >= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_allocated >= 0 ? `+${compareData.delta_allocated}` : compareData.delta_allocated} units
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Unmet Demand Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: compareData.delta_unmet <= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_unmet >= 0 ? `+${compareData.delta_unmet}` : compareData.delta_unmet} units
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Transportation Cost Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: compareData.delta_transport_cost <= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_transport_cost >= 0 ? `+₹${compareData.delta_transport_cost}` : `-₹${Math.abs(compareData.delta_transport_cost)}`}
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Overall Fulfilment Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: compareData.delta_overall_fulfilment_pct >= 0 ? '#16a34a' : '#dc2626' }}>
                    {compareData.delta_overall_fulfilment_pct >= 0 ? `+${compareData.delta_overall_fulfilment_pct}%` : `${compareData.delta_overall_fulfilment_pct}%`}
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Critical Fulfilment Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: (compareData.delta_critical_fulfilment_pct || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {(compareData.delta_critical_fulfilment_pct || 0) >= 0 ? `+${compareData.delta_critical_fulfilment_pct}%` : `${compareData.delta_critical_fulfilment_pct}%`}
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Gini Inequality Index Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: (compareData.delta_gini_coefficient || 0) <= 0 ? '#16a34a' : '#d97706' }}>
                    {(compareData.delta_gini_coefficient || 0) >= 0 ? `+${compareData.delta_gini_coefficient}` : `${compareData.delta_gini_coefficient}`}
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Disparity Gap Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: (compareData.delta_disparity_gap_pct || 0) <= 0 ? '#16a34a' : '#dc2626' }}>
                    {(compareData.delta_disparity_gap_pct || 0) >= 0 ? `+${compareData.delta_disparity_gap_pct}%` : `${compareData.delta_disparity_gap_pct}%`}
                  </strong>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                  <span style={{ color: 'var(--navy-500)', fontSize: '0.78rem', display: 'block' }}>Underserved Locations Delta:</span>
                  <strong style={{ fontSize: '0.95rem', color: (compareData.delta_underserved_count || 0) <= 0 ? '#16a34a' : '#dc2626' }}>
                    {(compareData.delta_underserved_count || 0) >= 0 ? `+${compareData.delta_underserved_count}` : `${compareData.delta_underserved_count}`}
                  </strong>
                </div>
              </div>

              {/* Fairness Rating & Comparative Assessment */}
              {compareData.fairness_comparison_summary && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', fontSize: '0.82rem', color: '#1e40af', lineHeight: '1.45' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Scale size={14} />
                    <span>Fairness Rating Comparison: {compareData.baseline_fairness_rating || 'Evaluated'} → {compareData.comparison_fairness_rating || 'Evaluated'}</span>
                  </div>
                  <div>{compareData.fairness_comparison_summary}</div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Modal: Load Disaster Scenario */}
        <Modal
          isOpen={sampleDisasterModalOpen}
          onClose={() => setSampleDisasterModalOpen(false)}
          title="Load Sample Indian Disaster Relief Scenario [DEMONSTRATION DATA]"
        >
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--navy-600)', marginBottom: '16px', lineHeight: '1.45' }}>
              Select a realistic multi-warehouse disaster scenario across Indian operational regions (Floods, Cyclones, Landslides). All scenarios contain realistic synthetic coordinates, supplies, urgency tiers and inventory constraints:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* 1. Assam Flood */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedScenarioKey === 'assam_flood' ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                  background: selectedScenarioKey === 'assam_flood' ? 'var(--primary-50)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="disaster_scenario"
                  value="assam_flood"
                  checked={selectedScenarioKey === 'assam_flood'}
                  onChange={(e) => setSelectedScenarioKey(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)', fontSize: '0.92rem' }}>
                      Assam Brahmaputra Basin Flood
                    </strong>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Flood
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                      North-East India
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                      DEMO DATA
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', display: 'block', lineHeight: '1.4' }}>
                    3 Depots (Guwahati, Tezpur, Silchar) & 5 Flood Locations (Ahatguri, Jonai, Sarthebari, Laharighat, Barkhola). Tests ample regional inventory, multi-depot riverine routing, and 100% Critical/High demand satisfaction.
                  </span>
                </div>
              </label>

              {/* 2. Odisha Cyclone */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedScenarioKey === 'odisha_cyclone' ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                  background: selectedScenarioKey === 'odisha_cyclone' ? 'var(--primary-50)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="disaster_scenario"
                  value="odisha_cyclone"
                  checked={selectedScenarioKey === 'odisha_cyclone'}
                  onChange={(e) => setSelectedScenarioKey(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)', fontSize: '0.92rem' }}>
                      Odisha Coastal Cyclone Emergency
                    </strong>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Cyclone
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                      Eastern Coast
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                      DEMO DATA
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', display: 'block', lineHeight: '1.4' }}>
                    2 Depots (Bhubaneswar, Cuttack) & 3 Inundated Wards (Puri, Jagatsinghpur, Kendrapara). Tests severe supply shortage (demand &gt;&gt; stock), rationing under scarcity, and non-negative inventory protection.
                  </span>
                </div>
              </label>

              {/* 3. Kerala Landslide */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedScenarioKey === 'kerala_landslide' ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                  background: selectedScenarioKey === 'kerala_landslide' ? 'var(--primary-50)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="disaster_scenario"
                  value="kerala_landslide"
                  checked={selectedScenarioKey === 'kerala_landslide'}
                  onChange={(e) => setSelectedScenarioKey(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)', fontSize: '0.92rem' }}>
                      Kerala Wayanad Landslide Crisis
                    </strong>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Landslide
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                      Southern India / Western Ghats
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                      DEMO DATA
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', display: 'block', lineHeight: '1.4' }}>
                    2 Mountain Bases (Kozhikode, Kalpetta) & 3 Hill Villages (Meppadi, Chooralmala, Mundakkai). Tests high-cost mountain transit, multi-source dispatches, and emergency relief tradeoffs under severed road access.
                  </span>
                </div>
              </label>

              {/* 4. Uttarakhand Flash Flood & Landslide */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedScenarioKey === 'uttarakhand_flash_flood' ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                  background: selectedScenarioKey === 'uttarakhand_flash_flood' ? 'var(--primary-50)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="disaster_scenario"
                  value="uttarakhand_flash_flood"
                  checked={selectedScenarioKey === 'uttarakhand_flash_flood'}
                  onChange={(e) => setSelectedScenarioKey(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)', fontSize: '0.92rem' }}>
                      Uttarakhand Himalayan Flash Flood & Landslide
                    </strong>
                    <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Flood & Landslide
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                      Northern India (Himalayas)
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                      DEMO DATA
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', display: 'block', lineHeight: '1.4' }}>
                    3 Depots (Dehradun, Rishikesh, Joshimath) & 4 Valley Wards (Rudraprayag, Joshimath Camp, Karnaprayag, Badrinath). Tests high-altitude mountain bottlenecks, multi-echelon staging, and thermal blankets under sub-zero conditions.
                  </span>
                </div>
              </label>

              {/* 5. Gujarat Cyclone */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedScenarioKey === 'gujarat_cyclone' ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                  background: selectedScenarioKey === 'gujarat_cyclone' ? 'var(--primary-50)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="disaster_scenario"
                  value="gujarat_cyclone"
                  checked={selectedScenarioKey === 'gujarat_cyclone'}
                  onChange={(e) => setSelectedScenarioKey(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)', fontSize: '0.92rem' }}>
                      Gujarat Cyclone Biparjoy Coastal Surge
                    </strong>
                    <span style={{ background: '#fae8ff', color: '#86198f', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Cyclone
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                      Western India (Arabian Sea)
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                      DEMO DATA
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', display: 'block', lineHeight: '1.4' }}>
                    3 Depots (Ahmedabad, Rajkot, Kandla Port) & 4 Coastal Wards (Jakhau, Mandvi, Bhuj, Porbandar). Tests storm surge coastal inundation, large-scale community evacuation, and potable water distribution against saltwater contamination.
                  </span>
                </div>
              </label>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSampleDisasterModalOpen(false)}
                className="btn btn-secondary"
                disabled={seedingScenario}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeedDisasterScenario}
                disabled={seedingScenario}
                className="btn btn-primary"
                style={{ gap: '8px' }}
              >
                <Sparkles size={16} />
                <span>{seedingScenario ? 'Loading & Solving...' : 'Load & Solve Scenario'}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

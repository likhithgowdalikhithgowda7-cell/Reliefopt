import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OptimizationPage from '../pages/OptimizationPage';
import {
  optimizationApi,
  transportCostsApi,
  warehousesApi,
  villagesApi,
  suppliesApi,
} from '../services/api';

vi.mock('../services/api', () => ({
  optimizationApi: {
    getOverview: vi.fn(),
    solve: vi.fn(),
    getRuns: vi.fn(),
    getRun: vi.fn(),
    simulate: vi.fn(),
    deleteRun: vi.fn(),
    compare: vi.fn(),
    getScenarios: vi.fn(),
    seedScenario: vi.fn(),
  },
  transportCostsApi: {
    getAll: vi.fn(),
    getMatrix: vi.fn(),
    createOrUpdate: vi.fn(),
    batchUpdate: vi.fn(),
    seedSample: vi.fn(),
    delete: vi.fn(),
  },
  warehousesApi: {
    getAll: vi.fn(),
  },
  villagesApi: {
    getAll: vi.fn(),
  },
  suppliesApi: {
    list: vi.fn(),
  },
}));

describe('Optimization Engine Page (OptimizationPage.jsx)', () => {
  const mockShowNotification = vi.fn();
  const mockOnNavigate = vi.fn();

  const mockOverview = {
    active_warehouses_count: 5,
    active_villages_count: 6,
    active_supplies_count: 7,
    total_available_inventory: 6849,
    total_recorded_demand: 4810,
    critical_demands_count: 5,
    configured_costs_count: 30,
    total_pairs_count: 30,
    missing_costs_count: 0,
    is_ready_to_solve: true,
  };

  const mockWarehouses = [
    { id: 1, name: 'Guwahati Central Depot', address: 'G.S. Road, Guwahati' },
    { id: 4, name: 'Tezpur Regional Hub', address: 'Mission Chariali, Tezpur' },
  ];

  const mockVillages = [
    { id: 7, name: 'Ahatguri Flood Relief Camp', district: 'Majuli' },
    { id: 9, name: 'Sarthebari Lowland Ward', district: 'Barpeta' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    optimizationApi.getOverview.mockResolvedValue({ success: true, data: mockOverview });
    transportCostsApi.getMatrix.mockResolvedValue({ success: true, data: { status: 'COMPLETE', total_configured_routes: 30, matrix: [] } });
    transportCostsApi.getAll.mockResolvedValue({ success: true, data: [] });
    optimizationApi.getRuns.mockResolvedValue({ success: true, data: [] });
    warehousesApi.getAll.mockResolvedValue({ success: true, data: mockWarehouses });
    villagesApi.getAll.mockResolvedValue({ success: true, data: mockVillages });
  });

  it('renders readiness overview metrics properly', async () => {
    render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/Available Stock/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Total Demand/i)).toBeInTheDocument();
    expect(screen.getByText(/Warehouses/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost Coverage/i)).toBeInTheDocument();
    expect(screen.getByText('6849')).toBeInTheDocument();
    expect(screen.getByText('4810')).toBeInTheDocument();
  });

  it('switching sub-tabs changes views between Solver, Costs and History', async () => {
    render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/Available Stock/i)).toBeInTheDocument();
    });

    // Switch to Transportation Costs sub-tab
    const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
    fireEvent.click(costsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Warehouse to Village Transportation Costs/i)).toBeInTheDocument();
    });

    // Switch to Plan History & Scenarios sub-tab
    const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/No Historical Plans Recorded/i)).toBeInTheDocument();
    });
  });

  it('loads warehouses and villages into transportation cost modal dropdowns (Priority 1 fix verification)', async () => {
    render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    // Switch to Transportation Costs sub-tab
    const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
    fireEvent.click(costsTabBtn);

    // Click Add Cost button
    const addCostBtn = screen.getByRole('button', { name: /Add \/ Update Route Cost/i });
    fireEvent.click(addCostBtn);

    expect(screen.getByRole('heading', { name: /Configure Transportation Cost/i })).toBeInTheDocument();

    // Wait for dropdown options to be populated from warehousesApi.getAll & villagesApi.getAll
    await waitFor(() => {
      expect(screen.getByText('Guwahati Central Depot (G.S. Road, Guwahati)')).toBeInTheDocument();
    });

    // Verify warehousesApi.getAll was called with { active_only: true }
    expect(warehousesApi.getAll).toHaveBeenCalledWith({ active_only: true });
    // Verify villagesApi.getAll was called with { active_only: true }
    expect(villagesApi.getAll).toHaveBeenCalledWith({ active_only: true });

    expect(screen.getByText('Tezpur Regional Hub (Mission Chariali, Tezpur)')).toBeInTheDocument();
    expect(screen.getByText('Ahatguri Flood Relief Camp (Majuli)')).toBeInTheDocument();
    expect(screen.getByText('Sarthebari Lowland Ward (Barpeta)')).toBeInTheDocument();
  });

  it('executing OR-Tools solver calls optimizationApi.solve', async () => {
    optimizationApi.solve.mockResolvedValue({
      success: true,
      data: {
        status: 'OPTIMAL',
        solver_time_ms: 45,
        total_transport_cost: 12500,
        total_allocated: 4810,
        total_requested: 4810,
        total_unmet: 0,
        critical_fulfilment_pct: 100,
        overall_fulfilment_pct: 100,
        allocations_count: 14,
        unmet_demands_count: 0,
        allocations: [],
        unmet_demands: [],
        demand_fulfilment: [],
        warehouse_utilization: [],
        fairness: {
          gini_coefficient: 0.12,
          hoover_index: 0.08,
          underserved_villages_count: 0,
          underserved_villages: [],
        },
      },
    });

    render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/Available Stock/i)).toBeInTheDocument();
    });

    const runBtn = screen.getByRole('button', { name: /Generate Allocation Plan/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(optimizationApi.solve).toHaveBeenCalled();
    });

    expect(mockShowNotification).toHaveBeenCalledWith('success', expect.stringContaining('Optimization complete'));

    // Verify Fairness Evaluation & Urgency Equity Metrics remain visible
    expect(screen.getByText(/Fairness Evaluation & Urgency Equity Metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Distribution Equity Indicators/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Village Fulfilment:/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum Village Fulfilment:/i)).toBeInTheDocument();
    expect(screen.getByText(/Gini Inequality Index:/i)).toBeInTheDocument();
    expect(screen.getByText(/Hoover \(Robin Hood\) Index:/i)).toBeInTheDocument();
    expect(screen.getByText(/Underserved Locations:/i)).toBeInTheDocument();
    expect(screen.getByText(/Urgency Tier Fulfilment Breakdown/i)).toBeInTheDocument();

    // Verify Methodological Distinction callout is completely absent
    expect(screen.queryByText(/Methodological Distinction: Optimization Objective vs. Fairness Evaluation/i)).not.toBeInTheDocument();
  });

  describe('Transportation Matrix Batch Grid', () => {
    const mockMatrixWithCells = {
      status: 'COMPLETE',
      total_configured_routes: 2,
      total_pairs: 2,
      configured_pairs: 2,
      missing_pairs: 0,
      is_complete: true,
      cells: [
        {
          warehouse_id: 1,
          warehouse_name: 'Guwahati Central Depot',
          village_id: 7,
          village_name: 'Ahatguri Flood Relief Camp',
          village_district: 'Majuli',
          cost_per_unit: 15.5,
          distance_km: 45.0,
          has_cost: true,
        },
      ],
    };

    it('enters batch grid editor mode and displays editable inputs', async () => {
      transportCostsApi.getMatrix.mockResolvedValue({ success: true, data: mockMatrixWithCells });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
      fireEvent.click(costsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Warehouse-Village Route Matrix/i)).toBeInTheDocument();
      });

      const batchEditBtn = screen.getByRole('button', { name: /Batch Edit Matrix/i });
      fireEvent.click(batchEditBtn);

      await waitFor(() => {
        expect(screen.getByText(/Transportation Matrix Batch Grid/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Route Row/i })).toBeInTheDocument();

      // Verify row with input populated
      const costInput = screen.getByDisplayValue('15.5');
      expect(costInput).toBeInTheDocument();
    });

    it('modifies route cost and submits via transportCostsApi.batchUpdate', async () => {
      transportCostsApi.getMatrix.mockResolvedValue({ success: true, data: mockMatrixWithCells });
      transportCostsApi.batchUpdate.mockResolvedValue({
        success: true,
        data: [{ id: 10, warehouse_id: 1, village_id: 7, cost_per_unit: 19.75 }],
      });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
      fireEvent.click(costsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Warehouse-Village Route Matrix/i)).toBeInTheDocument();
      });

      const batchEditBtn = screen.getByRole('button', { name: /Batch Edit Matrix/i });
      fireEvent.click(batchEditBtn);

      await waitFor(() => {
        expect(screen.getByText(/Transportation Matrix Batch Grid/i)).toBeInTheDocument();
      });

      const costInput = screen.getByDisplayValue('15.5');
      fireEvent.change(costInput, { target: { value: '19.75' } });

      expect(screen.getByText('Modified')).toBeInTheDocument();

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(transportCostsApi.batchUpdate).toHaveBeenCalledWith([
          {
            warehouse_id: 1,
            village_id: 7,
            cost_per_unit: 19.75,
            distance_km: 45,
          },
        ]);
      });

      expect(mockShowNotification).toHaveBeenCalledWith('success', expect.stringContaining('Successfully saved'));
    });

    it('adds new route row and alerts on duplicate warehouse-village combination', async () => {
      transportCostsApi.getMatrix.mockResolvedValue({ success: true, data: mockMatrixWithCells });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
      fireEvent.click(costsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Warehouse-Village Route Matrix/i)).toBeInTheDocument();
      });

      const batchEditBtn = screen.getByRole('button', { name: /Batch Edit Matrix/i });
      fireEvent.click(batchEditBtn);

      await waitFor(() => {
        expect(screen.getByText(/Transportation Matrix Batch Grid/i)).toBeInTheDocument();
      });

      // Click Add Route Row
      const addRowBtn = screen.getByRole('button', { name: /Add Route Row/i });
      fireEvent.click(addRowBtn);

      expect(screen.getByText(/1 new/i)).toBeInTheDocument();

      // Select same warehouse & village as existing row (Guwahati -> Ahatguri)
      const whSelect = screen.getByRole('combobox', { name: /Select source warehouse/i });
      fireEvent.change(whSelect, { target: { value: '1' } });

      const vilSelect = screen.getByRole('combobox', { name: /Select destination village/i });
      fireEvent.change(vilSelect, { target: { value: '7' } });

      // Duplicate detection should trigger
      await waitFor(() => {
        expect(screen.getByText(/Duplicate Route Combination Detected/i)).toBeInTheDocument();
      });

      // Save button should be disabled when duplicates exist
      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveBtn).toBeDisabled();
    });

    it('clicking Cancel exits batch edit mode without saving', async () => {
      transportCostsApi.getMatrix.mockResolvedValue({ success: true, data: mockMatrixWithCells });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const costsTabBtn = screen.getByRole('button', { name: /Transportation Costs/i });
      fireEvent.click(costsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Warehouse-Village Route Matrix/i)).toBeInTheDocument();
      });

      const batchEditBtn = screen.getByRole('button', { name: /Batch Edit Matrix/i });
      fireEvent.click(batchEditBtn);

      await waitFor(() => {
        expect(screen.getByText(/Transportation Matrix Batch Grid/i)).toBeInTheDocument();
      });

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText(/Transportation Matrix Batch Grid/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Batch Edit Matrix/i })).toBeInTheDocument();
    });
  });

  describe('Historical Plan Inspection & Consistency', () => {
    const mockRun5Allocations = [
      { warehouse_id: 2, warehouse_name: 'RSS', village_id: 1, village_name: 'GLH', supply_id: 1, supply_name: 'Food Kits', supply_category: 'Food', supply_unit: 'Kits', allocated_quantity: 80, unit_transport_cost: 360.72, total_transport_cost: 28857.6 },
      { warehouse_id: 4, warehouse_name: 'Tezpur Regional Hub', village_id: 3, village_name: 'Majuli River Island', supply_id: 4, supply_name: 'Potable Drinking Water', supply_category: 'Drinking Water', supply_unit: 'Litres', allocated_quantity: 500, unit_transport_cost: 257.5, total_transport_cost: 128750.0 },
      { warehouse_id: 4, warehouse_name: 'Tezpur Regional Hub', village_id: 3, village_name: 'Majuli River Island', supply_id: 1, supply_name: 'Food Kits', supply_category: 'Food', supply_unit: 'Kits', allocated_quantity: 150, unit_transport_cost: 257.5, total_transport_cost: 38625.0 },
      { warehouse_id: 4, warehouse_name: 'Tezpur Regional Hub', village_id: 3, village_name: 'Majuli River Island', supply_id: 2, supply_name: 'Shelter Tarpaulins', supply_category: 'Shelter', supply_unit: 'Tarps', allocated_quantity: 350, unit_transport_cost: 257.5, total_transport_cost: 90125.0 },
      { warehouse_id: 1, warehouse_name: 'Guwahati Central Depot', village_id: 2, village_name: 'Dhemaji North', supply_id: 1, supply_name: 'Food Kits', supply_category: 'Food', supply_unit: 'Kits', allocated_quantity: 200, unit_transport_cost: 544.93, total_transport_cost: 108986.0 },
      { warehouse_id: 4, warehouse_name: 'Tezpur Regional Hub', village_id: 2, village_name: 'Dhemaji North', supply_id: 2, supply_name: 'Shelter Tarpaulins', supply_category: 'Shelter', supply_unit: 'Tarps', allocated_quantity: 250, unit_transport_cost: 347.85, total_transport_cost: 86962.5 },
      { warehouse_id: 1, warehouse_name: 'Guwahati Central Depot', village_id: 4, village_name: 'Barpeta Lowlands', supply_id: 4, supply_name: 'Potable Drinking Water', supply_category: 'Drinking Water', supply_unit: 'Litres', allocated_quantity: 600, unit_transport_cost: 143.22, total_transport_cost: 85932.0 },
      { warehouse_id: 1, warehouse_name: 'Guwahati Central Depot', village_id: 4, village_name: 'Barpeta Lowlands', supply_id: 1, supply_name: 'Food Kits', supply_category: 'Food', supply_unit: 'Kits', allocated_quantity: 300, unit_transport_cost: 143.22, total_transport_cost: 42966.0 },
      { warehouse_id: 1, warehouse_name: 'Guwahati Central Depot', village_id: 5, village_name: 'Morigaon Sector', supply_id: 4, supply_name: 'Potable Drinking Water', supply_category: 'Drinking Water', supply_unit: 'Litres', allocated_quantity: 250, unit_transport_cost: 118.19, total_transport_cost: 29547.5 },
      { warehouse_id: 1, warehouse_name: 'Guwahati Central Depot', village_id: 5, village_name: 'Morigaon Sector', supply_id: 1, supply_name: 'Food Kits', supply_category: 'Food', supply_unit: 'Kits', allocated_quantity: 100, unit_transport_cost: 118.19, total_transport_cost: 11819.0 },
    ];

    const mockRun5Detail = {
      id: 5,
      run_id: 'run_20261122_064023_fc480c',
      status: 'OPTIMAL',
      solver_name: 'OR-Tools CBC',
      solver_status_message: 'Optimal Solution Found',
      solver_time_ms: 2.92,
      created_at: '2026-11-22T12:10:23.633290+05:30',
      total_requested: 2780.0,
      total_allocated: 2780.0,
      total_unmet: 0.0,
      total_transport_cost: 652570.6,
      overall_fulfilment_pct: 100.0,
      critical_fulfilment_pct: 100.0,
      is_scenario: false,
      scenario_name: 'Assam Brahmaputra Basin Flood Relief (Baseline)',
      allocations: mockRun5Allocations,
      demand_fulfilment: [
        { village_id: 1, village_name: 'GLH', village_district: 'Golaghat', supply_name: 'Food Kits', supply_unit: 'Kits', required_quantity: 80, allocated_quantity: 80, unmet_quantity: 0, urgency_level: 'Critical', fulfilment_pct: 100 },
      ],
      stock_usage: [
        { warehouse_id: 2, warehouse_name: 'RSS', supply_name: 'Food Kits', supply_unit: 'Kits', initial_available: 80, allocated_quantity: 80, remaining_stock: 0, utilization_pct: 100 },
      ],
      fairness: {
        fairness_score_rating: 'High Equity',
        average_fulfilment_pct: 100,
        min_fulfilment_pct: 100,
        disparity_gap_pct: 0,
        gini_coefficient: 0,
        hoover_index: 0,
        underserved_villages_count: 0,
        underserved_villages: [],
        urgency_breakdown: {},
      },
    };

    const mockRun26Allocations = Array.from({ length: 18 }, (_, i) => ({
      warehouse_id: (i % 3) + 1,
      warehouse_name: `Warehouse ${(i % 3) + 1}`,
      village_id: (i % 5) + 1,
      village_name: `Simulated Village ${(i % 5) + 1}`,
      supply_id: (i % 4) + 1,
      supply_name: `Supply ${(i % 4) + 1}`,
      supply_category: 'General',
      supply_unit: 'Units',
      allocated_quantity: 262.77,
      unit_transport_cost: 19.37,
      total_transport_cost: 5089.65, // 18 * ~5089.65 ≈ 91613.7
    }));

    const mockRun26Detail = {
      id: 26,
      run_id: 'run_20261123_162727_ee4af0',
      status: 'OPTIMAL',
      solver_name: 'OR-Tools CBC',
      solver_status_message: 'Optimal Solution Found',
      solver_time_ms: 3.5,
      created_at: '2026-11-23T21:57:27.845252+05:30',
      total_requested: 4730.0,
      total_allocated: 4730.0,
      total_unmet: 0.0,
      total_transport_cost: 91613.7,
      overall_fulfilment_pct: 100.0,
      critical_fulfilment_pct: 100.0,
      is_scenario: false,
      scenario_name: null,
      allocations: mockRun26Allocations,
      demand_fulfilment: [
        { village_id: 1, village_name: 'Simulated Village 1', village_district: 'Majuli', supply_name: 'Supply 1', supply_unit: 'Units', required_quantity: 500, allocated_quantity: 500, unmet_quantity: 0, urgency_level: 'High', fulfilment_pct: 100 },
      ],
      stock_usage: [
        { warehouse_id: 1, warehouse_name: 'Warehouse 1', supply_name: 'Supply 1', supply_unit: 'Units', initial_available: 1000, allocated_quantity: 500, remaining_stock: 500, utilization_pct: 50 },
      ],
      fairness: {
        fairness_score_rating: 'High Equity',
        average_fulfilment_pct: 100,
        min_fulfilment_pct: 100,
        disparity_gap_pct: 0,
        gini_coefficient: 0,
        hoover_index: 0,
        underserved_villages_count: 0,
        underserved_villages: [],
        urgency_breakdown: {},
      },
    };

    const mockRunsList = [
      {
        id: 26,
        run_id: 'run_20261123_162727_ee4af0',
        status: 'OPTIMAL',
        created_at: '2026-11-23T21:57:27.845252+05:30',
        total_requested: 4730.0,
        total_allocated: 4730.0,
        total_unmet: 0.0,
        total_transport_cost: 91613.7,
        overall_fulfilment_pct: 100.0,
        critical_fulfilment_pct: 100.0,
        is_scenario: false,
        scenario_name: null,
        solver_time_ms: 3.5,
      },
      {
        id: 5,
        run_id: 'run_20261122_064023_fc480c',
        status: 'OPTIMAL',
        created_at: '2026-11-22T12:10:23.633290+05:30',
        total_requested: 2780.0,
        total_allocated: 2780.0,
        total_unmet: 0.0,
        total_transport_cost: 652570.6,
        overall_fulfilment_pct: 100.0,
        critical_fulfilment_pct: 100.0,
        is_scenario: false,
        scenario_name: 'Assam Brahmaputra Basin Flood Relief (Baseline)',
        solver_time_ms: 2.92,
      },
    ];

    it('inspecting historical Run 5 displays ₹652,570.60, 10 allocations, and read-only inspection banner', async () => {
      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockImplementation(async (runId) => {
        if (runId === 'run_20261122_064023_fc480c' || runId === 5) {
          return { success: true, data: mockRun5Detail };
        }
        return { success: false, error: 'Not found' };
      });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      // Switch to History sub-tab
      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });

      // Find Inspect button for Run 5
      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[1]); // second row is Run 5

      // Verify solver tab is activated and Historical Plan Inspection banner is rendered
      await waitFor(() => {
        expect(screen.getByText(/Historical Plan Inspection \(Read-Only\)/i)).toBeInTheDocument();
      });

      // Verify run identification and saved date
      expect(screen.getAllByText(/Assam Brahmaputra Basin Flood Relief/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/All allocations, route costs, and fulfilment rates belong exclusively to this historical snapshot/i)).toBeInTheDocument();

      // Verify KPI metrics display Run 5 data
      expect(screen.getByText('₹652,570.6')).toBeInTheDocument();
      expect(screen.getByText('2780')).toBeInTheDocument();

      // Verify Recommended Dispatch Allocations displays exactly 10 allocations
      expect(screen.getByText(/Recommended Dispatch Allocations \(10\)/i)).toBeInTheDocument();

      // Verify Re-solve button is hidden/replaced by Back to Live Optimization
      expect(screen.queryByRole('button', { name: /^Re-solve$/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Back to Live Optimization/i }).length).toBeGreaterThan(0);

      // Verify Live Readiness Overview banner contains distinction label
      expect(screen.getByText(/Current Live Data/i)).toBeInTheDocument();
      expect(screen.getByText(/Metrics below reflect current PostgreSQL warehouse readiness, not conditions from the inspected historical snapshot/i)).toBeInTheDocument();
    });

    it('inspecting Run 26 displays ₹91,613.70 and 18 allocations', async () => {
      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockImplementation(async (runId) => {
        if (runId === 'run_20261123_162727_ee4af0' || runId === 26) {
          return { success: true, data: mockRun26Detail };
        }
        return { success: false, error: 'Not found' };
      });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261123_162727_ee4af0')).toBeInTheDocument();
      });

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[0]); // first row is Run 26

      await waitFor(() => {
        expect(screen.getByText(/Historical Plan Inspection \(Read-Only\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText('₹91,613.7')).toBeInTheDocument();
      expect(screen.getByText('4730')).toBeInTheDocument();
      expect(screen.getByText(/Recommended Dispatch Allocations \(18\)/i)).toBeInTheDocument();
    });

    it('switching from Run 5 to Run 26 and back to Run 5 updates data cleanly without bleed-through', async () => {
      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockImplementation(async (runId) => {
        if (runId === 'run_20261122_064023_fc480c' || runId === 5) {
          return { success: true, data: mockRun5Detail };
        }
        if (runId === 'run_20261123_162727_ee4af0' || runId === 26) {
          return { success: true, data: mockRun26Detail };
        }
        return { success: false, error: 'Not found' };
      });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });

      // 1. Inspect Run 5
      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/Recommended Dispatch Allocations \(10\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText('₹652,570.6')).toBeInTheDocument();

      // 2. Switch back to History tab and inspect Run 26
      fireEvent.click(screen.getByRole('button', { name: /Plan History & Scenarios/i }));
      await waitFor(() => {
        expect(screen.getByText('run_20261123_162727_ee4af0')).toBeInTheDocument();
      });
      const inspectButtons2 = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons2[0]);

      await waitFor(() => {
        expect(screen.getByText(/Recommended Dispatch Allocations \(18\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText('₹91,613.7')).toBeInTheDocument();
      expect(screen.queryByText('₹652,570.6')).not.toBeInTheDocument();

      // 3. Switch back to History tab and re-inspect Run 5
      fireEvent.click(screen.getByRole('button', { name: /Plan History & Scenarios/i }));
      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });
      const inspectButtons3 = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons3[1]);

      await waitFor(() => {
        expect(screen.getByText(/Recommended Dispatch Allocations \(10\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText('₹652,570.6')).toBeInTheDocument();
      expect(screen.queryByText('₹91,613.7')).not.toBeInTheDocument();
    });

    it('displays loading state and purges previous plan while API request is pending', async () => {
      let resolveRun;
      const pendingPromise = new Promise((resolve) => {
        resolveRun = resolve;
      });

      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockImplementation(() => pendingPromise);

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[1]);

      // Verify loading state is immediately visible in solver tab
      expect(screen.getByText(/Loading Historical Optimization Plan\.\.\./i)).toBeInTheDocument();
      expect(screen.getByText(/run_20261122_064023_fc480c/i)).toBeInTheDocument();

      // Verify no allocation table is visible while pending
      expect(screen.queryByText(/Recommended Dispatch Allocations/i)).not.toBeInTheDocument();

      // Resolve the pending promise
      resolveRun({ success: true, data: mockRun5Detail });

      await waitFor(() => {
        expect(screen.getByText(/Recommended Dispatch Allocations \(10\)/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Loading Historical Optimization Plan\.\.\./i)).not.toBeInTheDocument();
    });

    it('handles API failure gracefully without silently displaying stale data', async () => {
      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockResolvedValue({ success: false, error: 'Database network timeout' });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[1]);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith('error', expect.stringContaining('Database network timeout'));
      });

      // Verify no stale plan or allocations are rendered; empty state is displayed
      expect(screen.queryByText(/Recommended Dispatch Allocations/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No Optimization Plan Generated Yet/i)).toBeInTheDocument();
    });

    it('clicking Back to Live Optimization returns to live solver mode', async () => {
      optimizationApi.getRuns.mockResolvedValue({ success: true, data: mockRunsList });
      optimizationApi.getRun.mockResolvedValue({ success: true, data: mockRun5Detail });

      render(<OptimizationPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      const historyTabBtn = screen.getByRole('button', { name: /Plan History & Scenarios/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('run_20261122_064023_fc480c')).toBeInTheDocument();
      });

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/Historical Plan Inspection \(Read-Only\)/i)).toBeInTheDocument();
      });

      // Click Back to Live Optimization button
      const backBtn = screen.getAllByRole('button', { name: /Back to Live Optimization/i })[0];
      fireEvent.click(backBtn);

      // Verify notification and live mode restored
      expect(mockShowNotification).toHaveBeenCalledWith('info', 'Returned to Live Optimization mode.');
      expect(screen.queryByText(/Historical Plan Inspection \(Read-Only\)/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No Optimization Plan Generated Yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Allocation Plan/i })).toBeInTheDocument();
    });
  });
});

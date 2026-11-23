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
});

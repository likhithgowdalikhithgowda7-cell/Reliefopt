import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../pages/DashboardPage';
import { dashboardApi } from '../services/api';

vi.mock('../services/api', () => ({
  dashboardApi: {
    getSummary: vi.fn(),
  },
}));

describe('Dashboard Component (DashboardPage.jsx)', () => {
  const mockOnNavigate = vi.fn();
  const mockShowNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDashboardData = {
    total_warehouses: 5,
    total_active_villages: 6,
    total_supply_types: 7,
    total_available_inventory: 6849,
    total_recorded_demand: 4810,
    critical_demands_count: 5,
    demand_by_urgency: {
      Critical: 5,
      High: 4,
      Medium: 3,
      Low: 4,
    },
    is_empty: false,
  };

  it('renders loading state initially while fetching summary', () => {
    dashboardApi.getSummary.mockReturnValue(new Promise(() => {})); // pending

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    expect(screen.getByText(/Retrieving metrics from PostgreSQL\.\.\./i)).toBeInTheDocument();
  });

  it('renders error banner when API returns error', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: false,
      error: 'Connection to PostgreSQL refused',
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText(/Connection to PostgreSQL refused/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when database has no records', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: true,
      data: { is_empty: true },
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText(/Database is Empty/i)).toBeInTheDocument();
    });
  });

  it('renders complete operational metrics when data loads successfully', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Registered Warehouses')).toBeInTheDocument();
    });

    // Check metric values
    expect(screen.getAllByText('5')[0]).toBeInTheDocument(); // total_warehouses
    expect(screen.getByText('6')).toBeInTheDocument(); // total_active_villages
    expect(screen.getByText('7')).toBeInTheDocument(); // total_supply_types
    expect(screen.getByText('6,849')).toBeInTheDocument(); // inventory
    expect(screen.getByText('4,810')).toBeInTheDocument(); // demand

    // Urgency breakdown pills
    expect(screen.getByText(/Critical Priority:/i)).toBeInTheDocument();
    expect(screen.getByText(/High Urgency:/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium Urgency:/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Urgency:/i)).toBeInTheDocument();
  });

  it('clicking a metric card navigates to the associated sub-module', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Registered Warehouses')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Registered Warehouses'));
    expect(mockOnNavigate).toHaveBeenCalledWith('warehouses');

    fireEvent.click(screen.getByText('Active Villages'));
    expect(mockOnNavigate).toHaveBeenCalledWith('villages');
  });

  it('refresh button re-fetches dashboard metrics', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Registered Warehouses')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
  });

  it('triggers onNavigate for all Quick Management Actions including Optimization and Analytics & Maps', async () => {
    dashboardApi.getSummary.mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });

    render(<DashboardPage onNavigate={mockOnNavigate} showNotification={mockShowNotification} />);

    await waitFor(() => {
      expect(screen.getByText('Quick Management Actions')).toBeInTheDocument();
    });

    // 5 existing management actions
    fireEvent.click(screen.getByRole('button', { name: /Manage Warehouses/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('warehouses');

    fireEvent.click(screen.getByRole('button', { name: /Define Supplies/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('supplies');

    fireEvent.click(screen.getByRole('button', { name: /Update Inventory/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('inventory');

    fireEvent.click(screen.getByRole('button', { name: /Register Village/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('villages');

    fireEvent.click(screen.getByRole('button', { name: /Record Demand/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('demands');

    // 2 new approved actions
    fireEvent.click(screen.getByRole('button', { name: /Run Optimization/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('optimization');

    fireEvent.click(screen.getByRole('button', { name: /View Analytics & Maps/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('analytics_maps');
  });
});

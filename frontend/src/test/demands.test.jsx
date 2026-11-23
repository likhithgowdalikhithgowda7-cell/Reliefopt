import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DemandsPage from '../pages/DemandsPage';
import { demandsApi, villagesApi, suppliesApi } from '../services/api';

vi.mock('../services/api', () => ({
  demandsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  villagesApi: {
    list: vi.fn(),
  },
  suppliesApi: {
    list: vi.fn(),
  },
}));

describe('Demand Management (DemandsPage.jsx)', () => {
  const mockShowNotification = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVillages = [
    { id: 7, name: 'Ahatguri Flood Relief Camp', district: 'Majuli' },
  ];

  const mockSupplies = [
    { id: 1, name: 'Water Purification Tablets', category: 'Drinking Water' },
  ];

  const mockDemands = [
    {
      id: 101,
      village_id: 7,
      village_name: 'Ahatguri Flood Relief Camp',
      village_district: 'Majuli',
      supply_id: 1,
      supply_name: 'Water Purification Tablets',
      supply_category: 'Drinking Water',
      required_quantity: 500,
      urgency_level: 'Critical',
      remarks: 'Brahmaputra overflow contamination',
      created_at: '2026-11-22T10:00:00Z',
    },
  ];

  it('renders demand list with urgency badges and quantity', async () => {
    demandsApi.list.mockResolvedValue({ success: true, data: mockDemands });
    villagesApi.list.mockResolvedValue({ success: true, data: mockVillages });
    suppliesApi.list.mockResolvedValue({ success: true, data: mockSupplies });

    render(<DemandsPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Water Purification Tablets')).toBeInTheDocument();
    });

    expect(screen.getByText('Ahatguri Flood Relief Camp')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getAllByText('Critical')[0]).toBeInTheDocument();
  });

  it('filtering by urgency triggers API fetch with correct urgency parameter', async () => {
    demandsApi.list.mockResolvedValue({ success: true, data: mockDemands });
    villagesApi.list.mockResolvedValue({ success: true, data: mockVillages });
    suppliesApi.list.mockResolvedValue({ success: true, data: mockSupplies });

    render(<DemandsPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Water Purification Tablets')).toBeInTheDocument();
    });

    const criticalFilterBtn = screen.getByRole('button', { name: /^Critical/i });
    fireEvent.click(criticalFilterBtn);

    expect(demandsApi.list).toHaveBeenCalledWith({ urgency: 'Critical' });
  });

  it('opens Edit Demand modal and populates existing record values', async () => {
    demandsApi.list.mockResolvedValue({ success: true, data: mockDemands });
    villagesApi.list.mockResolvedValue({ success: true, data: mockVillages });
    suppliesApi.list.mockResolvedValue({ success: true, data: mockSupplies });

    render(<DemandsPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Water Purification Tablets')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /Edit Demand Record/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Brahmaputra overflow contamination')).toBeInTheDocument();
  });

  it('saves updated demand record when valid positive quantity is submitted', async () => {
    demandsApi.list.mockResolvedValue({ success: true, data: mockDemands });
    villagesApi.list.mockResolvedValue({ success: true, data: mockVillages });
    suppliesApi.list.mockResolvedValue({ success: true, data: mockSupplies });
    demandsApi.update.mockResolvedValue({ success: true, data: { ...mockDemands[0], required_quantity: 750 } });

    render(<DemandsPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Water Purification Tablets')).toBeInTheDocument();
    });

    // Open edit modal
    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);

    const quantityInput = screen.getByDisplayValue('500');
    fireEvent.change(quantityInput, { target: { value: '750' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(demandsApi.update).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          required_quantity: 750,
          urgency_level: 'Critical',
        })
      );
    });

    expect(mockShowNotification).toHaveBeenCalledWith('success', expect.stringContaining('successfully'));
  });
});

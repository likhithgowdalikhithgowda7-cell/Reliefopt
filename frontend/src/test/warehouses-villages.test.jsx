import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WarehousesPage from '../pages/WarehousesPage';
import VillagesPage from '../pages/VillagesPage';
import { warehousesApi, villagesApi, inventoryApi } from '../services/api';

vi.mock('../services/api', () => ({
  warehousesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  villagesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  inventoryApi: {
    getByWarehouse: vi.fn(),
  },
}));

describe('Warehouses and Villages Management', () => {
  const mockShowNotification = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WarehousesPage Component', () => {
    const mockWarehouses = [
      {
        id: 1,
        name: 'Guwahati Central Depot',
        address: 'G.S. Road, Guwahati',
        latitude: 26.1445,
        longitude: 91.7362,
        contact_info: '+91-94350-11223',
        is_active: true,
        total_inventory_items: 4,
      },
      {
        id: 2,
        name: 'Tezpur Regional Hub',
        address: 'Mission Chariali, Tezpur',
        latitude: 26.6528,
        longitude: 92.7926,
        contact_info: '+91-94351-44556',
        is_active: false,
        total_inventory_items: 0,
      },
    ];

    it('renders warehouses table with records and active/inactive badges', async () => {
      warehousesApi.list.mockResolvedValue({
        success: true,
        data: mockWarehouses,
      });

      render(<WarehousesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Guwahati Central Depot')).toBeInTheDocument();
      });

      expect(screen.getByText('Tezpur Regional Hub')).toBeInTheDocument();
      expect(screen.getByText('G.S. Road, Guwahati')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('opens Add Warehouse modal when Add Warehouse button is clicked', async () => {
      warehousesApi.list.mockResolvedValue({
        success: true,
        data: mockWarehouses,
      });

      render(<WarehousesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Guwahati Central Depot')).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add Warehouse/i });
      fireEvent.click(addBtn);

      expect(screen.getByRole('heading', { name: /Register New Warehouse/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Guwahati Central Relief Hub/i)).toBeInTheDocument();
    });

    it('renders EmptyState when warehouse list is empty', async () => {
      warehousesApi.list.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<WarehousesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText(/No Warehouses Registered/i)).toBeInTheDocument();
      });
    });

    it('displays continuous sequential serial numbers 1, 2, 3, 4, 5 when database IDs have gaps (1, 3, 4, 5, 6) while operations use real DB IDs', async () => {
      const mockGappedWarehouses = [
        { id: 1, name: 'Guwahati Depot', address: 'G.S. Road', latitude: 26.14, longitude: 91.73, contact_info: '111', is_active: true, total_inventory_items: 2 },
        { id: 3, name: 'Silchar Depot', address: 'Park Road', latitude: 24.82, longitude: 92.79, contact_info: '333', is_active: true, total_inventory_items: 3 },
        { id: 4, name: 'Dibrugarh Depot', address: 'AT Road', latitude: 27.47, longitude: 94.91, contact_info: '444', is_active: true, total_inventory_items: 1 },
        { id: 5, name: 'Jorhat Depot', address: 'Gar-Ali', latitude: 26.75, longitude: 94.20, contact_info: '555', is_active: false, total_inventory_items: 0 },
        { id: 6, name: 'Nagaon Depot', address: 'Haibargaon', latitude: 26.34, longitude: 92.68, contact_info: '666', is_active: true, total_inventory_items: 4 },
      ];

      warehousesApi.list.mockResolvedValue({
        success: true,
        data: mockGappedWarehouses,
      });
      warehousesApi.update.mockResolvedValue({ success: true, data: { ...mockGappedWarehouses[1], name: 'Silchar Updated Hub' } });
      warehousesApi.delete.mockResolvedValue({ success: true });
      inventoryApi.getByWarehouse.mockResolvedValue({ success: true, data: [] });

      render(<WarehousesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Guwahati Depot')).toBeInTheDocument();
      });

      // Verify continuous sequential serial numbers 1 through 5 are displayed
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('#5')).toBeInTheDocument();

      // Tooltips display the original database IDs
      expect(screen.getByTitle('Database ID: 1')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 3')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 4')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 5')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 6')).toBeInTheDocument();

      // Check operations preserve original DB IDs
      // 1. Edit Silchar Depot (row 2, S.No #2, original DB ID 3)
      const editButtons = screen.getAllByTitle('Edit Details');
      fireEvent.click(editButtons[1]); // 2nd row (Silchar Depot, DB ID 3)

      expect(screen.getByDisplayValue('Silchar Depot')).toBeInTheDocument();
      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(warehousesApi.update).toHaveBeenCalledWith(
          3,
          expect.objectContaining({ name: 'Silchar Depot' })
        );
      });

      // 2. View Inventory for Dibrugarh Depot (row 3, S.No #3, original DB ID 4)
      const invButtons = screen.getAllByTitle('View Inventory');
      fireEvent.click(invButtons[2]);

      expect(inventoryApi.getByWarehouse).toHaveBeenCalledWith(4);

      // 3. Toggle active for Jorhat Depot (row 4, S.No #4, original DB ID 5)
      const toggleButtons = screen.getAllByTitle(/Activate|Deactivate/i);
      fireEvent.click(toggleButtons[3]);

      expect(warehousesApi.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ is_active: true })
      );

      // 4. Delete Nagaon Depot (row 5, S.No #5, original DB ID 6)
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteButtons = screen.getAllByTitle('Delete Warehouse');
      fireEvent.click(deleteButtons[4]);

      expect(warehousesApi.delete).toHaveBeenCalledWith(6, true);
    });
  });

  describe('VillagesPage Component', () => {
    const mockVillages = [
      {
        id: 7,
        name: 'Ahatguri Flood Relief Camp',
        district: 'Majuli',
        state: 'Assam',
        latitude: 26.9612,
        longitude: 94.1843,
        population: 3850,
        is_active: true,
        total_demands_count: 3,
      },
      {
        id: 1,
        name: 'GLH',
        district: 'Chitradurga',
        state: 'Karnataka',
        latitude: 24.8333,
        longitude: 92.7789,
        population: 500,
        is_active: true,
        total_demands_count: 1,
      },
    ];

    it('renders affected villages with population, district and state', async () => {
      villagesApi.list.mockResolvedValue({
        success: true,
        data: mockVillages,
      });

      render(<VillagesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Ahatguri Flood Relief Camp')).toBeInTheDocument();
      });

      expect(screen.getByText('GLH')).toBeInTheDocument();
      expect(screen.getByText(/Majuli/i)).toBeInTheDocument();
      expect(screen.getByText('3,850')).toBeInTheDocument();
    });

    it('opens Register Village modal when clicking Register Village button', async () => {
      villagesApi.list.mockResolvedValue({
        success: true,
        data: mockVillages,
      });

      render(<VillagesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Ahatguri Flood Relief Camp')).toBeInTheDocument();
      });

      const registerBtn = screen.getByRole('button', { name: /Register Village/i });
      fireEvent.click(registerBtn);

      expect(screen.getByRole('heading', { name: /Register Affected Village/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Majuli Riverbank Ward 3/i)).toBeInTheDocument();
    });

    it('displays continuous sequential serial numbers 1, 2, 3, 4, 5 for villages with ID gaps while preserving real DB IDs for actions', async () => {
      const mockGappedVillages = [
        { id: 1, name: 'GLH', district: 'Chitradurga', state: 'Karnataka', latitude: 24.83, longitude: 92.77, population: 500, is_active: true, total_demands_count: 1 },
        { id: 2, name: 'ger', district: 'Chitradurga', state: 'Karnataka', latitude: 24.84, longitude: 92.78, population: 600, is_active: true, total_demands_count: 0 },
        { id: 7, name: 'Ahatguri Flood Relief Camp', district: 'Majuli', state: 'Assam', latitude: 26.96, longitude: 94.18, population: 3850, is_active: true, total_demands_count: 3 },
        { id: 8, name: 'Brahmaputra Embankment Ward', district: 'Dhubri', state: 'Assam', latitude: 26.02, longitude: 89.97, population: 4200, is_active: true, total_demands_count: 2 },
        { id: 9, name: 'Rupahi Inundation Shelter', district: 'Nagaon', state: 'Assam', latitude: 26.43, longitude: 92.71, population: 2900, is_active: false, total_demands_count: 1 },
      ];

      villagesApi.list.mockResolvedValue({
        success: true,
        data: mockGappedVillages,
      });
      villagesApi.update.mockResolvedValue({ success: true, data: { ...mockGappedVillages[2], name: 'Ahatguri Center' } });

      render(<VillagesPage showNotification={mockShowNotification} onNavigate={mockOnNavigate} />);

      await waitFor(() => {
        expect(screen.getByText('Ahatguri Flood Relief Camp')).toBeInTheDocument();
      });

      // Verify sequential numbers 1 to 5
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('#5')).toBeInTheDocument();

      // Tooltips display actual DB IDs
      expect(screen.getByTitle('Database ID: 7')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 8')).toBeInTheDocument();
      expect(screen.getByTitle('Database ID: 9')).toBeInTheDocument();

      // Edit 3rd row (Ahatguri Flood Relief Camp, serial #3, real DB ID 7)
      const editButtons = screen.getAllByTitle('Edit Village');
      fireEvent.click(editButtons[2]);

      expect(screen.getByDisplayValue('Ahatguri Flood Relief Camp')).toBeInTheDocument();
      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(villagesApi.update).toHaveBeenCalledWith(
          7,
          expect.objectContaining({ name: 'Ahatguri Flood Relief Camp' })
        );
      });
    });
  });
});

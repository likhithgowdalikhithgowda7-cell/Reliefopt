import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  warehousesApi,
  villagesApi,
  suppliesApi,
  inventoryApi,
  demandsApi,
  dashboardApi,
  transportCostsApi,
  optimizationApi,
  checkBackendHealth,
} from '../services/api';

describe('Central API Client (api.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('warehousesApi', () => {
    it('list() calls /api/warehouses without query param by default', async () => {
      const mockData = [{ id: 1, name: 'Guwahati Depot' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const res = await warehousesApi.list();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/warehouses$/),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('list(true) appends active_only query param', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await warehousesApi.list(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/warehouses\?active_only=true$/),
        expect.any(Object)
      );
    });

    it('getAll({ active_only: true }) correctly forwards active filter', async () => {
      const mockWhs = [{ id: 1, name: 'Warehouse A' }, { id: 2, name: 'Warehouse B' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockWhs,
      });

      const res = await warehousesApi.getAll({ active_only: true });
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/warehouses\?active_only=true$/),
        expect.any(Object)
      );
    });

    it('getAll() with no arguments requests all warehouses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await warehousesApi.getAll();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/warehouses$/),
        expect.any(Object)
      );
    });

    it('create() posts warehouse payload', async () => {
      const payload = { name: 'New Depot', latitude: 26.1, longitude: 91.7, address: 'Assam' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 10, ...payload }),
      });

      const res = await warehousesApi.create(payload);
      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/warehouses$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });
  });

  describe('villagesApi', () => {
    it('getAll({ active_only: true }) queries active villages', async () => {
      const mockVillages = [{ id: 9, name: 'Sarthebari Ward', district: 'Barpeta' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockVillages,
      });

      const res = await villagesApi.getAll({ active_only: true });
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockVillages);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/villages\?active_only=true$/),
        expect.any(Object)
      );
    });

    it('getAll(false) and getAll() query all villages without active_only', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await villagesApi.getAll(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/villages$/),
        expect.any(Object)
      );
    });
  });

  describe('dashboardApi and health', () => {
    it('getSummary() queries /api/dashboard/summary', async () => {
      const summaryMock = {
        total_warehouses: 5,
        total_villages: 6,
        total_inventory_units: 6849,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => summaryMock,
      });

      const res = await dashboardApi.getSummary();
      expect(res.success).toBe(true);
      expect(res.data.total_warehouses).toBe(5);
    });

    it('checkBackendHealth() hits /health', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'healthy', database: 'connected' }),
      });

      const res = await checkBackendHealth();
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('healthy');
    });
  });

  describe('transportCostsApi and optimizationApi', () => {
    it('transportCostsApi.getAll with filters formats query string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await transportCostsApi.getAll({ warehouse_id: 1, village_id: 7 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/transportation-costs\?warehouse_id=1&village_id=7$/),
        expect.any(Object)
      );
    });

    it('optimizationApi.solve sends scenario_name when provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'OPTIMAL', total_cost: 15420.5 }),
      });

      const res = await optimizationApi.solve('Flood Plan Beta');
      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/optimization\/solve\?scenario_name=Flood%20Plan%20Beta$/),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Unified Error Handling', () => {
    it('handles HTTP 422 with validation detail string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          detail: 'Quantity must be greater than zero',
        }),
      });

      const res = await demandsApi.create({ quantity: -10 });
      expect(res.success).toBe(false);
      expect(res.status).toBe(422);
      expect(res.error).toBe('Quantity must be greater than zero');
    });

    it('handles network failure gracefully without crashing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const res = await warehousesApi.list();
      expect(res.success).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toBe('Failed to fetch');
    });
  });
});

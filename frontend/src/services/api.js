/**
 * Central API Client for ReliefOpt Frontend.
 * Communicates with the FastAPI backend service and PostgreSQL database.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Generic fetch wrapper with timeout, JSON parsing, and unified error handling.
 */
async function request(endpoint, options = {}, timeoutMs = 8000) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 204) {
      return { success: true, data: null, error: null };
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.detail ||
        (Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg).join(', ')
          : `HTTP ${response.status}: ${response.statusText}`);
      return { success: false, data: null, error: errorMsg, status: response.status };
    }

    return { success: true, data, error: null, status: response.status };
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMsg = 'Failed to connect to backend server.';
    if (err.name === 'AbortError') {
      errorMsg = `Request timed out after ${timeoutMs / 1000} seconds.`;
    } else if (err.message) {
      errorMsg = err.message;
    }
    return { success: false, data: null, error: errorMsg, status: 0 };
  }
}

/**
 * Health check
 */
export async function checkBackendHealth(timeoutMs = 4000) {
  const result = await request('/health', { method: 'GET' }, timeoutMs);
  return {
    ...result,
    url: `${API_BASE_URL}/health`,
  };
}

/**
 * Warehouse API service
 */
export const warehousesApi = {
  list: (activeOnly = false) =>
    request(`/api/warehouses${activeOnly ? '?active_only=true' : ''}`, { method: 'GET' }),
  get: (id) => request(`/api/warehouses/${id}`, { method: 'GET' }),
  create: (data) =>
    request('/api/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/api/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id, hardDelete = false) =>
    request(`/api/warehouses/${id}${hardDelete ? '?hard_delete=true' : ''}`, {
      method: 'DELETE',
    }),
};

/**
 * Relief Supply API service
 */
export const suppliesApi = {
  list: () => request('/api/supplies', { method: 'GET' }),
  get: (id) => request(`/api/supplies/${id}`, { method: 'GET' }),
  create: (data) =>
    request('/api/supplies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/api/supplies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/api/supplies/${id}`, { method: 'DELETE' }),
};

/**
 * Warehouse Inventory API service
 */
export const inventoryApi = {
  list: () => request('/api/inventory', { method: 'GET' }),
  getByWarehouse: (warehouseId) =>
    request(`/api/inventory/warehouse/${warehouseId}`, { method: 'GET' }),
  getSummary: () => request('/api/inventory/summary', { method: 'GET' }),
  get: (id) => request(`/api/inventory/${id}`, { method: 'GET' }),
  add: (data) =>
    request('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/api/inventory/${id}`, { method: 'DELETE' }),
};

/**
 * Affected Village API service
 */
export const villagesApi = {
  list: (activeOnly = false) =>
    request(`/api/villages${activeOnly ? '?active_only=true' : ''}`, { method: 'GET' }),
  get: (id) => request(`/api/villages/${id}`, { method: 'GET' }),
  create: (data) =>
    request('/api/villages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/api/villages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id, hardDelete = false) =>
    request(`/api/villages/${id}${hardDelete ? '?hard_delete=true' : ''}`, {
      method: 'DELETE',
    }),
};

/**
 * Village Demand API service
 */
export const demandsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.village_id) query.append('village_id', params.village_id);
    if (params.urgency) query.append('urgency', params.urgency);
    const qs = query.toString();
    return request(`/api/demands${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  get: (id) => request(`/api/demands/${id}`, { method: 'GET' }),
  create: (data) =>
    request('/api/demands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/api/demands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/api/demands/${id}`, { method: 'DELETE' }),
};

/**
 * Dashboard API service
 */
export const dashboardApi = {
  getSummary: () => request('/api/dashboard/summary', { method: 'GET' }),
};

/**
 * Transportation Costs API service
 */
export const transportCostsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.warehouse_id) query.append('warehouse_id', params.warehouse_id);
    if (params.village_id) query.append('village_id', params.village_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/transportation-costs${qs}`, { method: 'GET' });
  },
  getMatrix: () => request('/api/transportation-costs/matrix', { method: 'GET' }),
  createOrUpdate: (data) =>
    request('/api/transportation-costs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  batchUpdate: (costs) =>
    request('/api/transportation-costs/batch', {
      method: 'POST',
      body: JSON.stringify({ costs }),
    }),
  seedSample: () =>
    request('/api/transportation-costs/seed-sample', { method: 'POST' }),
  delete: (id) => request(`/api/transportation-costs/${id}`, { method: 'DELETE' }),
};

/**
 * Optimization API service
 */
export const optimizationApi = {
  getOverview: () => request('/api/optimization/overview', { method: 'GET' }),
  solve: (scenarioName) => {
    const qs = scenarioName ? `?scenario_name=${encodeURIComponent(scenarioName)}` : '';
    return request(`/api/optimization/solve${qs}`, { method: 'POST' });
  },
  simulate: (data) =>
    request('/api/optimization/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRuns: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.is_scenario !== undefined) query.append('is_scenario', params.is_scenario);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/optimization/runs${qs}`, { method: 'GET' });
  },
  getRun: (id) => request(`/api/optimization/runs/${id}`, { method: 'GET' }),
  deleteRun: (id) => request(`/api/optimization/runs/${id}`, { method: 'DELETE' }),
  compare: (runAId, runBId) =>
    request(`/api/optimization/compare?run_a_id=${runAId}&run_b_id=${runBId}`, { method: 'GET' }),
};

/**
 * Analytics & Maps API service
 */
export const analyticsApi = {
  getOverview: (params = {}) => {
    const query = new URLSearchParams();
    if (params.plan_id) query.append('plan_id', params.plan_id);
    if (params.warehouse_id) query.append('warehouse_id', params.warehouse_id);
    if (params.village_id) query.append('village_id', params.village_id);
    if (params.supply_id) query.append('supply_id', params.supply_id);
    if (params.urgency) query.append('urgency', params.urgency);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/analytics/overview${qs}`, { method: 'GET' });
  },
};

export default {
  API_BASE_URL,
  checkBackendHealth,
  warehousesApi,
  suppliesApi,
  inventoryApi,
  villagesApi,
  demandsApi,
  dashboardApi,
  transportCostsApi,
  optimizationApi,
  analyticsApi,
};



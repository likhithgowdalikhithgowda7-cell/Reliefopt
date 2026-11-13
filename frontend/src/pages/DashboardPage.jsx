import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  MapPin,
  Boxes,
  Layers,
  ClipboardList,
  AlertOctagon,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import EmptyState from '../components/EmptyState';

export default function DashboardPage({ onNavigate, showNotification }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    const result = await dashboardApi.getSummary();
    if (result.success && result.data) {
      setSummary(result.data);
    } else {
      setError(result.error || 'Failed to load dashboard metrics.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="page-container container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Coordinator Dashboard</h1>
          <p className="page-subtitle">
            Real-time operational summary derived directly from the PostgreSQL database.
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <strong>Database Communication Error:</strong> {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !summary && (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Retrieving metrics from PostgreSQL...</span>
        </div>
      )}

      {/* Empty State */}
      {summary && summary.is_empty && (
        <EmptyState
          title="Database is Empty"
          description="No warehouses, supplies, or affected villages have been recorded yet. Start by adding your first warehouse or relief supply."
          actionLabel="Add Warehouse"
          onAction={() => onNavigate('warehouses')}
        />
      )}

      {/* Dashboard Metrics Grid */}
      {summary && !summary.is_empty && (
        <>
          <div className="metrics-grid">
            {/* Warehouses Card */}
            <div className="metric-card" onClick={() => onNavigate('warehouses')}>
              <div className="metric-header">
                <span className="metric-label">Registered Warehouses</span>
                <div className="metric-icon-box bg-blue">
                  <Warehouse size={20} />
                </div>
              </div>
              <div className="metric-value">{summary.total_warehouses}</div>
              <div className="metric-footer">
                <span>Active storage depots</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Affected Villages Card */}
            <div className="metric-card" onClick={() => onNavigate('villages')}>
              <div className="metric-header">
                <span className="metric-label">Active Villages</span>
                <div className="metric-icon-box bg-indigo">
                  <MapPin size={20} />
                </div>
              </div>
              <div className="metric-value">{summary.total_active_villages}</div>
              <div className="metric-footer">
                <span>Disaster-impacted locations</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Supply Types Card */}
            <div className="metric-card" onClick={() => onNavigate('supplies')}>
              <div className="metric-header">
                <span className="metric-label">Supply Types</span>
                <div className="metric-icon-box bg-teal">
                  <Boxes size={20} />
                </div>
              </div>
              <div className="metric-value">{summary.total_supply_types}</div>
              <div className="metric-footer">
                <span>Catalogued relief items</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Available Inventory Card */}
            <div className="metric-card" onClick={() => onNavigate('inventory')}>
              <div className="metric-header">
                <span className="metric-label">Available Inventory</span>
                <div className="metric-icon-box bg-emerald">
                  <Layers size={20} />
                </div>
              </div>
              <div className="metric-value">{summary.total_available_inventory.toLocaleString()}</div>
              <div className="metric-footer">
                <span>Total units in depots</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Total Demand Card */}
            <div className="metric-card" onClick={() => onNavigate('demands')}>
              <div className="metric-header">
                <span className="metric-label">Total Recorded Demand</span>
                <div className="metric-icon-box bg-amber">
                  <ClipboardList size={20} />
                </div>
              </div>
              <div className="metric-value">{summary.total_recorded_demand.toLocaleString()}</div>
              <div className="metric-footer">
                <span>Units requested by villages</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Critical Urgency Card */}
            <div className="metric-card metric-critical" onClick={() => onNavigate('demands')}>
              <div className="metric-header">
                <span className="metric-label">Critical Demands</span>
                <div className="metric-icon-box bg-rose">
                  <AlertOctagon size={20} />
                </div>
              </div>
              <div className="metric-value text-rose">{summary.critical_urgency_demands}</div>
              <div className="metric-footer">
                <span>Highest dispatch priority</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Urgency Distribution Breakdown */}
          <div className="dashboard-section-card">
            <h3 className="section-card-title">Demand Urgency Breakdown</h3>
            <p className="section-card-desc">
              Distribution of coordinator-recorded relief requests categorized by assigned urgency levels.
            </p>

            <div className="urgency-breakdown-grid">
              <div className="urgency-stat-pill pill-critical">
                <span className="urgency-dot bg-danger"></span>
                <span className="urgency-label">Critical Priority:</span>
                <strong>{summary.demand_by_urgency?.Critical || 0}</strong>
              </div>
              <div className="urgency-stat-pill pill-high">
                <span className="urgency-dot bg-warning"></span>
                <span className="urgency-label">High Urgency:</span>
                <strong>{summary.demand_by_urgency?.High || 0}</strong>
              </div>
              <div className="urgency-stat-pill pill-medium">
                <span className="urgency-dot bg-primary"></span>
                <span className="urgency-label">Medium Urgency:</span>
                <strong>{summary.demand_by_urgency?.Medium || 0}</strong>
              </div>
              <div className="urgency-stat-pill pill-low">
                <span className="urgency-dot bg-success"></span>
                <span className="urgency-label">Low Urgency:</span>
                <strong>{summary.demand_by_urgency?.Low || 0}</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="quick-actions-card">
            <h3 className="section-card-title">Quick Management Actions</h3>
            <div className="quick-actions-btns">
              <button onClick={() => onNavigate('warehouses')} className="btn btn-secondary btn-sm">
                <Plus size={14} />
                <span>Manage Warehouses</span>
              </button>
              <button onClick={() => onNavigate('supplies')} className="btn btn-secondary btn-sm">
                <Plus size={14} />
                <span>Define Supplies</span>
              </button>
              <button onClick={() => onNavigate('inventory')} className="btn btn-secondary btn-sm">
                <Plus size={14} />
                <span>Update Inventory</span>
              </button>
              <button onClick={() => onNavigate('villages')} className="btn btn-secondary btn-sm">
                <Plus size={14} />
                <span>Register Village</span>
              </button>
              <button onClick={() => onNavigate('demands')} className="btn btn-primary btn-sm">
                <Plus size={14} />
                <span>Record Demand</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

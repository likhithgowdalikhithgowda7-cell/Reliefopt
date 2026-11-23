import React from 'react';
import { X, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export default function DashboardModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={18} color="var(--primary-600)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-600)' }}>
                ReliefOpt Operational Overview
              </span>
            </div>
            <h3 className="modal-title">Operational Subsystems</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-banner">
          <strong>System Status:</strong> All core emergency decision-support modules are active, connected to the PostgreSQL database, and integrated with the Google OR-Tools optimization engine.
        </div>

        <div className="roadmap-list">
          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-1-badge">Operational</span>
            <div>
              <div className="roadmap-item-title">Real-Time Database Metrics & Dashboard</div>
              <div className="roadmap-item-desc">
                Live aggregations for registered warehouses, active villages, inventory levels, recorded demands, and critical urgency breakdowns.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-1-badge">Operational</span>
            <div>
              <div className="roadmap-item-title">Warehouses, Villages & Demand Management</div>
              <div className="roadmap-item-desc">
                PostgreSQL CRUD management for supply depots, flood-affected communities, categorized relief catalogue, and urgency prioritization.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-1-badge">Operational</span>
            <div>
              <div className="roadmap-item-title">Google OR-Tools Mathematical Optimization</div>
              <div className="roadmap-item-desc">
                Mixed-Integer Linear Programming solver formulating optimal multi-commodity distribution plans under inventory limits and urgency tiers.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-1-badge">Operational</span>
            <div>
              <div className="roadmap-item-title">Interactive Geospatial Maps & Plotly Analytics</div>
              <div className="roadmap-item-desc">
                Leaflet GIS mapping with English cartography, distribution transit routes, and Plotly visual fulfillment reporting.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            <span>Close Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
}

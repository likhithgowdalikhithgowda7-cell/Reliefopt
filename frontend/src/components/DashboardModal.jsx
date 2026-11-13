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
                ReliefOpt Development Status
              </span>
            </div>
            <h3 className="modal-title">Coordinator Dashboard</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-banner">
          <strong>Notice:</strong> The interactive ReliefOpt Dashboard is currently under development. Stage 1 establishes the architectural foundation and real-time backend health connectivity.
        </div>

        <div className="roadmap-list">
          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-1-badge">Stage 1: Completed</span>
            <div>
              <div className="roadmap-item-title">Foundation & Health Connectivity</div>
              <div className="roadmap-item-desc">
                FastAPI server entry point, CORS configuration, React/Vite client, and live API health verification.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-future-badge">Stage 2: Next</span>
            <div>
              <div className="roadmap-item-title">Warehouses & Villages Management</div>
              <div className="roadmap-item-desc">
                PostgreSQL database integration, supply intake forms, affected village demand records, and coordinator-assessed urgency levels.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-future-badge">Stage 3: Planned</span>
            <div>
              <div className="roadmap-item-title">Google OR-Tools Optimisation Engine</div>
              <div className="roadmap-item-desc">
                Use Google OR-Tools to recommend allocations considering inventory, demand, estimated transportation costs, urgency, and explicitly defined fairness rules.
              </div>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-stage-badge stage-future-badge">Stage 4: Planned</span>
            <div>
              <div className="roadmap-item-title">Interactive Geospatial Maps & Plotly Charts</div>
              <div className="roadmap-item-desc">
                Visualise results, remaining inventory, estimated transportation costs, and unmet demand using Plotly, Leaflet, and OpenStreetMap.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            <span>Got it, return to home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

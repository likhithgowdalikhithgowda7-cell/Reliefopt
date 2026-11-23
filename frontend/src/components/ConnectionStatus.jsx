import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Server, Clock } from 'lucide-react';

export default function ConnectionStatus({ status, healthData, error, endpointUrl, onRetry, isChecking }) {
  return (
    <div className={`connection-banner ${status}`}>
      <div className="connection-banner-left">
        <div className="connection-icon-wrapper">
          {status === 'connected' && <CheckCircle2 size={24} />}
          {status === 'connecting' && <RefreshCw size={22} className={isChecking ? 'spin-icon' : ''} />}
          {status === 'unavailable' && <AlertCircle size={24} />}
        </div>

        <div>
          <div className="connection-title">
            {status === 'connected' && 'Backend Connected (FastAPI)'}
            {status === 'connecting' && 'Connecting to Backend...'}
            {status === 'unavailable' && 'Backend Unavailable'}
          </div>

          <div className="connection-details">
            {status === 'connected' && healthData && (
              <span>
                Verified API: <span className="connection-endpoint-tag">{endpointUrl}</span> • Version:{' '}
                <strong>{healthData.version || '1.0.0'}</strong> • System Status:{' '}
                <strong>{healthData.status === 'healthy' ? 'Operational (v1.0.0)' : 'Degraded'}</strong>
              </span>
            )}

            {status === 'connecting' && (
              <span>Attempting health check against <span className="connection-endpoint-tag">{endpointUrl}</span></span>
            )}

            {status === 'unavailable' && (
              <div>
                <span>Unable to reach <span className="connection-endpoint-tag">{endpointUrl}</span></span>
                <div className="connection-error-box">
                  <strong>Diagnostic:</strong> {error || 'Connection refused or backend server is not running.'}
                  <div style={{ marginTop: '4px', fontSize: '0.8rem', opacity: 0.9 }}>
                    Tip: Start the FastAPI backend with: <code>uvicorn app.main:app --reload --port 8000</code> in the <code>backend/</code> folder.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="connection-actions">
        {status === 'connected' && healthData?.timestamp && (
          <span style={{ fontSize: '0.78rem', color: 'var(--navy-500)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {new Date(healthData.timestamp).toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onRetry}
          disabled={isChecking}
          className="btn btn-secondary btn-sm"
          title="Re-check health endpoint"
        >
          <RefreshCw size={14} className={isChecking ? 'spin-icon' : ''} />
          <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
        </button>
      </div>
    </div>
  );
}

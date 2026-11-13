import React from 'react';
import {
  ShieldAlert,
  Activity,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Warehouse,
  Boxes,
  Layers,
  MapPin,
  ClipboardList,
  Home,
  Cpu,
  Map,
} from 'lucide-react';


export default function Header({ status, currentTab, onSelectTab }) {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="status-pill connected" title="FastAPI backend and PostgreSQL are responsive">
            <span className="status-dot"></span>
            <Wifi size={14} />
            <span>Backend Connected</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="status-pill connecting" title="Contacting FastAPI health endpoint...">
            <span className="status-dot"></span>
            <Activity size={14} />
            <span>Connecting...</span>
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="status-pill unavailable" title="FastAPI backend is unreachable">
            <span className="status-dot"></span>
            <WifiOff size={14} />
            <span>Backend Unavailable</span>
          </span>
        );
    }
  };

  const navItems = [
    { id: 'landing', label: 'Home', icon: <Home size={15} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'warehouses', label: 'Warehouses', icon: <Warehouse size={15} /> },
    { id: 'supplies', label: 'Supplies', icon: <Boxes size={15} /> },
    { id: 'inventory', label: 'Inventory', icon: <Layers size={15} /> },
    { id: 'villages', label: 'Villages', icon: <MapPin size={15} /> },
    { id: 'demands', label: 'Demand', icon: <ClipboardList size={15} /> },
    { id: 'optimization', label: 'Optimization', icon: <Cpu size={15} /> },
    { id: 'analytics_maps', label: 'Analytics & Maps', icon: <Map size={15} /> },
  ];



  return (
    <header className="header">
      <div className="container header-container">
        {/* Brand logo & title */}
        <div
          className="brand-wrapper"
          onClick={() => onSelectTab('landing')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-box">
            <ShieldAlert size={26} strokeWidth={2.2} />
          </div>
          <div className="brand-text-group">
            <span className="brand-title">ReliefOpt</span>
            <span className="brand-subtitle">Smart Emergency Relief Distribution System</span>
          </div>
        </div>

        {/* Navigation links & status badge */}
        <div className="header-actions">
          <nav>
            <ul className="nav-links">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onSelectTab(item.id)}
                    className={`nav-link-btn ${currentTab === item.id ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Dynamic Connection Indicator */}
          {getStatusBadge()}
        </div>
      </div>
    </header>
  );
}

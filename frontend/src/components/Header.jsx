import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  Warehouse,
  Boxes,
  Layers,
  MapPin,
  ClipboardList,
  Home,
  Cpu,
  Map,
  Menu,
  X,
} from 'lucide-react';

export default function Header({ status, currentTab, onSelectTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Brand logo & title */}
        <div
          className="brand-wrapper"
          onClick={() => handleNavClick('landing')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-box">
            <ShieldAlert size={24} strokeWidth={2.2} />
          </div>
          <div className="brand-text-group">
            <span className="brand-title">ReliefOpt</span>
            <span className="brand-subtitle">Smart Emergency Relief Distribution</span>
          </div>
        </div>

        {/* Desktop Navigation links */}
        <div className="header-actions">
          <nav className="desktop-nav" aria-label="Main Navigation">
            <ul className="nav-links">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`nav-link-btn ${currentTab === item.id ? 'active' : ''}`}
                    title={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="mobile-nav-menu" aria-label="Mobile Navigation">
            <div className="mobile-nav-header">
              <span className="mobile-nav-heading">Navigation Menu</span>
              <button
                className="mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Menu"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="mobile-nav-list">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`mobile-nav-item ${currentTab === item.id ? 'active' : ''}`}
                  >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span className="mobile-nav-label">{item.label}</span>
                    {currentTab === item.id && <span className="mobile-nav-indicator" />}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}

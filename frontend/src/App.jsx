import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import NotificationToast from './components/NotificationToast';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import WarehousesPage from './pages/WarehousesPage';
import SuppliesPage from './pages/SuppliesPage';
import InventoryPage from './pages/InventoryPage';
import VillagesPage from './pages/VillagesPage';
import DemandsPage from './pages/DemandsPage';
import OptimizationPage from './pages/OptimizationPage';
import AnalyticsMapsPage from './pages/AnalyticsMapsPage';
import { checkBackendHealth } from './services/api';
import './styles/App.css';


export default function App() {
  // Navigation state synced with URL hash
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['landing', 'dashboard', 'warehouses', 'supplies', 'inventory', 'villages', 'demands', 'optimization', 'analytics_maps'];
    return validTabs.includes(hash) ? hash : 'landing';
  };



  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [notification, setNotification] = useState(null);

  // Health check state
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'unavailable'
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
  }, []);

  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    window.location.hash = tabId === 'landing' ? '' : tabId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync state if user navigates with browser Back/Forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['landing', 'dashboard', 'warehouses', 'supplies', 'inventory', 'villages', 'demands', 'optimization', 'analytics_maps'];
      setCurrentTab(validTabs.includes(hash) ? hash : 'landing');
    };


    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Health check polling
  const performHealthCheck = useCallback(async () => {
    setIsChecking(true);
    setStatus((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
    setError(null);

    const result = await checkBackendHealth(4000);

    setEndpointUrl(result.url);
    if (result.success && result.data && result.data.status === 'healthy') {
      setStatus('connected');
      setHealthData(result.data);
      setError(null);
    } else {
      setStatus('unavailable');
      setHealthData(null);
      setError(result.error || 'Backend service is unavailable.');
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    performHealthCheck();
    const interval = setInterval(() => {
      performHealthCheck();
    }, 15000);
    return () => clearInterval(interval);
  }, [performHealthCheck]);

  return (
    <div className="app-layout">
      {/* Top Header Navigation */}
      <Header
        status={status}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Page View */}
      <main className="app-main-content">
        {currentTab === 'landing' && (
          <LandingPage
            status={status}
            healthData={healthData}
            error={error}
            endpointUrl={endpointUrl}
            performHealthCheck={performHealthCheck}
            isChecking={isChecking}
            onExploreDashboard={() => handleSelectTab('dashboard')}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'warehouses' && (
          <WarehousesPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'supplies' && (
          <SuppliesPage
            showNotification={showNotification}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'villages' && (
          <VillagesPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'demands' && (
          <DemandsPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'optimization' && (
          <OptimizationPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}

        {currentTab === 'analytics_maps' && (
          <AnalyticsMapsPage
            onNavigate={handleSelectTab}
            showNotification={showNotification}
          />
        )}
      </main>



      {/* Footer */}
      <Footer />

      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import Plotly from 'plotly.js-dist-min';
import createPlotComponent from 'react-plotly.js/factory';
import {
  Map as MapIcon,
  BarChart3,
  RefreshCw,
  Filter,
  RotateCcw,
  AlertTriangle,
  Warehouse,
  MapPin,
  TrendingUp,
  Package,
  Percent,
  IndianRupee,
  ShieldAlert,
  Info,
  Maximize2,
  Navigation,
  CheckCircle2,
  Layers,
} from 'lucide-react';

import { analyticsApi } from '../services/api';

const Plot = createPlotComponent(Plotly);

// --- Custom Leaflet Markers ---
const createWarehouseMarkerIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker warehouse-marker',
    html: `
      <div style="
        background: #1e3a8a;
        color: #ffffff;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(30, 58, 138, 0.45);
        cursor: pointer;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
          <path d="M6 18h12"/>
          <path d="M6 14h12"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

const createVillageMarkerIcon = (urgency) => {
  const urgencyColors = {
    Critical: '#dc2626',
    High: '#ea580c',
    Medium: '#2563eb',
    Low: '#16a34a',
    None: '#64748b',
  };
  const color = urgencyColors[urgency] || '#64748b';
  const label = urgency === 'Critical' ? '!' : urgency === 'High' ? 'H' : '●';

  return L.divIcon({
    className: 'custom-leaflet-marker village-marker',
    html: `
      <div style="
        background: ${color};
        color: #ffffff;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 0 3px ${color}40, 0 4px 10px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        font-weight: 800;
        font-size: 13px;
      ">
        ${label}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
};

// Regional operational boundaries for Indian emergency relief (6°N–38°N, 68°E–99°E)
const isWithinOperationalBounds = (lat, lng) => {
  return (
    lat != null &&
    lng != null &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= 6.0 &&
    lat <= 38.0 &&
    lng >= 68.0 &&
    lng <= 99.0
  );
};

// --- Map View Controller Component ---
function MapViewController({ points, fitTrigger, resetTrigger, assamCenter, assamZoom }) {
  const map = useMap();

  // Automatic resize synchronization when window or container dimensions change
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    if (fitTrigger === 0) return;

    const validCoords = (points || [])
      .filter((p) => isWithinOperationalBounds(p.lat, p.lng))
      .map((p) => [p.lat, p.lng]);

    if (validCoords.length === 0) {
      map.setView(assamCenter, assamZoom, { animate: true });
    } else if (validCoords.length === 1) {
      map.setView(validCoords[0], 11, { animate: true });
    } else {
      map.fitBounds(validCoords, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  }, [fitTrigger, points, map, assamCenter, assamZoom]);

  useEffect(() => {
    if (resetTrigger > 0) {
      map.setView(assamCenter, assamZoom, { animate: true });
    }
  }, [resetTrigger, map, assamCenter, assamZoom]);

  return null;
}

// Available Basemap Tile Providers (Reliable, publicly accessible, keyless GIS layers)
export const BASEMAP_OPTIONS = {
  esri_street: {
    id: 'esri_street',
    name: 'Esri World Street',
    label: 'Esri Street (English Labels)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, METI, TomTom, and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 20,
    maxNativeZoom: 17, // Native coverage in India up to z=17; Leaflet smoothly scales up to z=20 without "Map data not yet available" grey tiles
  },
  esri_topo: {
    id: 'esri_topo',
    name: 'Esri Topographic',
    label: 'Esri Topographic (English Labels)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 20,
    maxNativeZoom: 17,
  },
  esri_imagery: {
    id: 'esri_imagery',
    name: 'Esri Satellite',
    label: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 20,
    maxNativeZoom: 18,
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    label: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
};

export default function AnalyticsMapsPage({ onNavigate, showNotification }) {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'analytics'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');

  // Map Layer Toggles & Configuration
  const [showWarehouses, setShowWarehouses] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Basemap Selection (defaults to Esri World Street with English labels, 100% keyless)
  const [selectedBasemap, setSelectedBasemap] = useState(() => {
    const saved = localStorage.getItem('reliefopt_basemap');
    if (saved && BASEMAP_OPTIONS[saved]) {
      return saved;
    }
    return 'esri_street';
  });

  // Ensure any legacy broken CARTO selection in localStorage is cleaned up immediately
  useEffect(() => {
    const saved = localStorage.getItem('reliefopt_basemap');
    if (!saved || !BASEMAP_OPTIONS[saved]) {
      localStorage.setItem('reliefopt_basemap', 'esri_street');
      setSelectedBasemap('esri_street');
    }
  }, []);

  const currentBasemap = useMemo(() => {
    return BASEMAP_OPTIONS[selectedBasemap] || BASEMAP_OPTIONS.esri_street;
  }, [selectedBasemap]);

  const tileUrl = currentBasemap.url;

  // Fetch Analytics Overview
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedPlanId) params.plan_id = selectedPlanId;
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId;
      if (selectedVillageId) params.village_id = selectedVillageId;
      if (selectedSupplyId) params.supply_id = selectedSupplyId;
      if (selectedUrgency) params.urgency = selectedUrgency;

      const res = await analyticsApi.getOverview(params);
      if (res.success && res.data) {
        setData(res.data);
        if (!selectedPlanId && res.data.selected_plan_id) {
          setSelectedPlanId(String(res.data.selected_plan_id));
        }
        // Auto-fit bounds to available markers after initial data load
        setFitTrigger((prev) => prev + 1);
      } else {
        setError(res.error || 'Failed to load analytics overview.');
        if (showNotification) {
          showNotification('error', res.error || 'Failed to load analytics overview.');
        }
      }
    } catch (err) {
      setError(err.message || 'Error communicating with analytics service.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId, selectedWarehouseId, selectedVillageId, selectedSupplyId, selectedUrgency, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSelectedPlanId('');
    setSelectedWarehouseId('');
    setSelectedVillageId('');
    setSelectedSupplyId('');
    setSelectedUrgency('');
  };

  // Filtered map points based on UI toggles & filters (including warehouses, villages, and active distribution routes)
  const mapPointsForFit = useMemo(() => {
    if (!data) return [];
    const pts = [];
    if (showWarehouses && data.warehouses_geo) {
      data.warehouses_geo.forEach((w) => {
        if (w.has_valid_coordinates && isWithinOperationalBounds(w.latitude, w.longitude)) {
          pts.push({ lat: w.latitude, lng: w.longitude });
        }
      });
    }
    if (showVillages && data.villages_geo) {
      data.villages_geo.forEach((v) => {
        if (v.has_valid_coordinates && isWithinOperationalBounds(v.latitude, v.longitude)) {
          if (!selectedUrgency || v.highest_urgency === selectedUrgency) {
            pts.push({ lat: v.latitude, lng: v.longitude });
          }
        }
      });
    }
    if (showRoutes && data.distribution_routes) {
      data.distribution_routes.forEach((r) => {
        if (isWithinOperationalBounds(r.warehouse_lat, r.warehouse_lng)) {
          pts.push({ lat: r.warehouse_lat, lng: r.warehouse_lng });
        }
        if (isWithinOperationalBounds(r.village_lat, r.village_lng)) {
          pts.push({ lat: r.village_lat, lng: r.village_lng });
        }
      });
    }
    return pts;
  }, [data, showWarehouses, showVillages, showRoutes, selectedUrgency]);

  // Default Center: Set to active Assam disaster operations region (lat 26.2006, lng 92.9376)
  const defaultCenter = [26.2006, 92.9376];
  const defaultZoom = 7.5;
  const assamCenter = [26.2006, 92.9376];
  const assamZoom = 8;

  // Spiderfy dispersal calculation for overlapping/co-located markers to ensure all are visible and clickable
  const getDispersedWarehousePosition = useCallback((wh, allWarehouses) => {
    if (!allWarehouses || allWarehouses.length <= 1) return [wh.latitude, wh.longitude];
    const duplicates = allWarehouses.filter(
      (other) =>
        other.has_valid_coordinates &&
        Math.abs(other.latitude - wh.latitude) < 0.001 &&
        Math.abs(other.longitude - wh.longitude) < 0.001
    );
    if (duplicates.length <= 1) {
      return [wh.latitude, wh.longitude];
    }
    const dupIndex = duplicates.findIndex((other) => other.id === wh.id);
    const angle = (dupIndex / duplicates.length) * (2 * Math.PI) + Math.PI / 4;
    const radius = 0.006; // visual separation in degrees (~600m on map)
    return [
      wh.latitude + radius * Math.cos(angle),
      wh.longitude + radius * Math.sin(angle),
    ];
  }, []);

  // Chart Theme Configuration
  const plotLayoutDefaults = {
    font: { family: 'Inter, system-ui, sans-serif', color: '#1e293b' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    autosize: true,
    margin: { t: 40, r: 24, b: 50, l: 50 },
    legend: { orientation: 'h', y: -0.2, x: 0.1 },
  };

  return (
    <div className="analytics-maps-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">Geospatial Intelligence & Supply Analytics</h1>
            <p className="page-subtitle">
              Interactive relief distribution network and Google OR-Tools optimization reporting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="btn btn-secondary flex items-center gap-2"
              title="Refresh live data"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* View Mode Switcher */}
            <div className="view-mode-tabs flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                className={`tab-btn flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('map')}
              >
                <MapIcon size={16} />
                <span>Relief Distribution Map</span>
              </button>
              <button
                className={`tab-btn flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 size={16} />
                <span>Analytical Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="analytics-filter-bar bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
              <Filter size={16} className="text-blue-600" />
              <span>Analytics & Map Filters</span>
            </div>
            {(selectedPlanId ||
              selectedWarehouseId ||
              selectedVillageId ||
              selectedSupplyId ||
              selectedUrgency) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Optimization Plan Filter */}
            <div>
              <label className="filter-label text-xs font-medium text-slate-500 block mb-1">
                Optimization Plan
              </label>
              <select
                className="form-select w-full text-xs"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">Latest Solved Plan</option>
                {data?.available_plans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.scenario_name} ({p.status} - {p.total_allocated} units)
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Filter */}
            <div>
              <label className="filter-label text-xs font-medium text-slate-500 block mb-1">
                Source Warehouse
              </label>
              <select
                className="form-select w-full text-xs"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {data?.available_warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Village Filter */}
            <div>
              <label className="filter-label text-xs font-medium text-slate-500 block mb-1">
                Target Village
              </label>
              <select
                className="form-select w-full text-xs"
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
              >
                <option value="">All Villages</option>
                {data?.available_villages?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.extra})
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency Filter */}
            <div>
              <label className="filter-label text-xs font-medium text-slate-500 block mb-1">
                Urgency Level
              </label>
              <select
                className="form-select w-full text-xs"
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
              >
                <option value="">All Urgency Levels</option>
                <option value="Critical">Critical (Immediate)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            {/* Relief Supply Filter */}
            <div>
              <label className="filter-label text-xs font-medium text-slate-500 block mb-1">
                Relief Supply Type
              </label>
              <select
                className="form-select w-full text-xs"
                value={selectedSupplyId}
                onChange={(e) => setSelectedSupplyId(e.target.value)}
              >
                <option value="">All Supply Types</option>
                {data?.available_supplies?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.extra})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* High-Level KPIs Row */}
        {data?.kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <ClipboardListIcon size={14} className="text-blue-500" />
                <span>Total Demand</span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {data.kpis.total_demand.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Across all villages</div>
            </div>

            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Allocated</span>
              </div>
              <div className="text-xl font-bold text-emerald-600">
                {data.kpis.total_allocated.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 mt-0.5 font-medium">
                {data.kpis.demand_fulfilment_pct}% fulfilled
              </div>
            </div>

            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="text-rose-500" />
                <span>Unmet Deficit</span>
              </div>
              <div className="text-xl font-bold text-rose-600">
                {data.kpis.total_unmet.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Pending replenishment</div>
            </div>

            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <ShieldAlert size={14} className="text-red-500" />
                <span>Critical Fulfilment</span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {data.kpis.critical_fulfilment_pct}%
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Life-safety priority</div>
            </div>

            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <IndianRupee size={14} className="text-amber-500" />
                <span>Transit Cost</span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                ₹{data.kpis.total_transport_cost.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Optimal route total</div>
            </div>

            <div className="kpi-card bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1">
                <Navigation size={14} className="text-sky-500" />
                <span>Active Routes</span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {data.kpis.active_distribution_routes_count}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Dispatched links</div>
            </div>
          </div>
        )}

        {/* Invalid Coordinates Warning Banner */}
        {data?.invalid_coordinates?.length > 0 && (
          <div className="alert-warning p-4 rounded-xl border border-amber-200 bg-amber-50 mb-6 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <span className="font-semibold text-amber-900 block">
                Warning: {data.invalid_coordinates.length} locations have missing or invalid GPS coordinates
              </span>
              <span className="text-amber-800 block mt-0.5">
                The following entries are excluded from map plotting to avoid geographic inaccuracies:
              </span>
              <ul className="list-disc list-inside mt-1 text-xs text-amber-700">
                {data.invalid_coordinates.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.name}</strong> ({item.entity_type}): {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 1: INTERACTIVE RELIEF MAP */}
        {activeTab === 'map' && (
          <div className="map-view-container bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            {/* Map Top Bar Controls */}
            <div className="map-controls-bar p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap text-xs font-medium text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWarehouses}
                    onChange={(e) => setShowWarehouses(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Warehouses ({data?.warehouses_geo?.length || 0})</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showVillages}
                    onChange={(e) => setShowVillages(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Affected Villages ({data?.villages_geo?.length || 0})</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Distribution Links ({data?.distribution_routes?.length || 0})</span>
                </label>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Basemap Provider Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <Layers size={13} className="text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">Basemap:</span>
                  <select
                    value={selectedBasemap}
                    onChange={(e) => {
                      setSelectedBasemap(e.target.value);
                      localStorage.setItem('reliefopt_basemap', e.target.value);
                    }}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    title="Select geographical basemap tile provider"
                  >
                    {Object.values(BASEMAP_OPTIONS).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset to Assam Button */}
                <button
                  onClick={() => setResetTrigger((prev) => prev + 1)}
                  className="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs"
                  title="Reset view directly to Assam central region"
                >
                  <RotateCcw size={13} />
                  <span>Assam Center</span>
                </button>

                {/* Fit Bounds Button */}
                <button
                  onClick={() => setFitTrigger((prev) => prev + 1)}
                  className="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs"
                  title="Fit map view to all registered locations"
                >
                  <Maximize2 size={13} />
                  <span>Fit All Bounds</span>
                </button>
              </div>
            </div>

            {/* Leaflet Map Frame */}
            <div className="map-frame-wrapper relative" style={{ width: '100%' }}>
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                minZoom={3}
                maxZoom={20}
                zoomSnap={0.5}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  key={currentBasemap.id}
                  attribution={currentBasemap.attribution}
                  url={tileUrl}
                  subdomains={currentBasemap.subdomains || 'abc'}
                  maxZoom={currentBasemap.maxZoom || 20}
                  maxNativeZoom={currentBasemap.maxNativeZoom || 17}
                />

                {/* Map View Controller (Auto-Fit & Assam Reset) */}
                <MapViewController
                  points={mapPointsForFit}
                  fitTrigger={fitTrigger}
                  resetTrigger={resetTrigger}
                  assamCenter={assamCenter}
                  assamZoom={assamZoom}
                />

                {/* Warehouse Markers */}
                {showWarehouses &&
                  data?.warehouses_geo?.map((wh) => {
                    if (!wh.has_valid_coordinates || !isWithinOperationalBounds(wh.latitude, wh.longitude)) return null;
                    if (selectedWarehouseId && String(wh.id) !== selectedWarehouseId) return null;

                    const markerPos = getDispersedWarehousePosition(wh, data?.warehouses_geo);
                    const isCoLocated = (data?.warehouses_geo || []).filter(
                      (other) =>
                        other.id !== wh.id &&
                        other.has_valid_coordinates &&
                        Math.abs(other.latitude - wh.latitude) < 0.001 &&
                        Math.abs(other.longitude - wh.longitude) < 0.001
                    ).length > 0;

                    return (
                      <Marker
                        key={`wh_${wh.id}`}
                        position={markerPos}
                        icon={createWarehouseMarkerIcon()}
                      >
                        <Popup className="custom-popup" minWidth={260}>
                          <div className="popup-card">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                              <Warehouse size={14} />
                              <span>Relief Warehouse</span>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mb-1">{wh.name}</h4>
                            <p className="text-xs text-slate-500 mb-2">{wh.address}</p>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-2">
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Total Available Stock:</span>
                                <span className="font-bold text-slate-800">
                                  {wh.total_stock.toLocaleString()} units
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Stored Supply Types:</span>
                                <span className="font-semibold text-slate-700">
                                  {wh.supply_types_count}
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Status:</span>
                                <span
                                  className={`font-semibold ${
                                    wh.is_active ? 'text-emerald-600' : 'text-slate-400'
                                  }`}
                                >
                                  {wh.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5 border-t border-slate-200 mt-1 pt-1">
                                <span className="text-slate-500">Coordinates:</span>
                                <span className="font-mono text-slate-700">
                                  {wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}
                                </span>
                              </div>
                              {isCoLocated && (
                                <div className="text-blue-600 font-medium text-xs mt-1 pt-1 border-t border-blue-100">
                                  Co-located Depot &bull; Spiderfy Dispersal Active
                                </div>
                              )}
                            </div>

                            {/* Stock by Supply */}
                            {Object.keys(wh.stock_by_supply || {}).length > 0 && (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-600 mb-1">
                                  Inventory on Hand:
                                </div>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                  {Object.entries(wh.stock_by_supply).map(([name, qty]) => (
                                    <div
                                      key={name}
                                      className="flex justify-between text-xs py-0.5 border-b border-slate-50"
                                    >
                                      <span className="text-slate-600">{name}</span>
                                      <span className="font-medium text-slate-800">{qty}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {wh.contact_info && (
                              <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-1">
                                Contact: {wh.contact_info}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* Village Markers */}
                {showVillages &&
                  data?.villages_geo?.map((vil) => {
                    if (!vil.has_valid_coordinates || !isWithinOperationalBounds(vil.latitude, vil.longitude)) return null;
                    if (selectedVillageId && String(vil.id) !== selectedVillageId) return null;
                    if (selectedUrgency && vil.highest_urgency !== selectedUrgency) return null;

                    return (
                      <Marker
                        key={`vil_${vil.id}`}
                        position={[vil.latitude, vil.longitude]}
                        icon={createVillageMarkerIcon(vil.highest_urgency)}
                      >
                        <Popup className="custom-popup" minWidth={280}>
                          <div className="popup-card">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  vil.highest_urgency === 'Critical'
                                    ? 'bg-red-100 text-red-700'
                                    : vil.highest_urgency === 'High'
                                    ? 'bg-amber-100 text-amber-700'
                                    : vil.highest_urgency === 'Medium'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {vil.highest_urgency} Urgency
                              </span>
                              <span className="text-xs text-slate-400">
                                Pop: {vil.population.toLocaleString()}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-slate-800 mb-0.5">{vil.name}</h4>
                            <p className="text-xs text-slate-500 mb-2">
                              {vil.district}, {vil.state}
                            </p>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-2">
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Total Demanded:</span>
                                <span className="font-bold text-slate-800">
                                  {vil.total_demanded.toLocaleString()} units
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Total Allocated:</span>
                                <span className="font-bold text-emerald-600">
                                  {vil.total_allocated.toLocaleString()} units
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-500">Unmet Deficit:</span>
                                <span className="font-bold text-rose-600">
                                  {vil.total_unmet.toLocaleString()} units
                                </span>
                              </div>
                            </div>

                            {/* Demands Itemized */}
                            {vil.demands_summary?.length > 0 && (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-600 mb-1">
                                  Requested Supplies:
                                </div>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                  {vil.demands_summary.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs py-0.5 border-b border-slate-50 flex justify-between items-center"
                                    >
                                      <div>
                                        <span className="font-medium text-slate-700">
                                          {item.supply_name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">
                                          Req: {item.required_quantity} {item.supply_unit}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-emerald-600 font-medium">
                                          +{item.allocated_quantity}
                                        </span>
                                        {item.unmet_quantity > 0 && (
                                          <span className="text-rose-500 text-[10px] block">
                                            -{item.unmet_quantity} unmet
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* Distribution Links (Polyline) */}
                {showRoutes &&
                  data?.distribution_routes?.map((route) => (
                    <Polyline
                      key={route.id}
                      positions={[
                        [route.warehouse_lat, route.warehouse_lng],
                        [route.village_lat, route.village_lng],
                      ]}
                      pathOptions={{
                        color: '#0284c7',
                        weight: 3.5,
                        opacity: 0.75,
                        dashArray: '6, 6',
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-xs">
                          <strong>{route.warehouse_name}</strong> → <strong>{route.village_name}</strong>
                          <br />
                          {route.allocated_quantity} {route.supply_unit} of {route.supply_name}
                        </div>
                      </Tooltip>
                      <Popup minWidth={240}>
                        <div className="popup-card text-xs">
                          <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Navigation size={12} />
                            <span>Geographical Dispatch Link</span>
                          </div>
                          <div className="mb-2">
                            <strong>From:</strong> {route.warehouse_name}
                            <br />
                            <strong>To:</strong> {route.village_name}
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-500">Dispatched:</span>
                              <span className="font-bold text-slate-800">
                                {route.allocated_quantity} {route.supply_unit}
                              </span>
                            </div>
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-500">Supply:</span>
                              <span className="font-medium text-slate-700">{route.supply_name}</span>
                            </div>
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-500">Unit Transit Rate:</span>
                              <span className="font-medium text-slate-700">₹{route.unit_cost}</span>
                            </div>
                            <div className="flex justify-between py-0.5 border-t border-slate-200 mt-1 pt-1">
                              <span className="font-semibold text-slate-600">Total Transit Cost:</span>
                              <span className="font-bold text-slate-900">₹{route.total_transit_cost}</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            * {route.disclaimer}
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  ))}
              </MapContainer>

              {/* Floating Map Legend */}
              <div className="map-legend-box absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-md text-xs z-[1000] pointer-events-auto max-w-xs">
                <div className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-600" />
                  <span>Map Legend</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-blue-900 inline-block"></span>
                    <span className="text-slate-600">Relief Warehouse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-600 inline-block"></span>
                    <span className="text-slate-600">Critical Urgency Village</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block"></span>
                    <span className="text-slate-600">High Urgency Village</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block"></span>
                    <span className="text-slate-600">Medium Urgency Village</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block"></span>
                    <span className="text-slate-600">Low Urgency Village</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="w-5 h-0.5 bg-sky-500 border-t-2 border-dashed border-sky-500 inline-block"></span>
                    <span className="text-slate-600">Optimization Allocation Link</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLOTLY ANALYTICAL DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="analytics-dashboard-container space-y-6 mb-8">
            {/* Row 1: Chart 1 (Demand vs Allocation) & Chart 2 (Urgency Distribution) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Demand vs Allocation per Village (2 cols) */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Chart 1 — Demand vs. Allocated Supplies
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comparison of requested, allocated, and unmet supply units across villages.
                    </p>
                  </div>
                </div>

                {data?.village_allocations?.length > 0 ? (
                  <Plot
                    data={[
                      {
                        x: data.village_allocations.map((v) => v.village_name),
                        y: data.village_allocations.map((v) => v.requested_quantity),
                        name: 'Requested Demand',
                        type: 'bar',
                        marker: { color: '#1e3a8a' },
                      },
                      {
                        x: data.village_allocations.map((v) => v.village_name),
                        y: data.village_allocations.map((v) => v.allocated_quantity),
                        name: 'Allocated Supplies',
                        type: 'bar',
                        marker: { color: '#059669' },
                      },
                      {
                        x: data.village_allocations.map((v) => v.village_name),
                        y: data.village_allocations.map((v) => v.unmet_quantity),
                        name: 'Unmet Deficit',
                        type: 'bar',
                        marker: { color: '#dc2626' },
                      },
                    ]}
                    layout={{
                      ...plotLayoutDefaults,
                      barmode: 'group',
                      height: 340,
                      xaxis: { title: 'Affected Village', tickangle: -20 },
                      yaxis: { title: 'Supply Units' },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '340px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No village demand records available.
                  </div>
                )}
              </div>

              {/* Chart 2: Urgency Distribution (1 col) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Chart 2 — Urgency Tier Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Share of demand volume categorized by assessed urgency level.
                  </p>
                </div>

                {data?.urgency_distribution?.some((u) => u.total_quantity > 0) ? (
                  <Plot
                    data={[
                      {
                        labels: data.urgency_distribution.map((u) => `${u.urgency_level} Priority`),
                        values: data.urgency_distribution.map((u) => u.total_quantity),
                        type: 'pie',
                        hole: 0.45,
                        textinfo: 'label+percent',
                        textposition: 'inside',
                        marker: {
                          colors: ['#dc2626', '#ea580c', '#2563eb', '#16a34a'],
                        },
                      },
                    ]}
                    layout={{
                      ...plotLayoutDefaults,
                      height: 340,
                      showlegend: false,
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '340px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No urgency records available.
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Chart 3 (Warehouse Inventory) & Chart 4 (Village-wise Allocation) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Warehouse Inventory Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Chart 3 — Warehouse Inventory Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Available stock on hand categorized by warehouse depot.
                  </p>
                </div>

                {data?.warehouse_stock?.length > 0 ? (
                  <Plot
                    data={(() => {
                      // Collect all distinct supply names
                      const allSupplyNames = Array.from(
                        new Set(data.warehouse_stock.flatMap((w) => Object.keys(w.supplies || {})))
                      );
                      const palette = ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899'];

                      return allSupplyNames.map((sName, idx) => ({
                        x: data.warehouse_stock.map((w) => w.warehouse_name),
                        y: data.warehouse_stock.map((w) => w.supplies[sName] || 0),
                        name: sName,
                        type: 'bar',
                        marker: { color: palette[idx % palette.length] },
                      }));
                    })()}
                    layout={{
                      ...plotLayoutDefaults,
                      barmode: 'stack',
                      height: 320,
                      xaxis: { title: 'Warehouse' },
                      yaxis: { title: 'Available Quantity' },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '320px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No warehouse inventory records available.
                  </div>
                )}
              </div>

              {/* Chart 4: Village-wise Supply Allocation */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Chart 4 — Village-Wise Supply Allocation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total quantities allocated to each flood-affected community.
                  </p>
                </div>

                {data?.village_allocations?.length > 0 ? (
                  <Plot
                    data={[
                      {
                        x: data.village_allocations.map((v) => v.village_name),
                        y: data.village_allocations.map((v) => v.allocated_quantity),
                        type: 'bar',
                        marker: {
                          color: data.village_allocations.map((v) =>
                            v.fulfilment_pct >= 100
                              ? '#059669'
                              : v.fulfilment_pct >= 50
                              ? '#f59e0b'
                              : '#dc2626'
                          ),
                        },
                        text: data.village_allocations.map((v) => `${v.fulfilment_pct}%`),
                        textposition: 'auto',
                      },
                    ]}
                    layout={{
                      ...plotLayoutDefaults,
                      height: 320,
                      xaxis: { title: 'Village' },
                      yaxis: { title: 'Allocated Units' },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '320px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No allocation records available.
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Chart 5 (Transit Cost Analysis) & Chart 6 (Efficiency Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 5: Historical Plan Cost Comparison */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Chart 5 — Plan Transportation Cost & Dispatches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Historical optimization runs comparing total transit costs and allocated units.
                  </p>
                </div>

                {data?.plan_cost_comparisons?.length > 0 ? (
                  <Plot
                    data={[
                      {
                        x: data.plan_cost_comparisons.map((p) => p.scenario_name),
                        y: data.plan_cost_comparisons.map((p) => p.total_cost),
                        name: 'Transit Cost (₹)',
                        type: 'bar',
                        marker: { color: '#0284c7' },
                        yaxis: 'y1',
                      },
                      {
                        x: data.plan_cost_comparisons.map((p) => p.scenario_name),
                        y: data.plan_cost_comparisons.map((p) => p.total_allocated),
                        name: 'Allocated Units',
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#10b981', size: 8 },
                        line: { color: '#10b981', width: 3 },
                        yaxis: 'y2',
                      },
                    ]}
                    layout={{
                      ...plotLayoutDefaults,
                      height: 320,
                      xaxis: { title: 'Optimization Plan' },
                      yaxis: { title: 'Transit Cost (₹)' },
                      yaxis2: {
                        title: 'Allocated Units',
                        overlaying: 'y',
                        side: 'right',
                      },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '320px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No historical optimization runs available.
                  </div>
                )}
              </div>

              {/* Chart 6: Distribution Fulfilment Efficiency Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Chart 6 — Village Fulfilment Rate Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proportion of required demand satisfied for each community.
                  </p>
                </div>

                {data?.village_allocations?.length > 0 ? (
                  <Plot
                    data={[
                      {
                        x: data.village_allocations.map((v) => v.village_name),
                        y: data.village_allocations.map((v) => v.fulfilment_pct),
                        type: 'bar',
                        marker: {
                          color: '#3b82f6',
                        },
                      },
                    ]}
                    layout={{
                      ...plotLayoutDefaults,
                      height: 320,
                      xaxis: { title: 'Affected Village' },
                      yaxis: {
                        title: 'Fulfilment (%)',
                        range: [0, 105],
                      },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '320px' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No village demand records available.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon helper for demand KPI
function ClipboardListIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

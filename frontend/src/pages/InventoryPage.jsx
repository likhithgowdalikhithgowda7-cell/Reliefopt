import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Warehouse,
  Boxes,
  AlertTriangle,
  SlidersHorizontal,
  BarChart2,
} from 'lucide-react';
import { inventoryApi, warehousesApi, suppliesApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function InventoryPage({ showNotification, onNavigate }) {
  const [inventories, setInventories] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'summary'
  const [lowStockThreshold, setLowStockThreshold] = useState(25);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    warehouse_id: '',
    supply_id: '',
    available_quantity: '',
  });

  const [editQuantity, setEditQuantity] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [invRes, sumRes, whRes, spRes] = await Promise.all([
      inventoryApi.list(),
      inventoryApi.getSummary(),
      warehousesApi.list(true),
      suppliesApi.list(),
    ]);

    if (invRes.success && invRes.data) setInventories(invRes.data);
    if (sumRes.success && sumRes.data) setStockSummary(sumRes.data);
    if (whRes.success && whRes.data) setWarehouses(whRes.data);
    if (spRes.success && spRes.data) setSupplies(spRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      warehouse_id: warehouses.length > 0 ? warehouses[0].id.toString() : '',
      supply_id: supplies.length > 0 ? supplies[0].id.toString() : '',
      available_quantity: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (inv) => {
    setSelectedInventory(inv);
    setEditQuantity(inv.available_quantity.toString());
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(formData.available_quantity);
    if (isNaN(qty) || qty < 0) {
      showNotification('error', 'Available quantity must be a non-negative number.');
      return;
    }

    setSubmitting(true);
    const payload = {
      warehouse_id: parseInt(formData.warehouse_id, 10),
      supply_id: parseInt(formData.supply_id, 10),
      available_quantity: qty,
    };

    const result = await inventoryApi.add(payload);
    if (result.success) {
      showNotification('success', 'Inventory stock successfully logged in PostgreSQL!');
      setIsAddModalOpen(false);
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to record inventory.');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInventory) return;

    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty < 0) {
      showNotification('error', 'Available quantity must be a non-negative number.');
      return;
    }

    setSubmitting(true);
    const result = await inventoryApi.update(selectedInventory.id, { available_quantity: qty });
    if (result.success) {
      showNotification('success', 'Inventory quantity successfully updated.');
      setIsEditModalOpen(false);
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to update inventory.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete inventory line for ${inv.supply_name} at ${inv.warehouse_name}?`)) {
      return;
    }

    const result = await inventoryApi.delete(inv.id);
    if (result.success) {
      showNotification('success', 'Inventory line deleted.');
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to delete inventory.');
    }
  };

  return (
    <div className="page-container container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouse Inventory Management</h1>
          <p className="page-subtitle">
            Manage stocked relief supplies across warehouses with low-stock threshold monitoring.
          </p>
        </div>
        <div className="page-actions">
          <div className="segmented-control">
            <button
              onClick={() => setViewMode('detailed')}
              className={`segmented-btn ${viewMode === 'detailed' ? 'active' : ''}`}
            >
              Warehouse Lines
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`segmented-btn ${viewMode === 'summary' ? 'active' : ''}`}
            >
              Stock Summary
            </button>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Add Stock</span>
          </button>
          <button onClick={fetchData} disabled={loading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Threshold configuration banner */}
      <div className="threshold-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={16} color="var(--primary-700)" />
          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Low-Stock Warning Threshold:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min="0"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="form-input form-input-sm"
            style={{ width: '80px', padding: '4px 8px' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--navy-600)' }}>units</span>
        </div>
      </div>

      {loading && inventories.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading inventory from database...</span>
        </div>
      ) : viewMode === 'detailed' ? (
        inventories.length === 0 ? (
          <EmptyState
            icon={<Layers size={42} strokeWidth={1.5} />}
            title="No Inventory Recorded"
            description="No supply inventory is registered at any warehouse. Record stock to begin tracking disaster resources."
            actionLabel="Add Stock"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Warehouse Depot</th>
                  <th>Relief Supply Item</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Unit</th>
                  <th>Stock Health</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventories.map((inv) => {
                  const isLow = inv.available_quantity <= lowStockThreshold;
                  return (
                    <tr key={inv.id} className={isLow ? 'row-warning' : ''}>
                      <td><span className="id-badge">#{inv.id}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Warehouse size={14} color="var(--primary-700)" />
                          <strong>{inv.warehouse_name || `#${inv.warehouse_id}`}</strong>
                        </div>
                      </td>
                      <td><strong>{inv.supply_name || `#${inv.supply_id}`}</strong></td>
                      <td><span className="pill-badge badge-neutral">{inv.supply_category || '—'}</span></td>
                      <td>
                        <span className={`qty-display ${isLow ? 'text-danger font-bold' : ''}`}>
                          {inv.available_quantity.toLocaleString()}
                        </span>
                      </td>
                      <td>{inv.supply_unit || 'units'}</td>
                      <td>
                        {isLow ? (
                          <span className="pill-badge badge-warning" style={{ display: 'inline-flex', gap: '4px' }}>
                            <AlertTriangle size={12} />
                            <span>Low Stock (≤{lowStockThreshold})</span>
                          </span>
                        ) : (
                          <span className="pill-badge badge-success">Sufficient</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--navy-500)' }}>
                          {new Date(inv.updated_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="action-btn"
                            title="Update Quantity"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            className="action-btn btn-danger-action"
                            title="Remove Line"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Overall Stock Summary View */
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supply Item</th>
                <th>Category</th>
                <th>Total Stock Available</th>
                <th>Unit</th>
                <th>Warehouses Stocking</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stockSummary.map((item) => {
                const isLow = item.total_available <= lowStockThreshold;
                return (
                  <tr key={item.supply_id}>
                    <td><strong>{item.supply_name}</strong></td>
                    <td><span className="pill-badge badge-primary">{item.category}</span></td>
                    <td>
                      <strong className={isLow ? 'text-danger' : 'text-success'}>
                        {item.total_available.toLocaleString()}
                      </strong>
                    </td>
                    <td>{item.unit}</td>
                    <td>
                      <span className="count-badge">{item.warehouse_count}</span>
                    </td>
                    <td>
                      {isLow ? (
                        <span className="pill-badge badge-warning">Low Total Stock</span>
                      ) : (
                        <span className="pill-badge badge-success">Adequate Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Warehouse Inventory"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          {warehouses.length === 0 || supplies.length === 0 ? (
            <div className="connection-error-box">
              You must have at least one registered warehouse and one supply type before logging inventory.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select Warehouse Depot *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="form-input"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.address.slice(0, 30)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Relief Supply Item *</label>
                <select
                  required
                  value={formData.supply_id}
                  onChange={(e) => setFormData({ ...formData, supply_id: e.target.value })}
                  className="form-input"
                >
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category} • {s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Available Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 500"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                  className="form-input"
                />
                <span className="form-help">
                  Note: If stock for this supply already exists at this warehouse, this quantity will be incremented.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Saving to Database...' : 'Save Stock'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Edit Quantity Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Update Inventory Stock Level"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Warehouse</label>
            <input
              type="text"
              disabled
              value={selectedInventory?.warehouse_name || ''}
              className="form-input form-input-disabled"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Relief Supply</label>
            <input
              type="text"
              disabled
              value={`${selectedInventory?.supply_name || ''} (${selectedInventory?.supply_unit || ''})`}
              className="form-input form-input-disabled"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Exact Available Quantity *</label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Saving...' : 'Update Quantity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

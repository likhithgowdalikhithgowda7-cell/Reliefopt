import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  MapPin,
  Phone,
  Power,
} from 'lucide-react';
import { warehousesApi, inventoryApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function WarehousesPage({ showNotification, onNavigate }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_info: '',
    is_active: true,
  });

  const fetchWarehouses = async () => {
    setLoading(true);
    const result = await warehousesApi.list();
    if (result.success && result.data) {
      setWarehouses(result.data);
    } else {
      showNotification('error', result.error || 'Failed to fetch warehouses.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      contact_info: '',
      is_active: true,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      latitude: warehouse.latitude.toString(),
      longitude: warehouse.longitude.toString(),
      contact_info: warehouse.contact_info || '',
      is_active: warehouse.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleViewInventory = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsInventoryModalOpen(true);
    const result = await inventoryApi.getByWarehouse(warehouse.id);
    if (result.success && result.data) {
      setWarehouseInventory(result.data);
    } else {
      setWarehouseInventory([]);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showNotification('error', 'Latitude must be a valid number between -90 and 90.');
      setSubmitting(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      showNotification('error', 'Longitude must be a valid number between -180 and 180.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: lat,
      longitude: lon,
      contact_info: formData.contact_info.trim() || null,
      is_active: formData.is_active,
    };

    const result = await warehousesApi.create(payload);
    if (result.success) {
      showNotification('success', `Warehouse "${payload.name}" successfully registered!`);
      setIsAddModalOpen(false);
      resetForm();
      fetchWarehouses();
    } else {
      showNotification('error', result.error || 'Failed to create warehouse.');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    setSubmitting(true);

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showNotification('error', 'Latitude must be a valid number between -90 and 90.');
      setSubmitting(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      showNotification('error', 'Longitude must be a valid number between -180 and 180.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: lat,
      longitude: lon,
      contact_info: formData.contact_info.trim() || null,
      is_active: formData.is_active,
    };

    const result = await warehousesApi.update(selectedWarehouse.id, payload);
    if (result.success) {
      showNotification('success', `Warehouse "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      fetchWarehouses();
    } else {
      showNotification('error', result.error || 'Failed to update warehouse.');
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (warehouse) => {
    const updatedStatus = !warehouse.is_active;
    const result = await warehousesApi.update(warehouse.id, { is_active: updatedStatus });
    if (result.success) {
      showNotification(
        'success',
        `Warehouse "${warehouse.name}" is now ${updatedStatus ? 'Active' : 'Deactivated'}.`
      );
      fetchWarehouses();
    } else {
      showNotification('error', result.error || 'Failed to update status.');
    }
  };

  const handleDelete = async (warehouse) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete warehouse "${warehouse.name}"? This will also remove associated inventory.`
      )
    ) {
      return;
    }

    const result = await warehousesApi.delete(warehouse.id, true);
    if (result.success) {
      showNotification('success', `Warehouse "${warehouse.name}" deleted.`);
      fetchWarehouses();
    } else {
      showNotification('error', result.error || 'Failed to delete warehouse.');
    }
  };

  return (
    <div className="page-container container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouse Management</h1>
          <p className="page-subtitle">
            Register and manage supply depots, geographical coordinates, and inventory capacities.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Add Warehouse</span>
          </button>
          <button onClick={fetchWarehouses} disabled={loading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {loading && warehouses.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading warehouses from database...</span>
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={<Warehouse size={42} strokeWidth={1.5} />}
          title="No Warehouses Registered"
          description="You haven't added any supply depots yet. Register your first warehouse to start tracking relief stock."
          actionLabel="Add Warehouse"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Warehouse Name</th>
                <th>Location / Address</th>
                <th>Coordinates</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Stock Items</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh.id} className={!wh.is_active ? 'row-inactive' : ''}>
                  <td>
                    <span className="id-badge">#{wh.id}</span>
                  </td>
                  <td>
                    <strong>{wh.name}</strong>
                  </td>
                  <td>
                    <div style={{ maxWidth: '240px', fontSize: '0.85rem' }}>{wh.address}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                      <MapPin size={12} color="var(--primary-600)" />
                      <span>{wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}</span>
                    </div>
                  </td>
                  <td>
                    {wh.contact_info ? (
                      <span style={{ fontSize: '0.82rem' }}>{wh.contact_info}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill-badge ${wh.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {wh.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className="count-badge">{wh.total_inventory_items || 0}</span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => handleViewInventory(wh)}
                        className="action-btn"
                        title="View Inventory"
                      >
                        <Layers size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(wh)}
                        className="action-btn"
                        title="Edit Details"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(wh)}
                        className="action-btn"
                        title={wh.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={15} color={wh.is_active ? 'var(--warning-600)' : 'var(--success-600)'} />
                      </button>
                      <button
                        onClick={() => handleDelete(wh)}
                        className="action-btn btn-danger-action"
                        title="Delete Warehouse"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Warehouse"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Warehouse Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Guwahati Central Relief Hub"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address / Location Description *</label>
            <textarea
              required
              rows={2}
              placeholder="Full street address, district, proximity to transport artery"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude (-90 to 90) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 26.1445"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude (-180 to 180) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 91.7362"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Information (Optional)</label>
            <input
              type="text"
              placeholder="Contact coordinator name & telephone"
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Mark as active warehouse ready for distribution</span>
            </label>
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
              {submitting ? 'Saving to Database...' : 'Register Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Warehouse Details"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Warehouse Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              required
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Information</label>
            <input
              type="text"
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
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
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Associated Inventory Modal */}
      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title={`Inventory at ${selectedWarehouse?.name || 'Warehouse'}`}
        maxWidth="680px"
      >
        <div>
          {warehouseInventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p className="text-muted" style={{ marginBottom: '16px' }}>
                No relief supplies are currently stocked at this warehouse.
              </p>
              <button
                onClick={() => {
                  setIsInventoryModalOpen(false);
                  onNavigate('inventory');
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Add Stock to this Warehouse</span>
              </button>
            </div>
          ) : (
            <table className="data-table" style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Supply Item</th>
                  <th>Category</th>
                  <th>Available Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {warehouseInventory.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.supply_name}</strong></td>
                    <td><span className="pill-badge badge-neutral">{item.supply_category}</span></td>
                    <td><strong>{item.available_quantity.toLocaleString()}</strong></td>
                    <td>{item.supply_unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  Power,
  ClipboardList,
} from 'lucide-react';
import { villagesApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function VillagesPage({ showNotification, onNavigate }) {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    population: '',
    is_active: true,
  });

  const fetchVillages = async () => {
    setLoading(true);
    const result = await villagesApi.list();
    if (result.success && result.data) {
      setVillages(result.data);
    } else {
      showNotification('error', result.error || 'Failed to fetch affected villages.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      district: '',
      state: 'Assam',
      latitude: '',
      longitude: '',
      population: '',
      is_active: true,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (village) => {
    setSelectedVillage(village);
    setFormData({
      name: village.name,
      district: village.district,
      state: village.state,
      latitude: village.latitude.toString(),
      longitude: village.longitude.toString(),
      population: village.population.toString(),
      is_active: village.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.name.trim()) {
      showNotification('error', 'Village name is required.');
      setSubmitting(false);
      return;
    }

    if (!formData.district.trim()) {
      showNotification('error', 'District name is required.');
      setSubmitting(false);
      return;
    }

    if (!formData.state.trim()) {
      showNotification('error', 'State name is required.');
      setSubmitting(false);
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    const pop = parseInt(formData.population, 10);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showNotification('error', 'Latitude must be between -90 and 90.');
      setSubmitting(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      showNotification('error', 'Longitude must be between -180 and 180.');
      setSubmitting(false);
      return;
    }

    if (isNaN(pop) || pop <= 0) {
      showNotification('error', 'Population count must be a positive integer.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
      latitude: lat,
      longitude: lon,
      population: pop,
      is_active: formData.is_active,
    };

    const result = await villagesApi.create(payload);
    if (result.success) {
      showNotification('success', `Village "${payload.name}" successfully registered!`);
      setIsAddModalOpen(false);
      resetForm();
      fetchVillages();
    } else {
      showNotification('error', result.error || 'Failed to register village.');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVillage) return;
    setSubmitting(true);

    if (!formData.name.trim()) {
      showNotification('error', 'Village name cannot be empty.');
      setSubmitting(false);
      return;
    }

    if (!formData.district.trim()) {
      showNotification('error', 'District name cannot be empty.');
      setSubmitting(false);
      return;
    }

    if (!formData.state.trim()) {
      showNotification('error', 'State name cannot be empty.');
      setSubmitting(false);
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    const pop = parseInt(formData.population, 10);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showNotification('error', 'Latitude must be between -90 and 90.');
      setSubmitting(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      showNotification('error', 'Longitude must be between -180 and 180.');
      setSubmitting(false);
      return;
    }

    if (isNaN(pop) || pop <= 0) {
      showNotification('error', 'Population count must be a positive integer.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
      latitude: lat,
      longitude: lon,
      population: pop,
      is_active: formData.is_active,
    };

    const result = await villagesApi.update(selectedVillage.id, payload);
    if (result.success) {
      showNotification('success', `Village "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      fetchVillages();
    } else {
      showNotification('error', result.error || 'Failed to update village.');
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (village) => {
    const updatedStatus = !village.is_active;
    const result = await villagesApi.update(village.id, { is_active: updatedStatus });
    if (result.success) {
      showNotification(
        'success',
        `Village "${village.name}" is now ${updatedStatus ? 'Active' : 'Deactivated'}.`
      );
      fetchVillages();
    } else {
      showNotification('error', result.error || 'Failed to change status.');
    }
  };

  const handleDelete = async (village) => {
    if (
      !window.confirm(
        `Permanently delete village "${village.name}"? This will also remove any recorded demand for this location.`
      )
    ) {
      return;
    }

    const result = await villagesApi.delete(village.id, true);
    if (result.success) {
      showNotification('success', `Village "${village.name}" deleted.`);
      fetchVillages();
    } else {
      showNotification('error', result.error || 'Failed to delete village.');
    }
  };

  return (
    <div className="page-container container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Affected Village Management</h1>
          <p className="page-subtitle">
            Register flood-affected locations, verified population figures, and geographical coordinates.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Register Village</span>
          </button>
          <button onClick={fetchVillages} disabled={loading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {loading && villages.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading affected villages from database...</span>
        </div>
      ) : villages.length === 0 ? (
        <EmptyState
          icon={<MapPin size={42} strokeWidth={1.5} />}
          title="No Affected Villages Registered"
          description="Register villages impacted by floods or natural disasters to track local populations and supply requirements."
          actionLabel="Register Village"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th title="Serial Number">#</th>
                <th>Village Name</th>
                <th>District / State</th>
                <th>Coordinates</th>
                <th>Affected Population</th>
                <th>Status</th>
                <th>Demands</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {villages.map((v, index) => (
                <tr key={v.id} className={!v.is_active ? 'row-inactive' : ''}>
                  <td>
                    <span className="id-badge" title={`Database ID: ${v.id}`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td><strong>{v.name}</strong></td>
                  <td>
                    <span>{v.district}, {v.state}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                      <MapPin size={12} color="var(--primary-600)" />
                      <span>{v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="var(--navy-600)" />
                      <strong>{v.population.toLocaleString()}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`pill-badge ${v.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className="count-badge">{v.total_demands_count || 0}</span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => onNavigate('demands')}
                        className="action-btn"
                        title="View Demands"
                      >
                        <ClipboardList size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="action-btn"
                        title="Edit Village"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(v)}
                        className="action-btn"
                        title={v.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={15} color={v.is_active ? 'var(--warning-600)' : 'var(--success-600)'} />
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="action-btn btn-danger-action"
                        title="Delete Village"
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

      {/* Add Village Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Affected Village"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Village Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Majuli Riverbank Ward 3"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">District *</label>
              <input
                type="text"
                required
                placeholder="e.g. Majuli"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">State / Region *</label>
              <input
                type="text"
                required
                placeholder="e.g. Assam"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude (-90 to 90) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 26.9535"
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
                placeholder="e.g. 94.2045"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Affected Population Count *</label>
            <input
              type="number"
              min="1"
              required
              placeholder="e.g. 850"
              value={formData.population}
              onChange={(e) => setFormData({ ...formData, population: e.target.value })}
              className="form-input"
            />
            <span className="form-help">Must be a verified positive integer based on field reports.</span>
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
              {submitting ? 'Registering...' : 'Register Village'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Village Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Affected Village Details"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Village Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">District *</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="form-input"
              />
            </div>
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
            <label className="form-label">Affected Population *</label>
            <input
              type="number"
              min="1"
              required
              value={formData.population}
              onChange={(e) => setFormData({ ...formData, population: e.target.value })}
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

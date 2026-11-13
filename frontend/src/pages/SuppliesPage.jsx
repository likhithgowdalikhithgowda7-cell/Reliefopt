import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { suppliesApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const CATEGORIES = [
  'Food',
  'Drinking Water',
  'Medical Supplies',
  'Clothing',
  'Shelter Materials',
  'Sanitation & Hygiene',
  'Other',
];

export default function SuppliesPage({ showNotification }) {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Food',
    unit: 'Kits',
    description: '',
  });

  const fetchSupplies = async () => {
    setLoading(true);
    const result = await suppliesApi.list();
    if (result.success && result.data) {
      setSupplies(result.data);
    } else {
      showNotification('error', result.error || 'Failed to load relief supplies.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Food',
      unit: 'Kits',
      description: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (supply) => {
    setSelectedSupply(supply);
    setFormData({
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      description: supply.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit.trim(),
      description: formData.description.trim() || null,
    };

    const result = await suppliesApi.create(payload);
    if (result.success) {
      showNotification('success', `Supply item "${payload.name}" registered successfully.`);
      setIsAddModalOpen(false);
      resetForm();
      fetchSupplies();
    } else {
      showNotification('error', result.error || 'Failed to register supply type.');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupply) return;
    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit.trim(),
      description: formData.description.trim() || null,
    };

    const result = await suppliesApi.update(selectedSupply.id, payload);
    if (result.success) {
      showNotification('success', `Supply item "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      fetchSupplies();
    } else {
      showNotification('error', result.error || 'Failed to update supply item.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (supply) => {
    if (
      !window.confirm(
        `Are you sure you want to delete supply type "${supply.name}"? Note: deletion will be blocked if inventory or demand records reference it.`
      )
    ) {
      return;
    }

    const result = await suppliesApi.delete(supply.id);
    if (result.success) {
      showNotification('success', `Supply "${supply.name}" deleted.`);
      fetchSupplies();
    } else {
      showNotification('error', result.error || 'Failed to delete supply.');
    }
  };

  return (
    <div className="page-container container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relief Supply Management</h1>
          <p className="page-subtitle">
            Catalogue standardized relief materials, unit definitions, and categorization.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Add Supply Type</span>
          </button>
          <button onClick={fetchSupplies} disabled={loading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {loading && supplies.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading supply catalogue from database...</span>
        </div>
      ) : supplies.length === 0 ? (
        <EmptyState
          icon={<Boxes size={42} strokeWidth={1.5} />}
          title="No Supply Types Defined"
          description="Register common emergency items (e.g., Food Kits, Drinking Water, Medical Rations) to start logging inventory."
          actionLabel="Add Supply Type"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Supply Name</th>
                <th>Category</th>
                <th>Measurement Unit</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="id-badge">#{item.id}</span>
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span className="pill-badge badge-primary">{item.category}</span>
                  </td>
                  <td>
                    <span className="unit-tag">{item.unit}</span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '280px', fontSize: '0.84rem' }}>
                      {item.description || <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="action-btn"
                        title="Edit Details"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="action-btn btn-danger-action"
                        title="Delete Supply"
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

      {/* Add Supply Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Relief Supply Item"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Supply Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. High-Calorie Rations"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unit of Measurement *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kits, Litres, Cartons"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Kit contents, dietary notes, or package dimensions"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input"
            />
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
              {submitting ? 'Saving...' : 'Add Supply Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Supply Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Relief Supply"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Supply Name *</label>
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
              <label className="form-label">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unit of Measurement *</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

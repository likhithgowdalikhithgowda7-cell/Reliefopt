import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  AlertOctagon,
  Filter,
  MapPin,
  Boxes,
} from 'lucide-react';
import { demandsApi, villagesApi, suppliesApi } from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const URGENCY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];

export default function DemandsPage({ showNotification, onNavigate }) {
  const [demands, setDemands] = useState([]);
  const [villages, setVillages] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    village_id: '',
    supply_id: '',
    required_quantity: '',
    urgency_level: 'High',
    remarks: '',
  });

  const [editFormData, setEditFormData] = useState({
    required_quantity: '',
    urgency_level: 'High',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const filterParam = urgencyFilter === 'All' ? {} : { urgency: urgencyFilter };
    const [demRes, vilRes, supRes] = await Promise.all([
      demandsApi.list(filterParam),
      villagesApi.list(true),
      suppliesApi.list(),
    ]);

    if (demRes.success && demRes.data) setDemands(demRes.data);
    if (vilRes.success && vilRes.data) setVillages(vilRes.data);
    if (supRes.success && supRes.data) setSupplies(supRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [urgencyFilter]);

  const handleOpenAdd = () => {
    setFormData({
      village_id: villages.length > 0 ? villages[0].id.toString() : '',
      supply_id: supplies.length > 0 ? supplies[0].id.toString() : '',
      required_quantity: '',
      urgency_level: 'High',
      remarks: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (demand) => {
    setSelectedDemand(demand);
    setEditFormData({
      required_quantity: demand.required_quantity.toString(),
      urgency_level: demand.urgency_level,
      remarks: demand.remarks || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(formData.required_quantity);
    if (isNaN(qty) || qty <= 0) {
      showNotification('error', 'Required quantity must be a positive number.');
      return;
    }

    setSubmitting(true);
    const payload = {
      village_id: parseInt(formData.village_id, 10),
      supply_id: parseInt(formData.supply_id, 10),
      required_quantity: qty,
      urgency_level: formData.urgency_level,
      remarks: formData.remarks.trim() || null,
    };

    const result = await demandsApi.create(payload);
    if (result.success) {
      showNotification('success', 'Relief demand successfully recorded in database!');
      setIsAddModalOpen(false);
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to record demand.');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDemand) return;

    const qty = parseFloat(editFormData.required_quantity);
    if (isNaN(qty) || qty <= 0) {
      showNotification('error', 'Required quantity must be a positive number.');
      return;
    }

    setSubmitting(true);
    const payload = {
      required_quantity: qty,
      urgency_level: editFormData.urgency_level,
      remarks: editFormData.remarks.trim() || null,
    };

    const result = await demandsApi.update(selectedDemand.id, payload);
    if (result.success) {
      showNotification('success', 'Demand record updated.');
      setIsEditModalOpen(false);
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to update demand.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (demand) => {
    if (
      !window.confirm(
        `Delete demand of ${demand.required_quantity} ${demand.supply_unit} for ${demand.village_name}?`
      )
    ) {
      return;
    }

    const result = await demandsApi.delete(demand.id);
    if (result.success) {
      showNotification('success', 'Demand record deleted.');
      fetchData();
    } else {
      showNotification('error', result.error || 'Failed to delete demand.');
    }
  };

  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'Critical':
        return <span className="urgency-badge badge-critical">Critical</span>;
      case 'High':
        return <span className="urgency-badge badge-high">High</span>;
      case 'Medium':
        return <span className="urgency-badge badge-medium">Medium</span>;
      case 'Low':
      default:
        return <span className="urgency-badge badge-low">Low</span>;
    }
  };

  return (
    <div className="page-container container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Village Demand Management</h1>
          <p className="page-subtitle">
            Log, prioritize, and track emergency supply requests assessed by relief coordinators.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Record Demand</span>
          </button>
          <button onClick={fetchData} disabled={loading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Urgency Filter Tabs */}
      <div className="filter-tabs-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--navy-600)', fontSize: '0.85rem' }}>
          <Filter size={15} />
          <span>Filter Urgency:</span>
        </div>
        <div className="filter-pill-group">
          <button
            onClick={() => setUrgencyFilter('All')}
            className={`filter-pill ${urgencyFilter === 'All' ? 'active' : ''}`}
          >
            All Demands
          </button>
          <button
            onClick={() => setUrgencyFilter('Critical')}
            className={`filter-pill pill-critical ${urgencyFilter === 'Critical' ? 'active' : ''}`}
          >
            Critical
          </button>
          <button
            onClick={() => setUrgencyFilter('High')}
            className={`filter-pill pill-high ${urgencyFilter === 'High' ? 'active' : ''}`}
          >
            High
          </button>
          <button
            onClick={() => setUrgencyFilter('Medium')}
            className={`filter-pill pill-medium ${urgencyFilter === 'Medium' ? 'active' : ''}`}
          >
            Medium
          </button>
          <button
            onClick={() => setUrgencyFilter('Low')}
            className={`filter-pill pill-low ${urgencyFilter === 'Low' ? 'active' : ''}`}
          >
            Low
          </button>
        </div>
      </div>

      {loading && demands.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading village demands from database...</span>
        </div>
      ) : demands.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={42} strokeWidth={1.5} />}
          title={urgencyFilter === 'All' ? 'No Demands Recorded' : `No ${urgencyFilter} Urgency Demands`}
          description={
            urgencyFilter === 'All'
              ? 'No village supply requests have been recorded yet. Click below to record requirements from field coordinators.'
              : `There are currently no recorded requests tagged with ${urgencyFilter} priority.`
          }
          actionLabel={urgencyFilter === 'All' ? 'Record Demand' : undefined}
          onAction={urgencyFilter === 'All' ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Affected Village</th>
                <th>Requested Supply</th>
                <th>Category</th>
                <th>Required Quantity</th>
                <th>Urgency Level</th>
                <th>Coordinator Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demands.map((d) => (
                <tr key={d.id} className={d.urgency_level === 'Critical' ? 'row-critical' : ''}>
                  <td><span className="id-badge">#{d.id}</span></td>
                  <td>
                    <div>
                      <strong>{d.village_name || `#${d.village_id}`}</strong>
                      {d.village_district && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--navy-500)' }}>
                          District: {d.village_district}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{d.supply_name || `#${d.supply_id}`}</strong>
                  </td>
                  <td>
                    <span className="pill-badge badge-neutral">{d.supply_category || '—'}</span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.98rem' }}>
                      {d.required_quantity.toLocaleString()} {d.supply_unit || ''}
                    </strong>
                  </td>
                  <td>{getUrgencyBadge(d.urgency_level)}</td>
                  <td>
                    <div style={{ maxWidth: '240px', fontSize: '0.84rem' }}>
                      {d.remarks || <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => handleOpenEdit(d)}
                        className="action-btn"
                        title="Edit Demand"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="action-btn btn-danger-action"
                        title="Delete Demand"
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

      {/* Add Demand Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Village Supply Demand"
      >
        <form onSubmit={handleCreateSubmit} className="modal-form">
          {villages.length === 0 || supplies.length === 0 ? (
            <div className="connection-error-box">
              You must register at least one affected village and one relief supply type before logging demand.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select Impacted Village *</label>
                <select
                  required
                  value={formData.village_id}
                  onChange={(e) => setFormData({ ...formData, village_id: e.target.value })}
                  className="form-input"
                >
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.district}, pop: {v.population})
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Required Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    placeholder="e.g. 200"
                    value={formData.required_quantity}
                    onChange={(e) => setFormData({ ...formData, required_quantity: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assessed Urgency Level *</label>
                  <select
                    value={formData.urgency_level}
                    onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                    className="form-input"
                  >
                    {URGENCY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Field Coordinator Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Details on isolation, road accessibility, or vulnerable demographics"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
                  {submitting ? 'Recording to DB...' : 'Record Demand'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Edit Demand Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Demand Record"
      >
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Village</label>
            <input
              type="text"
              disabled
              value={selectedDemand?.village_name || ''}
              className="form-input form-input-disabled"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Relief Supply</label>
            <input
              type="text"
              disabled
              value={`${selectedDemand?.supply_name || ''} (${selectedDemand?.supply_unit || ''})`}
              className="form-input form-input-disabled"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Required Quantity *</label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={editFormData.required_quantity}
                onChange={(e) => setEditFormData({ ...editFormData, required_quantity: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level *</label>
              <select
                value={editFormData.urgency_level}
                onChange={(e) => setEditFormData({ ...editFormData, urgency_level: e.target.value })}
                className="form-input"
              >
                {URGENCY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              rows={2}
              value={editFormData.remarks}
              onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
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
    </div>
  );
}

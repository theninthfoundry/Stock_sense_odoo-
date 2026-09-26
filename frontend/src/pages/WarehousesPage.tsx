import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';
import { Warehouse, Location } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const WarehousesPage: React.FC = () => {
  const { isManager } = useAuth();
  const toast = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState({ name: '', code: '', address: '' });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locForm, setLocForm] = useState({ warehouse_id: '', name: '', code: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wRes, lRes] = await Promise.all([
        api.warehouses.list(),
        api.locations.list()
      ]);
      setWarehouses(wRes.data || []);
      setLocations(lRes.data || []);

      if (wRes.data?.length && !locForm.warehouse_id) {
        setLocForm((prev) => ({ ...prev, warehouse_id: wRes.data[0].id }));
      }
    } catch (err: any) {
      toast.error('Failed to load facilities: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateWh = () => {
    setEditingWarehouse(null);
    setWhForm({ name: '', code: '', address: '' });
    setIsWarehouseModalOpen(true);
  };

  const openEditWh = (w: Warehouse) => {
    setEditingWarehouse(w);
    setWhForm({ name: w.name, code: w.code, address: w.address || '' });
    setIsWarehouseModalOpen(true);
  };

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.warehouses.update(editingWarehouse.id, whForm);
        toast.success(`Warehouse ${whForm.code} updated`);
      } else {
        await api.warehouses.create(whForm);
        toast.success(`Warehouse ${whForm.code} created`);
      }
      setIsWarehouseModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDeleteWh = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${name}"? This will fail if it contains active stock.`)) {
      return;
    }
    try {
      await api.warehouses.delete(id);
      toast.success('Warehouse deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const openCreateLoc = (whId?: string) => {
    setLocForm({
      warehouse_id: whId || (warehouses[0]?.id || ''),
      name: '',
      code: ''
    });
    setIsLocationModalOpen(true);
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.locations.create(locForm);
      toast.success(`Location ${locForm.code} created`);
      setIsLocationModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDeleteLoc = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete location "${name}"? This will fail if it contains active stock.`)) {
      return;
    }
    try {
      await api.locations.delete(id);
      toast.success('Location deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Warehouse & Location Architecture
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Define physical storage hubs, zones, and picking shelves with live-stock deletion protection
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {isManager && (
            <>
              <button onClick={() => openCreateLoc()} className="btn btn-secondary">
                <Plus size={16} />
                <span>New Location</span>
              </button>
              <button onClick={openCreateWh} className="btn btn-primary">
                <Plus size={16} />
                <span>New Warehouse</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warehouses Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-3)' }}>
        {warehouses.map((w) => {
          const whLocations = locations.filter((l) => l.warehouse_id === w.id);

          return (
            <div key={w.id} className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building2 size={20} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{w.name}</h3>
                    <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Code: {w.code}
                    </div>
                  </div>
                </div>

                {isManager && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEditWh(w)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                      title="Edit Warehouse"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteWh(w.id, w.name)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', color: '#ffffff' }}
                      title="Delete Warehouse"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {w.address && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  📍 {w.address}
                </div>
              )}

              {/* Sub-Locations List */}
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Storage Locations ({whLocations.length})
                  </span>
                  {isManager && (
                    <button
                      onClick={() => openCreateLoc(w.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={11} />
                      Add Bin/Shelf
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {whLocations.length === 0 ? (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      No bins or zones created under this warehouse yet.
                    </span>
                  ) : (
                    whLocations.map((loc) => (
                      <div
                        key={loc.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color="#ffffff" />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{loc.name}</span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            [{loc.code}]
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: (loc.total_stock ?? 0) > 0 ? '#ffffff' : 'var(--text-muted)' }}>
                            {loc.total_stock ?? 0} units
                          </span>
                          {isManager && (
                            <button
                              onClick={() => handleDeleteLoc(loc.id, loc.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              title="Delete Location"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT WAREHOUSE MODAL */}
      {isWarehouseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <form onSubmit={handleWhSubmit}>
              <div className="modal-header">
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                  {editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Central Logistics Hub"
                    value={whForm.name}
                    onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Code (Unique)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. WH-CENTRAL"
                    value={whForm.code}
                    onChange={(e) => setWhForm({ ...whForm, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Physical Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 100 Industrial Parkway, Sector 4"
                    value={whForm.address}
                    onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsWarehouseModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LOCATION MODAL */}
      {isLocationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <form onSubmit={handleLocSubmit}>
              <div className="modal-header">
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                  Add Location / Storage Bin
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Parent Warehouse</label>
                  <select
                    className="form-select"
                    value={locForm.warehouse_id}
                    onChange={(e) => setLocForm({ ...locForm, warehouse_id: e.target.value })}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Location / Bin Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Picking Shelf Zone B"
                    value={locForm.name}
                    onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. LOC-B"
                    value={locForm.code}
                    onChange={(e) => setLocForm({ ...locForm, code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLocationModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

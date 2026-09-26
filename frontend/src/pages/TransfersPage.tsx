import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  X,
  FileCheck,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { Transfer, Product, Location } from '../types';
import { api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

export const TransfersPage: React.FC = () => {
  const toast = useToast();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [qty, setQty] = useState<number>(10);
  const [availableAtSource, setAvailableAtSource] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Validate Modal
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; transferId: string | null }>({
    isOpen: false,
    transferId: null
  });
  const [isValidating, setIsValidating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes, lRes] = await Promise.all([
        api.transfers.list(),
        api.products.list(),
        api.locations.list()
      ]);
      setTransfers(tRes.data || []);
      setProducts(pRes.data || []);
      setLocations(lRes.data || []);

      if (pRes.data?.length && !selectedProductId) {
        setSelectedProductId(pRes.data[0].id);
      }
      if (lRes.data?.length >= 2 && !fromLocationId) {
        setFromLocationId(lRes.data[0].id);
        setToLocationId(lRes.data[1].id);
      }
    } catch (err: any) {
      toast.error('Failed to load transfers: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Track stock at source location
  useEffect(() => {
    async function checkSourceStock() {
      if (selectedProductId && fromLocationId) {
        try {
          const res = await api.products.getStock(selectedProductId);
          const found = res.locations.find((l) => l.location_id === fromLocationId);
          setAvailableAtSource(found ? found.qty : 0);
        } catch {
          setAvailableAtSource(0);
        }
      }
    }
    checkSourceStock();
  }, [selectedProductId, fromLocationId]);

  const handleOpenCreateModal = () => {
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLocationId === toLocationId) {
      toast.error('Source and destination locations cannot be the same');
      return;
    }
    if (qty > availableAtSource) {
      toast.error(`Transfer quantity exceeds available stock (${availableAtSource} on hand)`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.transfers.create({
        product_id: selectedProductId,
        qty: Number(qty),
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        status: 'ready'
      });
      toast.success('Internal transfer created successfully');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerValidate = (transferId: string) => {
    setConfirmModalState({ isOpen: true, transferId });
  };

  const handleConfirmValidate = async () => {
    if (!confirmModalState.transferId) return;
    setIsValidating(true);
    try {
      await api.transfers.validate(confirmModalState.transferId);
      toast.success('Transfer validated! Net zero overall change, locations updated.');
      setConfirmModalState({ isOpen: false, transferId: null });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Internal Stock Transfers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Move stock between bins and warehouse zones with guaranteed net-zero inventory balance
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>Product</th>
              <th>Quantity Moved</th>
              <th>From Location</th>
              <th>To Location</th>
              <th>Status</th>
              <th>Initiated By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  No internal transfers recorded. Click "New Transfer" to initiate a location move.
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a5b4fc' }}>
                      {t.id.substring(0, 8)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.product_name}</div>
                    <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {t.product_sku}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {t.qty} {t.uom}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="#ffffff" />
                      <span>{t.from_location_name}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({t.from_warehouse_name})</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="#ffffff" />
                      <span>{t.to_location_name}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({t.to_warehouse_name})</span>
                    </div>
                  </td>
                  <td>
                    <StatusChip status={t.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {t.created_by_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {t.created_at}
                    </span>
                  </td>
                  <td>
                    {t.status !== 'done' && t.status !== 'canceled' && (
                      <button
                        onClick={() => triggerValidate(t.id)}
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                      >
                        <FileCheck size={12} />
                        <span>Validate</span>
                      </button>
                    )}
                    {t.status === 'done' && (
                      <span style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>
                        ✓ Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE TRANSFER MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ArrowLeftRight size={20} color="#ffffff" />
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Initiate Internal Transfer</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Product</label>
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: varSpace }}>
                  <div className="form-group">
                    <label className="form-label">From Location (Source)</label>
                    <select
                      className="form-select"
                      value={fromLocationId}
                      onChange={(e) => setFromLocationId(e.target.value)}
                      required
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.warehouse_name})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 'var(--text-xs)', color: availableAtSource > 0 ? '#34d399' : '#f87171', marginTop: 4 }}>
                      On hand at source: <strong>{availableAtSource}</strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">To Location (Destination)</label>
                    <select
                      className="form-select"
                      value={toLocationId}
                      onChange={(e) => setToLocationId(e.target.value)}
                      required
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.warehouse_name})
                        </option>
                      ))}
                    </select>
                    {fromLocationId === toLocationId && (
                      <div className="form-error-inline">
                        Source and destination must be different
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity to Move</label>
                  <input
                    type="number"
                    min={1}
                    max={availableAtSource || undefined}
                    className="form-input"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    required
                  />
                  {qty > availableAtSource && (
                    <div className="form-error-inline">
                      Quantity exceeds available stock ({availableAtSource} on hand)
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || fromLocationId === toLocationId || qty > availableAtSource}
                >
                  {isSubmitting ? 'Submitting...' : 'Save Transfer Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM VALIDATION MODAL */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title="Validate Stock Transfer"
        message="Are you sure you want to validate this internal transfer? It will deduct stock from the source location and credit it to the destination location atomically with net-zero balance."
        confirmText="Confirm & Transfer Stock"
        isLoading={isValidating}
        onConfirm={handleConfirmValidate}
        onCancel={() => setConfirmModalState({ isOpen: false, transferId: null })}
      />
    </div>
  );
};

const varSpace = 'var(--space-2)';

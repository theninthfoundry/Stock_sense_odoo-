import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Adjustment, Product, Location } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdjustmentsPage: React.FC = () => {
  const { isManager } = useAuth();
  const toast = useToast();

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [currentSystemQty, setCurrentSystemQty] = useState<number>(0);
  const [countedQty, setCountedQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [adjRes, prodRes, locRes] = await Promise.all([
        api.adjustments.list(),
        api.products.list(),
        api.locations.list()
      ]);
      setAdjustments(adjRes.data || []);
      setProducts(prodRes.data || []);
      setLocations(locRes.data || []);

      if (prodRes.data?.length && !selectedProductId) {
        setSelectedProductId(prodRes.data[0].id);
      }
      if (locRes.data?.length && !selectedLocationId) {
        setSelectedLocationId(locRes.data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load adjustments: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch current system stock for selected product and location
  useEffect(() => {
    async function checkCurrentStock() {
      if (selectedProductId && selectedLocationId) {
        try {
          const res = await api.products.getStock(selectedProductId);
          const found = res.locations.find((l) => l.location_id === selectedLocationId);
          const qty = found ? found.qty : 0;
          setCurrentSystemQty(qty);
          setCountedQty(qty);
        } catch {
          setCurrentSystemQty(0);
          setCountedQty(0);
        }
      }
    }
    checkCurrentStock();
  }, [selectedProductId, selectedLocationId]);

  const handleOpenModal = () => {
    setReason('');
    setIsCreateOpen(true);
  };

  const calculatedDelta = countedQty - currentSystemQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length === 0) {
      toast.error('Adjustment reason is mandatory to maintain audit trail integrity');
      return;
    }
    if (countedQty < 0) {
      toast.error('Physical counted quantity cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.adjustments.create({
        product_id: selectedProductId,
        location_id: selectedLocationId,
        counted_qty: Number(countedQty),
        reason: reason.trim()
      });
      toast.success('Physical reconciliation logged and Stock Ledger adjusted!');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Physical Stock Reconciliation & Adjustments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Reconcile physical counts with mandatory reason logging and automated ledger delta calculation
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {isManager && (
            <button onClick={handleOpenModal} className="btn btn-primary">
              <Plus size={16} />
              <span>Record Physical Count</span>
            </button>
          )}
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Location & Warehouse</th>
              <th>Counted Qty</th>
              <th>Ledger Delta</th>
              <th>Mandatory Audit Reason</th>
              <th>Logged By</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  No stock adjustments recorded yet. Physical count reconciliations will appear here.
                </td>
              </tr>
            ) : (
              adjustments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.product_name}</div>
                    <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {a.product_sku}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="var(--primary)" />
                      <span>{a.location_name}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({a.warehouse_name})</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>
                      {a.counted_qty} {a.uom}
                    </span>
                  </td>
                  <td>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 700,
                      color: a.delta > 0 ? '#34d399' : a.delta < 0 ? '#f87171' : 'var(--text-muted)'
                    }}>
                      {a.delta > 0 && <TrendingUp size={14} />}
                      {a.delta < 0 && <TrendingDown size={14} />}
                      <span>{a.delta > 0 ? `+${a.delta}` : a.delta} {a.uom}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      "{a.reason}"
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {a.created_by_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {a.created_at}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE ADJUSTMENT MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClipboardList size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Record Physical Inventory Count</h3>
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
                  <label className="form-label">Product to Reconcile</label>
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

                <div className="form-group">
                  <label className="form-label">Physical Location</label>
                  <select
                    className="form-select"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    required
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.warehouse_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Side-by-Side Comparison Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: varSpace,
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  margin: `${varSpace} 0`
                }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Current System Stock:
                    </span>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentSystemQty}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Calculated Ledger Delta:
                    </span>
                    <div style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      color: calculatedDelta > 0 ? '#34d399' : calculatedDelta < 0 ? '#f87171' : 'var(--text-muted)'
                    }}>
                      {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Physical Counted Quantity</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={countedQty}
                    onChange={(e) => setCountedQty(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Audit Reason</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Provide detailed explanation (e.g. Annual physical count, Damaged box found in corner, Calibration evaporation loss)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
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
                  disabled={isSubmitting || !reason.trim()}
                >
                  {isSubmitting ? 'Logging...' : 'Confirm & Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const varSpace = 'var(--space-2)';

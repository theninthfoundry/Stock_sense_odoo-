import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Plus,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  FileCheck
} from 'lucide-react';
import { Receipt, Product, Warehouse, Location } from '../types';
import { api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

export const ReceiptsPage: React.FC = () => {
  const toast = useToast();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail / Active Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptLines, setReceiptLines] = useState<any[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formParty, setFormParty] = useState('');
  const [formReference, setFormReference] = useState('');
  const [lines, setLines] = useState<Array<{ product_id: string; location_id: string; expected_qty: number; received_qty: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Validate Modal
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; receiptId: string | null }>({
    isOpen: false,
    receiptId: null
  });
  const [isValidating, setIsValidating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rRes, pRes, wRes, lRes] = await Promise.all([
        api.receipts.list(),
        api.products.list(),
        api.warehouses.list(),
        api.locations.list()
      ]);
      setReceipts(rRes.data || []);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
      setLocations(lRes.data || []);

      if (wRes.data?.length && !formWarehouseId) {
        setFormWarehouseId(wRes.data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load receipts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setFormParty('');
    setFormReference('');
    if (products.length > 0 && locations.length > 0) {
      setLines([
        {
          product_id: products[0].id,
          location_id: locations[0].id,
          expected_qty: 50,
          received_qty: 50
        }
      ]);
    } else {
      setLines([]);
    }
    setIsCreateOpen(true);
  };

  const addLine = () => {
    if (products.length === 0 || locations.length === 0) return;
    setLines([
      ...lines,
      {
        product_id: products[0].id,
        location_id: locations[0].id,
        expected_qty: 10,
        received_qty: 10
      }
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, val: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = val;
    setLines(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Please add at least one line item to the receipt');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.receipts.create({
        warehouse_id: formWarehouseId,
        party: formParty,
        reference: formReference,
        status: 'ready',
        lines
      });
      toast.success('Receipt created successfully');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewModal = async (rcpt: Receipt) => {
    try {
      const full = await api.receipts.get(rcpt.id);
      setSelectedReceipt(full);
      setReceiptLines(full.lines || []);
    } catch (err: any) {
      toast.error('Failed to load receipt details: ' + err.message);
    }
  };

  const triggerValidate = (receiptId: string) => {
    setConfirmModalState({ isOpen: true, receiptId });
  };

  const handleConfirmValidate = async () => {
    if (!confirmModalState.receiptId) return;
    setIsValidating(true);
    try {
      await api.receipts.validate(confirmModalState.receiptId);
      toast.success('Receipt validated and committed to Stock Ledger!');
      setConfirmModalState({ isOpen: false, receiptId: null });
      if (selectedReceipt) {
        setSelectedReceipt(null);
      }
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
            Inbound Receipts
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Record supplier deliveries and credit location inventory atomically via the Stock Ledger
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>New Receipt</span>
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt Ref</th>
              <th>Supplier / Party</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Total Lines</th>
              <th>Received Qty</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  No inbound receipts recorded yet. Click "New Receipt" to begin.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a5b4fc' }}>
                      {r.reference || r.id.substring(0, 8)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.party}</td>
                  <td>{r.warehouse_name}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td>{r.total_lines ?? '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#34d399' }}>
                      +{r.total_received_qty ?? 0}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {r.created_by_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {r.created_at}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openViewModal(r)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      {r.status !== 'done' && r.status !== 'canceled' && (
                        <button
                          onClick={() => triggerValidate(r.id)}
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                        >
                          <FileCheck size={12} />
                          <span>Validate</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE RECEIPT MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 750 }}>
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ArrowDownToLine size={20} color="#10b981" />
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Create Inbound Receipt</h3>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: varSpace, marginBottom: varSpace }}>
                  <div className="form-group">
                    <label className="form-label">Destination Warehouse</label>
                    <select
                      className="form-select"
                      value={formWarehouseId}
                      onChange={(e) => setFormWarehouseId(e.target.value)}
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
                    <label className="form-label">Supplier / Vendor Party</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Apex Industrial Supplies"
                      value={formParty}
                      onChange={(e) => setFormParty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: varSpace }}>
                  <label className="form-label">PO Reference / Invoice Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PO-98201"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                  />
                </div>

                {/* Line Items Table with Expected vs Received side by side */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Line Items (Expected vs Received)</label>
                  <button type="button" onClick={addLine} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }}>
                    <Plus size={12} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="table-container" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Target Location</th>
                        <th style={{ width: 110 }}>Expected Qty</th>
                        <th style={{ width: 110 }}>Received Qty</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="form-select"
                              value={line.product_id}
                              onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                              required
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.sku} - {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-select"
                              value={line.location_id}
                              onChange={(e) => updateLine(idx, 'location_id', e.target.value)}
                              required
                            >
                              {locations
                                .filter((l) => !formWarehouseId || l.warehouse_id === formWarehouseId)
                                .map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name} ({l.code})
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-input"
                              value={line.expected_qty}
                              onChange={(e) => updateLine(idx, 'expected_qty', Number(e.target.value))}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-input"
                              value={line.received_qty}
                              onChange={(e) => updateLine(idx, 'received_qty', Number(e.target.value))}
                              required
                            />
                          </td>
                          <td>
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Save Draft Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT DETAILS MODAL */}
      {selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    Receipt: {selectedReceipt.reference || selectedReceipt.id.substring(0, 8)}
                  </h3>
                  <StatusChip status={selectedReceipt.status} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Supplier: <strong>{selectedReceipt.party}</strong> • Warehouse: <strong>{selectedReceipt.warehouse_name}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Line Items (Expected vs Received)
              </h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Location</th>
                      <th>Expected Qty</th>
                      <th>Received Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptLines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{line.product_name}</div>
                          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {line.product_sku}
                          </span>
                        </td>
                        <td>{line.location_name} ({line.location_code})</td>
                        <td>{line.expected_qty} {line.uom}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#34d399' }}>
                            +{line.received_qty} {line.uom}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              {selectedReceipt.status !== 'done' && selectedReceipt.status !== 'canceled' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => triggerValidate(selectedReceipt.id)}
                >
                  <FileCheck size={16} />
                  <span>Validate Receipt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM VALIDATION MODAL (Enforces irreversible confirm step per spec) */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title="Validate Inbound Receipt"
        message="Are you sure you want to validate this receipt? This will append an immutable receipt transaction to the Stock Ledger, increasing on-hand stock immediately."
        confirmText="Yes, Validate & Increase Stock"
        isLoading={isValidating}
        onConfirm={handleConfirmValidate}
        onCancel={() => setConfirmModalState({ isOpen: false, receiptId: null })}
      />
    </div>
  );
};

const varSpace = 'var(--space-2)';

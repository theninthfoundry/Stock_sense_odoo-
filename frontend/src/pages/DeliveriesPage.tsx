import React, { useState, useEffect } from 'react';
import {
  ArrowUpFromLine,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { DeliveryOrder, Product, Warehouse, Location } from '../types';
import { api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

export const DeliveriesPage: React.FC = () => {
  const toast = useToast();

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [deliveryLines, setDeliveryLines] = useState<any[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formParty, setFormParty] = useState('');
  const [formReference, setFormReference] = useState('');
  const [lines, setLines] = useState<Array<{ product_id: string; location_id: string; expected_qty: number; picked_qty: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time stock on hand map for current product & location
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Confirm Validate Modal
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; deliveryId: string | null }>({
    isOpen: false,
    deliveryId: null
  });
  const [isValidating, setIsValidating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dRes, pRes, wRes, lRes] = await Promise.all([
        api.deliveries.list(),
        api.products.list(),
        api.warehouses.list(),
        api.locations.list()
      ]);
      setDeliveries(dRes.data || []);
      setProducts(pRes.data || []);
      setWarehouses(wRes.data || []);
      setLocations(lRes.data || []);

      if (wRes.data?.length && !formWarehouseId) {
        setFormWarehouseId(wRes.data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load deliveries: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update stock on hand for selected products
  const fetchAvailableStock = async (productId: string, locationId: string) => {
    try {
      const res = await api.products.getStock(productId);
      const loc = res.locations.find((l) => l.location_id === locationId);
      const available = loc ? loc.qty : 0;
      setStockMap((prev) => ({ ...prev, [`${productId}_${locationId}`]: available }));
    } catch {
      // Ignore
    }
  };

  const openCreateModal = () => {
    setFormParty('');
    setFormReference('');
    if (products.length > 0 && locations.length > 0) {
      const initialLines = [
        {
          product_id: products[0].id,
          location_id: locations[0].id,
          expected_qty: 10,
          picked_qty: 10
        }
      ];
      setLines(initialLines);
      fetchAvailableStock(products[0].id, locations[0].id);
    } else {
      setLines([]);
    }
    setIsCreateOpen(true);
  };

  const addLine = () => {
    if (products.length === 0 || locations.length === 0) return;
    const newLine = {
      product_id: products[0].id,
      location_id: locations[0].id,
      expected_qty: 5,
      picked_qty: 5
    };
    setLines([...lines, newLine]);
    fetchAvailableStock(newLine.product_id, newLine.location_id);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, val: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = val;
    setLines(updated);

    if (field === 'product_id' || field === 'location_id') {
      fetchAvailableStock(updated[index].product_id, updated[index].location_id);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Please add at least one line item to the delivery order');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.deliveries.create({
        warehouse_id: formWarehouseId,
        party: formParty,
        reference: formReference,
        status: 'ready',
        lines
      });
      toast.success('Delivery order created successfully');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create delivery order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewModal = async (deliv: DeliveryOrder) => {
    try {
      const full = await api.deliveries.get(deliv.id);
      setSelectedDelivery(full);
      setDeliveryLines(full.lines || []);
    } catch (err: any) {
      toast.error('Failed to load delivery details: ' + err.message);
    }
  };

  const triggerValidate = (deliveryId: string) => {
    setConfirmModalState({ isOpen: true, deliveryId });
  };

  const handleConfirmValidate = async () => {
    if (!confirmModalState.deliveryId) return;
    setIsValidating(true);
    try {
      await api.deliveries.validate(confirmModalState.deliveryId);
      toast.success('Delivery validated and deducted from Stock Ledger!');
      setConfirmModalState({ isOpen: false, deliveryId: null });
      if (selectedDelivery) {
        setSelectedDelivery(null);
      }
      loadData();
    } catch (err: any) {
      // SPEC REQUIREMENT: Specific error message ("Quantity exceeds available stock (42 on hand)")
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
            Outbound Delivery Orders
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Fulfill customer shipments with strict zero-overselling validation and atomic ledger deduction
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>New Delivery Order</span>
          </button>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Ref</th>
              <th>Customer / Party</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Lines</th>
              <th>Picked Qty</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  No delivery orders created yet. Click "New Delivery Order" to begin.
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a5b4fc' }}>
                      {d.reference || d.id.substring(0, 8)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{d.party}</td>
                  <td>{d.warehouse_name}</td>
                  <td>
                    <StatusChip status={d.status} />
                  </td>
                  <td>{d.total_lines ?? '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#f87171' }}>
                      -{d.total_picked_qty ?? 0}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {d.created_by_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {d.created_at}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openViewModal(d)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      {d.status !== 'done' && d.status !== 'canceled' && (
                        <button
                          onClick={() => triggerValidate(d.id)}
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

      {/* CREATE DELIVERY MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 780 }}>
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ArrowUpFromLine size={20} color="#60a5fa" />
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Create Delivery Order</h3>
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
                    <label className="form-label">Dispatch Warehouse</label>
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
                    <label className="form-label">Customer / Recipient Party</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Acme Corporation"
                      value={formParty}
                      onChange={(e) => setFormParty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: varSpace }}>
                  <label className="form-label">Sales Order (SO) Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SO-44012"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Order Lines (Expected vs Picked Qty)
                  </label>
                  <button type="button" onClick={addLine} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }}>
                    <Plus size={12} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="table-container" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Pick Location</th>
                        <th style={{ width: 100 }}>Available</th>
                        <th style={{ width: 110 }}>Expected Qty</th>
                        <th style={{ width: 110 }}>Picked Qty</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const stockKey = `${line.product_id}_${line.location_id}`;
                        const available = stockMap[stockKey] ?? 0;
                        const isExceeding = line.picked_qty > available;

                        return (
                          <tr key={idx} style={{ backgroundColor: isExceeding ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
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
                              <span style={{
                                fontWeight: 700,
                                color: available > 0 ? '#34d399' : '#f87171',
                                fontSize: 'var(--text-xs)'
                              }}>
                                {available} on hand
                              </span>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                className="form-input"
                                value={line.expected_qty}
                                onChange={(e) => updateLine(idx, 'expected_qty', Number(e.target.value))}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                className="form-input"
                                style={{
                                  borderColor: isExceeding ? '#ef4444' : 'var(--border-medium)',
                                  backgroundColor: isExceeding ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-canvas)'
                                }}
                                value={line.picked_qty}
                                onChange={(e) => updateLine(idx, 'picked_qty', Number(e.target.value))}
                                required
                              />
                              {/* SPEC REQUIREMENT: Inline specific error under the field */}
                              {isExceeding && (
                                <div className="form-error-inline" style={{ whiteSpace: 'nowrap' }}>
                                  Quantity exceeds available stock ({available} on hand)
                                </div>
                              )}
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
                        );
                      })}
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
                  {isSubmitting ? 'Creating...' : 'Save Draft Delivery Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DELIVERY DETAILS MODAL */}
      {selectedDelivery && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 740 }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    Delivery Order: {selectedDelivery.reference || selectedDelivery.id.substring(0, 8)}
                  </h3>
                  <StatusChip status={selectedDelivery.status} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Customer: <strong>{selectedDelivery.party}</strong> • Warehouse: <strong>{selectedDelivery.warehouse_name}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Pick Lines & Stock Verification
              </h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Location</th>
                      <th>Expected Qty</th>
                      <th>Picked Qty</th>
                      <th>Available at Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryLines.map((line) => (
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
                          <span style={{ fontWeight: 700, color: '#f87171' }}>
                            -{line.picked_qty} {line.uom}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: (line.current_available_stock ?? 0) >= line.picked_qty ? '#34d399' : '#f87171' }}>
                            {line.current_available_stock ?? '—'} on hand
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
                onClick={() => setSelectedDelivery(null)}
              >
                Close
              </button>
              {selectedDelivery.status !== 'done' && selectedDelivery.status !== 'canceled' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => triggerValidate(selectedDelivery.id)}
                >
                  <FileCheck size={16} />
                  <span>Validate Delivery</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM VALIDATION MODAL */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title="Validate Delivery Order"
        message="Are you sure you want to validate this delivery order? This will decrement available stock and write permanent negative movement lines to the Stock Ledger. This cannot be undone."
        confirmText="Confirm & Dispatch Stock"
        isLoading={isValidating}
        onConfirm={handleConfirmValidate}
        onCancel={() => setConfirmModalState({ isOpen: false, deliveryId: null })}
      />
    </div>
  );
};

const varSpace = 'var(--space-2)';

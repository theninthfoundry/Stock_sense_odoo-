import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Filter,
  Eye,
  ShieldCheck,
  Package,
  Layers,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { DashboardKpis, Warehouse, Category } from '../types';
import { api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  onNavigateTo: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTo }) => {
  const toast = useToast();

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, opsRes, whRes, catRes] = await Promise.all([
        api.dashboard.getKpis({
          type: selectedType,
          status: selectedStatus,
          warehouse: selectedWarehouse,
          category: selectedCategory
        }),
        api.dashboard.getOperations({
          type: selectedType,
          status: selectedStatus,
          warehouse: selectedWarehouse,
          category: selectedCategory
        }),
        api.warehouses.list(),
        api.categories.list()
      ]);

      setKpis(kpiRes);
      setOperations(opsRes.data || []);
      setWarehouses(whRes.data || []);
      setCategories(catRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load dashboard data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType, selectedStatus, selectedWarehouse, selectedCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Live Warehouse Telemetry
            </span>
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginTop: 4 }}>
            Inventory Command
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Continuous real-time synchronization from the immutable Stock Ledger
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={loadData}
            className="btn btn-secondary"
            disabled={isLoading}
            title="Refresh snapshot"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => onNavigateTo('receipts')}
            className="btn btn-secondary"
          >
            <ArrowDownToLine size={14} />
            <span>Receive</span>
          </button>
          <button
            onClick={() => onNavigateTo('deliveries')}
            className="btn btn-primary"
          >
            <ArrowUpFromLine size={14} />
            <span>Fulfill Order</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout (Monochromatic, High-End Minimalist) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16
      }}>
        {/* Main Hero Card: Total On-Hand Stock (Span 6) */}
        <div className="bento-card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Aggregate Active Inventory
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                fontSize: 11,
                color: 'var(--text-secondary)'
              }}>
                <ShieldCheck size={13} color="#ffffff" />
                <span>Zero Drift</span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {kpis?.total_stock_qty?.toLocaleString() ?? 0}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>
                Total countable units maintained across <strong>{kpis?.total_products ?? 0}</strong> registered catalog SKUs.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Warehouses</span>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff', marginTop: 2 }}>{warehouses.length}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categories</span>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff', marginTop: 2 }}>{categories.length}</div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTo('products')}
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
            >
              <span>Explore Catalog</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Card 2: Reorder & Low-Stock Alerts (Span 3) */}
        <div className="bento-card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Low Stock Sentinel
              </span>
              {(kpis?.low_stock_count ?? 0) > 0 && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 0 8px #ffffff' }} />
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: (kpis?.low_stock_count ?? 0) > 0 ? '#ffffff' : 'var(--text-muted)' }}>
                {kpis?.low_stock_count ?? 0}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 6 }}>
                Items currently at or below configured reorder minimums.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Out of stock: <strong>{kpis?.out_of_stock_count ?? 0}</strong>
            </span>
            <button
              onClick={() => onNavigateTo('products')}
              className="btn btn-ghost"
              style={{ padding: '2px 6px', fontSize: 11 }}
            >
              Review
            </button>
          </div>
        </div>

        {/* Card 3: Pending Inbound & Outbound Pipeline (Span 3) */}
        <div className="bento-card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Movement Pipeline
              </span>
              <Activity size={15} color="var(--text-muted)" />
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowDownToLine size={13} color="#ffffff" /> Inbound Receipts
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>
                  {kpis?.pending_receipts ?? 0}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowUpFromLine size={13} color="#ffffff" /> Outbound Shipments
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>
                  {kpis?.pending_deliveries ?? 0}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeftRight size={13} color="#ffffff" /> Internal Transfers
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>
                  {kpis?.pending_transfers ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Total pending operations: <strong>{kpis?.total_pending_ops ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Chip Bar */}
      <div className="bento-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 4 }}>
              Filter Stream:
            </span>

            <button
              className={`filter-chip ${selectedType === '' ? 'active' : ''}`}
              onClick={() => setSelectedType('')}
            >
              All Types
            </button>
            <button
              className={`filter-chip ${selectedType === 'receipt' ? 'active' : ''}`}
              onClick={() => setSelectedType('receipt')}
            >
              Receipts
            </button>
            <button
              className={`filter-chip ${selectedType === 'delivery' ? 'active' : ''}`}
              onClick={() => setSelectedType('delivery')}
            >
              Deliveries
            </button>
            <button
              className={`filter-chip ${selectedType === 'transfer' ? 'active' : ''}`}
              onClick={() => setSelectedType('transfer')}
            >
              Transfers
            </button>

            <span style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />

            <button
              className={`filter-chip ${selectedStatus === '' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('')}
            >
              All Status
            </button>
            <button
              className={`filter-chip ${selectedStatus === 'ready' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('ready')}
            >
              Ready
            </button>
            <button
              className={`filter-chip ${selectedStatus === 'done' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('done')}
            >
              Done
            </button>
            <button
              className={`filter-chip ${selectedStatus === 'draft' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('draft')}
            >
              Draft
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 12px', fontSize: 'var(--text-xs)' }}
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 12px', fontSize: 'var(--text-xs)' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabbed Operations List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#ffffff' }}>
              Movement Log & Audit Trail
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Sequential journal of all inventory transfers, fulfillments, and receipts
            </p>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Showing <strong>{operations.length}</strong> events
          </span>
        </div>

        {operations.length === 0 ? (
          <div className="empty-state">
            <Boxes className="empty-state-icon" />
            <h3 className="empty-state-title">No operations yet — create your first receipt</h3>
            <p className="empty-state-desc">
              Your inventory ledger is ready and clean. Log your initial supplier delivery to begin tracking movements.
            </p>
            <button
              onClick={() => onNavigateTo('receipts')}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Create Inbound Receipt</span>
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference / Partner</th>
                  <th>Warehouse / Route</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={`${op.type}_${op.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {op.type === 'receipt' && <ArrowDownToLine size={13} color="#ffffff" />}
                          {op.type === 'delivery' && <ArrowUpFromLine size={13} color="#ffffff" />}
                          {op.type === 'transfer' && <ArrowLeftRight size={13} color="#ffffff" />}
                        </span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#ffffff' }}>
                          {op.type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{op.party || op.product_name}</div>
                      {op.reference && (
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {op.reference}
                        </div>
                      )}
                    </td>
                    <td>
                      {op.type === 'transfer' ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          {op.from_location_name} → {op.to_location_name} (<strong>{op.qty}</strong> units)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{op.warehouse_name}</span>
                      )}
                    </td>
                    <td>
                      <StatusChip status={op.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {op.created_by_name}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {op.created_at}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          if (op.type === 'receipt') onNavigateTo('receipts');
                          else if (op.type === 'delivery') onNavigateTo('deliveries');
                          else if (op.type === 'transfer') onNavigateTo('transfers');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Filter,
  Eye,
  CheckCircle2
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Inventory Snapshot
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Real-time KPIs derived continuously from the immutable Stock Ledger
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button
            onClick={loadData}
            className="btn btn-secondary"
            disabled={isLoading}
            title="Refresh KPIs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigateTo('receipts')}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Eye path: Number -> Filter -> List) */}
      <div className="kpi-grid">
        <div className="card kpi-card kpi-primary">
          <div className="kpi-label">
            <span>Total Units In Stock</span>
            <Boxes size={18} color="var(--primary)" />
          </div>
          <div className="kpi-value">{kpis?.total_stock_qty?.toLocaleString() ?? 0}</div>
          <div className="kpi-subtext">Across {kpis?.total_products ?? 0} catalog items</div>
        </div>

        <div className="card kpi-card kpi-warning">
          <div className="kpi-label">
            <span>Low Stock Items</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div className="kpi-value" style={{ color: (kpis?.low_stock_count ?? 0) > 0 ? '#fbbf24' : 'inherit' }}>
            {kpis?.low_stock_count ?? 0}
          </div>
          <div className="kpi-subtext">Below configured reorder threshold</div>
        </div>

        <div className="card kpi-card kpi-danger">
          <div className="kpi-label">
            <span>Out of Stock</span>
            <PackageX size={18} color="#ef4444" />
          </div>
          <div className="kpi-value" style={{ color: (kpis?.out_of_stock_count ?? 0) > 0 ? '#f87171' : 'inherit' }}>
            {kpis?.out_of_stock_count ?? 0}
          </div>
          <div className="kpi-subtext">Requires immediate replenishment</div>
        </div>

        <div className="card kpi-card kpi-success">
          <div className="kpi-label">
            <span>Pending Inbound</span>
            <ArrowDownToLine size={18} color="#10b981" />
          </div>
          <div className="kpi-value">{kpis?.pending_receipts ?? 0}</div>
          <div className="kpi-subtext">Awaiting warehouse receipt check-in</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-label">
            <span>Pending Outbound</span>
            <ArrowUpFromLine size={18} color="#60a5fa" />
          </div>
          <div className="kpi-value">{kpis?.pending_deliveries ?? 0}</div>
          <div className="kpi-subtext">Orders awaiting picking/packing</div>
        </div>
      </div>

      {/* Filter Chip Bar */}
      <div className="card" style={{ padding: 'var(--space-2) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <Filter size={14} />
          <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Filter Active Snapshot:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {/* Document Type Chips */}
          <button
            className={`filter-chip ${selectedType === '' ? 'active' : ''}`}
            onClick={() => setSelectedType('')}
          >
            All Operations
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

          <span style={{ width: 1, height: 18, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />

          {/* Status Chips */}
          <button
            className={`filter-chip ${selectedStatus === '' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('')}
          >
            All Statuses
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

          {/* Warehouse Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 10px', fontSize: 'var(--text-xs)' }}
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

          {/* Category Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 10px', fontSize: 'var(--text-xs)' }}
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

      {/* Tabbed Operations List */}
      <div style={{ marginTop: 'var(--space-1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: varSpace }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Movement Operations
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Showing {operations.length} events
          </span>
        </div>

        {operations.length === 0 ? (
          /* Explicit Zero-State for brand-new account per spec */
          <div className="empty-state">
            <Boxes className="empty-state-icon" />
            <h3 className="empty-state-title">No operations yet — create your first receipt</h3>
            <p className="empty-state-desc">
              Your inventory ledger is currently empty. Record incoming stock from a supplier to seed locations and track inventory movements.
            </p>
            <button
              onClick={() => onNavigateTo('receipts')}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Create First Receipt</span>
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference / Party</th>
                  <th>Warehouse / Route</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={`${op.type}_${op.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        {op.type === 'receipt' && <ArrowDownToLine size={15} color="#10b981" />}
                        {op.type === 'delivery' && <ArrowUpFromLine size={15} color="#60a5fa" />}
                        {op.type === 'transfer' && <ArrowLeftRight size={15} color="#a5b4fc" />}
                        <span style={{ textTransform: 'capitalize' }}>{op.type}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{op.party || op.product_name}</div>
                      {op.reference && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Ref: {op.reference}
                        </div>
                      )}
                    </td>
                    <td>
                      {op.type === 'transfer' ? (
                        <span style={{ fontSize: 'var(--text-xs)' }}>
                          {op.from_location_name} → {op.to_location_name} ({op.qty} units)
                        </span>
                      ) : (
                        <span>{op.warehouse_name}</span>
                      )}
                    </td>
                    <td>
                      <StatusChip status={op.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {op.created_by_name}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
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
                        style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                      >
                        <Eye size={12} />
                        <span>View</span>
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

const varSpace = 'var(--space-2)';

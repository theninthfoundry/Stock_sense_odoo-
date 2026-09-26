import React from 'react';
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  Building2,
  Sparkles,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'products'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'warehouses'
  | 'walkthrough';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, isManager } = useAuth();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          className="app-brand"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('dashboard')}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Boxes size={20} color="#fff" />
          </div>
          <span style={{ letterSpacing: '-0.02em' }}>StockSense</span>
          <span className="brand-badge">IMS</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={16} />
            <span>Products</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'receipts' ? 'active' : ''}`}
            onClick={() => setActiveTab('receipts')}
          >
            <ArrowDownToLine size={16} />
            <span>Receipts</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => setActiveTab('deliveries')}
          >
            <ArrowUpFromLine size={16} />
            <span>Deliveries</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfers')}
          >
            <ArrowLeftRight size={16} />
            <span>Transfers</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'adjustments' ? 'active' : ''}`}
            onClick={() => setActiveTab('adjustments')}
          >
            <ClipboardList size={16} />
            <span>Adjustments</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'warehouses' ? 'active' : ''}`}
            onClick={() => setActiveTab('warehouses')}
          >
            <Building2 size={16} />
            <span>Warehouses</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'walkthrough' ? 'active' : ''}`}
            onClick={() => setActiveTab('walkthrough')}
            style={{
              color: activeTab === 'walkthrough' ? '#fff' : '#a5b4fc',
              backgroundColor: activeTab === 'walkthrough' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
              borderColor: 'rgba(99, 102, 241, 0.3)'
            }}
          >
            <Sparkles size={16} />
            <span>Seed Proof (77)</span>
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-medium)'
          }}>
            <UserIcon size={16} color="var(--text-secondary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: 4,
                backgroundColor: isManager ? 'rgba(99, 102, 241, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isManager ? '#a5b4fc' : '#93c5fd'
              }}>
                {isManager ? 'Manager' : 'Staff'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}
          title="Sign out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

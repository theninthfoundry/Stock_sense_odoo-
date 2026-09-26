import React, { useState } from 'react';
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
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileDrawer } from './ProfileDrawer';

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
  const { user, isManager } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="top-nav">
        {/* Brand & Invariant Ledger Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="brand-section" onClick={() => setActiveTab('dashboard')}>
            <div className="brand-logo">
              <Boxes size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="brand-title">StockSense</span>
                <span className="brand-tag">v1.0</span>
              </div>
            </div>
          </div>

          <div className="ledger-pulse" title="Append-only SQLite WAL Ledger Active">
            <span className="pulse-dot" />
            <span>LEDGER SYNCED</span>
          </div>
        </div>

        {/* Central Architectural Navigation Pills */}
        <nav className="nav-pill-container">
          <button
            className={`nav-pill ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={14} />
            <span>Catalog</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'receipts' ? 'active' : ''}`}
            onClick={() => setActiveTab('receipts')}
          >
            <ArrowDownToLine size={14} />
            <span>Receipts</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => setActiveTab('deliveries')}
          >
            <ArrowUpFromLine size={14} />
            <span>Deliveries</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfers')}
          >
            <ArrowLeftRight size={14} />
            <span>Transfers</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'adjustments' ? 'active' : ''}`}
            onClick={() => setActiveTab('adjustments')}
          >
            <ClipboardList size={14} />
            <span>Adjustments</span>
          </button>

          <button
            className={`nav-pill ${activeTab === 'warehouses' ? 'active' : ''}`}
            onClick={() => setActiveTab('warehouses')}
          >
            <Building2 size={14} />
            <span>Facilities</span>
          </button>

          <button
            className={`nav-pill nav-pill-special ${activeTab === 'walkthrough' ? 'active' : ''}`}
            onClick={() => setActiveTab('walkthrough')}
          >
            <Sparkles size={14} />
            <span>77 Proof</span>
          </button>
        </nav>

        {/* User Profile Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'var(--text-xs)'
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 11
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>{user?.name?.split(' ')[0]}</span>
            <span style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '1px 6px',
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)'
            }}>
              {isManager ? 'Manager' : 'Staff'}
            </span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>
        </div>
      </header>

      {/* Slide-Over Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

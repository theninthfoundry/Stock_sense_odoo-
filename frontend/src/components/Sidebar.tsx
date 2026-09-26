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
  LogOut,
  ChevronRight
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

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isManager, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <aside className="app-sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-section" onClick={() => setActiveTab('dashboard')}>
            <div className="brand-logo">
              <Boxes size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="brand-title">StockSense</span>
                <span className="brand-tag">v1.0</span>
              </div>
            </div>
          </div>

          {/* Live Invariant Sync Status */}
          <div className="ledger-pulse" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
            <span className="pulse-dot" />
            <span>LEDGER GROUND TRUTH</span>
          </div>
        </div>

        {/* Grouped Left Nav Sections */}
        <nav className="sidebar-nav">
          {/* Group 1: Core */}
          <div className="nav-group">
            <span className="nav-group-title">Overview</span>

            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'walkthrough' ? 'active' : ''}`}
              onClick={() => setActiveTab('walkthrough')}
            >
              <Sparkles size={16} />
              <span style={{ flex: 1 }}>77 Proof</span>
              <span className="sidebar-badge">SPEC</span>
            </button>
          </div>

          {/* Group 2: Warehouse Operations */}
          <div className="nav-group">
            <span className="nav-group-title">Stock Movements</span>

            <button
              className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
              onClick={() => setActiveTab('receipts')}
            >
              <ArrowDownToLine size={16} />
              <span>Receipts</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'deliveries' ? 'active' : ''}`}
              onClick={() => setActiveTab('deliveries')}
            >
              <ArrowUpFromLine size={16} />
              <span>Deliveries</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'transfers' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfers')}
            >
              <ArrowLeftRight size={16} />
              <span>Transfers</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'adjustments' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjustments')}
            >
              <ClipboardList size={16} />
              <span>Adjustments</span>
            </button>
          </div>

          {/* Group 3: Master Catalog & Storage */}
          <div className="nav-group">
            <span className="nav-group-title">Catalog & Network</span>

            <button
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package size={16} />
              <span>Products</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'warehouses' ? 'active' : ''}`}
              onClick={() => setActiveTab('warehouses')}
            >
              <Building2 size={16} />
              <span>Facilities</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer with Account Profile Trigger */}
        <div className="sidebar-footer">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="sidebar-user-card"
            title="Open Account Profile Drawer"
          >
            <div className="sidebar-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-username">{user?.name}</div>
              <div className="sidebar-role">
                {isManager ? 'Manager' : 'Staff'}
              </div>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={logout}
              className="btn-sidebar-action"
              title="Sign out of session"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Slide-over Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

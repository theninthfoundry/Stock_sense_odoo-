import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { TransfersPage } from './pages/TransfersPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { WalkthroughPage } from './pages/WalkthroughPage';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading StockSense...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="app-viewport">
        <main className="app-main">
          {activeTab === 'dashboard' && <DashboardPage onNavigateTo={setActiveTab} />}
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'receipts' && <ReceiptsPage />}
          {activeTab === 'deliveries' && <DeliveriesPage />}
          {activeTab === 'transfers' && <TransfersPage />}
          {activeTab === 'adjustments' && <AdjustmentsPage />}
          {activeTab === 'warehouses' && <WarehousesPage />}
          {activeTab === 'walkthrough' && <WalkthroughPage />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;

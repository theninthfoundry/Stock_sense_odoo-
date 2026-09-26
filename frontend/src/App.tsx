import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar, ActiveTab } from './components/Navbar';
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
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-secondary)'
      }}>
        Loading StockSense...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-main" style={{ flex: 1, width: '100%' }}>
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

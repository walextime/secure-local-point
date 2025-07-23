import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PointOfSale from './pages/PointOfSale';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import SalesHistory from './pages/SalesHistory';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SetupWizard from './components/setup/SetupWizard';
import BackupManager from './pages/BackupManager';
import PendingSales from './pages/PendingSales';
import { AppSettings } from './types/settings';
import { db } from './lib/dexieDb';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TranslationProvider } from './hooks/useTranslation';
import RoleGuard from './components/auth/RoleGuard';
import PrintedReceipts from './pages/PrintedReceipts';
import PWAInitializer from './components/PWAInitializer';
import PublicLayout from './layouts/PublicLayout';
import ProtectedLayout from './layouts/ProtectedLayout';

async function checkSetupComplete(): Promise<boolean> {
  console.log('[CheckSetup] Running check...');
  try {
    const appSettings = await db.settings.get('app-settings');
    const isComplete = appSettings?.setupComplete === true;
    console.log(`[CheckSetup] Status: ${isComplete ? 'Complete' : 'Incomplete'}`);
    return isComplete;
  } catch (error) {
    console.error('[CheckSetup] Error:', error);
    return false;
  }
}

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('[AppRoutes] useEffect triggered. Checking setup status.');
    checkSetupComplete().then(status => {
      setIsSetupComplete(status);
    });
  }, []);

  console.log('[AppRoutes] Rendering component with states:', { isSetupComplete, isAuthLoading, isAuthenticated });

  if (isSetupComplete === null || isAuthLoading) {
    console.log('[AppRoutes] Showing main loading screen.');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading Application...</p>
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    console.log('[AppRoutes] Setup is not complete. Rendering SetupWizard.');
    return (
      <Router>
        <Routes>
          <Route path="*" element={<SetupWizard />} />
        </Routes>
      </Router>
    );
  }

  console.log('[AppRoutes] Setup complete. Proceeding to main routing.');
  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <Route path="/*" element={<ProtectedLayout />}>
             <Route index element={<Navigate to={user?.role === 'root' ? '/settings' : '/pos'} replace />} />
            {user?.role !== 'root' && (
            <Route path="pos" element={
              <RoleGuard allowedRoles={['admin', 'manager', 'cashier']}>
                <PointOfSale />
              </RoleGuard>
            } />
            )}
            <Route 
              path="inventory" 
              element={
                <RoleGuard allowedRoles={['admin', 'manager', 'root']}>
                  <Inventory />
                </RoleGuard>
              } 
            />
            <Route 
              path="customers" 
              element={
                <RoleGuard allowedRoles={['admin', 'manager', 'root']}>
                  <Customers />
                </RoleGuard>
              } 
            />
            {user?.role !== 'root' && (
            <Route 
              path="sales-history" 
              element={
                <RoleGuard allowedRoles={['admin', 'manager']}>
                  <SalesHistory />
                </RoleGuard>
              } 
            />
            )}
            <Route 
              path="users" 
              element={
                <RoleGuard allowedRoles={['admin', 'root']}>
                  <Users />
                </RoleGuard>
              } 
            />
            <Route 
              path="backup" 
              element={
                <RoleGuard allowedRoles={['admin', 'root']}>
                  <BackupManager />
                </RoleGuard>
              } 
            />
            <Route 
              path="settings" 
              element={
                <RoleGuard allowedRoles={['admin', 'root']}>
                  <Settings />
                </RoleGuard>
              } 
            />
            {user?.role !== 'root' && (
            <Route 
              path="pending-sales" 
              element={
                <RoleGuard allowedRoles={['admin', 'manager', 'cashier']}>
                  <PendingSales />
                </RoleGuard>
              } 
            />
            )}
            {user?.role !== 'root' && (
            <Route path="printed-receipts" element={
              <RoleGuard allowedRoles={['admin', 'manager', 'cashier']}>
                <PrintedReceipts />
              </RoleGuard>
            } />
            )}
            <Route 
              path="pwa-status" 
              element={
                <RoleGuard allowedRoles={['admin', 'root']}>
                  <PWAInitializer />
                </RoleGuard>
              } 
            />
          </Route>
        ) : (
          <>
            <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <TranslationProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TranslationProvider>
  );
};

export default App;

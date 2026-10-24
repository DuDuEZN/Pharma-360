import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/common/Toast'
import { AuthProvider } from './hooks/useAuth'
import { CartProvider } from './hooks/useCart'
import { BarcodeScannerProvider } from './hooks/useBarcodeScanner'
import { WebSocketProvider } from './hooks/useWebSocket'
import { AlertsProvider } from './hooks/useAlerts'

// Layout
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import CashierPage from './pages/CashierPage'
import {
  AdminPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  SettingsPage,
  ReportsPage
} from './pages/admin'
import { ManagerPage } from './pages/manager'

// Protected Route
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BarcodeScannerProvider>
        <CartProvider>
          <WebSocketProvider role="cashier">
            <AlertsProvider>
              <Toaster />
              <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/cashier" element={<CashierPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminPage />}>
                <Route index element={<UsersPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
              
              {/* Manager Routes */}
              <Route path="/manager" element={<ManagerPage />} />
              
            </Route>
            
            <Route path="*" element={<div>404 - Page non trouvée</div>} />
          </Routes>
            </AlertsProvider>
          </WebSocketProvider>
        </CartProvider>
      </BarcodeScannerProvider>
    </AuthProvider>
  )
}

export default App

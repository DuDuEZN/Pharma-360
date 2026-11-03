import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/common/Toast'
import { Toaster as SonnerToaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import { CartProvider } from './hooks/useCart'
import { BarcodeScannerProvider } from './hooks/useBarcodeScanner'
import { WebSocketProvider } from './hooks/useWebSocket'
import { AlertsProvider } from './hooks/useAlerts'

// Layout
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/LoginPage'

import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import CashierPage from './pages/CashierPage'
import ProductFormPage from './pages/ProductFormPage'
import HelpPage from './pages/HelpPage'
import ComingSoonPage from './pages/ComingSoonPage'
import {
  AdminPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  SettingsPage,
  ReportsPage
} from './pages/admin'
import { ManagerPage, InventoryPage, SuppliersPage, DashboardPage as ManagerDashboardPage } from './pages/manager'

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
              <SonnerToaster richColors position="top-right" />
              <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<ManagerDashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<ProductFormPage />} />
              <Route path="/products/:id/edit" element={<ProductFormPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/new" element={<Navigate to="/sales" replace />} />
              <Route path="/cashier" element={<CashierPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminPage />}>
                <Route index element={<UsersPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<ManagerDashboardPage />} />
              </Route>
              
              {/* Manager Routes */}
              <Route path="/manager" element={<ManagerPage />}>
                <Route index element={<InventoryPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="dashboard" element={<ManagerDashboardPage />} />
                <Route
                  path="orders"
                  element={
                    <ComingSoonPage
                      title="Commandes d'approvisionnement"
                      backTo="/manager"
                      backLabel="Retour au gestionnaire"
                    />
                  }
                />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<ManagerDashboardPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              
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

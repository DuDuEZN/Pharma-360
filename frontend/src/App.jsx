import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/common/Toast'
import { AuthProvider } from './hooks/useAuth'
import { CartProvider } from './hooks/useCart'
import { BarcodeScannerProvider } from './hooks/useBarcodeScanner'
import { WebSocketProvider } from './hooks/useWebSocket'
import { AlertsProvider } from './hooks/useAlerts'

// Design System Providers
import { ThemeProvider } from './providers/ThemeProvider'
import { AlertProvider } from './providers/AlertProvider'

// Layout
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import CashierPage from './pages/CashierPage'
import HelpPage from './pages/HelpPage'
import ProductFormPage from './pages/ProductFormPage'
import SaleFormPage from './pages/SaleFormPage'

// Admin Pages
import {
  AdminPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  AdminSettingsPage,
  AdminReportsPage,
  AdminAnalyticsPage
} from './pages/admin'

// Manager Pages
import {
  ManagerPage,
  ManagerDashboardPage,
  InventoryPage,
  SuppliersPage,
  CustomersPage,
  OrdersPage,
  DeliveriesPage,
  ManagerReportsPage,
  ManagerSettingsPage,
  ManagerAnalyticsPage,
  DeliveryFormPage,
  OrderFormPage,
  ReportFormPage,
  BackupPage,
  RestorePage
} from './pages/manager'

// Protected Route
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BarcodeScannerProvider>
          <CartProvider>
            <WebSocketProvider role="cashier">
              <AlertsProvider>
                <AlertProvider>
                  <Toaster />
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      {/* Dashboard */}
                      <Route path="/" element={<ManagerDashboardPage />} />
                      
                      {/* Products */}
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/new" element={<ProductFormPage />} />
                      <Route path="/products/:id/edit" element={<ProductFormPage />} />
                      
                      {/* Sales */}
                      <Route path="/sales" element={<SalesPage />} />
                      <Route path="/sales/new" element={<SaleFormPage />} />
                      
                      {/* Cashier */}
                      <Route path="/cashier" element={<CashierPage />} />
                      
                      {/* Help */}
                      <Route path="/help" element={<HelpPage />} />
                      
                      {/* Reports */}
                      <Route path="/reports" element={<AdminReportsPage />} />
                      
                      {/* Settings */}
                      <Route path="/settings" element={<AdminSettingsPage />} />
                      
                      {/* Admin Routes */}
                      <Route path="/admin" element={<AdminPage />}>
                        <Route index element={<UsersPage />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="roles" element={<RolesPage />} />
                        <Route path="permissions" element={<PermissionsPage />} />
                        <Route path="settings" element={<AdminSettingsPage />} />
                        <Route path="reports" element={<AdminReportsPage />} />
                        <Route path="analytics" element={<AdminAnalyticsPage />} />
                      </Route>
                      
                      {/* Manager Routes */}
                      <Route path="/manager" element={<ManagerPage />}>
                        <Route index element={<ManagerDashboardPage />} />
                        <Route path="dashboard" element={<ManagerDashboardPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                        <Route path="suppliers" element={<SuppliersPage />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="orders/new" element={<OrderFormPage />} />
                        <Route path="deliveries" element={<DeliveriesPage />} />
                        <Route path="deliveries/new" element={<DeliveryFormPage />} />
                        <Route path="reports" element={<ManagerReportsPage />} />
                        <Route path="reports/new" element={<ReportFormPage />} />
                        <Route path="analytics" element={<ManagerAnalyticsPage />} />
                        <Route path="settings" element={<ManagerSettingsPage />} />
                        <Route path="backup" element={<BackupPage />} />
                        <Route path="restore" element={<RestorePage />} />
                      </Route>
                      
                    </Route>
                    
                    <Route path="*" element={<div className="min-h-screen flex items-center justify-center text-2xl">404 - Page non trouvée</div>} />
                  </Routes>
                </AlertProvider>
              </AlertsProvider>
            </WebSocketProvider>
          </CartProvider>
        </BarcodeScannerProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

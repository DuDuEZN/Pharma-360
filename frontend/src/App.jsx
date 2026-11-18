import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/common/Toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { CartProvider } from '@/providers/CartProvider'
import { BarcodeScannerProvider } from '@/hooks/useBarcodeScanner'
import { WebSocketProvider } from '@/hooks/useWebSocket'
import { AlertsProvider } from '@/hooks/useAlerts'

// Design System Providers
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AlertProvider } from '@/providers/AlertProvider'
import { PharmacyProvider } from '@/providers/PharmacyProvider'

// Layout
import Layout from '@/components/layout/Layout'

// Pages
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import HelpPage from '@/pages/HelpPage'

// Modules métier (monolithe modulaire)
import { ProductsPage, ProductFormPage } from '@/features/catalog'
import { CustomersPage } from '@/features/customers'
import { CashierPage } from '@/features/cash'
import { InventoryPage } from '@/features/inventory'
import { OrdersPage, OrderFormPage } from '@/features/orders'
import { AdminReportsPage, ManagerReportsPage, ReportFormPage } from '@/features/reports'
import { SalesPage, SaleFormPage } from '@/features/sales'

// Admin Pages
import {
  AdminPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  AdminSettingsPage,
  AdminAnalyticsPage,
  AdminAuditPage
} from '@/pages/admin'

// Manager Pages
import {
  ManagerPage,
  ManagerDashboardPage,
  SuppliersPage,
  DeliveriesPage,
  ManagerSettingsPage,
  ManagerAnalyticsPage,
  DeliveryFormPage,
  BackupPage,
  RestorePage
} from '@/pages/manager'

// Protected Route
import ProtectedRoute from '@/components/common/ProtectedRoute'
import RoleRoute from '@/components/common/RoleRoute'

function RoleHome() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user?.role === 'cashier') return <Navigate to="/cashier" replace />
  if (user?.role === 'seller') return <Navigate to="/manager/orders" replace />
  return <ManagerDashboardPage />
}

function ManagerHome() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user?.role === 'seller') return <Navigate to="/manager/orders" replace />
  return <ManagerDashboardPage />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PharmacyProvider>
        <BarcodeScannerProvider>
          <CartProvider>
            <WebSocketProvider>
              <AlertsProvider>
                <AlertProvider>
                  <Toaster />
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      {/* Dashboard (cashier/seller redirigés) */}
                      <Route path="/" element={<RoleHome />} />
                      
                      {/* Products */}
                      <Route path="/products" element={<ProductsPage />} />
                      <Route
                        path="/products/new"
                        element={
                          <RoleRoute roles={['admin', 'manager']}>
                            <ProductFormPage />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/products/:id/edit"
                        element={
                          <RoleRoute roles={['admin', 'manager']}>
                            <ProductFormPage />
                          </RoleRoute>
                        }
                      />
                      
                      {/* Sales */}
                      <Route path="/sales" element={<SalesPage />} />
                      <Route path="/sales/new" element={<SaleFormPage />} />

                      {/* Clients (tous sauf caissier) */}
                      <Route
                        path="/customers"
                        element={
                          <RoleRoute roles={['admin', 'manager', 'seller']}>
                            <CustomersPage />
                          </RoleRoute>
                        }
                      />
                      
                      {/* Cashier (admin / cashier uniquement) */}
                      <Route
                        path="/cashier"
                        element={
                          <RoleRoute roles={['admin', 'cashier']}>
                            <CashierPage />
                          </RoleRoute>
                        }
                      />
                      
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
                        <Route path="audit" element={<AdminAuditPage />} />
                      </Route>
                      
                      {/* Manager Routes */}
                      <Route path="/manager" element={<ManagerPage />}>
                        <Route index element={<ManagerHome />} />
                        <Route path="dashboard" element={<ManagerDashboardPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                        <Route path="suppliers" element={<SuppliersPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="orders/new" element={<OrderFormPage />} />
                        <Route path="orders/:id/edit" element={<OrderFormPage />} />
                        <Route path="deliveries" element={<DeliveriesPage />} />
                        <Route path="deliveries/new" element={<DeliveryFormPage />} />
                        <Route path="deliveries/:id/edit" element={<DeliveryFormPage />} />
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
        </PharmacyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

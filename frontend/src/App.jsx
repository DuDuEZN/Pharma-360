import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/common/Toast'

// Layout
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import CashierPage from './pages/CashierPage'
import AdminPage from './pages/admin/AdminPage'
import ManagerPage from './pages/manager/ManagerPage'

// Protected Route
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/manager/*" element={<ManagerPage />} />
        </Route>
        
        <Route path="*" element={<div>404 - Page non trouvée</div>} />
      </Routes>
    </>
  )
}

export default App

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const h = await vi.hoisted(async () => {
  const React = (await import('react')).default
  return {
    addToast: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    stub: (name) => () => React.createElement('div', null, `STUB:${name}`),
  }
})
const { addToast, post, stub } = h

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, token: 't', user: { role: 'admin' } }),
  AuthProvider: ({ children }) => children,
}))
vi.mock('../src/hooks/useCart', () => ({ CartProvider: ({ children }) => children }))
vi.mock('../src/hooks/useBarcodeScanner', () => ({ BarcodeScannerProvider: ({ children }) => children }))
vi.mock('../src/hooks/useWebSocket', () => ({ WebSocketProvider: ({ children }) => children }))
vi.mock('../src/hooks/useAlerts', () => ({ AlertsProvider: ({ children }) => children }))
vi.mock('../src/components/common/Toast', () => ({ Toaster: () => null, useToast: () => ({ addToast: h.addToast }) }))
vi.mock('../src/components/layout/Layout', () => ({ default: () => React.createElement(Outlet) }))
vi.mock('../src/services/api', () => ({ default: { post: (...a) => h.post(...a), get: (...a) => h.get(...a), put: (...a) => h.put(...a) }, api: {} }))

vi.mock('../src/pages/LoginPage', () => ({ default: h.stub('Login') }))
vi.mock('../src/pages/ProductsPage', () => ({ default: h.stub('Products') }))
vi.mock('../src/pages/SalesPage', () => ({ default: h.stub('Sales') }))
vi.mock('../src/pages/CashierPage', () => ({ default: h.stub('Cashier') }))
vi.mock('../src/pages/admin', () => ({
  AdminPage: () => React.createElement(Outlet),
  UsersPage: h.stub('Users'), RolesPage: h.stub('Roles'), PermissionsPage: h.stub('Permissions'),
  SettingsPage: h.stub('Settings'), ReportsPage: h.stub('Reports'),
}))
vi.mock('../src/pages/manager', () => ({
  ManagerPage: () => React.createElement(Outlet),
  InventoryPage: h.stub('Inventory'), SuppliersPage: h.stub('Suppliers'), DashboardPage: h.stub('ManagerDashboard'),
}))

import App from '../src/App'

const go = (path) => render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))

const CASES = [
  ['/products/new', 'Nouveau produit'],
  ['/sales/new', 'STUB:Sales'],
  ['/reports', 'STUB:Reports'],
  ['/settings', 'STUB:Settings'],
  ['/help', 'Aide'],
  ['/manager/orders', "Commandes d'approvisionnement"],
  ['/manager/analytics', 'STUB:ManagerDashboard'],
  ['/manager/reports', 'STUB:Reports'],
  ['/manager/settings', 'STUB:Settings'],
  ['/admin/analytics', 'STUB:ManagerDashboard'],
  // routes qui fonctionnaient déjà : non-régression
  ['/products', 'STUB:Products'],
  ['/manager/inventory', 'STUB:Inventory'],
  ['/admin/users', 'STUB:Users'],
]

describe('routes', () => {
  beforeEach(() => {
    addToast.mockClear(); post.mockReset(); h.put.mockReset(); h.get.mockReset()
    h.get.mockImplementation((url) => {
      if (url === '/categories/') return Promise.resolve({ data: [{ id: 1, name: 'Antibiotiques' }, { id: 2, name: 'Vitamines' }] })
      if (url === '/products/5') return Promise.resolve({ data: { id: 5, name: 'Doliprane', category_id: 2, price: 1200, cost_price: 800, stock_min: 5, stock_max: 50, unit: 'boîte', dci: 'Paracétamol', barcode: '999', is_active: true, requires_prescription: false } })
      return Promise.resolve({ data: [] })
    })
  })

  it.each(CASES)('%s ne renvoie plus 404', (path, marker) => {
    go(path)
    expect(screen.queryByText(/404 - Page non trouvée/)).toBeNull()
    expect(screen.getAllByText(marker).length).toBeGreaterThan(0)
  })

  it('une URL inconnue affiche toujours la 404', () => {
    go('/n-importe-quoi')
    expect(screen.getByText(/404 - Page non trouvée/)).toBeInTheDocument()
  })

  it('le formulaire envoie POST /products/ avec le bon payload', async () => {
    post.mockResolvedValue({ data: { id: 1 } })
    go('/products/new')
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: '  Paracétamol 500mg ' } })
    fireEvent.change(screen.getByLabelText('Prix de vente'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('DCI'), { target: { value: 'Paracétamol' } })
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/ }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/products/')
    expect(body).toMatchObject({ name: 'Paracétamol 500mg', dci: 'Paracétamol', price: 1500, barcode: null, stock_min: 0, stock_max: 100, is_active: true })
    await waitFor(() => expect(screen.getByText('STUB:Products')).toBeInTheDocument())
  })

  it('affiche un message clair si le rôle est refusé (403)', async () => {
    post.mockRejectedValue({ response: { status: 403, data: { detail: 'x' } } })
    go('/products/new')
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/ }))
    await waitFor(() => expect(addToast).toHaveBeenCalled())
    expect(addToast.mock.calls.at(-1)[0].message).toMatch(/gestionnaires et administrateurs/)
  })

  it('création : la catégorie choisie est envoyée (category_id)', async () => {
    post.mockResolvedValue({ data: { id: 1 } })
    go('/products/new')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Antibiotiques' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Amoxicilline' } })
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/ }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][1]).toMatchObject({ name: 'Amoxicilline', category_id: 1 })
  })

  it('création : sans catégorie, category_id vaut null', async () => {
    post.mockResolvedValue({ data: { id: 1 } })
    go('/products/new')
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Sans catégorie' } })
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/ }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][1].category_id).toBeNull()
  })

  it('nouvelle catégorie à la volée : POST /categories/ puis sélection automatique', async () => {
    post.mockImplementation((url) => url === '/categories/'
      ? Promise.resolve({ data: { id: 9, name: 'Antipaludéens' } })
      : Promise.resolve({ data: { id: 1 } }))
    go('/products/new')
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle catégorie/ }))
    fireEvent.change(screen.getByLabelText('Nom de la nouvelle catégorie'), { target: { value: 'Antipaludéens' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => expect(screen.getByLabelText('Catégorie').value).toBe('9'))
    expect(post.mock.calls[0]).toEqual(['/categories/', { name: 'Antipaludéens' }])
  })

  it('modification : charge le produit (catégorie incluse) et envoie PUT /products/5', async () => {
    h.put.mockResolvedValue({ data: {} })
    go('/products/5/edit')
    await waitFor(() => expect(screen.getByDisplayValue('Doliprane')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByLabelText('Catégorie').value).toBe('2'))
    fireEvent.change(screen.getByLabelText('Prix de vente'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/ }))
    await waitFor(() => expect(h.put).toHaveBeenCalledTimes(1))
    const [url, body] = h.put.mock.calls[0]
    expect(url).toBe('/products/5')
    expect(body).toMatchObject({ name: 'Doliprane', category_id: 2, price: 1500, stock_min: 5 })
    expect(post).not.toHaveBeenCalled()
  })
})

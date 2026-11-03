import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  get: vi.fn(), del: vi.fn(), addToast: vi.fn(), role: { value: 'admin' },
}))

vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: h.role.value } }) }))
vi.mock('../src/hooks/useAlerts', () => ({ useAlerts: () => ({ hasAlerts: () => false, getAlertCountForProduct: () => 0, getProductAlertSeverity: () => null }) }))
vi.mock('../src/components/common', () => ({ AlertBadge: () => null }))
vi.mock('../src/components/common/Toast', () => ({ useToast: () => ({ addToast: h.addToast }) }))
vi.mock('../src/services/api', () => ({ default: { get: (...a) => h.get(...a), delete: (...a) => h.del(...a), post: vi.fn() } }))

import ProductsPage from '../src/pages/ProductsPage'

const PRODUCTS = [
  { id: 1, name: 'Amoxicilline', category_name: 'Antibiotiques', price: 2500, current_stock: 10, stock_min: 2, stock_max: 100, unit: 'boîte', is_active: true },
  { id: 2, name: 'Vitamine C', category_name: null, price: 500, current_stock: 30, stock_min: 2, stock_max: 100, unit: 'boîte', is_active: false },
]

function Where() { return React.createElement('div', null, `PATH:${useLocation().pathname}`) }
const renderPage = () => render(
  React.createElement(MemoryRouter, { initialEntries: ['/products'] },
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/products', element: React.createElement(ProductsPage) }),
      React.createElement(Route, { path: '*', element: React.createElement(Where) })))
)

describe('ProductsPage : Modifier / Supprimer', () => {
  beforeEach(() => {
    h.get.mockReset(); h.del.mockReset(); h.addToast.mockClear(); h.role.value = 'admin'
    h.get.mockResolvedValue({ data: { products: PRODUCTS } })
  })

  it('affiche la catégorie (ou « Non classé ») et le badge Inactif', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    expect(screen.getByText('Antibiotiques')).toBeInTheDocument()
    expect(screen.getByText('Non classé')).toBeInTheDocument()
    expect(screen.getByText('Inactif')).toBeInTheDocument()
  })

  it('Modifier ouvre /products/:id/edit', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Modifier/ })[0])
    expect(await screen.findByText('PATH:/products/1/edit')).toBeInTheDocument()
  })

  it('Supprimer demande confirmation, appelle DELETE et retire la ligne', async () => {
    h.del.mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/ })[0])
    await waitFor(() => expect(h.del).toHaveBeenCalledWith('/products/1'))
    await waitFor(() => expect(screen.queryByText('Amoxicilline')).toBeNull())
    expect(h.addToast.mock.calls.at(-1)[0].type).toBe('success')
  })

  it('Supprimer annulé : aucun appel', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/ })[0])
    expect(h.del).not.toHaveBeenCalled()
    expect(screen.getByText('Amoxicilline')).toBeInTheDocument()
  })

  it('refus 409 (produit avec historique) : message du serveur, la ligne reste', async () => {
    h.del.mockRejectedValue({ response: { status: 409, data: { detail: 'Ce produit a un historique' } } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/ })[0])
    await waitFor(() => expect(h.addToast).toHaveBeenCalled())
    expect(h.addToast.mock.calls.at(-1)[0].message).toBe('Ce produit a un historique')
    expect(screen.getByText('Amoxicilline')).toBeInTheDocument()
  })

  it('manager : Modifier visible, Supprimer masqué ; vendeur : aucun des deux', async () => {
    h.role.value = 'manager'
    const { unmount } = renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: /Modifier/ }).length).toBe(2)
    expect(screen.queryAllByRole('button', { name: /Supprimer/ }).length).toBe(0)
    unmount()
    h.role.value = 'seller'
    renderPage()
    await waitFor(() => expect(screen.getByText('Amoxicilline')).toBeInTheDocument())
    expect(screen.queryAllByRole('button', { name: /Modifier|Supprimer/ }).length).toBe(0)
  })
})

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

const h = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/services/api.js', () => ({ api: { get: (...a) => h.get(...a), post: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import SuppliersPage from '../src/pages/manager/SuppliersPage.jsx'

describe('SuppliersPage', () => {
  it('affiche les fournisseurs renvoyés sous forme paginée, contact/email null inclus', async () => {
    h.get.mockImplementation((url) => {
      if (url.startsWith('/suppliers')) {
        return Promise.resolve({ data: { suppliers: [
          { id: 1, name: 'Pharma Distri', contact: null, email: null, phone: '+229 01', address: null },
          { id: 2, name: 'Sodipharm', contact: 'Jean', email: 'j@s.bj', phone: null, address: 'Cotonou' },
        ], total: 2, page: 1, page_size: 100, total_pages: 1 } })
      }
      return Promise.resolve({ data: { invoices: [], total: 0 } })
    })
    render(React.createElement(SuppliersPage))
    await waitFor(() => expect(screen.getByText('Pharma Distri')).toBeInTheDocument())
    expect(screen.getByText('Sodipharm')).toBeInTheDocument()
  })
})

/**
 * @jest-environment jsdom
 * Frontend Pages Tests
 * QA-007: Tests Frontend (Jest + React Testing Library)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
}));

// Mock API calls
jest.mock('../src/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Pages Components', () => {
  describe('LoginPage', () => {
    it('renders login form', async () => {
      const { LoginPage } = require('../src/pages/LoginPage');
      render(<LoginPage />);
      
      expect(screen.getByText(/connexion/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/identifiant/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    });

    it('shows error message on login failure', async () => {
      const { api } = require('../src/services/api');
      const { LoginPage } = require('../src/pages/LoginPage');
      
      api.post.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      render(<LoginPage />);
      
      const usernameInput = screen.getByLabelText(/identifiant/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /connexion/i });
      
      fireEvent.change(usernameInput, { target: { value: 'test' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/identifiants invalides/i)).toBeInTheDocument();
      });
    });
  });

  describe('DashboardPage', () => {
    it('renders dashboard with stat cards', async () => {
      const { api } = require('../src/services/api');
      const { DashboardPage } = require('../src/pages/manager/DashboardPage');
      
      api.get.mockResolvedValue({
        data: {
          total_sales: 100,
          total_revenue: 500000,
          total_products: 50,
          low_stock_count: 5,
          expiring_soon_count: 3,
          active_users: 10,
          pending_invoices: 2,
        },
      });
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Ventes Totales')).toBeInTheDocument();
        expect(screen.getByText('Chiffre d\'affaires')).toBeInTheDocument();
        expect(screen.getByText('Produits')).toBeInTheDocument();
        expect(screen.getByText('Stock Faible')).toBeInTheDocument();
      });
    });

    it('displays loading state', async () => {
      const { api } = require('../src/services/api');
      const { DashboardPage } = require('../src/pages/manager/DashboardPage');
      
      api.get.mockImplementation(() => new Promise(() => {}));
      
      render(<DashboardPage />);
      
      expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    });
  });

  describe('ProductsPage', () => {
    it('renders products list', async () => {
      const { api } = require('../src/services/api');
      const { ProductsPage } = require('../src/pages/ProductsPage');
      
      api.get.mockResolvedValue({
        data: {
          items: [
            { id: 1, name: 'Paracétamol', barcode: '12345', price: 500 },
            { id: 2, name: 'Ibuprofène', barcode: '67890', price: 750 },
          ],
          total: 2,
          page: 1,
          page_size: 20,
        },
      });
      
      render(<ProductsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Paracétamol')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofène')).toBeInTheDocument();
      });
    });

    it('shows empty state when no products', async () => {
      const { api } = require('../src/services/api');
      const { ProductsPage } = require('../src/pages/ProductsPage');
      
      api.get.mockResolvedValue({
        data: { items: [], total: 0, page: 1, page_size: 20 },
      });
      
      render(<ProductsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/aucun produit/i)).toBeInTheDocument();
      });
    });
  });

  describe('CashierPage', () => {
    it('renders cashier interface', async () => {
      const { CashierPage } = require('../src/pages/CashierPage');
      
      render(<CashierPage />);
      
      expect(screen.getByText(/caisse/i)).toBeInTheDocument();
      expect(screen.getByText(/file d\'attente/i)).toBeInTheDocument();
    });

    it('displays empty queue message', async () => {
      const { api } = require('../src/services/api');
      const { CashierPage } = require('../src/pages/CashierPage');
      
      api.get.mockResolvedValue({ data: [] });
      
      render(<CashierPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/aucune vente en attente/i)).toBeInTheDocument();
      });
    });
  });

  describe('SalesPage', () => {
    it('renders sales interface', async () => {
      const { SalesPage } = require('../src/pages/SalesPage');
      
      render(<SalesPage />);
      
      expect(screen.getByText(/vente/i)).toBeInTheDocument();
      expect(screen.getByText(/rechercher/i)).toBeInTheDocument();
    });

    it('allows barcode scanning', async () => {
      const { api } = require('../src/services/api');
      const { SalesPage } = require('../src/pages/SalesPage');
      
      api.get.mockResolvedValue({
        data: { id: 1, name: 'Paracétamol', barcode: '12345', price: 500 },
      });
      
      render(<SalesPage />);
      
      const barcodeInput = screen.getByTestId('barcode-input');
      fireEvent.change(barcodeInput, { target: { value: '12345' } });
      
      await waitFor(() => {
        expect(screen.getByText('Paracétamol')).toBeInTheDocument();
      });
    });
  });
});

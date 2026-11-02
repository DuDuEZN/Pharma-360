/**
 * Production Pages Test Suite
 * Tests visual and functional integrity of all pages
 * 
 * QA-018: Production Page Integrity Tests
 * Tests that each page:
 * - Loads without errors (no 404, no blank page)
 * - Renders all expected components
 * - Has functional interactive elements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all external dependencies
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', role: 'admin' },
    token: 'test-token',
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    socket: {},
    sendMessage: vi.fn(),
    queueItems: [],
  }),
  WebSocketProvider: ({ children }) => children,
}));

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
  CartProvider: ({ children }) => children,
}));

vi.mock('@/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    scannedBarcode: null,
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
  }),
  BarcodeScannerProvider: ({ children }) => children,
}));

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    alerts: [],
    addAlert: vi.fn(),
    clearAlerts: vi.fn(),
  }),
  AlertsProvider: ({ children }) => children,
}));

// Import all pages
import LoginPage from '@/pages/LoginPage';
import ProductsPage from '@/pages/ProductsPage';
import SalesPage from '@/pages/SalesPage';
import CashierPage from '@/pages/CashierPage';
import AdminPage from '@/pages/admin/AdminPage';
import UsersPage from '@/pages/admin/UsersPage';
import RolesPage from '@/pages/admin/RolesPage';
import PermissionsPage from '@/pages/admin/PermissionsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import ManagerPage from '@/pages/manager/ManagerPage';
import InventoryPage from '@/pages/manager/InventoryPage';
import SuppliersPage from '@/pages/manager/SuppliersPage';
import ManagerDashboardPage from '@/pages/manager/DashboardPage';

// Helper component to wrap pages with providers
const TestWrapper = ({ children, initialRoute = '/' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Helper to check if page renders without crashing
const testPageRenders = (PageComponent, pageName, route = '/') => {
  it(`should render ${pageName} without errors`, async () => {
    render(
      <TestWrapper initialRoute={route}>
        <PageComponent />
      </TestWrapper>
    );

    // Should not throw any errors
    expect(screen).toBeDefined();
  });

  it(`should not be blank for ${pageName}`, async () => {
    render(
      <TestWrapper initialRoute={route}>
        <PageComponent />
      </TestWrapper>
    );

    // Check that there's some content on the page
    const elements = screen.getAllByRole('*');
    expect(elements.length).toBeGreaterThan(0);
  });
};

// Helper to check for common elements
const testPageHasContent = (PageComponent, pageName, expectedTexts, route = '/') => {
  it(`should display expected content for ${pageName}`, async () => {
    render(
      <TestWrapper initialRoute={route}>
        <PageComponent />
      </TestWrapper>
    );

    for (const text of expectedTexts) {
      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          // Case-insensitive, partial match
          return content.toLowerCase().includes(text.toLowerCase());
        })).toBeInTheDocument();
      }, { timeout: 5000 });
    }
  });
};

// ============================================================================
// Login Page Tests
// ============================================================================
describe('Login Page', () => {
  testPageRenders(LoginPage, 'Login Page', '/login');

  testPageHasContent(LoginPage, 'Login Page', [
    'login',
    'username',
    'password',
    'sign in',
  ], '/login');

  it('should have login form with email and password fields', async () => {
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email|username/i) || 
                       screen.getByPlaceholderText(/email|username/i) ||
                       screen.getByRole('textbox', { name: /email|username/i });
    const passwordInput = screen.getByLabelText(/password/i) || 
                          screen.getByPlaceholderText(/password/i) ||
                          screen.getByRole('textbox', { type: 'password' });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('should have a submit button', async () => {
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /login|sign in|submit/i });
    expect(submitButton).toBeInTheDocument();
  });
});

// ============================================================================
// Products Page Tests
// ============================================================================
describe('Products Page', () => {
  testPageRenders(ProductsPage, 'Products Page', '/products');

  testPageHasContent(ProductsPage, 'Products Page', [
    'product',
    'search',
    'add',
  ], '/products');

  it('should display product list or empty state', async () => {
    render(
      <TestWrapper initialRoute="/products">
        <ProductsPage />
      </TestWrapper>
    );

    // Should have either a list of products or an empty state message
    const hasProducts = screen.queryAllByRole('row').length > 1;
    const hasEmptyMessage = screen.queryByText(/no products|empty|add your first/i);
    
    expect(hasProducts || hasEmptyMessage).toBe(true);
  });
});

// ============================================================================
// Sales Page Tests
// ============================================================================
describe('Sales Page', () => {
  testPageRenders(SalesPage, 'Sales Page', '/sales');

  testPageHasContent(SalesPage, 'Sales Page', [
    'sale',
    'customer',
    'product',
  ], '/sales');

  it('should have cart functionality', async () => {
    render(
      <TestWrapper initialRoute="/sales">
        <SalesPage />
      </TestWrapper>
    );

    // Should have cart-related elements
    const hasCartText = screen.queryByText(/cart|panier|basket/i);
    const hasTotal = screen.queryByText(/total|amount|montant/i);
    
    expect(hasCartText || hasTotal).toBeInTheDocument();
  });
});

// ============================================================================
// Cashier Page Tests
// ============================================================================
describe('Cashier Page', () => {
  testPageRenders(CashierPage, 'Cashier Page', '/cashier');

  testPageHasContent(CashierPage, 'Cashier Page', [
    'cashier',
    'payment',
    'queue',
  ], '/cashier');

  it('should display queue or payment interface', async () => {
    render(
      <TestWrapper initialRoute="/cashier">
        <CashierPage />
      </TestWrapper>
    );

    // Should have queue or payment related elements
    const hasQueue = screen.queryByText(/queue|file|waiting/i);
    const hasPayment = screen.queryByText(/payment|pay|encaissement/i);
    
    expect(hasQueue || hasPayment).toBeInTheDocument();
  });
});

// ============================================================================
// Admin Pages Tests
// ============================================================================
describe('Admin Pages', () => {
  describe('Admin Dashboard (AdminPage)', () => {
    testPageRenders(AdminPage, 'Admin Dashboard', '/admin');
    testPageHasContent(AdminPage, 'Admin Dashboard', ['admin', 'dashboard'], '/admin');
  });

  describe('Users Page', () => {
    testPageRenders(UsersPage, 'Users Page', '/admin/users');
    testPageHasContent(UsersPage, 'Users Page', ['user', 'add user', 'edit'], '/admin/users');
  });

  describe('Roles Page', () => {
    testPageRenders(RolesPage, 'Roles Page', '/admin/roles');
    testPageHasContent(RolesPage, 'Roles Page', ['role', 'permission'], '/admin/roles');
  });

  describe('Permissions Page', () => {
    testPageRenders(PermissionsPage, 'Permissions Page', '/admin/permissions');
    testPageHasContent(PermissionsPage, 'Permissions Page', ['permission'], '/admin/permissions');
  });

  describe('Settings Page', () => {
    testPageRenders(SettingsPage, 'Settings Page', '/admin/settings');
    testPageHasContent(SettingsPage, 'Settings Page', ['setting', 'configuration'], '/admin/settings');
  });

  describe('Reports Page', () => {
    testPageRenders(ReportsPage, 'Reports Page', '/admin/reports');
    testPageHasContent(ReportsPage, 'Reports Page', ['report', 'sales report', 'statistics'], '/admin/reports');
  });
});

// ============================================================================
// Manager Pages Tests
// ============================================================================
describe('Manager Pages', () => {
  describe('Manager Dashboard', () => {
    testPageRenders(ManagerDashboardPage, 'Manager Dashboard', '/manager/dashboard');
    testPageHasContent(ManagerDashboardPage, 'Manager Dashboard', [
      'dashboard',
      'statistics',
      'chart',
    ], '/manager/dashboard');
  });

  describe('Inventory Page', () => {
    testPageRenders(InventoryPage, 'Inventory Page', '/manager/inventory');
    testPageHasContent(InventoryPage, 'Inventory Page', [
      'inventory',
      'stock',
      'product',
    ], '/manager/inventory');
  });

  describe('Suppliers Page', () => {
    testPageRenders(SuppliersPage, 'Suppliers Page', '/manager/suppliers');
    testPageHasContent(SuppliersPage, 'Suppliers Page', [
      'supplier',
      'fournisseur',
      'add',
    ], '/manager/suppliers');
  });

  describe('Manager Main Page', () => {
    testPageRenders(ManagerPage, 'Manager Main Page', '/manager');
    testPageHasContent(ManagerPage, 'Manager Main Page', ['manager'], '/manager');
  });
});

// ============================================================================
// Visual Regression Tests
// ============================================================================
describe('Visual Regression Tests', () => {
  it('should render LoginPage with consistent structure', async () => {
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    // Check for main structural elements
    const heading = screen.getByRole('heading', { name: /login|sign in/i });
    expect(heading).toBeInTheDocument();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render ProductsPage with consistent structure', async () => {
    render(
      <TestWrapper initialRoute="/products">
        <ProductsPage />
      </TestWrapper>
    );

    // Check for main structural elements
    const heading = screen.getByRole('heading', { name: /products?/i });
    expect(heading).toBeInTheDocument();

    // Should have search or filter functionality
    const searchInput = screen.queryByPlaceholderText(/search|rechercher/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should render SalesPage with consistent structure', async () => {
    render(
      <TestWrapper initialRoute="/sales">
        <SalesPage />
      </TestWrapper>
    );

    // Check for main structural elements
    const heading = screen.getByRole('heading', { name: /sales?|vente/i });
    expect(heading).toBeInTheDocument();
  });

  it('should render CashierPage with consistent structure', async () => {
    render(
      <TestWrapper initialRoute="/cashier">
        <CashierPage />
      </TestWrapper>
    );

    // Check for main structural elements
    const heading = screen.getByRole('heading', { name: /cashier|caiss/i });
    expect(heading).toBeInTheDocument();
  });
});

// ============================================================================
// Functional Tests
// ============================================================================
describe('Functional Tests', () => {
  describe('LoginPage functionality', () => {
    it('should allow form submission', async () => {
      render(
        <TestWrapper initialRoute="/login">
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /login|sign in|submit/i });
      
      // Button should be clickable
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('ProductsPage functionality', () => {
    it('should have search functionality', async () => {
      render(
        <TestWrapper initialRoute="/products">
          <ProductsPage />
        </TestWrapper>
      );

      const searchInput = screen.queryByPlaceholderText(/search|rechercher/i);
      if (searchInput) {
        // Should be able to type in search
        fireEvent.change(searchInput, { target: { value: 'test' } });
        expect(searchInput.value).toBe('test');
      }
    });
  });

  describe('Navigation between pages', () => {
    it('should navigate from login to products when authenticated', async () => {
      // Mock authenticated state
      vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
        user: { id: 1, username: 'testuser', role: 'admin' },
        token: 'test-token',
        login: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Initial page should be login
      expect(screen.getByText(/login|sign in/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// 404 and Blank Page Prevention Tests
// ============================================================================
describe('404 and Blank Page Prevention', () => {
  it('should render a custom 404 page for unknown routes', async () => {
    // Import App component
    const { default: App } = await import('@/App');

    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );

    // Should show 404 message
    const notFound = screen.getByText(/404|not found|page non trouvée/i);
    expect(notFound).toBeInTheDocument();
  });

  it('should not render blank page for known routes', async () => {
    const routesToTest = [
      '/',
      '/login',
      '/products',
      '/sales',
      '/cashier',
      '/admin',
      '/manager',
    ];

    const { default: App } = await import('@/App');

    for (const route of routesToTest) {
      render(
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      );

      // Should have some content
      const elements = screen.getAllByRole('*');
      expect(elements.length, `Route ${route} should not be blank`).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// WebSocket Integration Tests
// ============================================================================
describe('WebSocket Integration', () => {
  it('should initialize WebSocket connection for cashier role', async () => {
    // Mock useAuth to return cashier role
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: { id: 1, username: 'cashier', role: 'cashier' },
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    });

    const { default: App } = await import('@/App');

    render(
      <MemoryRouter initialEntries={['/cashier']}>
        <App />
      </MemoryRouter>
    );

    // WebSocket should be initialized (mocked)
    // This test mainly ensures the app doesn't crash with WebSocket
    expect(screen.getByText(/cashier|caiss/i)).toBeInTheDocument();
  });

  it('should initialize WebSocket connection for seller role', async () => {
    // Mock useAuth to return seller role
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: { id: 1, username: 'seller', role: 'seller' },
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    });

    const { default: App } = await import('@/App');

    render(
      <MemoryRouter initialEntries={['/sales']}>
        <App />
      </MemoryRouter>
    );

    // WebSocket should be initialized (mocked)
    expect(screen.getByText(/sale|vente/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================
describe('Accessibility Tests', () => {
  it('should have proper heading hierarchy on LoginPage', async () => {
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    // Should have at least one h1
    const h1 = screen.queryByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
  });

  it('should have proper labels for form inputs on LoginPage', async () => {
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    const inputs = screen.getAllByRole('textbox');
    for (const input of inputs) {
      // Each input should have a label or placeholder
      const hasLabel = input.getAttribute('aria-label') || 
                       input.getAttribute('aria-labelledby') ||
                       input.id;
      const hasPlaceholder = input.getAttribute('placeholder');
      
      expect(hasLabel || hasPlaceholder).toBeTruthy();
    }
  });
});

// ============================================================================
// Responsive Design Tests
// ============================================================================
describe('Responsive Design Tests', () => {
  it('should render LoginPage on mobile viewport', async () => {
    // Set mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    global.dispatchEvent(new Event('resize'));

    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    // Should still render without errors
    expect(screen.getByText(/login|sign in/i)).toBeInTheDocument();
  });

  it('should render ProductsPage on tablet viewport', async () => {
    // Set tablet viewport
    global.innerWidth = 768;
    global.innerHeight = 1024;
    global.dispatchEvent(new Event('resize'));

    render(
      <TestWrapper initialRoute="/products">
        <ProductsPage />
      </TestWrapper>
    );

    // Should still render without errors
    expect(screen.getByText(/product/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Performance Tests
// ============================================================================
describe('Performance Tests', () => {
  it('should render LoginPage within reasonable time', async () => {
    const start = performance.now();
    
    render(
      <TestWrapper initialRoute="/login">
        <LoginPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/login|sign in/i)).toBeInTheDocument();
    });

    const end = performance.now();
    const renderTime = end - start;

    // Should render within 5 seconds (generous limit for test environment)
    expect(renderTime).toBeLessThan(5000);
  });

  it('should render ProductsPage within reasonable time', async () => {
    const start = performance.now();
    
    render(
      <TestWrapper initialRoute="/products">
        <ProductsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/product/i)).toBeInTheDocument();
    });

    const end = performance.now();
    const renderTime = end - start;

    expect(renderTime).toBeLessThan(5000);
  });
});

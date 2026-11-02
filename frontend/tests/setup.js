/**
 * Configuration de base pour les tests Vitest
 * Mock des dépendances externes et configuration globale
 */

import { vi } from 'vitest';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock des modules externes
vi.mock('@/services/api.js', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
  },
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Mock de React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock des hooks personnalisés
vi.mock('@/hooks/useAuth.jsx', () => ({
  default: () => ({
    user: { username: 'testuser', role: 'admin', email: 'test@example.com' },
    login: vi.fn(() => Promise.resolve(true)),
    logout: vi.fn(() => Promise.resolve(true)),
    isAuthenticated: true,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useWebSocket.jsx', () => ({
  default: () => ({
    send: vi.fn(),
    onMessage: vi.fn(),
    onClose: vi.fn(),
    onOpen: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBarcodeScanner.jsx', () => ({
  default: () => ({
    scan: vi.fn(),
    stop: vi.fn(),
    error: null,
    loading: false,
  }),
}));

vi.mock('@/hooks/useCart.jsx', () => ({
  default: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    updateQuantity: vi.fn(),
    total: 0,
  }),
}));

// Mock de localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn((index) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock de sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Configuration avant chaque test
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Configuration globale
globalThis.IS_TEST_ENV = true;

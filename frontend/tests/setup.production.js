/**
 * Production Test Setup
 * Mock configurations for production page testing
 */

import { vi } from 'vitest';
import { beforeEach, afterEach } from 'vitest';

// Mock window.location
const originalLocation = window.location;

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Mock window.location for routing tests
  delete window.location;
  window.location = {
    ...originalLocation,
    href: 'http://localhost',
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    replace: vi.fn(),
    assign: vi.fn(),
  };
  
  // Mock localStorage
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
  
  // Mock sessionStorage
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
      length: 0,
      key: vi.fn((index) => Object.keys(store)[index] || null),
    };
  })();
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });
  
  // Mock navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      language: 'en-US',
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn(),
      },
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(),
      },
    },
    writable: true,
  });
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  // Mock getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn().mockImplementation(() => ({
      getPropertyValue: vi.fn().mockReturnValue(''),
    })),
  });
  
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn().mockReturnValue([]),
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock WebSocket for testing
  global.WebSocket = vi.fn().mockImplementation(() => ({
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  
  // Mock performance
  global.performance = {
    now: vi.fn().mockReturnValue(Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntries: vi.fn().mockReturnValue([]),
  };
});

afterEach(() => {
  // Restore original location
  window.location = originalLocation;
  
  // Clear all mocks
  vi.restoreAllMocks();
});

// Global error handler for tests
window.onerror = vi.fn();
window.addEventListener = vi.fn();
window.removeEventListener = vi.fn();

// Mock console methods to prevent test output pollution
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();
console.info = vi.fn();
console.debug = vi.fn();

// Restore console after tests
process.on('exit', () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

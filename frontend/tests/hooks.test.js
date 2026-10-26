/**
 * @jest-environment jsdom
 * Frontend Hooks Tests
 * QA-007: Tests Frontend (Jest + React Testing Library)
 */

import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock API
jest.mock('../src/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Custom Hooks', () => {
  describe('useAuth', () => {
    it('should return initial state', () => {
      const { useAuth } = require('../src/hooks/useAuth');
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('should store token on login', async () => {
      const { useAuth } = require('../src/hooks/useAuth');
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', expect.any(String));
    });

    it('should clear token on logout', async () => {
      const { useAuth } = require('../src/hooks/useAuth');
      const { result } = renderHook(() => useAuth());
      
      // Set a token first
      localStorage.setItem('token', 'test-token');
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should check authentication status', async () => {
      const { useAuth } = require('../src/hooks/useAuth');
      
      // Set a token
      localStorage.setItem('token', 'valid-token');
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.checkAuth();
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('useWebSocket', () => {
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      onmessage: null,
      onopen: null,
      onclose: null,
      onerror: null,
    };

    beforeEach(() => {
      global.WebSocket = jest.fn(() => mockWebSocket);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should connect to WebSocket', () => {
      const { useWebSocket } = require('../src/hooks/useWebSocket');
      renderHook(() => useWebSocket('ws://localhost:8000/ws'));
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8000/ws');
    });

    it('should send messages', () => {
      const { useWebSocket } = require('../src/hooks/useWebSocket');
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
      
      act(() => {
        result.current.sendMessage({ type: 'test', data: 'data' });
      });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', data: 'data' }));
    });

    it('should close connection', () => {
      const { useWebSocket } = require('../src/hooks/useWebSocket');
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
      
      act(() => {
        result.current.close();
      });
      
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('useCart', () => {
    it('should add items to cart', () => {
      const { useCart } = require('../src/hooks/useCart');
      const { result } = renderHook(() => useCart());
      
      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 100, quantity: 2 });
      });
      
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        id: 1,
        name: 'Product 1',
        price: 100,
        quantity: 2,
      });
    });

    it('should remove items from cart', () => {
      const { useCart } = require('../src/hooks/useCart');
      const { result } = renderHook(() => useCart());
      
      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 100, quantity: 2 });
        result.current.removeItem(1);
      });
      
      expect(result.current.items).toHaveLength(0);
    });

    it('should calculate total correctly', () => {
      const { useCart } = require('../src/hooks/useCart');
      const { result } = renderHook(() => useCart());
      
      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 100, quantity: 2 });
        result.current.addItem({ id: 2, name: 'Product 2', price: 200, quantity: 1 });
      });
      
      expect(result.current.total).toBe(400);
    });

    it('should clear cart', () => {
      const { useCart } = require('../src/hooks/useCart');
      const { result } = renderHook(() => useCart());
      
      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 100, quantity: 2 });
        result.current.clear();
      });
      
      expect(result.current.items).toHaveLength(0);
    });

    it('should update item quantity', () => {
      const { useCart } = require('../src/hooks/useCart');
      const { result } = renderHook(() => useCart());
      
      act(() => {
        result.current.addItem({ id: 1, name: 'Product 1', price: 100, quantity: 2 });
        result.current.updateQuantity(1, 5);
      });
      
      expect(result.current.items[0].quantity).toBe(5);
    });
  });

  describe('useBarcodeScanner', () => {
    it('should handle barcode scan', () => {
      const { useBarcodeScanner } = require('../src/hooks/useBarcodeScanner');
      const mockOnScan = jest.fn();
      
      const { result } = renderHook(() => useBarcodeScanner(mockOnScan));
      
      act(() => {
        result.current.handleScan('123456789');
      });
      
      expect(mockOnScan).toHaveBeenCalledWith('123456789');
    });

    it('should handle Enter key press', () => {
      const { useBarcodeScanner } = require('../src/hooks/useBarcodeScanner');
      const mockOnScan = jest.fn();
      
      const { result } = renderHook(() => useBarcodeScanner(mockOnScan));
      
      const mockEvent = {
        key: 'Enter',
        target: { value: '123456789' },
        preventDefault: jest.fn(),
      };
      
      act(() => {
        result.current.handleKeyDown(mockEvent);
      });
      
      expect(mockOnScan).toHaveBeenCalledWith('123456789');
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not handle other keys', () => {
      const { useBarcodeScanner } = require('../src/hooks/useBarcodeScanner');
      const mockOnScan = jest.fn();
      
      const { result } = renderHook(() => useBarcodeScanner(mockOnScan));
      
      const mockEvent = {
        key: 'a',
        target: { value: '123456789' },
        preventDefault: jest.fn(),
      };
      
      act(() => {
        result.current.handleKeyDown(mockEvent);
      });
      
      expect(mockOnScan).not.toHaveBeenCalled();
    });
  });

  describe('useAlerts', () => {
    it('should add alerts', () => {
      const { useAlerts } = require('../src/hooks/useAlerts');
      const { result } = renderHook(() => useAlerts());
      
      act(() => {
        result.current.addAlert('Test alert', 'error');
      });
      
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]).toEqual({
        id: expect.any(String),
        message: 'Test alert',
        type: 'error',
      });
    });

    it('should remove alerts', () => {
      const { useAlerts } = require('../src/hooks/useAlerts');
      const { result } = renderHook(() => useAlerts());
      
      act(() => {
        const id = result.current.addAlert('Test alert', 'error');
        result.current.removeAlert(id);
      });
      
      expect(result.current.alerts).toHaveLength(0);
    });

    it('should auto-remove alerts after timeout', async () => {
      jest.useFakeTimers();
      
      const { useAlerts } = require('../src/hooks/useAlerts');
      const { result } = renderHook(() => useAlerts());
      
      act(() => {
        result.current.addAlert('Test alert', 'error');
      });
      
      expect(result.current.alerts).toHaveLength(1);
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.alerts).toHaveLength(0);
      
      jest.useRealTimers();
    });
  });
});

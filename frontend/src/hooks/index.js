// hooks/index.js - Centralized exports for hooks module
export { useAuth, AuthProvider } from './useAuth';
export { useBarcodeScanner, BarcodeScannerProvider } from './useBarcodeScanner';
export { useCart, CartProvider } from './useCart';
export { useWebSocket, WebSocketProvider, withWebSocket } from './useWebSocket';
export { useAlerts, AlertsProvider, withAlerts } from './useAlerts';

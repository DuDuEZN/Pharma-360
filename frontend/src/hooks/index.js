// Export all hooks
import { useAuth, AuthProvider } from './useAuth'
import { useBarcodeScanner, BarcodeScannerProvider } from './useBarcodeScanner'
import { useCart, CartProvider } from './useCart'
import { useWebSocket, WebSocketProvider, withWebSocket } from './useWebSocket'
import { useAlerts, AlertsProvider, withAlerts } from './useAlerts'

export {
  useAuth,
  AuthProvider,
  useBarcodeScanner,
  BarcodeScannerProvider,
  useCart,
  CartProvider,
  useWebSocket,
  WebSocketProvider,
  withWebSocket,
  useAlerts,
  AlertsProvider,
  withAlerts,
}

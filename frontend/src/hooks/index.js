// Export all hooks
import { useAuth, AuthProvider } from './useAuth'
import { useBarcodeScanner, BarcodeScannerProvider } from './useBarcodeScanner'
import { useCart, CartProvider } from './useCart'
import { useWebSocket, WebSocketProvider, withWebSocket } from './useWebSocket'

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
}

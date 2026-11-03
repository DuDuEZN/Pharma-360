import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useToast } from '../components/common/Toast'

/**
 * WebSocket Context for Pharmacie 360
 * Real-time communication between Sales and Cashier sessions
 * 
 * FRNT-006: Session Caisse (File d'attente + encaissement)
 */

const WebSocketContext = createContext(null)

// WebSocket URL configuration
// Le backend expose les WebSockets sous /api/ws/... (routeur /ws monté avec le préfixe /api)
const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
  (window.location.hostname === 'localhost'
    ? 'ws://localhost:8000'
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`)

// Reconnect delay (exponential backoff)
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000]

// Codes de fermeture pour lesquels on ne tente PAS de se reconnecter
// 1000 = fermeture normale, 1008 = refus d'authentification / rôle non autorisé
const NO_RECONNECT_CODES = [1000, 1008]

/**
 * WebSocket Provider Component
 * Manages WebSocket connection for cashier / seller roles
 *
 * IMPORTANT: la connexion est pilotée par des refs et l'effet ne dépend que de
 * (token, rôle). Si l'effet dépend du state `socket`, chaque setSocket() recrée
 * les callbacks, relance l'effet et ouvre une nouvelle connexion en boucle
 * ("WebSocket is closed before the connection is established").
 */
export function WebSocketProvider({ children, role = 'cashier' }) {
  const { token, user } = useAuth()
  const { addToast } = useToast()

  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [queueItems, setQueueItems] = useState([])
  const [lastMessage, setLastMessage] = useState(null)

  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const messageQueueRef = useRef([])
  const shouldReconnectRef = useRef(false)
  const addToastRef = useRef(addToast)

  // Garder la dernière version de addToast sans relancer la connexion
  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  const userRole = user?.role

  // Endpoint selon le rôle de l'utilisateur connecté (le backend refuse les autres rôles)
  const endpoint = (() => {
    if (userRole === 'seller') return '/api/ws/sales'
    if (userRole === 'cashier') return '/api/ws/cashier'
    // admin : suit la prop `role` (cashier par défaut)
    return role === 'seller' ? '/api/ws/sales' : '/api/ws/cashier'
  })()

  // Send message through WebSocket (mise en file d'attente si non connecté)
  const sendMessage = useCallback((message) => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      messageQueueRef.current.push(message)
      return false
    }
    try {
      ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      messageQueueRef.current.push(message)
      return false
    }
  }, [])

  const sendPaymentValidated = useCallback(
    (saleData) => sendMessage({ type: 'payment_validated', data: saleData }),
    [sendMessage]
  )

  const sendQueueUpdate = useCallback(
    (queueData) => sendMessage({ type: 'queue_update', data: queueData }),
    [sendMessage]
  )

  const sendPing = useCallback(() => {
    sendMessage({ type: 'ping' })
  }, [sendMessage])

  const handleMessage = useCallback((event) => {
    const toast = (opts) => addToastRef.current?.(opts)
    try {
      const message = JSON.parse(event.data)
      setLastMessage(message)

      switch (message.type) {
        case 'new_sale':
          setQueueItems(prev => {
            const exists = prev.some(item => item.id === message.data.id)
            if (exists) {
              return prev.map(item => item.id === message.data.id ? message.data : item)
            }
            return [...prev, message.data]
          })
          toast({
            type: 'info',
            title: 'Nouvelle vente',
            message: `Vente #${message.data.sale_id || message.data.id} ajoutée à la file`
          })
          break

        case 'sale_cancelled':
          setQueueItems(prev =>
            prev.filter(item => item.id !== message.data.sale_id && item.id !== message.data.id)
          )
          toast({
            type: 'warning',
            title: 'Vente annulée',
            message: `Vente #${message.data.sale_id || message.data.id} a été annulée`
          })
          break

        case 'payment_validated':
          setQueueItems(prev =>
            prev.filter(item => item.id !== message.data.sale_id && item.id !== message.data.id)
          )
          toast({
            type: 'success',
            title: 'Paiement validé',
            message: `Vente #${message.data.sale_id || message.data.id} a été payée`
          })
          break

        case 'queue_update':
          if (Array.isArray(message.data)) {
            setQueueItems(message.data)
          }
          break

        case 'pong':
          break

        default:
          console.log('WebSocket: Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }, [])

  // Disconnect WebSocket (stable)
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    const ws = socketRef.current
    socketRef.current = null
    if (ws) {
      // On détache les handlers pour éviter toasts / reconnexions parasites
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Normal closure')
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // Fermer dès l'ouverture, sans erreur "closed before the connection is established"
          ws.onopen = () => ws.close(1000, 'Normal closure')
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
    }

    setSocket(null)
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  // Open a connection (stable: lit token/endpoint depuis les paramètres)
  const openConnection = useCallback((currentToken, currentEndpoint) => {
    if (!currentToken) {
      console.warn('WebSocket: No token available, cannot connect')
      return
    }

    const url = new URL(currentEndpoint, WS_BASE_URL)
    url.searchParams.append('token', currentToken)

    setIsConnecting(true)

    let ws
    try {
      ws = new WebSocket(url.toString())
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setIsConnecting(false)
      return
    }
    socketRef.current = ws

    ws.onopen = () => {
      reconnectAttemptRef.current = 0
      setReconnectAttempt(0)
      setSocket(ws)
      setIsConnected(true)
      setIsConnecting(false)
      addToastRef.current?.({
        type: 'success',
        title: 'Connexion établie',
        message: 'Connexion WebSocket établie avec succès'
      })

      // Vider la file de messages en attente
      const pending = [...messageQueueRef.current]
      messageQueueRef.current = []
      pending.forEach((m) => {
        try { ws.send(JSON.stringify(m)) } catch (e) { console.error(e) }
      })

      ws.send(JSON.stringify({ type: 'ping' }))
    }

    ws.onmessage = handleMessage

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = (event) => {
      if (socketRef.current === ws) socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      setIsConnecting(false)

      if (NO_RECONNECT_CODES.includes(event.code)) {
        if (event.code === 1008) {
          addToastRef.current?.({
            type: 'error',
            title: 'Connexion refusée',
            message: event.reason || 'Authentification WebSocket refusée'
          })
        }
        return
      }

      addToastRef.current?.({
        type: 'error',
        title: 'Connexion perdue',
        message: `Connexion WebSocket perdue (code: ${event.code})`
      })

      if (!shouldReconnectRef.current) return

      const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)]
      reconnectAttemptRef.current += 1
      setReconnectAttempt(reconnectAttemptRef.current)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (shouldReconnectRef.current) openConnection(currentToken, currentEndpoint)
      }, delay)
    }
  }, [handleMessage])

  // Connexion manuelle (ré-utilise le token et l'endpoint courants)
  const connect = useCallback(() => {
    shouldReconnectRef.current = true
    openConnection(token, endpoint)
  }, [openConnection, token, endpoint])

  // Gérer la connexion selon l'authentification : ne dépend QUE de token / rôle / endpoint
  useEffect(() => {
    if (!token || !userRole) {
      disconnect()
      return undefined
    }

    // Seuls cashier / seller / admin utilisent le WebSocket
    if (!['cashier', 'seller', 'admin'].includes(userRole)) {
      disconnect()
      return undefined
    }

    shouldReconnectRef.current = true
    openConnection(token, endpoint)

    return () => {
      disconnect()
    }
  }, [token, userRole, endpoint, openConnection, disconnect])

  // Ping périodique pour garder la connexion ouverte
  useEffect(() => {
    if (!isConnected) return undefined
    const pingInterval = setInterval(sendPing, 30000)
    return () => clearInterval(pingInterval)
  }, [isConnected, sendPing])

  const value = {
    socket,
    isConnected,
    isConnecting,
    reconnectAttempt,
    queueItems,
    lastMessage,
    sendMessage,
    sendPaymentValidated,
    sendQueueUpdate,
    connect,
    disconnect,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Custom hook to use WebSocket context
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext)
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  
  return context
}

/**
 * Higher-order component for WebSocket integration
 */
export function withWebSocket(Component) {
  return function WrappedComponent(props) {
    const websocket = useWebSocket()
    return <Component {...props} websocket={websocket} />
  }
}

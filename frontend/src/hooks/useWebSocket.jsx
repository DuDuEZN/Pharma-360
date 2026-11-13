import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useToast } from '@/components/common/Toast'

/**
 * WebSocket Context for Pharmacie 360
 * Real-time communication between Sales and Cashier sessions
 * 
 * FRNT-006: Session Caisse (File d'attente + encaissement)
 */

const WebSocketContext = createContext(null)

// WebSocket URL configuration : même origine que l'application (nginx / Vite proxy).
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
  `${WS_PROTOCOL}//${window.location.host}`

// Endpoints WebSocket : « sales » pour les vendeurs, « cashier » pour la caisse
const WS_ENDPOINTS = {
  sales: '/ws/sales',
  cashier: '/ws/cashier'
}

// Reconnect delay (exponential backoff)
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000]
const MAX_RECONNECT_DELAY = 10000

/**
 * WebSocket Provider Component
 * Manages WebSocket connection for cashier role
 */
export function WebSocketProvider({ children }) {
  const { token, user } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()
  const userRole = user?.role

  // Un admin peut ouvrir la caisse : il se connecte alors au canal caisse.
  // Seller → canal ventes, cashier → canal caisse, manager → aucun canal.
  const endpointRole = userRole === 'admin'
    ? (location.pathname.startsWith('/cashier') ? 'cashier' : 'sales')
    : userRole === 'cashier'
      ? 'cashier'
      : userRole === 'seller'
        ? 'sales'
        : null

  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [queueItems, setQueueItems] = useState([])
  const [lastMessage, setLastMessage] = useState(null)

  // Les refs gardent la connexion stable entre les rendus : si la connexion
  // dépendait d'états React (socket, addToast...), chaque rendu fermerait puis
  // rouvrirait la WebSocket en boucle.
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const shouldReconnectRef = useRef(false)
  const messageQueueRef = useRef([])
  const connectRef = useRef(null)
  const addToastRef = useRef(addToast)
  addToastRef.current = addToast

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Send message through WebSocket (mis en file d'attente si non connecté)
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

  // Send queued messages once the connection is open
  const processMessageQueue = useCallback(() => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const messagesToSend = [...messageQueueRef.current]
    messageQueueRef.current = []
    messagesToSend.forEach((message) => {
      try {
        ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending queued message:', error)
      }
    })
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

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    clearReconnectTimeout()
    const attempt = reconnectAttemptRef.current
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)] || MAX_RECONNECT_DELAY
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current = attempt + 1
      setReconnectAttempt(attempt + 1)
      connectRef.current?.()
    }, delay)
  }, [clearReconnectTimeout])

  // Disconnect WebSocket (fermeture volontaire : pas de reconnexion)
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    clearReconnectTimeout()

    const ws = socketRef.current
    socketRef.current = null
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      try {
        ws.close(1000, 'Normal closure')
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
    }

    setSocket(null)
    setIsConnected(false)
    setIsConnecting(false)
  }, [clearReconnectTimeout])

  // Handle WebSocket connection
  const connect = useCallback(() => {
    if (!token) {
      console.warn('WebSocket: No token available, cannot connect')
      return
    }

    clearReconnectTimeout()

    // Ferme une éventuelle connexion précédente sans déclencher de reconnexion
    const previous = socketRef.current
    if (previous) {
      previous.onopen = null
      previous.onmessage = null
      previous.onerror = null
      previous.onclose = null
      try {
        previous.close(1000, 'Replaced')
      } catch (error) {
        console.error('Error closing previous WebSocket:', error)
      }
      socketRef.current = null
    }

    const endpoint = WS_ENDPOINTS[endpointRole]
    if (!endpoint) {
      setIsConnecting(false)
      return
    }

    const url = new URL(endpoint, WS_BASE_URL)
    url.searchParams.append('token', token)

    shouldReconnectRef.current = true
    setIsConnecting(true)

    try {
      const newSocket = new WebSocket(url.toString())
      socketRef.current = newSocket

      newSocket.onopen = () => {
        if (socketRef.current !== newSocket) return
        reconnectAttemptRef.current = 0
        setReconnectAttempt(0)
        setIsConnected(true)
        setIsConnecting(false)
        setSocket(newSocket)

        addToastRef.current({
          type: 'success',
          title: 'Connexion établie',
          message: 'Connexion WebSocket établie avec succès'
        })

        processMessageQueue()
        sendPing()
      }

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setLastMessage(message)
        
        // Handle different message types
        switch (message.type) {
          case 'new_sale':
            // Add new sale to queue
            setQueueItems(prev => {
              const exists = prev.some(item => item.id === message.data.id)
              if (exists) {
                return prev.map(item => 
                  item.id === message.data.id ? message.data : item
                )
              }
              return [...prev, message.data]
            })
            
            addToastRef.current({
              type: 'info',
              title: 'Nouvelle vente',
              message: `Vente #${message.data.sale_id || message.data.id} ajoutée à la file`
            })
            break

          case 'sale_cancelled':
            // Remove cancelled sale from queue
            setQueueItems(prev => 
              prev.filter(item => item.id !== message.data.sale_id && item.id !== message.data.id)
            )
            
            addToastRef.current({
              type: 'warning',
              title: 'Vente annulée',
              message: `Vente #${message.data.sale_id || message.data.id} a été annulée`
            })
            break

          case 'payment_validated':
            // Remove paid sale from queue
            setQueueItems(prev => 
              prev.filter(item => item.id !== message.data.sale_id && item.id !== message.data.id)
            )
            
            addToastRef.current({
              type: 'success',
              title: 'Paiement validé',
              message: `Vente #${message.data.sale_id || message.data.id} a été payée`
            })
            break

          case 'queue_update':
            // Full queue update
            if (Array.isArray(message.data)) {
              setQueueItems(message.data)
            }
            break

          case 'pong':
            // Ping response - connection is alive
            break

          default:
            console.log('WebSocket: Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

      newSocket.onclose = (event) => {
        if (socketRef.current !== newSocket) return
        socketRef.current = null
        setIsConnected(false)
        setIsConnecting(false)
        setSocket(null)

        if (!shouldReconnectRef.current) return

        // Notification (sauf fermeture normale)
        if (event.code !== 1000) {
          addToastRef.current({
            type: 'error',
            title: 'Connexion perdue',
            message: `Connexion WebSocket perdue (code: ${event.code})`
          })
        }

        // 1000 = normal, 1008 = refus (authentification / rôle) : inutile de réessayer
        if (event.code !== 1000 && event.code !== 1008) {
          scheduleReconnect()
        }
      }

      newSocket.onerror = (error) => {
        // La notification utilisateur est faite dans onclose (évite les doublons)
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setIsConnecting(false)
      scheduleReconnect()
    }
  }, [token, endpointRole, clearReconnectTimeout, processMessageQueue, sendPing, scheduleReconnect])

  connectRef.current = connect

  // Manage the connection according to authentication.
  // Dépendances volontairement limitées à des valeurs primitives.
  // Clé stable de l'utilisateur (primitive) : l'objet `user` peut changer d'identité sans changer d'utilisateur
  const userId = user ? (user.id ?? user.username ?? 'user') : null
  useEffect(() => {
    if (!token || !userId) {
      disconnect()
      return
    }

    // Seuls les rôles disposant d'un canal temps réel se connectent.
    if (endpointRole) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [token, userId, endpointRole, connect, disconnect])

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const pingInterval = setInterval(() => {
      sendPing()
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(pingInterval)
  }, [isConnected, sendPing])

  // Provide context value
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

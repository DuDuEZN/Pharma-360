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
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 
  (window.location.hostname === 'localhost' 
    ? `ws://localhost:8000` 
    : `ws://${window.location.host}`)

// Reconnect delay (exponential backoff)
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000]
const MAX_RECONNECT_DELAY = 10000

/**
 * WebSocket Provider Component
 * Manages WebSocket connection for cashier role
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
  
  const reconnectTimeoutRef = useRef(null)
  const messageQueueRef = useRef([])

  // Get WebSocket endpoint based on role
  const getWebSocketEndpoint = useCallback(() => {
    const endpoints = {
      cashier: '/ws/cashier',
      seller: '/ws/sales',
      admin: '/ws/sales'
    }
    return endpoints[role] || '/ws/cashier'
  }, [role])

  // Build WebSocket URL with token
  const buildWebSocketUrl = useCallback(() => {
    const endpoint = getWebSocketEndpoint()
    if (!token) return null
    
    const url = new URL(endpoint, WS_BASE_URL)
    url.searchParams.append('token', token)
    
    return url.toString()
  }, [token, getWebSocketEndpoint])

  // Process queued messages when connection is established
  const processMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length > 0 && socket?.readyState === WebSocket.OPEN) {
      const messagesToSend = [...messageQueueRef.current]
      messageQueueRef.current = []
      
      messagesToSend.forEach(message => {
        try {
          socket.send(JSON.stringify(message))
        } catch (error) {
          console.error('Error sending queued message:', error)
        }
      })
    }
  }, [socket])

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      messageQueueRef.current.push(message)
      return false
    }
    
    try {
      socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      messageQueueRef.current.push(message)
      return false
    }
  }, [socket])

  // Send payment validation notification
  const sendPaymentValidated = useCallback((saleData) => {
    return sendMessage({
      type: 'payment_validated',
      data: saleData
    })
  }, [sendMessage])

  // Send queue update notification
  const sendQueueUpdate = useCallback((queueData) => {
    return sendMessage({
      type: 'queue_update',
      data: queueData
    })
  }, [sendMessage])

  // Send ping to keep connection alive
  const sendPing = useCallback(() => {
    sendMessage({ type: 'ping' })
  }, [sendMessage])

  // Handle WebSocket connection
  const connect = useCallback(() => {
    const wsUrl = buildWebSocketUrl()
    if (!wsUrl) {
      console.warn('WebSocket: No token available, cannot connect')
      return
    }

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setIsConnecting(true)
    
    try {
      const newSocket = new WebSocket(wsUrl)
      
      newSocket.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setSocket(newSocket)
        setReconnectAttempt(0)
        
        addToast({
          type: 'success',
          title: 'Connexion établie',
          message: 'Connexion WebSocket établie avec succès'
        })
        
        // Process any queued messages
        processMessageQueue()
        
        // Send initial ping
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
              
              addToast({
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
              
              addToast({
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
              
              addToast({
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
        setIsConnected(false)
        setSocket(null)
        
        // Show disconnect notification (except for normal closure)
        if (event.code !== 1000) {
          addToast({
            type: 'error',
            title: 'Connexion perdue',
            message: `Connexion WebSocket perdue (code: ${event.code})`
          })
        }

        // Attempt to reconnect
        if (event.code !== 1000 && event.code !== 1008) {
          scheduleReconnect()
        }
      }

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        addToast({
          type: 'error',
          title: 'Erreur WebSocket',
          message: 'Une erreur est survenue avec la connexion WebSocket'
        })
      }

      setSocket(newSocket)
      
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setIsConnecting(false)
      scheduleReconnect()
    }
  }, [buildWebSocketUrl, processMessageQueue, sendPing, addToast])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)] || MAX_RECONNECT_DELAY
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempt(prev => prev + 1)
      connect()
    }, delay)
  }, [reconnectAttempt, connect])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socket) {
      try {
        socket.close(1000, 'Normal closure')
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
    }
    
    setSocket(null)
    setIsConnected(false)
    setIsConnecting(false)
  }, [socket])

  // Effect to manage WebSocket connection based on authentication
  useEffect(() => {
    if (!token || !user) {
      disconnect()
      return
    }

    // Only connect for cashier or seller roles
    if (user.role === 'cashier' || user.role === 'seller' || user.role === 'admin') {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [token, user, connect, disconnect])

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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import { useAuth } from './useAuth'

/**
 * Alerts Context for Pharmacie 360
 * Real-time stock and expiry alerts management
 * 
 * FRNT-007: Système Alertes (Code couleur péremptions/stocks)
 */

const AlertsContext = createContext(null)

// Alert severity colors
const SEVERITY_COLORS = {
  danger: {
    bg: 'bg-danger-50',
    border: 'border-danger-500',
    text: 'text-danger-600',
    icon: 'bg-danger-100',
    iconText: 'text-danger-600'
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-500',
    text: 'text-warning-600',
    icon: 'bg-warning-100',
    iconText: 'text-warning-600'
  },
  info: {
    bg: 'bg-primary-50',
    border: 'border-primary-500',
    text: 'text-primary-600',
    icon: 'bg-primary-100',
    iconText: 'text-primary-600'
  }
}

// Alert types in French
const ALERT_TYPES_FR = {
  stock: 'Stock',
  expiry: 'Péremption',
  low: 'Stock faible',
  over: 'Stock excédentaire',
  both: 'Stock faible et excédentaire',
  expired: 'Périmé',
  critical: 'Péremption critique',
  expiring_soon: 'Proche péremption'
}

/**
 * Alerts Provider Component
 */
export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    stock: { total: 0, low: 0, over: 0 },
    expiry: { total: 0, expired: 0, critical: 0, expiring_soon: 0 }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(30000) // 30 seconds

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      // Fetch all alerts
      const alertsResponse = await api.get('/alerts')
      const alertsData = alertsResponse.data.alerts || []
      
      // Fetch stats
      const statsResponse = await api.get('/alerts/stats')
      const statsData = statsResponse.data
      
      setAlerts(alertsData)
      setStats(statsData)
      setLastUpdated(new Date())
      
      // Show toast for critical alerts
      const criticalAlerts = alertsData.filter(a => a.severity === 'danger')
      if (criticalAlerts.length > 0) {
        addToast({
          type: 'error',
          title: `${criticalAlerts.length} alerte(s) critique(s)`,
          message: 'Vérifiez les alertes de stock et péremption',
          duration: 10000
        })
      }
      
    } catch (error) {
      console.error('Error fetching alerts:', error)
      addToast({
        type: 'error',
        title: 'Erreur de chargement',
        message: 'Impossible de charger les alertes'
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, addToast])

  // Group alerts by type
  const getAlertsByType = useCallback((type) => {
    return alerts.filter(alert => alert.type === type)
  }, [alerts])

  // Get alerts by severity
  const getAlertsBySeverity = useCallback((severity) => {
    return alerts.filter(alert => alert.severity === severity)
  }, [alerts])

  // Get alerts for a specific product
  const getAlertsForProduct = useCallback((productId) => {
    return alerts.filter(alert => alert.product_id === productId)
  }, [alerts])

  // Check if a product has alerts
  const hasAlerts = useCallback((productId) => {
    return alerts.some(alert => alert.product_id === productId)
  }, [alerts])

  // Get alert count for a product
  const getAlertCountForProduct = useCallback((productId) => {
    return alerts.filter(alert => alert.product_id === productId).length
  }, [alerts])

  // Get severity for a product
  const getProductAlertSeverity = useCallback((productId) => {
    const productAlerts = alerts.filter(alert => alert.product_id === productId)
    if (productAlerts.length === 0) return null
    
    // Return highest severity
    const severityOrder = { danger: 0, warning: 1, info: 2 }
    return productAlerts.reduce((highest, alert) => {
      return severityOrder[alert.severity] < severityOrder[highest.severity] ? alert : highest
    }, productAlerts[0]).severity
  }, [alerts])

  // Dismiss an alert (client-side only)
  const dismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  // Refresh alerts manually
  const refreshAlerts = useCallback(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Set custom polling interval
  const setAlertPolling = useCallback((interval) => {
    setPollingInterval(interval)
  }, [])

  // Get color classes for severity
  const getSeverityColors = useCallback((severity) => {
    return SEVERITY_COLORS[severity] || SEVERITY_COLORS.info
  }, [])

  // Get French label for alert type
  const getAlertTypeLabel = useCallback((type, alertType) => {
    if (alertType && ALERT_TYPES_FR[alertType]) {
      return ALERT_TYPES_FR[alertType]
    }
    return ALERT_TYPES_FR[type] || type
  }, [])

  // Effect to fetch alerts on mount and start polling
  useEffect(() => {
    if (user) {
      fetchAlerts()
      
      // Set up polling
      const interval = setInterval(fetchAlerts, pollingInterval)
      
      return () => clearInterval(interval)
    }
  }, [user, fetchAlerts, pollingInterval])

  // Provide context value
  const value = {
    alerts,
    stats,
    isLoading,
    lastUpdated,
    fetchAlerts,
    refreshAlerts,
    getAlertsByType,
    getAlertsBySeverity,
    getAlertsForProduct,
    hasAlerts,
    getAlertCountForProduct,
    getProductAlertSeverity,
    dismissAlert,
    setAlertPolling,
    getSeverityColors,
    getAlertTypeLabel,
  }

  return (
    <AlertsContext.Provider value={value}>
      {children}
    </AlertsContext.Provider>
  )
}

/**
 * Custom hook to use Alerts context
 */
export function useAlerts() {
  const context = useContext(AlertsContext)
  
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider')
  }
  
  return context
}

/**
 * Higher-order component for Alerts integration
 */
export function withAlerts(Component) {
  return function WrappedComponent(props) {
    const alerts = useAlerts()
    return <Component {...props} alerts={alerts} />
  }
}

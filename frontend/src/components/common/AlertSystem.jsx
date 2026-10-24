import React, { useState, useEffect } from 'react'
import { AlertTriangle, Package, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAlerts } from '../../hooks/useAlerts'
import Button from './Button'
import Alert from './Alert'

/**
 * Alert System Component for Pharmacie 360
 * Displays all active alerts with filtering and grouping
 * 
 * FRNT-007: Système Alertes (Code couleur péremptions/stocks)
 */

function AlertSystem({ onAlertClick, showStats = true, showFilters = true }) {
  const {
    alerts,
    stats,
    isLoading,
    lastUpdated,
    getAlertsByType,
    getAlertsBySeverity,
    getSeverityColors,
    getAlertTypeLabel,
    refreshAlerts
  } = useAlerts()
  
  const [expanded, setExpanded] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTypeFilter, setActiveTypeFilter] = useState('all')

  // Filter alerts based on active filters
  const filteredAlerts = alerts.filter(alert => {
    // Filter by severity
    if (activeFilter !== 'all' && alert.severity !== activeFilter) {
      return false
    }
    
    // Filter by type
    if (activeTypeFilter !== 'all' && alert.type !== activeTypeFilter) {
      return false
    }
    
    return true
  })

  // Group alerts by product
  const alertsByProduct = filteredAlerts.reduce((acc, alert) => {
    const productId = alert.product_id
    if (!acc[productId]) {
      acc[productId] = {
        productId,
        productName: alert.product_name,
        barcode: alert.barcode,
        alerts: []
      }
    }
    acc[productId].alerts.push(alert)
    return acc
  }, {})

  // Get unique product alert groups
  const productAlertGroups = Object.values(alertsByProduct)

  // Sort by highest severity
  const severityOrder = { danger: 0, warning: 1, info: 2 }
  productAlertGroups.sort((a, b) => {
    const aHighest = Math.min(...a.alerts.map(alert => severityOrder[alert.severity] || 3))
    const bHighest = Math.min(...b.alerts.map(alert => severityOrder[alert.severity] || 3))
    return aHighest - bHighest
  })

  // Format time ago
  const formatTimeAgo = (date) => {
    if (!date) return 'Jamais'
    
    const seconds = Math.floor((new Date() - date) / 1000)
    
    if (seconds < 60) return 'À l\'instant'
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`
    return `Il y a ${Math.floor(seconds / 86400)} j`
  }

  // Render alert icon based on type
  const renderAlertIcon = (alert) => {
    const colors = getSeverityColors(alert.severity)
    const Icon = alert.type === 'expiry' ? Calendar : Package
    
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.icon}`}>
        <Icon className={`w-4 h-4 ${colors.iconText}`} />
      </div>
    )
  }

  // Get alert badge color
  const getBadgeColor = (severity) => {
    const colors = {
      danger: 'bg-danger-100 text-danger-600',
      warning: 'bg-warning-100 text-warning-600',
      info: 'bg-primary-100 text-primary-600'
    }
    return colors[severity] || colors.info
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
            <span>Alertes ({stats.total || 0})</span>
          </button>
          
          {showStats && (
            <div className="flex items-center gap-4">
              {stats.critical > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-danger-500 rounded-full"></span>
                  <span className="text-sm text-danger-600 font-medium">{stats.critical} Critique(s)</span>
                </div>
              )}
              {stats.warning > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-warning-500 rounded-full"></span>
                  <span className="text-sm text-warning-600 font-medium">{stats.warning} Avertissement(s)</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showFilters && (
            <>
              {/* Type filter */}
              <select
                value={activeTypeFilter}
                onChange={(e) => setActiveTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous types</option>
                <option value="stock">Stock</option>
                <option value="expiry">Péremption</option>
              </select>
              
              {/* Severity filter */}
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous niveaux</option>
                <option value="danger">Critique</option>
                <option value="warning">Avertissement</option>
                <option value="info">Info</option>
              </select>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAlerts}
            isLoading={isLoading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Alerts list */}
      {expanded && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="animate-spin h-5 w-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p>Chargement des alertes...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <Alert type="info" icon={<AlertTriangle className="w-4 h-4" />}>
              Aucune alerte active
            </Alert>
          ) : (
            <div className="space-y-2">
              {productAlertGroups.map((group) => {
                const highestSeverity = group.alerts.reduce((highest, alert) => {
                  return severityOrder[alert.severity] < severityOrder[highest.severity] ? alert : highest
                }, group.alerts[0]).severity
                
                const colors = getSeverityColors(highestSeverity)
                
                return (
                  <div
                    key={group.productId}
                    className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}
                    onClick={() => onAlertClick && onAlertClick(group.productId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {renderAlertIcon(group.alerts[0])}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{group.productName}</h4>
                          {group.barcode && (
                            <span className="text-xs text-gray-500">[{group.barcode}]</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(highestSeverity)}`}>
                            {group.alerts.length} alerte(s)
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {group.alerts.map((alert, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${{
                                danger: 'bg-danger-500',
                                warning: 'bg-warning-500',
                                info: 'bg-primary-500'
                              }[alert.severity]}`}>
                              </span>
                              <span className={`font-medium ${{
                                danger: 'text-danger-600',
                                warning: 'text-warning-600',
                                info: 'text-primary-600'
                              }[alert.severity]}`}>
                                {getAlertTypeLabel(alert.type, alert.details?.alert_type)}:
                              </span>
                              <span>{alert.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {lastUpdated && (
            <p className="text-xs text-gray-400 text-center">
              Dernière mise à jour: {formatTimeAgo(lastUpdated)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Alert Badge Component - Small badge showing alert count
 */
export function AlertBadge({ productId, size = 'md' }) {
  const { getAlertCountForProduct, getProductAlertSeverity } = useAlerts()
  
  const count = getAlertCountForProduct(productId)
  const severity = getProductAlertSeverity(productId)
  
  if (count === 0) return null
  
  const badgeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm'
  }
  
  const severityClasses = {
    danger: 'bg-danger-500',
    warning: 'bg-warning-500',
    info: 'bg-primary-500'
  }
  
  return (
    <div className={`rounded-full flex items-center justify-center text-white font-bold ${badgeClasses[size]} ${severityClasses[severity || 'info']}`}>
      {count}
    </div>
  )
}

/**
 * Alert Summary Component - Compact summary of all alerts
 */
export function AlertSummary() {
  const { stats, isLoading } = useAlerts()
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>Chargement...</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-4">
      {stats.critical > 0 && (
        <div className="flex items-center gap-1 text-danger-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{stats.critical} Critique</span>
        </div>
      )}
      {stats.warning > 0 && (
        <div className="flex items-center gap-1 text-warning-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{stats.warning} Avertissement</span>
        </div>
      )}
      {stats.total === 0 && (
        <span className="text-sm text-gray-500">Aucune alerte</span>
      )}
    </div>
  )
}

export default AlertSystem

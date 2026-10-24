import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Alert Component for Pharmacie 360
 * Displays contextual feedback messages
 * 
 * Types: info, success, warning, error
 * 
 * FRNT-002: Composants Communs
 */
function Alert({
  type = 'info',
  title,
  message,
  onClose,
  showIcon = true,
  className,
  children,
  ...props
}) {
  // Define alert configurations
  const alertConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      textColor: 'text-primary-800',
      iconColor: 'text-primary-600',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      textColor: 'text-success-800',
      iconColor: 'text-success-600',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      textColor: 'text-warning-800',
      iconColor: 'text-warning-600',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-danger-50',
      borderColor: 'border-danger-200',
      textColor: 'text-danger-800',
      iconColor: 'text-danger-600',
    },
  }

  const config = alertConfig[type] || alertConfig.info
  const Icon = config.icon

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'rounded-lg border p-4 flex gap-3',
          config.bgColor,
          config.borderColor,
          className
        )
      )}
      {...props}
    >
      {/* Icon */}
      {showIcon && (
        <Icon className={clsx('w-5 h-5 flex-shrink-0', config.iconColor)} />
      )}
      
      {/* Content */}
      <div className="flex-1">
        {title && (
          <h4 className={clsx('font-semibold mb-1', config.textColor)}>
            {title}
          </h4>
        )}
        <div className={clsx('text-sm', config.textColor)}>
          {message || children}
        </div>
      </div>
      
      {/* Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={clsx(
            'p-1 rounded hover:bg-black/5 transition-colors',
            config.textColor
          )}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Convenience components for each type
export function InfoAlert({ title, message, onClose, className, children }) {
  return (
    <Alert type="info" title={title} message={message} onClose={onClose} className={className}>
      {children}
    </Alert>
  )
}

export function SuccessAlert({ title, message, onClose, className, children }) {
  return (
    <Alert type="success" title={title} message={message} onClose={onClose} className={className}>
      {children}
    </Alert>
  )
}

export function WarningAlert({ title, message, onClose, className, children }) {
  return (
    <Alert type="warning" title={title} message={message} onClose={onClose} className={className}>
      {children}
    </Alert>
  )
}

export function ErrorAlert({ title, message, onClose, className, children }) {
  return (
    <Alert type="error" title={title} message={message} onClose={onClose} className={className}>
      {children}
    </Alert>
  )
}

export default Alert

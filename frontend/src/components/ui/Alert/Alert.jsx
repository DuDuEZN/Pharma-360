import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

const Alert = forwardRef(({ 
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props 
}, ref) => {
  const variants = {
    info: {
      container: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-500/10 dark:border-primary-500/25 dark:text-primary-200',
      icon: <Info className="h-5 w-5 text-primary-500 dark:text-primary-400" />
    },
    success: {
      container: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-500/10 dark:border-success-500/25 dark:text-success-200',
      icon: <CheckCircle className="h-5 w-5 text-success-500 dark:text-success-400" />
    },
    warning: {
      container: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-500/10 dark:border-warning-500/25 dark:text-warning-200',
      icon: <AlertTriangle className="h-5 w-5 text-warning-500 dark:text-warning-400" />
    },
    error: {
      container: 'bg-danger-50 border-danger-200 text-danger-800 dark:bg-danger-500/10 dark:border-danger-500/25 dark:text-danger-200',
      icon: <AlertCircle className="h-5 w-5 text-danger-500 dark:text-danger-400" />
    }
  }

  // 'danger' et 'destructive' sont des alias de 'error' ; variante inconnue -> 'info'
  variants.danger = variants.error
  variants.destructive = variants.error
  const { container, icon } = variants[variant] ?? variants.info

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative flex gap-3 rounded-lg border p-4',
        container,
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        {title && <h5 className="font-medium mb-1">{title}</h5>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

Alert.displayName = 'Alert'

export { Alert }

import React, { forwardRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react'

const Toast = forwardRef(({ 
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right',
  className
}, ref) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.(id)
    }, 300)
  }, [id, onClose])

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, handleClose])

  if (!isVisible) return null

  const icons = {
    info: <Info className="h-5 w-5 text-primary-500" />,
    success: <CheckCircle className="h-5 w-5 text-success-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning-500" />,
    error: <XCircle className="h-5 w-5 text-danger-500" />
  }

  const variants = {
    info: 'bg-primary-50 border-primary-200 text-primary-800',
    success: 'bg-success-50 border-success-200 text-success-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    error: 'bg-danger-50 border-danger-200 text-danger-800'
  }

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  return createPortal(
    <div
      ref={ref}
      className={cn(
        'fixed z-50 flex items-start justify-end pointer-events-none',
        positions[position]
      )}
    >
      <div
        className={cn(
          'relative flex items-center gap-3 rounded-lg border p-4 shadow-lg',
          'animate-slide-in-right pointer-events-auto',
          isExiting && 'animate-slide-out-right',
          variants[type],
          className
        )}
        role="alert"
      >
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          type="button"
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  )
})

Toast.displayName = 'Toast'

// Toast Container
const ToastContainer = ({ 
  toasts = [], 
  position = 'top-right',
  onClose
}) => {
  return (
    <div className={cn(
      'fixed z-50 pointer-events-none',
      position === 'top-right' && 'top-4 right-4',
      position === 'top-left' && 'top-4 left-4',
      position === 'bottom-right' && 'bottom-4 right-4',
      position === 'bottom-left' && 'bottom-4 left-4',
      (position === 'top-center' || position === 'bottom-center') && 'left-1/2 transform -translate-x-1/2',
      position === 'top-center' && 'top-4',
      position === 'bottom-center' && 'bottom-4'
    )}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          position={position}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

// Toast Provider
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  )
}

// Hook for using toasts
const useToast = () => {
  const addToast = (toast) => {
    // This will be called through the provider
    return toast
  }
  
  return { addToast }
}

export { Toast, ToastContainer, ToastProvider, useToast }

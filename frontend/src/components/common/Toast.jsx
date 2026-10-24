import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  
  const addToast = useCallback((toast) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { ...toast, id }])
    
    // Auto-remove after duration (default 5000ms)
    if (toast.duration !== false) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, toast.duration || 5000)
    }
  }, [])
  
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])
  
  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[100] space-y-2 w-80">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  }
  
  const Icon = icons[toast.type] || Info
  
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg animate-in slide-in-from-top-2 duration-300',
        {
          'bg-success-50 border border-success-200': toast.type === 'success',
          'bg-danger-50 border border-danger-200': toast.type === 'error',
          'bg-warning-50 border border-warning-200': toast.type === 'warning',
          'bg-primary-50 border border-primary-200': toast.type === 'info',
        }
      )}
    >
      <Icon
        className={clsx({
          'text-success-600': toast.type === 'success',
          'text-danger-600': toast.type === 'error',
          'text-warning-600': toast.type === 'warning',
          'text-primary-600': toast.type === 'info',
        })}
        size={20}
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
        aria-label="Fermer"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function Toaster() {
  return (
    <ToastProvider>
      <ToastConsumer />
    </ToastProvider>
  )
}

function ToastConsumer() {
  const { addToast } = useToast()
  
  // This component exists to provide the toast function globally
  window.toast = addToast
  
  return null
}

export { ToastProvider }

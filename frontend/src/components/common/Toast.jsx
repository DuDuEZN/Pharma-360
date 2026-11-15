import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

const ToastContext = createContext()

function ToastProvider({ children }) {
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
        'flex items-start gap-3 rounded-2xl border p-4 shadow-apple-lg backdrop-blur-xl animate-slide-up',
        {
          'bg-success-50/95 border-success-200/70 dark:bg-success-900/40 dark:border-success-500/30': toast.type === 'success',
          'bg-danger-50/95 border-danger-200/70 dark:bg-danger-900/40 dark:border-danger-500/30': toast.type === 'error',
          'bg-warning-50/95 border-warning-200/70 dark:bg-warning-900/40 dark:border-warning-500/30': toast.type === 'warning',
          'bg-primary-50/95 border-primary-200/70 dark:bg-primary-900/40 dark:border-primary-500/30': toast.type === 'info',
        }
      )}
    >
      <Icon
        className={clsx({
          'text-success-600 dark:text-success-400': toast.type === 'success',
          'text-danger-600 dark:text-danger-400': toast.type === 'error',
          'text-warning-600 dark:text-warning-400': toast.type === 'warning',
          'text-primary-600 dark:text-primary-400': toast.type === 'info',
        })}
        size={20}
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-secondary-900 dark:text-white">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-sm text-secondary-600 dark:text-secondary-300">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="-mr-1 -mt-1 rounded-full p-1 text-secondary-400 transition-colors hover:bg-black/5 hover:text-secondary-600 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Fermer"
      >
        <X size={16} />
      </button>
    </div>
  )
}

function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function Toaster() {
  return <ToastConsumer />
    //<ToastProvider>
      
    //</ToastProvider>
  
}

function ToastConsumer() {
  const { addToast } = useToast()
  
  // This component exists to provide the toast function globally
  window.toast = addToast
  
  return null
}

export { ToastProvider, useToast }
export default ToastProvider

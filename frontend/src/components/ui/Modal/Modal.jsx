import React, { forwardRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '../Button'

const Modal = forwardRef(({ 
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className
}, ref) => {
  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape' && isOpen) {
      onClose()
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/25 backdrop-blur-md animate-fade-in" />
      
      {/* Modal */}
      <div
        ref={ref}
        className={cn(
          'relative w-full max-h-[92vh] overflow-y-auto rounded-3xl border border-black/[0.06] bg-white/95 shadow-apple-lg backdrop-blur-2xl animate-slide-up dark:border-white/10 dark:bg-[#1c1c1e]/95',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-black/[0.06] p-6 dark:border-white/10">
            {title && (
              <h2 className="font-display text-xl font-semibold tracking-tight text-secondary-900 dark:text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 -mr-2 -mt-1"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
})

Modal.displayName = 'Modal'

export { Modal }

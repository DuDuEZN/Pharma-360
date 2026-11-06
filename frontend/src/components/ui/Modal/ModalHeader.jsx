import React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '../Button'

const ModalHeader = ({ 
  className,
  children,
  onClose,
  showCloseButton = true,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-6 border-b border-gray-200',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && onClose && (
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
  )
}

ModalHeader.displayName = 'ModalHeader'

export { ModalHeader }

import React from 'react'
import { cn } from '@/lib/utils'

const ModalFooter = ({ 
  className,
  children,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 p-6 border-t border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

ModalFooter.displayName = 'ModalFooter'

export { ModalFooter }

import React from 'react'
import { cn } from '@/lib/utils'

const ModalBody = ({ 
  className,
  children,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

ModalBody.displayName = 'ModalBody'

export { ModalBody }

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
        'flex items-center justify-end gap-3 border-t border-black/[0.06] p-6 dark:border-white/10',
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

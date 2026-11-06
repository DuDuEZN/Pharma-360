import React from 'react'
import { cn } from '@/lib/utils'

const SelectContent = React.forwardRef(({
  className,
  children,
  isOpen,
  onClose,
  ...props
}, ref) => {
  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-full bg-white rounded-lg shadow-lg border border-gray-200 mt-1',
        'max-h-60 overflow-y-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

SelectContent.displayName = 'SelectContent'

export { SelectContent }

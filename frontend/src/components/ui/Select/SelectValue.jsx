import React from 'react'
import { cn } from '@/lib/utils'

const SelectValue = React.forwardRef(({
  className,
  children,
  placeholder = 'Sélectionner une option',
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'text-gray-500',
        className
      )}
      {...props}
    >
      {children || placeholder}
    </span>
  )
})

SelectValue.displayName = 'SelectValue'

export { SelectValue }

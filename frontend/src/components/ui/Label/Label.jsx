import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Label = forwardRef(({ 
  className,
  children,
  htmlFor,
  required = false,
  ...props 
}, ref) => (
  <label
    ref={ref}
    htmlFor={htmlFor}
    className={cn(
      'block text-sm font-medium text-gray-700',
      required && 'after:content-["*"] after:text-danger-500 after:ml-1',
      className
    )}
    {...props}
  >
    {children}
  </label>
))

Label.displayName = 'Label'

export { Label }

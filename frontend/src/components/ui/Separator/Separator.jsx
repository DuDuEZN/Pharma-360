import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Separator = forwardRef(({ 
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props 
}, ref) => {
  if (orientation === 'horizontal') {
    return (
      <div
        ref={ref}
        role={decorative ? 'separator' : undefined}
        aria-orientation="horizontal"
        className={cn('h-[1px] w-full bg-gray-200', className)}
        {...props}
      />
    )
  }
  
  return (
    <div
      ref={ref}
      role={decorative ? 'separator' : undefined}
      aria-orientation="vertical"
      className={cn('h-full w-[1px] bg-gray-200', className)}
      {...props}
    />
  )
})

Separator.displayName = 'Separator'

export { Separator }

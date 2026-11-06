import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const SelectItem = React.forwardRef(({
  className,
  value,
  children,
  isSelected,
  onClick,
  disabled = false,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      className={cn(
        'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100',
        'flex items-center justify-between',
        { 'bg-gray-100': isSelected },
        { 'text-gray-400 cursor-not-allowed': disabled },
        className
      )}
      onClick={() => !disabled && onClick?.(value)}
      {...props}
    >
      <span>{children}</span>
      {isSelected && <Check className="h-4 w-4 text-primary-600" />}
    </div>
  )
})

SelectItem.displayName = 'SelectItem'

export { SelectItem }

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

const SelectTrigger = React.forwardRef(({
  className,
  children,
  value,
  onClick,
  disabled = false,
  error,
  clearable = false,
  onClear,
  isOpen,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
        error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <span className="flex-1 text-left">
        {children}
      </span>
      <div className="flex items-center gap-1">
        {clearable && value && (
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded"
            onClick={(e) => {
              e.stopPropagation()
              onClear?.()
            }}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </button>
  )
})

SelectTrigger.displayName = 'SelectTrigger'

export { SelectTrigger }

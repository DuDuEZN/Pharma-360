import React, { forwardRef, useState, isValidElement, useId } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(({
  className,
  type = 'text',
  label,
  error,
  hint,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  id,
  ...props
}, ref) => {
  const inputId = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id || inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isValidElement(LeftIcon) ? LeftIcon : <LeftIcon className="h-5 w-5 text-gray-400" />}
          </div>
        )}
        <input
          ref={ref}
          id={id || inputId}
          type={inputType}
          className={cn(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-gray-400',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300',
            LeftIcon && 'pl-10',
            (RightIcon || isPassword) && 'pr-10',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
        {RightIcon && !isPassword && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {isValidElement(RightIcon) ? RightIcon : <RightIcon className="h-5 w-5 text-gray-400" />}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export { Input }

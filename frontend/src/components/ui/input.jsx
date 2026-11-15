import * as React from 'react'
import { cn } from '@/lib/utils.js'

const baseClassName =
  'flex h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2 text-sm text-secondary-900 shadow-apple-sm transition-all duration-200 ease-apple placeholder:text-secondary-400 hover:border-black/20 focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/15 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-secondary-500 dark:hover:border-white/20'

// Accepte aussi bien un élément (<Icon />) qu'une référence de composant (Icon),
// ce qui évite l'erreur React « Objects are not valid as a React child ».
const renderIcon = (icon) => {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon

  if (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof)) {
    const Icon = icon
    return <Icon className="h-4 w-4" />
  }

  return icon
}

const Input = React.forwardRef(
  ({ className, type, leftIcon, rightIcon, label, hint, error, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const hasIcons = Boolean(leftIcon || rightIcon)

    const control = hasIcons ? (
      <div className="relative w-full">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {renderIcon(leftIcon)}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            baseClassName,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            {renderIcon(rightIcon)}
          </div>
        )}
      </div>
    ) : (
      <input
        id={inputId}
        type={type}
        ref={ref}
        className={cn(baseClassName, className)}
        {...props}
      />
    )

    if (!label && !error && !hint) return control

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-secondary-600 mb-1.5 dark:text-secondary-300">
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        {control}
        {error ? (
          <p className="mt-1 text-sm text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-sm text-gray-500">{hint}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

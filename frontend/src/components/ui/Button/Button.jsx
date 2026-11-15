import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const Button = forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 ease-apple focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-primary-600 text-white shadow-apple-sm hover:bg-primary-500',
    secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
    outline: 'border border-black/10 bg-white/70 text-secondary-900 shadow-apple-sm hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
    ghost: 'bg-transparent text-secondary-700 hover:bg-black/[0.05] dark:text-secondary-200 dark:hover:bg-white/10',
    danger: 'bg-danger-500 text-white shadow-apple-sm hover:brightness-105',
    success: 'bg-success-500 text-white shadow-apple-sm hover:brightness-105',
    warning: 'bg-warning-500 text-white shadow-apple-sm hover:brightness-105',
    link: 'bg-transparent text-primary-600 hover:text-primary-700 hover:underline p-0 dark:text-primary-400'
  }
  
  const sizes = {
    sm: 'h-9 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-7 text-[15px] gap-2.5'
  }
  
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {children}
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className="h-4 w-4" />}
          {children}
          {RightIcon && <RightIcon className="h-4 w-4" />}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }

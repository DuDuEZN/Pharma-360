import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Spinner = forwardRef(({ 
  className,
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  ...props 
}, ref) => {
  const sizes = {
    xs: 'h-3 w-3 border-2',
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-3',
    lg: 'h-8 w-8 border-4',
    xl: 'h-12 w-12 border-4',
  };

  const variants = {
    primary: 'border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400',
    secondary: 'border-secondary-200 border-t-secondary-600 dark:border-secondary-800 dark:border-t-secondary-400',
    success: 'border-success-200 border-t-success-600 dark:border-success-800 dark:border-t-success-400',
    warning: 'border-warning-200 border-t-warning-600 dark:border-warning-800 dark:border-t-warning-400',
    danger: 'border-danger-200 border-t-danger-600 dark:border-danger-800 dark:border-t-danger-400',
    info: 'border-info-200 border-t-info-600 dark:border-info-800 dark:border-t-info-400',
    white: 'border-white border-t-transparent',
    black: 'border-gray-900 border-t-transparent dark:border-white dark:border-t-transparent',
  };

  return (
    <div
      ref={ref}
      role="status"
      aria-label={label}
      className={cn('flex items-center justify-center gap-2', className)}
      {...props}
    >
      <div
        className={cn(
          'animate-spin rounded-full',
          sizes[size],
          variants[variant],
        )}
      />
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
});

Spinner.displayName = 'Spinner';

const LoadingOverlay = forwardRef(({ 
  className,
  children,
  isLoading = true,
  spinnerProps,
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      {...props}
    >
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <Spinner {...spinnerProps} />
        </div>
      )}
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export { Spinner, LoadingOverlay };

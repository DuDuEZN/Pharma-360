import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Progress = forwardRef(({ 
  className,
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  ...props 
}, ref) => {
  const sizes = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
    xl: 'h-8',
  };

  const variants = {
    primary: 'bg-primary-600',
    secondary: 'bg-secondary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    danger: 'bg-danger-600',
  };

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">{label || 'Progress'}</span>
          <span className="text-sm font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        ref={ref}
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          sizes[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

Progress.displayName = 'Progress';

export { Progress };

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Textarea = forwardRef(({ 
  className, 
  disabled = false,
  error = false,
  label,
  labelClassName,
  hint,
  rows = 3,
  id,
  ...props 
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-gray-700 dark:text-gray-300',
            labelClassName
          )}
        >
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        disabled={disabled}
        className={cn(
          'block w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-primary-500 dark:focus:ring-primary-500',
          { 'border-red-500 dark:border-red-500': error },
          { 'border-gray-300 dark:border-gray-600': !error },
          className
        )}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;

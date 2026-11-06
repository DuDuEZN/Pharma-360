import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useFormContext } from './FormContext';

const FormField = forwardRef(({ name, label, error, hint, required, className, children, ...props }, ref) => {
  const formContext = useFormContext();
  
  const fieldError = error || formContext?.errors?.[name];
  const isTouched = formContext?.touched?.[name];
  const showError = isTouched && fieldError;

  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      
      {children}
      
      {showError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {fieldError}
        </p>
      )}
      
      {hint && !showError && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;

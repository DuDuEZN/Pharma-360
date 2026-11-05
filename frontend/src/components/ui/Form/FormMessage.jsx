import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Alert } from '../Alert';

const FormMessage = forwardRef(({ type = 'error', message, className, ...props }, ref) => {
  if (!message) return null;

  return (
    <div ref={ref} className={cn('text-sm', className)} {...props}>
      {type === 'error' && (
        <p className="text-red-600 dark:text-red-400" role="alert">
          {message}
        </p>
      )}
      {type === 'success' && (
        <p className="text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
      {type === 'warning' && (
        <p className="text-yellow-600 dark:text-yellow-400">
          {message}
        </p>
      )}
      {type === 'info' && (
        <p className="text-blue-600 dark:text-blue-400">
          {message}
        </p>
      )}
    </div>
  );
});

FormMessage.displayName = 'FormMessage';

export default FormMessage;

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const FormItem = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  );
});

FormItem.displayName = 'FormItem';

export default FormItem;

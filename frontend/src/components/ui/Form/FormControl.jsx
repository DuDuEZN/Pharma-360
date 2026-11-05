import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const FormControl = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('relative', className)} {...props}>
      {children}
    </div>
  );
});

FormControl.displayName = 'FormControl';

export default FormControl;

import React, { forwardRef } from 'react';
import { Label } from '../Label';
import { cn } from '../../lib/utils';

const FormLabel = forwardRef(({ className, required, children, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500" aria-hidden="true">*</span>}
    </Label>
  );
});

FormLabel.displayName = 'FormLabel';

export default FormLabel;

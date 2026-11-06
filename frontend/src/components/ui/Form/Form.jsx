import React, { forwardRef } from 'react';
import { useFormContext } from './FormContext';
import { cn } from '@/lib/utils';

const Form = forwardRef(({ children, className, onSubmit, ...props }, ref) => {
  const formContext = useFormContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formContext?.handleSubmit) {
      await formContext.handleSubmit(e);
    }
    if (onSubmit) {
      await onSubmit(e);
    }
  };

  return (
    <form
      ref={ref}
      className={cn('space-y-4', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
});

Form.displayName = 'Form';

export default Form;

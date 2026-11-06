import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Radio = forwardRef(({ 
  className, 
  checked = false, 
  disabled = false,
  onChange,
  id,
  label,
  labelClassName,
  value,
  ...props 
}, ref) => {
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        id={id}
        type="radio"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className={cn(
          'h-4 w-4 border border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-primary-500 dark:focus:ring-primary-500',
          className
        )}
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none cursor-pointer select-none',
            { 'cursor-not-allowed opacity-50': disabled },
            labelClassName
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

const RadioGroup = forwardRef(({ 
  className, 
  disabled = false,
  orientation = 'vertical',
  value,
  onChange,
  children,
  ...props 
}, ref) => {
  const handleChange = (e) => {
    if (!disabled) {
      onChange?.(e);
    }
  };

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          checked: child.props.value === value,
          disabled: disabled || child.props.disabled,
          onChange: handleChange,
        });
      }
      return child;
    });
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      className={cn(
        { 'flex gap-4': orientation === 'horizontal' },
        { 'flex flex-col gap-2': orientation === 'vertical' },
        className
      )}
      {...props}
    >
      {renderChildren()}
    </div>
  );
});

RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup };

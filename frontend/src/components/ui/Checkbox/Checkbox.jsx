import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

const Checkbox = forwardRef(({ 
  className, 
  checked = false, 
  disabled = false,
  indeterminate = false,
  onChange,
  id,
  label,
  labelClassName,
  ...props 
}, ref) => {
  const checkboxRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => checkboxRef.current?.focus(),
    check: () => checkboxRef.current?.click(),
    get checked() { return checkboxRef.current?.checked; },
  }));

  const handleChange = (e) => {
    if (disabled) return;
    if (indeterminate) {
      // If indeterminate, set to true
      onChange?.({ target: { checked: true, id, name: props.name } });
    } else {
      onChange?.(e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={checkboxRef}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className={cn(
          'h-4 w-4 rounded border border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-primary-500 dark:focus:ring-primary-500 dark:focus:ring-offset-gray-900',
          { 'bg-gray-100 dark:bg-gray-700': indeterminate },
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;

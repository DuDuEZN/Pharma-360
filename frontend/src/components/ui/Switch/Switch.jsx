import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

const Switch = forwardRef(({ 
  className, 
  checked = false, 
  disabled = false,
  onChange,
  onCheckedChange,
  id,
  label,
  labelClassName,
  size = 'md',
  ...props 
}, ref) => {
  const switchRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => switchRef.current?.focus(),
    toggle: () => switchRef.current?.click(),
    get checked() { return switchRef.current?.checked; },
  }));

  const sizes = {
    sm: 'h-5 w-9 text-xs',
    md: 'h-6 w-11 text-sm',
    lg: 'h-7 w-14 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <button
        ref={switchRef}
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          const next = !checked
          onChange?.({ target: { checked: next, id, name: props.name } })
          onCheckedChange?.(next)
        }}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          { 'bg-gray-200 dark:bg-gray-700': !checked },
          { 'bg-primary-600 dark:bg-primary-500': checked },
          sizes[size],
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block rounded-full bg-white shadow-md transform transition-transform',
            { 'translate-x-1': checked && size === 'sm' },
            { 'translate-x-1': checked && size === 'md' },
            { 'translate-x-2': checked && size === 'lg' },
            { 'w-3 h-3': size === 'sm' },
            { 'w-4 h-4': size === 'md' },
            { 'w-5 h-5': size === 'lg' },
          )}
        />
      </button>
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

Switch.displayName = 'Switch';

export default Switch;

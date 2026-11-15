import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext();

const Tabs = ({ 
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleValueChange = useCallback((newValue) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className, children, ...props }) => {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center justify-start rounded-xl border border-black/[0.06] bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.06]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const TabsTrigger = ({ 
  value,
  className,
  disabled,
  children,
  ...props 
}) => {
  const { value: currentValue, onValueChange } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`tab-content-${value}`}
      data-state={isActive ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={() => !disabled && onValueChange?.(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-200 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:pointer-events-none disabled:opacity-50',
        { 'bg-white text-secondary-900 shadow-apple-sm dark:bg-white/15 dark:text-white': isActive },
        { 'text-secondary-500 hover:text-secondary-800 dark:text-secondary-400 dark:hover:text-white': !isActive },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ 
  value,
  className,
  children,
  ...props 
}) => {
  const { value: currentValue } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-trigger-${value}`}
      id={`tab-content-${value}`}
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        { 'hidden': !isActive },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };

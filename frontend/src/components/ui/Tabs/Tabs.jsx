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
        'inline-flex items-center justify-start rounded-lg bg-gray-100 dark:bg-gray-800 p-1',
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
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        { 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm': isActive },
        { 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700': !isActive },
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

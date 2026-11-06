import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const AccordionContext = createContext({
  multiple: false,
  value: [],
  onChange: () => {},
});

const Accordion = ({ 
  className,
  multiple = false,
  defaultValue = [],
  value,
  onChange,
  children,
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  const controlledValue = value !== undefined ? value : internalValue;
  
  const handleChange = (newValue) => {
    if (multiple) {
      const newValues = controlledValue.includes(newValue)
        ? controlledValue.filter(v => v !== newValue)
        : [...controlledValue, newValue];
      onChange?.(newValues);
      setInternalValue(newValues);
    } else {
      const newValues = controlledValue.includes(newValue) ? [] : [newValue];
      onChange?.(newValues);
      setInternalValue(newValues);
    }
  };

  return (
    <AccordionContext.Provider value={{ multiple, value: controlledValue, onChange: handleChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

Accordion.displayName = 'Accordion';

const AccordionItem = ({ 
  className,
  value,
  children,
  ...props 
}) => {
  const { value: contextValue, onChange } = useContext(AccordionContext);
  const isOpen = contextValue.includes(value);

  return (
    <div
      className={cn('border-b border-gray-200 dark:border-gray-700', className)}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            value,
            isOpen,
            onToggle: () => onChange(value),
          });
        }
        return child;
      })}
    </div>
  );
};

AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = ({ 
  className,
  value,
  isOpen,
  onToggle,
  children,
  ...props 
}) => {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between py-4 text-left font-medium',
        'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200',
        className
      )}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
};

AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = ({ 
  className,
  value,
  isOpen,
  children,
  ...props 
}) => {
  return (
    <div
      id={`accordion-content-${value}`}
      className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'max-h-[1000px] py-4' : 'max-h-0'
      )}
      aria-hidden={!isOpen}
      {...props}
    >
      <div className={cn('text-gray-600 dark:text-gray-300', className)}>
        {children}
      </div>
    </div>
  );
};

AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

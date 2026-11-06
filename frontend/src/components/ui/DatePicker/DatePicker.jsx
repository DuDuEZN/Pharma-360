import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn, formatDate, parseDate } from '@/lib/utils';
import { Button } from '../Button';
import { Input } from '../Input';

const DatePickerContext = React.createContext();

const DatePicker = forwardRef(({
  className,
  children,
  value,
  onChange,
  dateFormat = 'yyyy-MM-dd',
  disabled = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [viewDate, setViewDate] = useState(new Date());
  const [triggerRef, setTriggerRef] = useState(null);
  const [contentRef, setContentRef] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    onChange?.(date);
    setIsOpen(false);
  };

  const updatePosition = () => {
    if (!triggerRef || !contentRef || !isOpen) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const contentRect = contentRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.bottom + 4;
    let left = triggerRect.left;

    if (triggerRect.bottom + contentRect.height > viewportHeight) {
      top = triggerRect.top - contentRect.height - 4;
    }

    if (triggerRect.left + contentRect.width > viewportWidth) {
      left = triggerRect.right - contentRect.width;
    }

    top = Math.max(4, Math.min(top, viewportHeight - contentRect.height - 4));
    left = Math.max(4, Math.min(left, viewportWidth - contentRect.width - 4));

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && triggerRef && !triggerRef.contains(e.target) && 
          contentRef && !contentRef.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, triggerRef, contentRef]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const contextValue = {
    isOpen,
    setIsOpen,
    selectedDate,
    setSelectedDate,
    viewDate,
    setViewDate,
    handleDateSelect,
    triggerRef: setTriggerRef,
    contentRef: setContentRef,
    position,
    dateFormat,
    disabled,
  };

  return (
    <DatePickerContext.Provider value={contextValue}>
      <span ref={ref} className={cn('inline-block', className)} {...props}>
        {children}
      </span>
    </DatePickerContext.Provider>
  );
});

DatePicker.displayName = 'DatePicker';

const DatePickerTrigger = forwardRef(({ className, children, asChild, ...props }, ref) => {
  const { setIsOpen, triggerRef, selectedDate, dateFormat } = React.useContext(DatePickerContext);

  if (asChild) {
    return React.cloneElement(children, {
      ref: (node) => {
        triggerRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      onClick: (e) => {
        children.props.onClick?.(e);
        setIsOpen?.(true);
        e.stopPropagation();
      },
      className: cn(className, children.props.className),
      value: selectedDate ? formatDate(selectedDate, dateFormat) : '',
      ...props,
    });
  }

  return (
    <Input
      ref={(node) => {
        triggerRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type="text"
      readOnly
      value={selectedDate ? formatDate(selectedDate, dateFormat) : ''}
      onClick={(e) => {
        setIsOpen?.(true);
        e.stopPropagation();
      }}
      className={cn(className)}
      {...props}
    />
  );
});

DatePickerTrigger.displayName = 'DatePickerTrigger';

const DatePickerContent = forwardRef(({ className, ...props }, ref) => {
  const { isOpen, contentRef, position } = React.useContext(DatePickerContext);

  if (!isOpen) return null;

  const renderContent = () => (
    <div
      ref={(node) => {
        contentRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="dialog"
      aria-modal="true"
      className={cn(
        'absolute z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-3',
        className
      )}
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <Calendar />
    </div>
  );

  return createPortal(renderContent(), document.body);
});

DatePickerContent.displayName = 'DatePickerContent';

const Calendar = () => {
  const {
    selectedDate,
    viewDate,
    setViewDate,
    handleDateSelect,
    dateFormat,
  } = React.useContext(DatePickerContext);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    const date = new Date(year, month, day);
    handleDateSelect(date);
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const renderDays = () => {
    const days = [];

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(
        <button
          key={`prev-${i}`}
          type="button"
          className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 cursor-default"
          disabled
        >
          {daysInPrevMonth - i}
        </button>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = isSameDay(date, selectedDate);
      const isTodayDate = isToday(date);

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleDayClick(day)}
          className={cn(
            'w-8 h-8 flex items-center justify-center text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            { 'bg-primary-600 text-white dark:bg-primary-500': isSelected },
            { 'text-primary-600 dark:text-primary-400 font-bold': isTodayDate && !isSelected },
            { 'text-gray-900 dark:text-white': !isSelected && !isTodayDate }
          )}
        >
          {day}
        </button>
      );
    }

    // Next month days
    const remainingDays = 42 - (firstDayOfMonth + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 cursor-default"
          disabled
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
          &lt;
        </Button>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {months[month]} {year}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleNextMonth}>
          &gt;
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
    </div>
  );
};

const DatePickerInput = forwardRef(({ className, ...props }, ref) => {
  return (
    <DatePicker {...props}>
      <DatePickerTrigger ref={ref} className={className} />
      <DatePickerContent />
    </DatePicker>
  );
});

DatePickerInput.displayName = 'DatePickerInput';

export {
  DatePicker,
  DatePickerTrigger,
  DatePickerContent,
  DatePickerInput,
};

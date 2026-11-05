import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { useDisclosure } from '../../hooks/useDisclosure';

const PopoverContext = React.createContext();

const Popover = forwardRef(({
  className,
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [triggerRef, setTriggerRef] = useState(null);
  const [contentRef, setContentRef] = useState(null);
  const [position, setPosition] = useState('bottom');
  const [rect, setRect] = useState(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : isOpen;

  const handleOpen = () => {
    if (!isControlled) setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    if (!isControlled) setIsOpen(false);
    onOpenChange?.(false);
  };

  const updatePosition = () => {
    if (!triggerRef || !contentRef || !open) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const contentRect = contentRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition = 'bottom';
    let newRect = { ...triggerRect };

    // Check if bottom has enough space
    if (triggerRect.bottom + contentRect.height <= viewportHeight) {
      newPosition = 'bottom';
      newRect.top = triggerRect.bottom + 8;
      newRect.left = triggerRect.left;
    } else if (triggerRect.top - contentRect.height >= 0) {
      newPosition = 'top';
      newRect.top = triggerRect.top - contentRect.height - 8;
      newRect.left = triggerRect.left;
    } else if (triggerRect.right + contentRect.width <= viewportWidth) {
      newPosition = 'right';
      newRect.top = triggerRect.top;
      newRect.left = triggerRect.right + 8;
    } else {
      newPosition = 'left';
      newRect.top = triggerRect.top;
      newRect.left = triggerRect.left - contentRect.width - 8;
    }

    // Adjust for horizontal overflow
    if (newRect.left + contentRect.width > viewportWidth) {
      newRect.left = viewportWidth - contentRect.width - 8;
    }
    if (newRect.left < 0) {
      newRect.left = 8;
    }

    setPosition(newPosition);
    setRect({
      ...newRect,
      width: contentRect.width,
    });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [open, position]);

  const contextValue = {
    open,
    setOpen: handleOpen,
    close: handleClose,
    toggle: () => open ? handleClose() : handleOpen(),
    triggerRef: setTriggerRef,
    contentRef: setContentRef,
  };

  return (
    <PopoverContext.Provider value={contextValue}>
      <span ref={ref} className={cn('inline-block', className)} {...props}>
        {children}
      </span>
    </PopoverContext.Provider>
  );
});

Popover.displayName = 'Popover';

const PopoverTrigger = forwardRef(({ className, children, ...props }, ref) => {
  const { setOpen, triggerRef } = React.useContext(PopoverContext);

  return (
    <span
      ref={(node) => {
        triggerRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      onClick={() => setOpen?.()}
      className={cn('inline-block cursor-pointer', className)}
      {...props}
    >
      {children}
    </span>
  );
});

PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = forwardRef(({ className, children, side = 'bottom', ...props }, ref) => {
  const { open, close, contentRef } = React.useContext(PopoverContext);

  if (!open) return null;

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
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(renderContent(), document.body);
});

PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };

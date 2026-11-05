import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { Separator } from '../Separator';

const DropdownMenuContext = React.createContext();

const DropdownMenu = forwardRef(({
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
  const [position, setPosition] = useState({ top: 0, left: 0 });

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

    let top = triggerRect.bottom + 4;
    let left = triggerRect.left;

    // Check if it fits below
    if (triggerRect.bottom + contentRect.height > viewportHeight) {
      top = triggerRect.top - contentRect.height - 4;
    }

    // Check if it fits to the right
    if (triggerRect.left + contentRect.width > viewportWidth) {
      left = triggerRect.right - contentRect.width;
    }

    // Ensure it doesn't go off-screen
    top = Math.max(4, Math.min(top, viewportHeight - contentRect.height - 4));
    left = Math.max(4, Math.min(left, viewportWidth - contentRect.width - 4));

    setPosition({ top, left });
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
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && triggerRef && !triggerRef.contains(e.target) && 
          contentRef && !contentRef.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, triggerRef, contentRef, handleClose]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (open && e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  const contextValue = {
    open,
    setOpen: handleOpen,
    close: handleClose,
    toggle: () => open ? handleClose() : handleOpen(),
    triggerRef: setTriggerRef,
    contentRef: setContentRef,
  };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <span ref={ref} className={cn('inline-block', className)} {...props}>
        {children}
      </span>
    </DropdownMenuContext.Provider>
  );
});

DropdownMenu.displayName = 'DropdownMenu';

const DropdownMenuTrigger = forwardRef(({ className, children, asChild, ...props }, ref) => {
  const { setOpen, triggerRef } = React.useContext(DropdownMenuContext);

  if (asChild) {
    return React.cloneElement(children, {
      ref: (node) => {
        triggerRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      onClick: (e) => {
        children.props.onClick?.(e);
        setOpen?.();
        e.stopPropagation();
      },
      className: cn(className, children.props.className),
      ...props,
    });
  }

  return (
    <Button
      ref={(node) => {
        triggerRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      variant="outline"
      onClick={(e) => {
        setOpen?.();
        e.stopPropagation();
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
});

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = forwardRef(({ className, children, align = 'start', ...props }, ref) => {
  const { open, close, contentRef } = React.useContext(DropdownMenuContext);

  if (!open) return null;

  const renderContent = () => (
    <div
      ref={(node) => {
        contentRef?.(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="menu"
      className={cn(
        'absolute z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-1 min-w-[180px]',
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

DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = forwardRef(({ className, children, onClick, disabled, ...props }, ref) => {
  const { close } = React.useContext(DropdownMenuContext);

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    close?.();
  };

  return (
    <button
      ref={ref}
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full px-2 py-1.5 text-sm text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200',
        { 'text-gray-400 dark:text-gray-500 cursor-not-allowed': disabled },
        { 'text-gray-900 dark:text-white cursor-pointer': !disabled },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = forwardRef(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      orientation="horizontal"
      className={cn('my-1', className)}
      {...props}
    />
  );
});

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};

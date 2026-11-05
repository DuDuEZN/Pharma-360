import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

const Tooltip = forwardRef(({
  className,
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const [tooltipRect, setTooltipRect] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : isOpen;

  const handleMouseEnter = () => {
    if (disabled) return;
    const timer = setTimeout(() => {
      setIsOpen(true);
      onOpenChange?.(true);
    }, delay);
    return () => clearTimeout(timer);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current || !open) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition = position;
    let newRect = { ...triggerRect };

    // Calculate position based on available space
    switch (position) {
      case 'top':
        if (triggerRect.top - tooltipRect.height < 0) {
          newPosition = 'bottom';
          newRect.top = triggerRect.bottom;
          newRect.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        } else {
          newRect.top = triggerRect.top - tooltipRect.height - 8;
          newRect.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        }
        break;
      case 'bottom':
        if (triggerRect.bottom + tooltipRect.height > viewportHeight) {
          newPosition = 'top';
          newRect.top = triggerRect.top - tooltipRect.height - 8;
          newRect.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        } else {
          newRect.top = triggerRect.bottom + 8;
          newRect.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        }
        break;
      case 'left':
        if (triggerRect.left - tooltipRect.width < 0) {
          newPosition = 'right';
          newRect.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          newRect.left = triggerRect.right + 8;
        } else {
          newRect.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          newRect.left = triggerRect.left - tooltipRect.width - 8;
        }
        break;
      case 'right':
        if (triggerRect.right + tooltipRect.width > viewportWidth) {
          newPosition = 'left';
          newRect.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          newRect.left = triggerRect.left - tooltipRect.width - 8;
        } else {
          newRect.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          newRect.left = triggerRect.right + 8;
        }
        break;
    }

    setTooltipPosition(newPosition);
    setTooltipRect({
      ...newRect,
      width: tooltipRect.width,
      height: tooltipRect.height,
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
  }, [open, content, position]);

  const renderTooltip = () => {
    if (!open || !content) return null;

    const positions = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        className={cn(
          'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap',
          positions[tooltipPosition],
          className
        )}
        style={{
          position: 'fixed',
          top: tooltipRect?.top,
          left: tooltipRect?.left,
        }}
      >
        {content}
        <div
          className={cn(
            'absolute w-2 h-2 bg-gray-900 transform rotate-45',
            {
              'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': tooltipPosition === 'top',
              'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2': tooltipPosition === 'bottom',
              'right-0 top-1/2 -translate-y-1/2 translate-x-1/2': tooltipPosition === 'left',
              'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2': tooltipPosition === 'right',
            }
          )}
        />
      </div>,
      document.body
    );
  };

  return (
    <span
      ref={ref}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <span ref={triggerRef}>{children}</span>
      {renderTooltip()}
    </span>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;

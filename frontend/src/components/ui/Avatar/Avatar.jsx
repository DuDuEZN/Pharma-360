import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Avatar = forwardRef(({ 
  className,
  src,
  alt = 'User avatar',
  size = 'md',
  status,
  statusPosition = 'bottom-right',
  fallback,
  children,
  ...props 
}, ref) => {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getFallbackContent = () => {
    if (fallback) return fallback;
    if (children) return children;
    if (alt) return getInitials(alt);
    return '?';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      case 'busy':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-200',
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold">
            {getFallbackContent()}
          </span>
        )}
      </div>
      
      {status && (
        <span
          className={cn(
            'absolute rounded-full ring-2 ring-white dark:ring-gray-900',
            statusSizes[size],
            getStatusColor(),
            {
              'bottom-0 right-0': statusPosition === 'bottom-right',
              'bottom-0 left-0': statusPosition === 'bottom-left',
              'top-0 right-0': statusPosition === 'top-right',
              'top-0 left-0': statusPosition === 'top-left',
            }
          )}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

const AvatarGroup = forwardRef(({ 
  className,
  children,
  max = 5,
  ...props 
}, ref) => {
  const visibleChildren = React.Children.toArray(children).slice(0, max);
  const remaining = React.Children.count(children) - max;

  return (
    <div
      ref={ref}
      className={cn('flex items-center -space-x-2', className)}
      {...props}
    >
      {visibleChildren}
      {remaining > 0 && (
        <Avatar size="sm" fallback={`+${remaining}`} className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200" />
      )}
    </div>
  );
});

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };

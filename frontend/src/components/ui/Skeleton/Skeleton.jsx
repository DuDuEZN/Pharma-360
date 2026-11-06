import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Skeleton = forwardRef(({ 
  className,
  variant = 'text',
  width,
  height,
  circle = false,
  animated = true,
  ...props 
}, ref) => {
  const variants = {
    text: 'h-4 w-full',
    heading: 'h-8 w-3/4',
    paragraph: 'h-4 w-full',
    circular: 'h-10 w-10',
    rectangular: 'h-40 w-full',
    card: 'h-64 w-full',
    avatar: 'h-10 w-10',
  };

  const styles = {
    base: 'bg-gray-200 dark:bg-gray-700',
    animated: 'animate-pulse',
    rounded: circle ? 'rounded-full' : 'rounded-md',
    size: variants[variant],
    customWidth: width ? `w-[${width}]` : '',
    customHeight: height ? `h-[${height}]` : '',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        { 'animate-pulse': animated },
        { 'rounded-full': circle },
        { 'rounded-md': !circle },
        variants[variant],
        className
      )}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      aria-hidden="true"
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

const SkeletonText = forwardRef(({ 
  className,
  lines = 1,
  width,
  ...props 
}, ref) => {
  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={width}
          className={cn({
            'w-3/4': index === lines - 1 && !width,
          })}
        />
      ))}
    </div>
  );
});

SkeletonText.displayName = 'SkeletonText';

export { Skeleton, SkeletonText };

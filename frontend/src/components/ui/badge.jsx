import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-600 text-white',
        secondary:
          'border-transparent bg-secondary-100 text-secondary-700 dark:bg-white/10 dark:text-secondary-200',
        destructive: 'border-transparent bg-danger-500 text-white',
        danger:
          'border-transparent bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-300',
        success:
          'border-transparent bg-success-500/10 text-success-700 dark:bg-success-500/20 dark:text-success-300',
        warning:
          'border-transparent bg-warning-500/10 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300',
        info: 'border-transparent bg-primary-500/10 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
        outline:
          'border-black/10 text-secondary-700 dark:border-white/15 dark:text-secondary-200',
      },
      size: {
        xs: 'px-2 py-0.5 text-[10px]',
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  }
)

function Badge({ className, variant, size, ...props }) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }

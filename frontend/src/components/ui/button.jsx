import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-tight transition-all duration-200 ease-apple focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white shadow-apple-sm hover:bg-primary-500 active:bg-primary-700',
        destructive:
          'bg-danger-500 text-white shadow-apple-sm hover:brightness-105 active:brightness-95',
        outline:
          'border border-black/10 bg-white/70 text-secondary-900 shadow-apple-sm backdrop-blur hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
        secondary:
          'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
        ghost:
          'text-secondary-700 hover:bg-black/[0.05] dark:text-secondary-200 dark:hover:bg-white/10',
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

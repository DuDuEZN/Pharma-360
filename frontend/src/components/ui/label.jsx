import * as React from 'react'
import { cn } from '@/lib/utils.js'

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-[13px] font-medium leading-none text-secondary-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-secondary-300', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }

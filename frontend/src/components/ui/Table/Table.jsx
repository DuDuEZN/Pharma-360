import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const Table = forwardRef(({ className, children, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    >
      {children}
    </table>
  </div>
))

Table.displayName = 'Table'

const TableHeader = forwardRef(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b', className)}
    {...props}
  >
    {children}
  </thead>
))

TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef(({ className, children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  >
    {children}
  </tbody>
))

TableBody.displayName = 'TableBody'

const TableFooter = forwardRef(({ className, children, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('bg-primary-50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  >
    {children}
  </tfoot>
))

TableFooter.displayName = 'TableFooter'

const TableRow = forwardRef(({ className, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  >
    {children}
  </tr>
))

TableRow.displayName = 'TableRow'

const TableHead = forwardRef(({ 
  className, 
  children,
  sortable,
  sortDirection,
  onSort,
  ...props 
}, ref) => {
  const handleClick = () => {
    if (sortable && onSort) {
      const newDirection = !sortDirection 
        ? 'asc' 
        : sortDirection === 'asc' 
          ? 'desc' 
          : null
      onSort(newDirection)
    }
  }

  const showSortIcon = sortable && onSort
  
  return (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        sortable && 'cursor-pointer select-none hover:text-foreground',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {showSortIcon && (
          <span className="text-muted-foreground">
            {sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </th>
  )
})

TableHead.displayName = 'TableHead'

const TableCell = forwardRef(({ className, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  >
    {children}
  </td>
))

TableCell.displayName = 'TableCell'

const TableCaption = forwardRef(({ className, children, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </caption>
))

TableCaption.displayName = 'TableCaption'

const TableEmpty = forwardRef(({ 
  className, 
  message = 'Aucune donnée disponible',
  colSpan,
  ...props 
}, ref) => (
  <TableRow ref={ref} {...props}>
    <TableCell 
      colSpan={colSpan} 
      className={cn('h-24 text-center text-muted-foreground', className)}
    >
      {message}
    </TableCell>
  </TableRow>
))

TableEmpty.displayName = 'TableEmpty'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmpty
}

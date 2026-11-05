import * as React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils.js'

const toInput = (d) => (d ? format(d, 'yyyy-MM-dd') : '')
const fromInput = (s) => (s ? new Date(`${s}T00:00:00`) : undefined)

const inputClass =
  'h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

// Sélecteur de période sans dépendance externe : { from, to } (objets Date)
export function DatePickerWithRange({ className, date, value, onDateChange, onChange, setDate }) {
  const controlled = date ?? value
  const [inner, setInner] = React.useState(controlled)
  const range = controlled ?? inner

  const update = (next) => {
    setInner(next)
    const cb = onDateChange ?? onChange ?? setDate
    if (cb) cb(next)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="date"
        className={inputClass}
        value={toInput(range?.from)}
        onChange={(e) => update({ ...range, from: fromInput(e.target.value) })}
      />
      <span className="text-gray-500">→</span>
      <input
        type="date"
        className={inputClass}
        value={toInput(range?.to)}
        onChange={(e) => update({ ...range, to: fromInput(e.target.value) })}
      />
    </div>
  )
}

export default DatePickerWithRange

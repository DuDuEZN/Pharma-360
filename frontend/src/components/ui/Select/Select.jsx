import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'

const Select = forwardRef(({ 
  className,
  options = [],
  value,
  onChange,
  placeholder = 'Sélectionner une option',
  disabled = false,
  error,
  label,
  hint,
  searchable = false,
  clearable = false,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const selectRef = useRef(null)

  // Find selected option from value
  useEffect(() => {
    if (value && options.length > 0) {
      const option = options.find(opt => opt.value === value)
      if (option) setSelectedOption(option)
    }
  }, [value, options])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return
      
      switch (event.key) {
        case 'Escape':
          setIsOpen(false)
          setSearchQuery('')
          break
        case 'ArrowDown':
          event.preventDefault()
          // Focus first option
          break
        case 'ArrowUp':
          event.preventDefault()
          // Focus last option
          break
        case 'Enter':
          event.preventDefault()
          // Select focused option
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSelect = (option) => {
    setSelectedOption(option)
    setIsOpen(false)
    setSearchQuery('')
    onChange?.(option.value)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setSelectedOption(null)
    onChange?.('')
  }

  const filteredOptions = searchable 
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const displayValue = selectedOption?.label || placeholder

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium text-secondary-600 dark:text-secondary-300">
          {label}
        </label>
      )}
      <div ref={selectRef} className="relative">
        <button
          ref={ref}
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 px-3.5 py-2 text-sm',
            'rounded-xl border border-black/10 bg-white/80 shadow-apple-sm transition-all duration-200 ease-apple dark:border-white/10 dark:bg-white/5 dark:text-white',
            'focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
            'disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500 dark:disabled:bg-white/5',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/15'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          {...props}
        >
          <span className={cn('truncate', !displayValue && 'text-secondary-400 dark:text-secondary-500')}>
            {displayValue}
          </span>
          <div className="flex items-center gap-1">
            {clearable && selectedOption && (
              <button
                type="button"
                className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                onClick={handleClear}
              >
                <X className="h-4 w-4 text-secondary-400" />
              </button>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-secondary-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-secondary-400" />
            )}
          </div>
        </button>
        
        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-black/[0.06] bg-white/95 shadow-apple-lg backdrop-blur-2xl animate-scale-in dark:border-white/10 dark:bg-[#1c1c1e]/95">
            {searchable && options.length > 5 && (
              <div className="border-b border-black/[0.06] p-2 dark:border-white/10">
                <input
                  type="text"
                  className="w-full rounded-lg border border-black/10 bg-white/80 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 ease-apple hover:bg-black/[0.04] dark:hover:bg-white/10',
                      selectedOption?.value === option.value && 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {selectedOption?.value === option.value && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <span>{option.label}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Aucune option trouvée
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export { Select }

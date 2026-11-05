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
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div ref={selectRef} className="relative">
        <button
          ref={ref}
          type="button"
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm',
            'rounded-lg border bg-white transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300',
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          {...props}
        >
          <span className={cn('truncate', !displayValue && 'text-gray-400')}>
            {displayValue}
          </span>
          <div className="flex items-center gap-1">
            {clearable && selectedOption && (
              <button
                type="button"
                className="p-1 hover:bg-gray-100 rounded"
                onClick={handleClear}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>
        
        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
            {searchable && options.length > 5 && (
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                      'flex items-center gap-2',
                      selectedOption?.value === option.value && 'bg-primary-50 text-primary-700'
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

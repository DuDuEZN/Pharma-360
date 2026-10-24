import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { Barcode, X, CheckCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * BarcodeInput Component for Pharmacie 360
 * Specialized input for barcode scanning with hardware support
 * 
 * Features:
 * - Auto-focus on mount
 * - Automatic scanning on Enter key
 * - Visual feedback for scanning state
 * - Validation feedback
 * - Clear button
 * 
 * FRNT-003: Composant BarcodeInput (focus auto)
 */
const BarcodeInput = forwardRef(function BarcodeInput({
  value,
  onChange,
  onScan,
  onClear,
  placeholder = "Scanner un code-barres...",
  disabled = false,
  className,
  showValidation = true,
  ...props
}, ref) {
  const inputRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [error, setError] = useState(null)

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value
    
    // Clear error when user types
    if (error) {
      setError(null)
    }
    
    // Update value
    if (onChange) {
      onChange(e)
    }
  }

  // Handle key down for barcode scanning
  const handleKeyDown = async (e) => {
    // Check for Enter key (scanners typically send Enter after barcode)
    if (e.key === 'Enter' && value && value.trim()) {
      e.preventDefault()
      
      const barcode = value.trim()
      
      // Set scanning state
      setIsScanning(true)
      setError(null)
      
      try {
        // Call onScan callback if provided
        if (onScan) {
          const result = await onScan(barcode)
          
          if (result && result.error) {
            setError(result.error)
          } else if (result && result.success !== false) {
            setLastScanned({
              barcode,
              timestamp: new Date(),
              success: true
            })
          }
        }
        
        // Clear input after successful scan (optional behavior)
        // Can be controlled by parent via onChange
      } catch (err) {
        setError(err.message || 'Erreur de scan')
      } finally {
        setIsScanning(false)
      }
    }
  }

  // Handle clear
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (onChange) {
      onChange({ target: { value: '' } })
    }
    setError(null)
    setLastScanned(null)
    inputRef.current?.focus()
  }

  // Validate barcode format
  const validateBarcode = (barcode) => {
    if (!barcode || barcode.length < 6) return false
    
    // Check common barcode formats
    const digitOnly = /^\d+$/
    const alphanumeric = /^[A-Za-z0-9\-\s]+$/
    
    // EAN-8 (8 digits)
    if (barcode.length === 8 && digitOnly.test(barcode)) return true
    
    // EAN-13 (13 digits)
    if (barcode.length === 13 && digitOnly.test(barcode)) return true
    
    // UPC-A (12 digits)
    if (barcode.length === 12 && digitOnly.test(barcode)) return true
    
    // Code 39 (starts and ends with *, alphanumeric)
    if (barcode.startsWith('*') && barcode.endsWith('*') && alphanumeric.test(barcode.slice(1, -1))) {
      return true
    }
    
    // Code 128 (alphanumeric, 6-20 chars)
    if (barcode.length >= 6 && barcode.length <= 20 && alphanumeric.test(barcode)) {
      return true
    }
    
    return false
  }

  const isValid = value ? validateBarcode(value) : null
  const hasValue = value && value.trim()

  return (
    <div className={twMerge('w-full', className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isScanning ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600" />
          ) : (
            <Barcode className="w-4 h-4 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef || ref}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={twMerge(
            clsx(
              'block w-full pl-10 pr-10 py-2 text-sm border rounded-lg',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              error ? 'border-danger-500 bg-danger-50' : 'border-gray-300 bg-white',
              hasValue && isValid && !error ? 'border-success-500 bg-success-50' : '',
              hasValue && !isValid && !error ? 'border-warning-500 bg-warning-50' : ''
            )
          )}
          {...props}
        />
        
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Validation feedback */}
      {showValidation && hasValue && !error && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isValid ? (
            <>
              <CheckCircle className="w-3 h-3 text-success-600" />
              <span className="text-success-600">Format valide</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-warning-600" />
              <span className="text-warning-600">Format à vérifier</span>
            </>
          )}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <AlertCircle className="w-3 h-3 text-danger-600" />
          <span className="text-danger-600">{error}</span>
        </div>
      )}
      
      {/* Last scanned info */}
      {lastScanned && !error && (
        <div className="mt-1 text-xs text-gray-500">
          Scanné: {lastScanned.barcode} à {lastScanned.timestamp.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
})

BarcodeInput.displayName = 'BarcodeInput'

export default BarcodeInput

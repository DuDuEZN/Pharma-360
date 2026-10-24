import React, { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'
import { useToast } from '../components/common/Toast'

/**
 * Barcode Scanner Hook for Pharmacie 360
 * Handles barcode scanning with FEFO batch selection
 * 
 * FRNT-005: Session Vente (Recherche + FEFO + envoi Caisse)
 */
const BarcodeScannerContext = createContext(null)

export function BarcodeScannerProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [error, setError] = useState(null)
  const { addToast } = useToast()

  /**
   * Scan a barcode and get product with FEFO batch
   * @param {string} barcode - The barcode to scan
   * @returns {Promise<{product: Object, batch: Object, error: string}|null>}
   */
  const scanBarcode = useCallback(async (barcode) => {
    if (!barcode || !barcode.trim()) {
      setError('Code-barres vide')
      return null
    }

    setIsScanning(true)
    setError(null)

    try {
      const response = await api.post('/barcode/scan', {
        barcode: barcode.trim()
      })

      if (response.data.error) {
        setError(response.data.error)
        addToast({
          type: 'error',
          title: 'Erreur de scan',
          message: response.data.error
        })
        return null
      }

      const result = {
        product: response.data.product,
        batch: response.data.batch,
        error: null
      }

      setLastScanned(result)
      return result
    } catch (err) {
      const message = err.response?.data?.error || 
                     err.response?.data?.detail ||
                     'Erreur lors du scan du code-barres'
      setError(message)
      addToast({
        type: 'error',
        title: 'Erreur',
        message
      })
      return null
    } finally {
      setIsScanning(false)
    }
  }, [addToast])

  /**
   * Scan barcode and select batch with quantity validation
   * @param {string} barcode - The barcode to scan
   * @param {number} quantity - Requested quantity
   * @returns {Promise<{product: Object, batch: Object, error: string}|null>}
   */
  const scanAndSelect = useCallback(async (barcode, quantity = 1) => {
    if (!barcode || !barcode.trim()) {
      setError('Code-barres vide')
      return null
    }

    setIsScanning(true)
    setError(null)

    try {
      const response = await api.post('/barcode/scan-and-select', null, {
        params: {
          barcode: barcode.trim(),
          quantity
        }
      })

      if (response.data.error) {
        setError(response.data.error)
        addToast({
          type: 'error',
          title: 'Erreur',
          message: response.data.error
        })
        return null
      }

      const result = {
        product: response.data.product,
        batch: response.data.batch,
        error: null
      }

      setLastScanned(result)
      return result
    } catch (err) {
      const message = err.response?.data?.error || 
                     err.response?.data?.detail ||
                     'Erreur lors de la sélection FEFO'
      setError(message)
      addToast({
        type: 'error',
        title: 'Erreur',
        message
      })
      return null
    } finally {
      setIsScanning(false)
    }
  }, [addToast])

  /**
   * Validate barcode format
   * @param {string} barcode - The barcode to validate
   * @returns {boolean}
   */
  const validateBarcode = useCallback((barcode) => {
    if (!barcode || !barcode.trim()) return false
    
    const cleanBarcode = barcode.trim()
    
    // Check common barcode formats
    const digitOnly = /^\d+$/
    const alphanumeric = /^[A-Za-z0-9\-\s]+$/
    
    // EAN-8 (8 digits)
    if (cleanBarcode.length === 8 && digitOnly.test(cleanBarcode)) return true
    
    // EAN-13 (13 digits)
    if (cleanBarcode.length === 13 && digitOnly.test(cleanBarcode)) return true
    
    // UPC-A (12 digits)
    if (cleanBarcode.length === 12 && digitOnly.test(cleanBarcode)) return true
    
    // Code 39 (starts and ends with *, alphanumeric)
    if (cleanBarcode.startsWith('*') && cleanBarcode.endsWith('*') && 
        alphanumeric.test(cleanBarcode.slice(1, -1))) {
      return true
    }
    
    // Code 128 (alphanumeric, 6-20 chars)
    if (cleanBarcode.length >= 6 && cleanBarcode.length <= 20 && 
        alphanumeric.test(cleanBarcode)) {
      return true
    }
    
    return false
  }, [])

  /**
   * Clear scanner state
   */
  const clear = useCallback(() => {
    setIsScanning(false)
    setError(null)
    setLastScanned(null)
  }, [])

  return (
    <BarcodeScannerContext.Provider value={{
      scanBarcode,
      scanAndSelect,
      validateBarcode,
      isScanning,
      lastScanned,
      error,
      clear
    }}>
      {children}
    </BarcodeScannerContext.Provider>
  )
}

export function useBarcodeScanner() {
  const context = useContext(BarcodeScannerContext)
  if (!context) {
    throw new Error('useBarcodeScanner must be used within a BarcodeScannerProvider')
  }
  return context
}

export default BarcodeScannerProvider

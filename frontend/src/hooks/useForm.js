/**
 * Form hook for managing form state, validation, and submission
 */

import { useState, useCallback } from 'react'
import { VALIDATION_MESSAGES } from '@/lib/constants'

const useForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const inputValue = type === 'checkbox' ? checked : value
    
    setValues((prev) => ({
      ...prev,
      [name]: inputValue
    }))
    
    // Clear error when user types
    setErrors((prev) => ({
      ...prev,
      [name]: undefined
    }))
    
    // Mark as touched
    setTouched((prev) => ({
      ...prev,
      [name]: true
    }))
  }, [])

  // Set field value programmatically
  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value
    }))
  }, [])

  // Set multiple field values
  const setFieldValues = useCallback((newValues) => {
    setValues((prev) => ({
      ...prev,
      ...newValues
    }))
  }, [])

  // Validate single field
  const validateField = useCallback((name, value) => {
    const schema = validationSchema[name]
    if (!schema) return null
    
    const { required, validate, pattern, minLength, maxLength, min, max } = schema
    
    // Required validation
    if (required && (value === undefined || value === null || value === '')) {
      return VALIDATION_MESSAGES.REQUIRED
    }
    
    // Custom validation
    if (validate && typeof validate === 'function') {
      const result = validate(value, values)
      if (result) return result
    }
    
    // Pattern validation
    if (pattern && !pattern.test(String(value))) {
      return 'Format invalide'
    }
    
    // Min length validation
    if (minLength && String(value).length < minLength) {
      return VALIDATION_MESSAGES.MIN_LENGTH(minLength)
    }
    
    // Max length validation
    if (maxLength && String(value).length > maxLength) {
      return VALIDATION_MESSAGES.MAX_LENGTH(maxLength)
    }
    
    // Min value validation
    if (min !== undefined && Number(value) < min) {
      return VALIDATION_MESSAGES.NUMBER_MIN(min)
    }
    
    // Max value validation
    if (max !== undefined && Number(value) > max) {
      return VALIDATION_MESSAGES.NUMBER_MAX(max)
    }
    
    return null
  }, [validationSchema, values])

  // Validate all fields
  const validate = useCallback(() => {
    const newErrors = {}
    let isValid = true
    
    Object.keys(validationSchema).forEach((name) => {
      const error = validateField(name, values[name])
      if (error) {
        newErrors[name] = error
        isValid = false
      }
    })
    
    setErrors(newErrors)
    return isValid
  }, [validationSchema, validateField])

  // Validate on blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    
    setTouched((prev) => ({
      ...prev,
      [name]: true
    }))
    
    setErrors((prev) => ({
      ...prev,
      [name]: error
    }))
  }, [validateField])

  // Handle form submission
  const handleSubmit = useCallback(async (callback) => {
    setIsSubmitting(true)
    
    // Mark all fields as touched
    setTouched((prev) => {
      const newTouched = { ...prev }
      Object.keys(initialValues).forEach((key) => {
        newTouched[key] = true
      })
      return newTouched
    })
    
    // Validate all fields
    const isValid = validate()
    
    if (isValid && callback) {
      try {
        await callback(values)
      } catch (error) {
        // Handle submission error
        console.error('Form submission error:', error)
      }
    }
    
    setIsSubmitting(false)
    return isValid
  }, [initialValues, validate])

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0

  // Check if form has been touched
  const isTouched = Object.keys(touched).length > 0

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldValues,
    validate,
    validateField,
    resetForm
  }
}

export { useForm }

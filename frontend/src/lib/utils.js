import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * @param {import('react').ClassValue[]} inputs - Class values to merge
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in XOF (West African CFA Franc)
 */
export function formatCurrency(amount, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Format date for display
 */
export function formatDate(dateString, locale = 'fr-FR') {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format date with time
 */
export function formatDateTime(dateString, locale = 'fr-FR') {
  const date = new Date(dateString)
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate unique ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Sleep function for async operations
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Format percentage value for display
 * @param {number} value - The percentage value (e.g., 0.25 for 25% or 25 for 25%)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  const num = typeof value === 'number' ? value : parseFloat(value)
  const formatted = (num * 100).toFixed(decimals)
  return `${formatted}%`
}

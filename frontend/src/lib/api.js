/**
 * API Client for Pharma-360
 * Centralized HTTP client with interceptors and error handling
 */

import axios from 'axios'
import { API_BASE_URL, TOKEN_KEY, TOKEN_EXPIRY_BUFFER, ERROR_MESSAGES } from './constants'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    
    if (token) {
      // Check if token is about to expire
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expiresAt = payload.exp * 1000
        const now = Date.now()
        
        if (expiresAt - now < TOKEN_EXPIRY_BUFFER) {
          // Token will expire soon, try to refresh
          // For now, just continue with current token
          // In production, implement token refresh logic
        }
      } catch (e) {
        // Invalid token, continue without it
        console.warn('Invalid token format')
      }
      
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR))
    }
    
    if (!error.response) {
      return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR))
    }
    
    const { status, data } = error.response
    
    switch (status) {
      case 401:
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY)
        window.location.href = '/login'
        break
      case 403:
        error.message = ERROR_MESSAGES.FORBIDDEN
        break
      case 404:
        error.message = ERROR_MESSAGES.NOT_FOUND
        break
      case 422:
        error.message = ERROR_MESSAGES.VALIDATION_ERROR
        error.errors = data.detail || data.errors
        break
      case 429:
        error.message = 'Trop de requêtes. Veuillez patienter.'
        break
      case 500:
      case 502:
      case 503:
      case 504:
        error.message = ERROR_MESSAGES.SERVER_ERROR
        break
      default:
        error.message = data.message || data.detail || ERROR_MESSAGES.UNKNOWN_ERROR
    }
    
    return Promise.reject(error)
  }
)

// API methods wrapper
const apiClient = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
  
  // Convenience methods
  getAll: async (endpoint, params = {}) => {
    const { data } = await api.get(`/${endpoint}`, { params })
    return data
  },
  
  getById: async (endpoint, id) => {
    const { data } = await api.get(`/${endpoint}/${id}`)
    return data
  },
  
  create: async (endpoint, data) => {
    const { data: response } = await api.post(`/${endpoint}`, data)
    return response
  },
  
  update: async (endpoint, id, data) => {
    const { data: response } = await api.put(`/${endpoint}/${id}`, data)
    return response
  },
  
  remove: async (endpoint, id) => {
    const { data } = await api.delete(`/${endpoint}/${id}`)
    return data
  },
  
  // Search with pagination
  search: async (endpoint, params = {}) => {
    const { data } = await api.get(`/${endpoint}/search`, { params })
    return data
  }
}

export default apiClient

// Export axios instance for advanced usage
export { api }

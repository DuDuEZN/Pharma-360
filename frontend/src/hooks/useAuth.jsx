import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const isAuthenticated = !!token

  const login = useCallback(async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { access_token, user: userData } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      setToken(access_token)
      setUser(userData)

      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Erreur de connexion'
      return { success: false, message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
    }
  }, [])

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      await api.get('/api/health')

      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    }, (error) => Promise.reject(error))

    return () => {
      api.interceptors.request.eject(interceptor)
    }
  }, [token])

  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use((response) => response, (error) => {
      if (error.response?.status === 401) {
        logout()
        navigate('/login')
      }
      return Promise.reject(error)
    })

    return () => {
      api.interceptors.response.eject(responseInterceptor)
    }
  }, [logout, navigate])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      logout,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthProvider

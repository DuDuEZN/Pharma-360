import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from '@/lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const isAuthenticated = !!token

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    // Remove keys used by older builds during migration.
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common.Authorization
  }, [])

  const login = useCallback(async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { access_token, refresh_token, user: userData } = response.data
      localStorage.setItem(TOKEN_KEY, access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
      setToken(access_token)
      setUser(userData)
      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Erreur de connexion'
      return { success: false, message }
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    navigate('/login')
  }, [clearSession, navigate])

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
    const storedUser = localStorage.getItem(USER_KEY) || localStorage.getItem('user')
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
      const response = await api.get('/auth/me')
      const currentUser = response.data || (storedUser ? JSON.parse(storedUser) : null)
      localStorage.setItem(TOKEN_KEY, storedToken)
      if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(storedToken)
      setUser(currentUser)
    } catch (error) {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    }, (error) => Promise.reject(error))
    return () => api.interceptors.request.eject(interceptor)
  }, [token])

  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearSession()
          navigate('/login')
        }
        return Promise.reject(error)
      },
    )
    return () => api.interceptors.response.eject(responseInterceptor)
  }, [clearSession, navigate])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export default AuthProvider

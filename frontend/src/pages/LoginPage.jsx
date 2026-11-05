import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Package, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { useToast } from '../components/common/Toast'
import { cn } from '../lib/utils'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToast()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs')
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs',
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await login(username, password)

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Connexion réussie',
          message: `Bienvenue, ${result.user.username}!`,
        })
        navigate(from, { replace: true })
      } else {
        setError(result.message || 'Identifiants invalides')
        addToast({
          type: 'error',
          title: 'Erreur de connexion',
          message: result.message || 'Identifiants invalides'
        })
      }
    } catch (error) {
      setError(error.message || 'Une erreur est survenue lors de la connexion')
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue lors de la connexion'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
          {/* Logo */}
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle className="text-2xl">Pharma 360</CardTitle>
            <CardDescription className="text-center">
              Plateforme de gestion de pharmacie
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error Alert */}
            {error && (
              <Alert variant="danger" className="mb-6">
                <span>{error}</span>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<User className="w-5 h-5 text-gray-400" />}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-5 h-5 text-gray-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  }
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                size="lg"
              >
                Se connecter
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center text-xs text-gray-500 dark:text-gray-400">
            © 2025 Pharma 360. Tous droits réservés.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

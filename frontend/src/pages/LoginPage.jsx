import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Package } from 'lucide-react'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useToast } from '../components/common/Toast'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToast()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs'
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
          message: `Bienvenue, ${result.user.username}!`
        })
        navigate(from, { replace: true })
      } else {
        addToast({
          type: 'error',
          title: 'Erreur de connexion',
          message: result.message
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la connexion'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-10 duration-500">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pharmacie 360</h1>
            <p className="text-gray-500 mt-1">Plateforme de gestion de pharmacie</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text"
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              required
              autoComplete="username"
              autoFocus
            />

            <Input
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Se connecter
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            © 2025 Pharmacie 360. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

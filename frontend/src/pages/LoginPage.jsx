import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePharmacy } from '@/providers/PharmacyProvider'
import { Package, User, Lock, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { login } = useAuth()
  const { pharmacy } = usePharmacy()
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



  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent p-4 dark:bg-transparent">
      {/* Halos façon Apple */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary-400/25 blur-[120px] dark:bg-primary-600/20" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-[#af52de]/20 blur-[130px] dark:bg-[#af52de]/15" />

      <div className="relative w-full max-w-[400px] animate-slide-up">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-apple-lg backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.06]">
          {/* Logo */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-b from-primary-500 to-primary-700 shadow-apple">
              <Package className="h-8 w-8 text-white" strokeWidth={2.2} />
            </div>
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-secondary-900 dark:text-white">
              Pharma 360
            </h1>
            <p className="mt-1 text-[13px] font-medium text-secondary-600 dark:text-secondary-300">
              {pharmacy.name || 'Plateforme de gestion de pharmacie'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" className="mb-5">
              <span>{error}</span>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Nom d'utilisateur"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={User}
              required
              autoComplete="username"
              autoFocus
            />

            <Input
              type="password"
              label="Mot de passe"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Connexion…' : 'Se connecter'}
              {!isLoading && <ArrowRight className="ml-2 h-[18px] w-[18px]" />}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-secondary-400 dark:text-secondary-500">
          © {new Date().getFullYear()} Pharma 360. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

export default LoginPage

a/frontend/src/pages/LoginPage.jsx b/frontend/src/pages/LoginPage.jsx
++ b/frontend/src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Box, Eye, EyeOff, Lock, ShieldCheck, Smartphone, User,
} from 'lucide-react'
import Button from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/common/Toast'

/**
 * Page de connexion — refonte « Menthe & Sable »
 * Split-screen : panneau de marque teal + formulaire clavier d'abord.
 * FRNT-001 : Connexion (redirection par rôle + verrouillage après 3 échecs)
 */

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', label: 'Admin' },
  { username: 'manager1', password: 'manager123', label: 'Gestionnaire' },
  { username: 'seller1', password: 'seller123', label: 'Vendeur' },
  { username: 'cashier1', password: 'cashier123', label: 'Caissier' },
]

const HOME_BY_ROLE = {
  admin: '/admin',
  manager: '/',
  seller: '/sales',
  cashier: '/cashier',
}

const MAX_ATTEMPTS = 3
const LOCK_SECONDS = 30

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const location = useLocation()
  const { addToast } = useToast()

  const from = location.state?.from?.pathname || null
  const isLocked = lockCountdown > 0

  // Compte à rebours de verrouillage
  useEffect(() => {
    if (lockCountdown <= 0) return
    const t = setInterval(() => setLockCountdown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [lockCountdown])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isLocked) return

    if (!username.trim() || !password.trim()) {
      setError('Veuillez renseigner votre nom d\u2019utilisateur et votre mot de passe.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const result = await login(username.trim(), password)

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Connexion réussie',
          message: `Bienvenue, ${result.user.username} !`,
        })
        const home = from || HOME_BY_ROLE[result.user?.role] || '/'
        navigate(home, { replace: true })
      } else {
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockCountdown(LOCK_SECONDS)
          setAttempts(0)
          setError(`Trop de tentatives. Nouvel essai dans ${LOCK_SECONDS} secondes.`)
        } else {
          setError(
            `${result.message || 'Identifiants incorrects.'} ${MAX_ATTEMPTS - nextAttempts} tentative(s) restante(s).`
          )
        }
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemo = (account) => {
    if (isLocked) return
    setUsername(account.username)
    setPassword(account.password)
    setError('')
  }

  const handleForgotPassword = () => {
    addToast({
      type: 'info',
      title: 'Mot de passe oublié',
      message: 'Contactez votre administrateur pour réinitialiser votre accès.',
    })
  }

  const inputBase =
    'w-full rounded-xl border bg-white py-2.5 pr-11 text-sm shadow-sm outline-none transition focus:ring-2'

  return (
    <div className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-2">
      {/* ============ Panneau de marque ============ */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-teal-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Box className="h-5 w-5 text-teal-100" />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-wide text-white">PHARMACIE 360</p>
            <p className="text-[11px] font-medium text-teal-200/80">Gestion de pharmacie · Bénin</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight text-white">
            La pharmacie qui ne perd plus une boîte de vue.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-teal-100/90">
            Stocks, lots FEFO, ventes et encaissements réunis dans une seule interface pensée
            pour le comptoir.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Box, text: 'Inventaire par lot avec règle FEFO' },
              { icon: Smartphone, text: 'Encaissement espèces, carte et Mobile Money' },
              { icon: ShieldCheck, text: 'Rôles : admin, gestionnaire, vendeur, caissier' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sm text-teal-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-teal-200/70">
          © 2025 Pharmacie 360 — Tous droits réservés.
        </p>
      </div>

      {/* ============ Formulaire ============ */}
      <div className="flex min-h-screen items-center justify-center p-6 sm:p-10 lg:min-h-0">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <Box className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-stone-900">PHARMACIE 360</p>
              <p className="text-[11px] text-stone-400">Gestion de pharmacie · Bénin</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-stone-900">Content de vous revoir</h2>
          <p className="mt-1 text-sm text-stone-500">
            Connectez-vous pour accéder à votre espace de travail.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            {/* Nom d'utilisateur */}
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-xs font-semibold text-stone-600">
                Nom d&rsquo;utilisateur
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex. manager1"
                  autoComplete="username"
                  autoFocus
                  disabled={isLocked}
                  className={`${inputBase} border-stone-200 pl-10 ${
                    error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'focus:border-teal-500 focus:ring-teal-100'
                  }`}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold text-stone-600">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-semibold text-teal-700 underline decoration-dotted hover:text-teal-800"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLocked}
                  className={`${inputBase} border-stone-200 pl-10 ${
                    error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'focus:border-teal-500 focus:ring-teal-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erreur inline */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full !bg-teal-600 hover:!bg-teal-700"
              isLoading={isLoading || isLocked}
              disabled={isLocked}
            >
              {isLocked ? `Verrouillé (${lockCountdown} s)` : 'Se connecter'}
            </Button>
          </form>

          {/* Comptes de démonstration */}
          <div className="mt-8 border-t border-stone-200 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Comptes de démonstration
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => fillDemo(account)}
                  disabled={isLocked}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-50"
                >
                  <span className="block font-bold text-stone-700">{account.label}</span>
                  <span className="text-[10px] text-stone-400">
                    {account.username} / {account.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
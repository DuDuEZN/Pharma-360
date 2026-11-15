import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  PHARMACY_UPDATED_EVENT,
  getCachedPharmacy,
  normalizePharmacy,
} from '@/lib/pharmacy'

const PharmacyContext = createContext(null)

/**
 * Fournit le nom et les coordonnées de la pharmacie à toute l'application.
 * Utilisé sur les tickets, factures, rapports et étiquettes.
 */
export function PharmacyProvider({ children }) {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(() => getCachedPharmacy())

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/pharmacy')
      // Le serveur est la source de vérité : un champ vidé dans les
      // paramètres doit aussi disparaître des documents. Le cache local ne
      // sert qu'à l'affichage immédiat avant la réponse réseau.
      setPharmacy(normalizePharmacy(data))
    } catch {
      // Hors ligne ou non authentifié : on garde la valeur du cache.
      setPharmacy(getCachedPharmacy())
    }
  }, [])

  useEffect(() => {
    if (!user) return
    refresh()
  }, [user, refresh])

  useEffect(() => {
    const handleUpdated = () => {
      // Les paramètres viennent d'être enregistrés : on relit la source de
      // vérité serveur plutôt que de fusionner un éventuel ancien cache.
      if (user) refresh()
    }
    window.addEventListener(PHARMACY_UPDATED_EVENT, handleUpdated)
    return () =>
      window.removeEventListener(PHARMACY_UPDATED_EVENT, handleUpdated)
  }, [refresh, user])

  const value = useMemo(
    () => ({
      pharmacy,
      pharmacyName: pharmacy.name,
      refreshPharmacy: refresh,
    }),
    [pharmacy, refresh]
  )

  return (
    <PharmacyContext.Provider value={value}>
      {children}
    </PharmacyContext.Provider>
  )
}

export function usePharmacy() {
  const context = useContext(PharmacyContext)
  if (!context) {
    // Permet d'utiliser le hook hors provider sans casser le rendu.
    const pharmacy = getCachedPharmacy()
    return {
      pharmacy,
      pharmacyName: pharmacy.name,
      refreshPharmacy: async () => {},
    }
  }
  return context
}

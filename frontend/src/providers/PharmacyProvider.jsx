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
  readLocalPharmacySettings,
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
      // Les paramètres serveur priment, le cache local complète les champs vides.
      setPharmacy(normalizePharmacy(data, readLocalPharmacySettings()))
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
    const handleUpdated = (event) => {
      setPharmacy(
        normalizePharmacy(event?.detail, readLocalPharmacySettings())
      )
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

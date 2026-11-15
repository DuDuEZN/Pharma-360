/**
 * Informations de la pharmacie utilisées sur les documents imprimés
 * (tickets de caisse, factures, rapports, étiquettes).
 *
 * Source de vérité : les paramètres enregistrés côté serveur
 * (`GET /settings/pharmacy`). Un cache local (paramètres gestionnaire)
 * permet d'afficher immédiatement le bon nom avant le chargement réseau.
 */
import { APP_NAME } from './constants'

export const MANAGER_SETTINGS_KEY = 'pharma360_manager_settings'
export const PHARMACY_UPDATED_EVENT = 'pharmacy:updated'

const pick = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Normalise les différentes sources possibles (API, localStorage) vers une
 * forme unique. Les sources sont lues dans l'ordre de priorité.
 */
export function normalizePharmacy(...sources) {
  const merged = {}
  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (typeof value === 'string' && !value.trim()) return
      merged[key] = value
    })
  })

  return {
    name: pick(merged.pharmacy_name, merged.name) || APP_NAME,
    address: pick(merged.pharmacy_address, merged.address),
    phone: pick(merged.pharmacy_phone, merged.phone),
    email: pick(merged.pharmacy_email, merged.email),
    license: pick(merged.pharmacy_license, merged.license),
    taxId: pick(merged.pharmacy_tax_id, merged.taxId),
    currency: pick(merged.currency),
    currencySymbol: pick(merged.currency_symbol),
  }
}

/** Lit les paramètres locaux (saisis par le gestionnaire). */
export function readLocalPharmacySettings() {
  try {
    const raw = localStorage.getItem(MANAGER_SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Valeur disponible immédiatement, avant tout appel réseau. */
export function getCachedPharmacy() {
  return normalizePharmacy(readLocalPharmacySettings())
}

/** Notifie l'application qu'un nom de pharmacie vient d'être enregistré. */
export function emitPharmacyUpdated(pharmacy) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PHARMACY_UPDATED_EVENT, { detail: pharmacy })
  )
}

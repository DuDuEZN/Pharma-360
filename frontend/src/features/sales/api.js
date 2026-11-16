/**
 * API du module Ventes.
 *
 * Tous les appels au domaine Ventes passent par ce point d'entrée.
 * Les pages du module ne doivent plus appeler `/sales` directement.
 */

import api from '@/lib/api'

const BASE = '/sales'

export const salesApi = {
  /** Liste paginée des ventes. */
  list(params) {
    return api.get(`${BASE}/`, { params })
  },

  /** Ventes du jour. */
  getToday() {
    return api.get(`${BASE}/today`)
  },

  /** Ventes en attente de paiement. */
  getPending() {
    return api.get(`${BASE}/pending`)
  },

  /** File d'attente caisse (WebSocket / polling). */
  getQueue() {
    return api.get(`${BASE}/queue`)
  },

  /** Détail d'une vente. */
  getSale(id) {
    return api.get(`${BASE}/${id}`)
  },

  /** Création d'une vente (sélection FEFO côté backend). */
  createSale(payload) {
    return api.post(`${BASE}/`, payload)
  },

  /** Mise à jour d'une vente existante. */
  updateSale(id, payload) {
    return api.put(`${BASE}/${id}`, payload)
  },

  /** Validation du paiement d'une vente. */
  paySale(id, payment) {
    return api.post(`${BASE}/${id}/pay`, payment)
  },

  /** Annulation d'une vente en attente. */
  cancelSale(id) {
    return api.post(`${BASE}/${id}/cancel`)
  },
}

export default salesApi

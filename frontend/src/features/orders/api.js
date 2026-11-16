/**
 * API du module Commandes / Achats.
 *
 * Tous les appels au domaine Commandes passent par ce point d'entrée.
 * La page du module ne doit plus appeler `/manager/orders` directement.
 */

import api from '@/lib/api'

const BASE = '/manager/orders'

export const ordersApi = {
  /** Liste paginée des commandes. */
  list(params) {
    return api.get(BASE, { params })
  },

  /** Détail d'une commande. */
  get(id) {
    return api.get(`${BASE}/${id}`)
  },

  /** Création d'une commande. */
  create(payload) {
    return api.post(BASE, payload)
  },

  /** Mise à jour d'une commande. */
  update(id, payload) {
    return api.put(`${BASE}/${id}`, payload)
  },

  /** Validation d'une commande. */
  validate(id) {
    return api.post(`${BASE}/${id}/validate`)
  },

  /** Rejet d'une commande. */
  reject(id, payload) {
    return api.post(`${BASE}/${id}/reject`, payload)
  },

  /** Suppression d'une commande. */
  delete(id) {
    return api.delete(`${BASE}/${id}`)
  },

  /** Export des commandes. */
  export(params) {
    return api.get(`${BASE}/export`, { params, responseType: 'blob' })
  },
}

export default ordersApi

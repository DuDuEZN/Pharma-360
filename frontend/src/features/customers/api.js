/**
 * API du module Clients.
 *
 * Tous les appels au domaine Clients passent par ce point d'entrée.
 * La page du module ne doit plus appeler `/customers` directement.
 */

import api from '@/lib/api'

const BASE = '/customers'

export const customersApi = {
  /** Liste paginée des clients. */
  list(params) {
    return api.get(`${BASE}/`, { params })
  },

  /** Détail d'un client. */
  getCustomer(id) {
    return api.get(`${BASE}/${id}`)
  },

  /** Création d'un client. */
  createCustomer(payload) {
    return api.post(`${BASE}/`, payload)
  },

  /** Mise à jour d'un client. */
  updateCustomer(id, payload) {
    return api.put(`${BASE}/${id}`, payload)
  },

  /** Suppression d'un client. */
  deleteCustomer(id) {
    return api.delete(`${BASE}/${id}`)
  },

  /** Statistiques d'un client. */
  stats(id) {
    return api.get(`${BASE}/${id}/stats`)
  },

  /** Historique d'achats. */
  purchases(id) {
    return api.get(`${BASE}/${id}/purchases`)
  },

  /** Encours et achats à crédit. */
  credit(id) {
    return api.get(`${BASE}/${id}/credit`)
  },

  /** Commandes du client. */
  orders(id) {
    return api.get(`${BASE}/${id}/orders`)
  },

  /** Factures du client. */
  invoices(id) {
    return api.get(`${BASE}/${id}/invoices`)
  },
}

export default customersApi

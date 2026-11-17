/**
 * API du module Stock.
 *
 * Tous les appels au domaine Stock passent par ce point d'entrée.
 * La page du module ne doit plus appeler `/inventory` directement.
 */

import api from '@/lib/api'

const BASE = '/inventory'

export const inventoryApi = {
  /** Liste des articles de stock. */
  list(params) {
    return api.get(`${BASE}/`, { params })
  },

  /** Stock d'un produit. */
  getByProduct(id) {
    return api.get(`${BASE}/product/${id}`)
  },

  /** Mise à jour du stock d'un produit. */
  updateProduct(id, payload) {
    return api.put(`${BASE}/product/${id}`, payload)
  },

  /** Articles en stock faible. */
  lowStock() {
    return api.get(`${BASE}/low-stock`)
  },

  /** Lots expirant bientôt. */
  expiringSoon() {
    return api.get(`${BASE}/expiring-soon`)
  },

  /** Stock par catégorie. */
  byCategory(id) {
    return api.get(`${BASE}/by-category/${id}`)
  },

  /** Résumé global du stock. */
  summary() {
    return api.get(`${BASE}/summary`)
  },

  /** Stock par emplacement. */
  byLocation(location) {
    return api.get(`${BASE}/location/${location}`)
  },

  /** Réajustement de stock. */
  adjust(payload) {
    return api.post(`${BASE}/adjust`, payload)
  },

  /** Retrait des lots périmés. */
  removeExpired(batchIds) {
    return api.post(`${BASE}/remove-expired`, batchIds ? { batch_ids: batchIds } : undefined)
  },

  /** Lots périmés encore en stock (avant retrait). */
  expired() {
    return api.get(`${BASE}/expired`)
  },

  /** Historique des lots périmés déjà sortis. */
  expiredHistory(params) {
    return api.get(`${BASE}/expired-history`, { params })
  },

  /** Suppression d'un lot périmé ou vide (gestionnaire/admin). */
  deleteBatch(id) {
    return api.delete(`/batches/${id}`)
  },

  /** Import CSV de stock. */
  importCsv(formData) {
    return api.post(`${BASE}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default inventoryApi

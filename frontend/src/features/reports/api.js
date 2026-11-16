/**
 * API du module Rapports.
 *
 * Tous les appels au domaine Rapports passent par ce point d'entrée.
 * Les pages du module ne doivent plus appeler `/reports` ou `/manager/reports`
 * directement.
 */

import api from '@/lib/api'

export const reportsApi = {
  // --- Rapports standards (/reports) ---

  /** Liste paginée des rapports. */
  list(params) {
    return api.get('/reports', { params })
  },

  /** Détail d'un rapport. */
  get(id) {
    return api.get(`/reports/${id}`)
  },

  /** Export des rapports. */
  export(params) {
    return api.get('/reports/export', { params, responseType: 'blob' })
  },

  /** Suppression d'un rapport standard. */
  delete(id) {
    return api.delete(`/reports/${id}`)
  },

  // --- Rapports gestionnaire (/manager/reports) ---

  /** Liste paginée des rapports gestionnaire. */
  listManager(params) {
    return api.get('/manager/reports', { params })
  },

  /** Génération d'un rapport gestionnaire. */
  generateManager(payload) {
    return api.post('/manager/reports/generate', payload)
  },

  /** Téléchargement d'un rapport gestionnaire. */
  downloadManager(id, format = 'pdf') {
    return api.get(`/manager/reports/${id}/download`, {
      params: { format },
      responseType: 'blob',
    })
  },

  /** Suppression d'un rapport gestionnaire. */
  deleteManager(id) {
    return api.delete(`/manager/reports/${id}`)
  },
}

export default reportsApi

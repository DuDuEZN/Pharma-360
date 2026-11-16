/**
 * API du module Caisse.
 *
 * Tous les appels au domaine Caisse passent par ce point d'entrée.
 * La page du module ne doit plus appeler `/cash` directement.
 */

import api from '@/lib/api'

const BASE = '/cash'

export const cashApi = {
  /** État de la caisse courante. */
  current() {
    return api.get(`${BASE}/current`)
  },

  /** Ouverture d'une session de caisse. */
  open(payload) {
    return api.post(`${BASE}/open`, payload)
  },

  /** Clôture d'une session de caisse. */
  close(payload) {
    return api.post(`${BASE}/close`, payload)
  },

  /** Résumé d'une session. */
  summary(id) {
    return api.get(`${BASE}/${id}/summary`)
  },

  /** Liste des sessions. */
  listSessions(params) {
    return api.get(`${BASE}/sessions`, { params })
  },
}

export default cashApi

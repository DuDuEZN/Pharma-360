/**
 * API du module Catalogue.
 *
 * Tous les appels au domaine Catalogue passent par ce point d'entrée.
 * Les pages du module ne doivent plus appeler `/products` directement.
 */

import api from '@/lib/api'

const BASE = '/products'

export const catalogApi = {
  /** Liste paginée des produits. */
  list(params) {
    return api.get(`${BASE}`, { params })
  },

  /** Catégories actives. */
  listCategories() {
    return api.get(`${BASE}/categories`)
  },

  /** Créer une catégorie (admin/manager). */
  createCategory(payload) {
    return api.post(`${BASE}/categories`, payload)
  },

  /** Modifier une catégorie (admin/manager). */
  updateCategory(id, payload) {
    return api.put(`${BASE}/categories/${id}`, payload)
  },

  /** Supprimer une catégorie (admin/manager). */
  deleteCategory(id) {
    return api.delete(`${BASE}/categories/${id}`)
  },

  /** Nombre de produits actifs par catégorie. */
  categoryStats() {
    return api.get(`${BASE}/categories/stats`)
  },

  /** Recherche de produits. */
  search(query, params) {
    return api.get(`${BASE}/search`, { params: { query, ...params } })
  },

  /** Détail d'un produit. */
  getProduct(id) {
    return api.get(`${BASE}/${id}`)
  },

  /** Création d'un produit. */
  createProduct(payload) {
    return api.post(`${BASE}`, payload)
  },

  /** Mise à jour d'un produit. */
  updateProduct(id, payload) {
    return api.put(`${BASE}/${id}`, payload)
  },

  /** Suppression d'un produit. */
  deleteProduct(id) {
    return api.delete(`${BASE}/${id}`)
  },

  /** Produits sous le seuil de stock. */
  lowStock() {
    return api.get(`${BASE}/low-stock`)
  },

  /** Produits dont un lot expire bientôt. */
  expiringSoon() {
    return api.get(`${BASE}/expiring-soon`)
  },

  /** Scan d'un code-barres côté catalogue. */
  scanProduct(barcode) {
    return api.post(`${BASE}/scan`, { barcode })
  },
}

export default catalogApi

/**
 * Module frontend Catalogue — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `ProductsPage`, `ProductFormPage` : les écrans ;
 * - `catalogApi` : la couche d'accès au domaine ;
 * - `catalogNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { Package } from 'lucide-react'

import ProductsPage from './pages/ProductsPage'
import ProductFormPage from './pages/ProductFormPage'
import catalogApi from './api'

export const catalogNavigation = {
  name: 'Produits',
  href: '/products',
  icon: Package,
  roles: ['admin', 'manager', 'seller'],
}

export const catalogModule = {
  name: 'catalog',
  licenseFeature: 'catalog',
  navigation: catalogNavigation,
  pages: { ProductsPage, ProductFormPage },
  api: catalogApi,
}

export { ProductsPage, ProductFormPage, catalogApi }
export default catalogModule

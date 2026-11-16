/**
 * Module frontend Ventes — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `SalesPage`, `SaleFormPage`, `BulkLabelSheet` : les écrans ;
 * - `salesApi` : la couche d'accès au domaine ;
 * - `salesNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `components/`, `api.js`).
 */

import { ShoppingCart } from 'lucide-react'

import SalesPage from './pages/SalesPage'
import SaleFormPage from './pages/SaleFormPage'
import BulkLabelSheet from './components/BulkLabelSheet'
import salesApi from './api'

export const salesNavigation = {
  name: 'Ventes',
  href: '/sales',
  icon: ShoppingCart,
  roles: ['admin', 'manager', 'seller'],
}

export const salesModule = {
  name: 'sales',
  licenseFeature: 'sales',
  navigation: salesNavigation,
  pages: { SalesPage, SaleFormPage },
  components: { BulkLabelSheet },
  api: salesApi,
}

export { SalesPage, SaleFormPage, BulkLabelSheet, salesApi }
export default salesModule

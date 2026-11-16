/**
 * Module frontend Stock — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `InventoryPage` : l'écran ;
 * - `inventoryApi` : la couche d'accès au domaine ;
 * - `inventoryNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { Warehouse } from 'lucide-react'

import InventoryPage from './pages/InventoryPage'
import inventoryApi from './api'

export const inventoryNavigation = {
  name: 'Stock',
  href: '/manager/inventory',
  icon: Warehouse,
  roles: ['admin', 'manager'],
}

export const inventoryModule = {
  name: 'inventory',
  licenseFeature: 'inventory',
  navigation: inventoryNavigation,
  pages: { InventoryPage },
  api: inventoryApi,
}

export { InventoryPage, inventoryApi }
export default inventoryModule

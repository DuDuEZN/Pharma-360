/**
 * Module frontend Commandes / Achats — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `OrdersPage`, `OrderFormPage` : les écrans ;
 * - `ordersApi` : la couche d'accès au domaine ;
 * - `ordersNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { ClipboardList } from 'lucide-react'

import OrdersPage from './pages/OrdersPage'
import OrderFormPage from './pages/OrderFormPage'
import ordersApi from './api'

export const ordersNavigation = {
  name: 'Commandes',
  href: '/manager/orders',
  icon: ClipboardList,
  roles: ['admin', 'manager', 'seller'],
}

export const ordersModule = {
  name: 'orders',
  licenseFeature: 'orders',
  navigation: ordersNavigation,
  pages: { OrdersPage, OrderFormPage },
  api: ordersApi,
}

export { OrdersPage, OrderFormPage, ordersApi }
export default ordersModule

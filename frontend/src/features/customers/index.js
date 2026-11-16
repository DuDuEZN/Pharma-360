/**
 * Module frontend Clients — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `CustomersPage` : l'écran ;
 * - `customersApi` : la couche d'accès au domaine ;
 * - `customersNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { UserRound } from 'lucide-react'

import CustomersPage from './pages/CustomersPage'
import customersApi from './api'

export const customersNavigation = {
  name: 'Clients',
  href: '/customers',
  icon: UserRound,
  roles: ['admin', 'manager', 'seller'],
}

export const customersModule = {
  name: 'customers',
  licenseFeature: 'customers',
  navigation: customersNavigation,
  pages: { CustomersPage },
  api: customersApi,
}

export { CustomersPage, customersApi }
export default customersModule

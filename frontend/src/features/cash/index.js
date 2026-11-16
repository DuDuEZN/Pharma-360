/**
 * Module frontend Caisse — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `CashierPage` : l'écran ;
 * - `cashApi` : la couche d'accès au domaine ;
 * - `cashNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { CreditCard } from 'lucide-react'

import CashierPage from './pages/CashierPage'
import cashApi from './api'

export const cashNavigation = {
  name: 'Caisse',
  href: '/cashier',
  icon: CreditCard,
  roles: ['admin', 'cashier'],
}

export const cashModule = {
  name: 'cash',
  licenseFeature: 'cash',
  navigation: cashNavigation,
  pages: { CashierPage },
  api: cashApi,
}

export { CashierPage, cashApi }
export default cashModule

import InsurancePage from './pages/InsurancePage'
import PrescriptionsPage from './pages/PrescriptionsPage'
export { InsurancePage, PrescriptionsPage }
export { default as insuranceApi } from './api'
export const insuranceNavigation = { name: 'Assurances', href: '/manager/insurance', roles: ['admin','manager','seller'] }

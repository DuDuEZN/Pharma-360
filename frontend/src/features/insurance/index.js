import InsurancePage from './pages/InsurancePage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import PreordersPage from './pages/PreordersPage'
export { InsurancePage, PrescriptionsPage, PreordersPage }
export { default as insuranceApi } from './api'
export const insuranceNavigation = { name: 'Assurances', href: '/manager/insurance', roles: ['admin','manager','seller'] }

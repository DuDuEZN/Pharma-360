/**
 * Module frontend Rapports — bloc autonome du monolithe modulaire.
 *
 * API publique du module :
 * - `AdminReportsPage`, `ManagerReportsPage`, `ReportFormPage` : les écrans ;
 * - `reportsApi` : la couche d'accès au domaine ;
 * - `reportsNavigation` : l'entrée de navigation déclarée par le module.
 *
 * Les autres domaines doivent consommer ce manifeste et non les fichiers
 * internes (`pages/`, `api.js`).
 */

import { FileText } from 'lucide-react'

import AdminReportsPage from './pages/AdminReportsPage'
import ManagerReportsPage from './pages/ManagerReportsPage'
import ReportFormPage from './pages/ReportFormPage'
import reportsApi from './api'

export const reportsNavigation = {
  name: 'Rapports',
  href: '/reports',
  icon: FileText,
  roles: ['admin', 'manager'],
}

export const reportsModule = {
  name: 'reports',
  licenseFeature: 'reports',
  navigation: reportsNavigation,
  pages: { AdminReportsPage, ManagerReportsPage, ReportFormPage },
  api: reportsApi,
}

export { AdminReportsPage, ManagerReportsPage, ReportFormPage, reportsApi }
export default reportsModule

import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../providers/ThemeProvider'
import { usePharmacy } from '../../providers/PharmacyProvider'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  FileText,
  HelpCircle,
  Truck,
  Moon,
  Sun,
  Monitor,
  X,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function Sidebar({ mobileOpen = false, onClose }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { pharmacy } = usePharmacy()
  const location = useLocation()

  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { name: 'Produits', href: '/products', icon: Package, roles: ['admin', 'manager', 'seller'] },
    { name: 'Ventes', href: '/sales', icon: ShoppingCart, roles: ['admin', 'manager', 'seller'] },
    { name: 'Clients', href: '/customers', icon: UserRound, roles: ['admin', 'manager', 'seller'] },
    { name: 'Caisse', href: '/cashier', icon: CreditCard, roles: ['admin', 'cashier'] },
    { name: 'Commandes', href: '/manager/orders', icon: ClipboardList, roles: ['seller'] },
    { name: 'Administrateur', href: '/admin', icon: Users, roles: ['admin'] },
    { name: 'Gestionnaire', href: '/manager', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'Livraisons', href: '/manager/deliveries', icon: Truck, roles: ['seller'] },
    { name: 'Rapports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
    { name: 'Paramètres', href: user?.role === 'manager' ? '/manager/settings' : '/settings', icon: Settings, roles: ['admin', 'manager'] },
    { name: 'Aide', href: '/help', icon: HelpCircle, roles: ['admin', 'manager', 'seller', 'cashier'] },
  ]

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  const themeItems = [
    { icon: Sun, label: 'Clair', value: 'light' },
    { icon: Moon, label: 'Sombre', value: 'dark' },
    { icon: Monitor, label: 'Système', value: 'system' },
  ]

  return (
    <>
      {/* Voile mobile */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-apple lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[264px] flex-col border-r border-black/[0.06] bg-white/75 backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-[320ms] ease-spring dark:border-white/10 dark:bg-[#161617]/80 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / nom de la pharmacie */}
        <div className="flex h-[68px] items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-primary-500 to-primary-700 shadow-apple-sm">
            <Package className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-secondary-900 dark:text-white">
              {pharmacy.name}
            </p>
            <p className="text-[11px] font-medium text-secondary-500 dark:text-secondary-400">
              Gestion de pharmacie
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-secondary-500 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/10 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {filteredNavigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href + '/'))

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive: linkActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium tracking-tight transition-all duration-200 ease-apple',
                    isActive || linkActive
                      ? 'bg-primary-600 text-white shadow-apple-sm'
                      : 'text-secondary-600 hover:bg-black/[0.045] hover:text-secondary-900 dark:text-secondary-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
                  )
                }
              >
                {({ isActive: linkActive }) => {
                  const active = isActive || linkActive
                  return (
                    <>
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                          active
                            ? 'text-white'
                            : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                        )}
                        strokeWidth={2}
                      />
                      <span className="truncate">{item.name}</span>
                    </>
                  )
                }}
              </NavLink>
            )
          })}
        </nav>

        {/* Sélecteur de thème */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-1 rounded-xl border border-black/[0.06] bg-white/60 p-1 dark:border-white/10 dark:bg-white/[0.06]">
            {themeItems.map((themeItem) => (
              <button
                key={themeItem.value}
                onClick={() => setTheme(themeItem.value)}
                title={themeItem.label}
                className={cn(
                  'flex h-8 flex-1 items-center justify-center rounded-lg transition-all duration-200 ease-apple',
                  theme === themeItem.value
                    ? 'bg-white text-secondary-900 shadow-apple-sm dark:bg-white/15 dark:text-white'
                    : 'text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300'
                )}
              >
                <themeItem.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

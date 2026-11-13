import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../providers/ThemeProvider'
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
  Monitor
} from 'lucide-react'
import { cn, truncate } from '@/lib/utils'
import { Badge } from '../ui/Badge'


function Sidebar() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  const navigation = [
    { 
      name: 'Tableau de bord', 
      href: '/', 
      icon: LayoutDashboard,
      roles: ['admin', 'manager']
    },
    { 
      name: 'Produits', 
      href: '/products', 
      icon: Package,
      roles: ['admin', 'manager', 'seller']
    },
    { 
      name: 'Ventes', 
      href: '/sales', 
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'seller']
    },
    { 
      name: 'Caisse', 
      href: '/cashier', 
      icon: CreditCard,
      roles: ['admin', 'cashier']
    },
    {
      name: 'Commandes',
      href: '/manager/orders',
      icon: ClipboardList,
      roles: ['seller']
    },
    { 
      name: 'Administrateur', 
      href: '/admin', 
      icon: Users,
      roles: ['admin']
    },
    { 
      name: 'Gestionnaire', 
      href: '/manager', 
      icon: BarChart3,
      roles: ['admin', 'manager']
    },
    {
      name: 'Livraisons',
      href: '/manager/deliveries',
      icon: Truck,
      roles: ['seller']
    },
    { 
      name: 'Rapports', 
      href: '/reports', 
      icon: FileText,
      roles: ['admin', 'manager']
    },
    { 
      name: 'Paramètres', 
      href: '/settings', 
      icon: Settings,
      roles: ['admin', 'manager']
    },
    { 
      name: 'Aide', 
      href: '/help', 
      icon: HelpCircle,
      roles: ['admin', 'manager', 'seller', 'cashier']
    },
  ]

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  const themeItems = [
    { icon: Sun, label: 'Light', value: 'light' },
    { icon: Moon, label: 'Dark', value: 'dark' },
    { icon: Monitor, label: 'System', value: 'system' },
  ]

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 lg:translate-x-0 -translate-x-full transition-transform duration-300 ease-in-out">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">Pharma 360</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/')
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive: linkActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive || linkActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 transition-colors',
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-400 dark:text-gray-500'
              )} />
              <span>{truncate(item.name, 20)}</span>
              {item.name === 'Caisse' && user?.role === 'cashier' && (
                <Badge variant="success" size="xs">Nouveau</Badge>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {themeItems.map((themeItem) => (
            <button
              key={themeItem.value}
              onClick={() => setTheme(themeItem.value)}
              title={themeItem.label}
              className={cn(
                'p-1.5 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700',
                theme === themeItem.value 
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' 
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <themeItem.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Sidebar

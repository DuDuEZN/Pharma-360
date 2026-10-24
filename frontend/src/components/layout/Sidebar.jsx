import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  FileText,
  HelpCircle
} from 'lucide-react'
import { clsx } from 'clsx'

function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()

  const navigation = [
    { 
      name: 'Tableau de bord', 
      href: '/', 
      icon: LayoutDashboard,
      roles: ['admin', 'gestionnaire', 'vendeur', 'caissier']
    },
    { 
      name: 'Produits', 
      href: '/products', 
      icon: Package,
      roles: ['admin', 'gestionnaire', 'vendeur']
    },
    { 
      name: 'Ventes', 
      href: '/sales', 
      icon: ShoppingCart,
      roles: ['admin', 'gestionnaire', 'vendeur']
    },
    { 
      name: 'Caisse', 
      href: '/cashier', 
      icon: CreditCard,
      roles: ['admin', 'caissier', 'vendeur']
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
      roles: ['admin', 'gestionnaire']
    },
    { 
      name: 'Rapports', 
      href: '/reports', 
      icon: FileText,
      roles: ['admin', 'gestionnaire']
    },
    { 
      name: 'Paramètres', 
      href: '/settings', 
      icon: Settings,
      roles: ['admin', 'gestionnaire']
    },
    { 
      name: 'Aide', 
      href: '/help', 
      icon: HelpCircle,
      roles: ['admin', 'gestionnaire', 'vendeur', 'caissier']
    },
  ]

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 lg:translate-x-0 -translate-x-full transition-transform duration-300 ease-in-out">
      <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">Pharmacie 360</span>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/')
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={clsx('w-5 h-5', isActive ? 'text-primary-600' : 'text-gray-400')} />
              {item.name}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar

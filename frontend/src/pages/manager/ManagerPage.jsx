import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Package, BarChart3, FileText, Settings, ShoppingCart, Users } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Manager Page for Pharmacie 360
 * Manager dashboard for stock and supplier management
 * 
 * FRNT-008: Session Gestionnaire (Approvisionnement + Stock)
 */
function ManagerPage() {
  const location = useLocation()

  const managerNav = [
    { 
      path: '/manager/suppliers', 
      name: 'Fournisseurs', 
      icon: Users,
      description: 'Gestion des fournisseurs'
    },
    { 
      path: '/manager/inventory', 
      name: 'Inventaire', 
      icon: Package,
      description: 'Gestion des stocks et inventaire'
    },
    { 
      path: '/manager/orders', 
      name: 'Commandes', 
      icon: ShoppingCart,
      description: 'Commandes d\'approvisionnement'
    },
    { 
      path: '/manager/reports', 
      name: 'Rapports', 
      icon: FileText,
      description: 'Rapports de stock et ventes'
    },
    { 
      path: '/manager/analytics', 
      name: 'Analytics', 
      icon: BarChart3,
      description: 'Analyse des stocks et rotations'
    },
    { 
      path: '/manager/settings', 
      name: 'Paramètres', 
      icon: Settings,
      description: 'Paramètres gestionnaire'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Gestionnaire
        </h1>
        <p className="text-gray-500 mt-1">
          Gestion des stocks, fournisseurs et approvisionnements
        </p>
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managerNav.map((item) => {
            const isActive = location.pathname === item.path || 
                             location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div className={`p-3 rounded-full ${isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <Outlet />
      </div>
    </div>
  )
}

export default ManagerPage

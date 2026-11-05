import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Package, BarChart3, FileText, Settings, ShoppingCart, Users, Truck, ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { cn } from '../../lib/utils'

/**
 * Manager Page for Pharma 360
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
      description: 'Gestion des fournisseurs et factures',
      badge: 'OCR'
    },
    { 
      path: '/manager/inventory', 
      name: 'Inventaire', 
      icon: Package,
      description: 'Gestion des stocks et inventaire',
      badge: 'FEFO'
    },
    { 
      path: '/manager/orders', 
      name: 'Commandes', 
      icon: ShoppingCart,
      description: 'Commandes d\'approvisionnement',
    },
    { 
      path: '/manager/deliveries', 
      name: 'Livraisons', 
      icon: Truck,
      description: 'Suivi des livraisons fournisseurs',
    },
    { 
      path: '/manager/reports', 
      name: 'Rapports', 
      icon: FileText,
      description: 'Rapports de stock et ventes',
    },
    { 
      path: '/manager/analytics', 
      name: 'Analytics', 
      icon: BarChart3,
      description: 'Analyse des stocks et rotations',
    },
    { 
      path: '/manager/dashboard', 
      name: 'Tableau de bord', 
      icon: ClipboardList,
      description: 'Vue d\'ensemble et KPIs',
    },
    { 
      path: '/manager/settings', 
      name: 'Paramètres', 
      icon: Settings,
      description: 'Paramètres gestionnaire',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestionnaire</CardTitle>
          <CardDescription>
            Gestion des stocks, fournisseurs et approvisionnements
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navigation Cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {managerNav.map((item) => {
              const isActive = location.pathname === item.path || 
                               location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex flex-col gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md',
                    isActive
                      ? 'border-primary-200 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-200'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30' 
                      : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30'
                  )}>
                    <item.icon className={cn(
                      'w-6 h-6 transition-colors',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400' 
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'font-medium transition-colors',
                        isActive
                          ? 'text-primary-900 dark:text-primary-100' 
                          : 'text-gray-900 dark:text-white group-hover:text-primary-900 dark:group-hover:text-primary-100'
                      )}>
                        {item.name}
                      </p>
                      {item.badge && (
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          <Outlet />
        </CardContent>
      </Card>
    </div>
  )
}

export default ManagerPage

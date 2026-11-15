import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Package, BarChart3, FileText, Settings, ShoppingCart, Users, Truck, ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Manager Page for Pharma 360
 * Manager dashboard for stock and supplier management
 * 
 * FRNT-008: Session Gestionnaire (Approvisionnement + Stock)
 */
function ManagerPage() {
  const location = useLocation()
  const { user } = useAuth()

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

  // Un vendeur accède aux commandes (création) et aux livraisons.
  const sellerPaths = ['/manager/orders', '/manager/deliveries']
  const visibleNav = user?.role === 'seller'
    ? managerNav.filter((item) => sellerPaths.includes(item.path))
    : managerNav

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'seller' ? 'Commandes & livraisons' : 'Gestionnaire'}
          </CardTitle>
          <CardDescription>
            {user?.role === 'seller'
              ? 'Lancez les commandes fournisseurs et suivez les livraisons'
              : 'Gestion des stocks, fournisseurs et approvisionnements'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navigation Cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleNav.map((item) => {
              const isActive = location.pathname === item.path || 
                               location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 ease-apple hover:-translate-y-0.5 hover:shadow-apple',
                    isActive
                      ? 'border-primary-500/30 bg-primary-500/[0.08]'
                      : 'border-black/[0.06] bg-white/40 hover:border-primary-500/25 dark:border-white/10 dark:bg-white/[0.03]'
                  )}
                >
                  <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white shadow-apple-sm'
                      : 'bg-black/[0.045] text-secondary-600 group-hover:bg-primary-600 group-hover:text-white dark:bg-white/10 dark:text-secondary-300'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'font-medium tracking-tight transition-colors',
                        isActive
                          ? 'text-primary-800 dark:text-primary-200'
                          : 'text-secondary-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300'
                      )}>
                        {item.name}
                      </p>
                      {item.badge && (
                        <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
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
      <Outlet />
    </div>
  )
}

export default ManagerPage

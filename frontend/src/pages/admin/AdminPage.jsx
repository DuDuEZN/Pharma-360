import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Users, Settings, Shield, Key, FileText, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { cn } from '@/lib/utils'

/**
 * Admin Page for Pharma 360
 * Administration dashboard with user and role management
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function AdminPage() {
  const location = useLocation()

  const adminNav = [
    { 
      path: '/admin/users', 
      name: 'Utilisateurs', 
      icon: Users,
      description: 'Gestion des utilisateurs'
    },
    { 
      path: '/admin/roles', 
      name: 'Rôles', 
      icon: Shield,
      description: 'Gestion des rôles et permissions'
    },
    { 
      path: '/admin/permissions', 
      name: 'Permissions', 
      icon: Key,
      description: 'Gestion des permissions'
    },
    { 
      path: '/admin/settings', 
      name: 'Paramètres', 
      icon: Settings,
      description: 'Paramètres système'
    },
    { 
      path: '/admin/reports', 
      name: 'Rapports', 
      icon: FileText,
      description: 'Rapports et statistiques'
    },
    { 
      path: '/admin/analytics', 
      name: 'Analytics', 
      icon: BarChart3,
      description: 'Analyse des données'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>
            Gestion des utilisateurs, rôles et paramètres système
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navigation Cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminNav.map((item) => {
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
                    <p className={cn(
                      'font-medium transition-colors',
                      isActive
                        ? 'text-primary-900 dark:text-primary-100' 
                        : 'text-gray-900 dark:text-white group-hover:text-primary-900 dark:group-hover:text-primary-100'
                    )}>
                      {item.name}
                    </p>
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

export default AdminPage

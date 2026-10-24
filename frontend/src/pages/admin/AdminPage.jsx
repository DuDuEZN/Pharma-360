import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Users, Settings, Shield, Key, FileText, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Admin Page for Pharmacie 360
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Administration
        </h1>
        <p className="text-gray-500 mt-1">
          Gestion des utilisateurs, rôles et paramètres système
        </p>
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminNav.map((item) => {
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

export default AdminPage

import React from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, CreditCard, Users, BarChart3, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAlerts } from '../hooks/useAlerts'
import { AlertSystem } from '../components/common'

function DashboardPage() {
  const { user } = useAuth()
  const { alertsStats, isLoading } = useAlerts()

  const dashboardStats = [
    { 
      label: 'Produits en stock', 
      value: '1,234', 
      icon: Package,
      color: 'primary',
      bgColor: 'bg-primary-50'
    },
    { 
      label: 'Ventes aujourd\'hui', 
      value: '156', 
      icon: ShoppingCart,
      color: 'success',
      bgColor: 'bg-success-50'
    },
    { 
      label: 'Chiffre d\'affaires', 
      value: '234,500 XOF', 
      icon: CreditCard,
      color: 'warning',
      bgColor: 'bg-warning-50'
    },
    { 
      label: 'Alertes actives', 
      value: isLoading ? '...' : alertsStats.total,
      icon: AlertTriangle,
      color: alertsStats.critical > 0 ? 'danger' : alertsStats.warning > 0 ? 'warning' : 'primary',
      bgColor: alertsStats.critical > 0 ? 'bg-danger-50' : alertsStats.warning > 0 ? 'bg-warning-50' : 'bg-primary-50'
    },
  ]

  const quickActions = [
    { 
      label: 'Nouveau produit', 
      href: '/products/new',
      icon: Package,
      color: 'primary'
    },
    { 
      label: 'Nouvelle vente', 
      href: '/sales/new',
      icon: ShoppingCart,
      color: 'success'
    },
    { 
      label: 'Caisse', 
      href: '/cashier',
      icon: CreditCard,
      color: 'warning'
    },
    { 
      label: 'Gestion utilisateurs', 
      href: '/admin/users',
      icon: Users,
      color: 'secondary'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.username}!
        </h1>
        <p className="text-gray-500 mt-1">
          Voici un aperçu de votre pharmacie pour aujourd'hui
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <div
            key={stat.label}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className={`card text-center p-4 hover:shadow-lg transition-shadow duration-200 border-2 border-${action.color}-200`}
            >
              <div className={`mx-auto w-12 h-12 bg-${action.color}-50 rounded-full flex items-center justify-center mb-3`}>
                <action.icon className={`w-6 h-6 text-${action.color}-600`} />
              </div>
              <p className="text-sm font-medium text-gray-700">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventes récentes
          </h2>
          <div className="card">
            <p className="text-gray-500 text-center py-8">
              Aucune vente récente
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Alertes de stock et péremption
          </h2>
          <div className="card">
            <AlertSystem showStats={false} showFilters={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

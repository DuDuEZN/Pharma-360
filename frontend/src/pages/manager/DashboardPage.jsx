import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ShoppingCart, CreditCard, Users, BarChart3, Clock, 
  AlertTriangle, TrendingUp, TrendingDown, ArrowRight, 
  Calendar, DollarSign, Activity
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, 
  BarElement, PointElement, LineElement
)

function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch stats
      const [statsRes, salesRes, productsRes] = await Promise.all([
        api.get('/api/v1/alerts/stats'),
        api.get(`/api/v1/sale-history/analytics?period=${timeRange}`),
        api.get('/api/v1/sale-history/products/top?limit=5')
      ])
      
      setStats(statsRes.data)
      setSalesData(salesRes.data)
      setTopProducts(productsRes.data.top_products || [])
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      window.toast.error('Échec du chargement des données du tableau de bord')
    } finally {
      setLoading(false)
    }
  }

  // Chart data for sales by category
  const categoryChartData = {
    labels: salesData?.sales_by_category?.map(c => c.category_name) || [],
    datasets: [
      {
        label: 'Ventes par catégorie',
        data: salesData?.sales_by_category?.map(c => c.revenue) || [],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
        ],
        borderWidth: 0
      }
    ]
  }

  // Chart data for sales by day
  const dailyChartData = {
    labels: salesData?.sales_by_day?.map(d => new Date(d.date).toLocaleDateString('fr-FR')) || [],
    datasets: [
      {
        label: 'Chiffre d\'affaires',
        data: salesData?.sales_by_day?.map(d => d.revenue) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  // Chart data for top products
  const productsChartData = {
    labels: topProducts.map(p => p.product_name),
    datasets: [
      {
        label: 'Quantité vendue',
        data: topProducts.map(p => p.quantity),
        backgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  }

  // Stats cards
  const statCards = [
    {
      label: 'Ventes totales',
      value: salesData?.total_sales || 0,
      icon: ShoppingCart,
      color: 'primary',
      bgColor: 'bg-primary-50',
      trend: 'up',
      trendValue: '+12%'
    },
    {
      label: 'Chiffre d\'affaires',
      value: salesData ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(salesData.total_revenue) : '0 XOF',
      icon: DollarSign,
      color: 'success',
      bgColor: 'bg-success-50',
      trend: 'up',
      trendValue: '+8%'
    },
    {
      label: 'Quantité totale',
      value: salesData?.total_quantity || 0,
      icon: Package,
      color: 'warning',
      bgColor: 'bg-warning-50',
      trend: 'down',
      trendValue: '-2%'
    },
    {
      label: 'Alertes actives',
      value: stats?.total || 0,
      icon: AlertTriangle,
      color: stats?.critical > 0 ? 'danger' : 'warning',
      bgColor: stats?.critical > 0 ? 'bg-danger-50' : 'bg-warning-50',
      trend: stats?.critical > 0 ? 'up' : 'stable',
      trendValue: stats?.critical > 0 ? `+${stats.critical}` : '0'
    }
  ]

  // Quick actions
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
      label: 'Approvisionnement',
      href: '/manager/inventory',
      icon: BarChart3,
      color: 'warning'
    },
    {
      label: 'Fournisseurs',
      href: '/manager/suppliers',
      icon: Users,
      color: 'secondary'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-500 mt-1">Chargement en cours...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">
            Bonjour, {user?.username} ! Voici l'aperçu de votre pharmacie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow p-6 border border-gray-100 ${stat.bgColor}`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div className="flex gap-1">
                <span className={`text-xs px-2 py-1 rounded-full bg-${stat.color}-100 text-${stat.color}-700`}>
                  {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
                </span>
                <span className="text-xs text-gray-500">{stat.trendValue}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Category */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ventes par catégorie</h3>
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                }
              }}
              width={300}
              height={250}
            />
          </div>
        </div>

        {/* Daily Sales */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Chiffre d'affaires par jour
          </h3>
          <div className="h-64">
            <Line
              data={dailyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'XOF' 
                        }).format(context.parsed.y)
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'XOF',
                        notation: 'compact'
                      }).format(value)
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Produits les plus vendus
          </h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.product_name}</p>
                  <p className="text-sm text-gray-500">{product.quantity} unités</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'XOF' 
                    }).format(product.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actions rapides
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className={`w-12 h-12 rounded-xl bg-${action.color}-100 flex items-center justify-center`}>
                  <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Ventes récentes
          </h3>
          <Link to="/sales" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">N° Vente</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Client</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Montant</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 text-sm">VE-{1000 + i}</td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date().toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 text-sm">Client {i + 1}</td>
                  <td className="py-4 text-sm text-right">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'XOF' 
                    }).format(Math.random() * 50000 + 1000)}
                  </td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Terminé
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

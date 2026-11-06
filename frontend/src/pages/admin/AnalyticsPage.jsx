import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, TrendingDown, Package, DollarSign, Calendar, Users, ShoppingCart, ArrowUp, ArrowDown, Filter, Download, RefreshCw, Shield, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { cn, formatCurrency, formatDate, formatPercentage } from '../../lib/utils'

function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [usersData, setUsersData] = useState(null)
  const [systemData, setSystemData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const { addToast } = useToast()

  const timeRanges = [
    { value: 'day', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'all', label: 'Tout' },
  ]

  useEffect(() => {
    fetchCategories()
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, categoryFilter, userFilter])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { limit: 50 } })
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all analytics data in parallel
      const [statsRes, salesRes, stockRes, productsRes, usersRes, systemRes] = await Promise.all([
        api.get('/admin/analytics/stats', { 
          params: { 
            range: timeRange, 
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            user: userFilter !== 'all' ? userFilter : undefined 
          } 
        }),
        api.get('/admin/analytics/sales', { 
          params: { 
            range: timeRange, 
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            user: userFilter !== 'all' ? userFilter : undefined 
          } 
        }),
        api.get('/admin/analytics/stock', { 
          params: { 
            range: timeRange, 
            category: categoryFilter !== 'all' ? categoryFilter : undefined 
          } 
        }),
        api.get('/admin/analytics/top-products', { params: { range: timeRange, limit: 10 } }),
        api.get('/admin/analytics/users', { params: { range: timeRange } }),
        api.get('/admin/analytics/system')
      ])
      
      setStats(statsRes.data)
      setSalesData(salesRes.data)
      setStockData(stockRes.data)
      setTopProducts(productsRes.data.products || [])
      setUsersData(usersRes.data)
      setSystemData(systemRes.data)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les données d\'analyse'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchAnalytics()
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/analytics/export', {
        params: {
          range: timeRange,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          user: userFilter !== 'all' ? userFilter : undefined
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `analytics_admin_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Export terminé'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'exporter les données'
      })
    }
  }

  // Render stat card
  const StatCard = ({ icon: Icon, title, value, change, changeType = 'increase', trend }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            <div className="flex items-center gap-1 mt-2">
              {change && (
                <>
                  {changeType === 'increase' ? (
                    <ArrowUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {change}
                  </span>
                </>
              )}
              {trend && (
                <span className="text-sm text-gray-500">vs {trend}</span>
              )}
            </div>
          </div>
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render mini bar chart (simplified)
  const MiniBarChart = ({ data, color = '#3b82f6' }) => {
    const maxValue = Math.max(...data, 1)
    
    return (
      <div className="flex items-end gap-1 h-8">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-200 rounded-t-sm"
            style={{ 
              height: `${(value / maxValue) * 100}%`,
              backgroundColor: index === data.length - 1 ? color : '#e5e7eb'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-600" />
            Analytics Administrateur
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Vue d'ensemble complète des performances du système
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button type="button" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              title="Chiffre d'affaires total"
              value={stats?.total_sales ? formatCurrency(stats.total_sales) : '0 MAD'}
              change={stats?.sales_change ? formatPercentage(stats.sales_change) : null}
              changeType={stats?.sales_change && stats.sales_change >= 0 ? 'increase' : 'decrease'}
              trend={timeRanges.find(r => r.value === timeRange)?.label}
            />
            
            <StatCard
              icon={ShoppingCart}
              title="Ventes totales"
              value={stats?.total_transactions || 0}
              change={stats?.transactions_change ? formatPercentage(stats.transactions_change) : null}
              changeType={stats?.transactions_change && stats.transactions_change >= 0 ? 'increase' : 'decrease'}
              trend={timeRanges.find(r => r.value === timeRange)?.label}
            />
            
            <StatCard
              icon={Package}
              title="Produits vendus"
              value={stats?.total_items_sold || 0}
              change={stats?.items_change ? formatPercentage(stats.items_change) : null}
              changeType={stats?.items_change && stats.items_change >= 0 ? 'increase' : 'decrease'}
              trend={timeRanges.find(r => r.value === timeRange)?.label}
            />
            
            <StatCard
              icon={Users}
              title="Clients uniques"
              value={stats?.unique_customers || 0}
              change={stats?.customers_change ? formatPercentage(stats.customers_change) : null}
              changeType={stats?.customers_change && stats.customers_change >= 0 ? 'increase' : 'decrease'}
              trend={timeRanges.find(r => r.value === timeRange)?.label}
            />
          </div>

          {/* Stock Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Package}
              title="Stock total"
              value={stats?.total_stock || 0}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={TrendingUp}
              title="Valeur stock"
              value={stats?.stock_value ? formatCurrency(stats.stock_value) : '0 MAD'}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={AlertCircle}
              title="Produits en rupture"
              value={stats?.out_of_stock || 0}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={Calendar}
              title="Produits périmés"
              value={stats?.expired_products || 0}
              change={null}
              trend={null}
            />
          </div>

          {/* User Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title="Utilisateurs actifs"
              value={usersData?.active_users || 0}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={Activity}
              title="Sessions actives"
              value={usersData?.active_sessions || 0}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={ShoppingCart}
              title="Ventes par utilisateur"
              value={usersData?.avg_sales_per_user ? formatCurrency(usersData.avg_sales_per_user) : '0 MAD'}
              change={null}
              trend={null}
            />
            
            <StatCard
              icon={DollarSign}
              title="CA moyen par utilisateur"
              value={usersData?.avg_revenue_per_user ? formatCurrency(usersData.avg_revenue_per_user) : '0 MAD'}
              change={null}
              trend={null}
            />
          </div>

          {/* System Stats */}
          {systemData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Requêtes API (24h)</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{systemData.api_requests}</p>
                      <MiniBarChart data={systemData.api_requests_trend || []} />
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Temps de réponse moyen</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{systemData.avg_response_time}ms</p>
                      <MiniBarChart data={systemData.response_time_trend || []} color="#f59e0b" />
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Erreurs (24h)</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{systemData.errors}</p>
                      <MiniBarChart data={systemData.errors_trend || []} color="#ef4444" />
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Espace disque utilisé</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{systemData.disk_usage}%</p>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${systemData.disk_usage}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs for detailed views */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="sales">Ventes</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 des produits les plus vendus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topProducts.length > 0 ? (
                      <div className="space-y-3">
                        {topProducts.map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-primary-100 dark:bg-primary-900 rounded-full font-bold text-primary-600">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {product.barcode} - {product.category_name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{product.quantity} {product.unit}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {formatCurrency(product.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucun produit vendu</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Produits avec la meilleure marge</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats?.top_margin_products ? (
                      <div className="space-y-3">
                        {stats.top_margin_products.map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full font-bold text-green-600">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{product.barcode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{formatPercentage(product.margin)}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {formatCurrency(product.selling_price)} - {formatCurrency(product.purchase_price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Activité des utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersData?.user_activity ? (
                    <div className="space-y-3">
                      {usersData.user_activity.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center bg-primary-100 dark:bg-primary-900 rounded-full">
                              <span className="font-bold text-primary-600">
                                {user.username.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{user.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{user.sales_count} ventes</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {formatCurrency(user.total_sales)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucune activité utilisateur</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ventes par catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesData?.by_category ? (
                    <div className="space-y-3">
                      {salesData.by_category.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }}
                            />
                            <span>{cat.category_name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-40 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-primary-600 rounded-full" 
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                            <span className="font-medium">{formatCurrency(cat.amount)}</span>
                            <span className="text-sm text-gray-500">{cat.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Produits proches de la péremption</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stockData?.expiring_soon ? (
                      <div className="space-y-3">
                        {stockData.expiring_soon.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {product.barcode} - Expire dans {product.days_until_expiry} jours
                              </p>
                            </div>
                            <Badge variant="warning">
                              {product.quantity} {product.unit}
                            </Badge>
                          </div>
                        ))}
                        {stockData.expiring_soon.length > 5 && (
                          <p className="text-center text-sm text-gray-500">
                            +{stockData.expiring_soon.length - 5} autres produits
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucun produit proche de la péremption</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Produits en rupture de stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stockData?.out_of_stock_products ? (
                      <div className="space-y-3">
                        {stockData.out_of_stock_products.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{product.barcode}</p>
                            </div>
                            <Badge variant="danger">Rupture</Badge>
                          </div>
                        ))}
                        {stockData.out_of_stock_products.length > 5 && (
                          <p className="text-center text-sm text-gray-500">
                            +{stockData.out_of_stock_products.length - 5} autres produits
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucun produit en rupture</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance des utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersData?.user_performance ? (
                    <div className="space-y-3">
                      {usersData.user_performance.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-primary-100 dark:bg-primary-900 rounded-full">
                              <span className="font-bold text-primary-600 text-lg">
                                {user.username.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-lg">{user.username}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{user.role}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold">{user.sales_count}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Ventes</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{formatCurrency(user.total_sales)}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">CA</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{user.avg_transaction}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Panier moyen</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucune donnée utilisateur</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

export default AdminAnalyticsPage

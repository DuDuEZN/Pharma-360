import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, TrendingDown, Package, DollarSign, Calendar, Users, ShoppingCart, ArrowUp, ArrowDown, Filter, Download, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { cn, formatCurrency, formatDate, formatPercentage } from '../../lib/utils'
import Chart from 'chart.js/auto'

function AnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const { addToast } = useToast()

  const timeRanges = [
    { value: 'day', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
  ]

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, categoryFilter])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all analytics data in parallel
      const [statsRes, salesRes, stockRes, productsRes] = await Promise.all([
        api.get('/analytics/stats', { params: { range: timeRange, category: categoryFilter !== 'all' ? categoryFilter : undefined } }),
        api.get('/analytics/sales', { params: { range: timeRange, category: categoryFilter !== 'all' ? categoryFilter : undefined } }),
        api.get('/analytics/stock', { params: { range: timeRange, category: categoryFilter !== 'all' ? categoryFilter : undefined } }),
        api.get('/analytics/top-products', { params: { range: timeRange, limit: 10 } })
      ])
      
      setStats(statsRes.data)
      setSalesData(salesRes.data)
      setStockData(stockRes.data)
      setTopProducts(productsRes.data.products || [])
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
      const response = await api.get('/analytics/export', {
        params: {
          range: timeRange,
          category: categoryFilter !== 'all' ? categoryFilter : undefined
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `analytics_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`)
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

  // Render bar chart
  const BarChart = ({ data, title }) => {
    const chartRef = React.useRef(null)
    const chartInstance = React.useRef(null)

    React.useEffect(() => {
      if (data && chartRef.current) {
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }

        const ctx = chartRef.current.getContext('2d')
        
        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.labels || [],
            datasets: [{
              label: data.label || '',
              data: data.values || [],
              backgroundColor: data.colors || '#3b82f6',
              borderRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: title ? true : false,
                text: title,
                font: {
                  size: 14
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        })
      }
      
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }
      }
    }, [data])

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <canvas ref={chartRef} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render line chart
  const LineChart = ({ data, title }) => {
    const chartRef = React.useRef(null)
    const chartInstance = React.useRef(null)

    React.useEffect(() => {
      if (data && chartRef.current) {
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }

        const ctx = chartRef.current.getContext('2d')
        
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels || [],
            datasets: data.datasets || []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              },
              title: {
                display: title ? true : false,
                text: title,
                font: {
                  size: 14
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        })
      }
      
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }
      }
    }, [data])

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <canvas ref={chartRef} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const salesChartData = useMemo(() => {
    if (!salesData) return null
    
    return {
      labels: salesData.daily?.map(d => formatDate(d.date, 'dd MMM')) || [],
      datasets: [
        {
          label: 'Ventes',
          data: salesData.daily?.map(d => d.amount) || [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }, [salesData])

  const stockChartData = useMemo(() => {
    if (!stockData) return null
    
    return {
      labels: stockData.by_category?.map(c => c.category_name) || [],
      values: stockData.by_category?.map(c => c.quantity) || [],
      label: 'Quantité',
      colors: stockData.by_category?.map((c, i) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#eab308']
        return colors[i % colors.length]
      }) || []
    }
  }, [stockData])

  const topProductsChartData = useMemo(() => {
    if (!topProducts || topProducts.length === 0) return null
    
    return {
      labels: topProducts.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name),
      values: topProducts.map(p => p.quantity),
      label: 'Quantité vendue',
      colors: '#10b981'
    }
  }, [topProducts])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            Analytics et rapports
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Analyse des ventes, stocks et performances
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              title="Chiffre d'affaires"
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

          {/* Tabs for different views */}
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sales">Ventes</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="products">Top Produits</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LineChart
                  data={salesChartData}
                  title="Évolution des ventes"
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Ventes par catégorie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesData?.by_category ? (
                      <div className="space-y-3">
                        {salesData.by_category.map((cat, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] }}
                              />
                              <span>{cat.category_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
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
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ventes par jour de la semaine</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesData?.by_day_of_week ? (
                      <div className="space-y-3">
                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, index) => {
                          const data = salesData.by_day_of_week.find(d => d.day === index)
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <span>{day}</span>
                              <div className="flex items-center gap-4">
                                <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full mx-4">
                                  <div 
                                    className="h-2 bg-primary-600 rounded-full" 
                                    style={{ width: `${data ? data.percentage : 0}%` }}
                                  />
                                </div>
                                <span className="font-medium">{data ? formatCurrency(data.amount) : '0 MAD'}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Ventes par heure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesData?.by_hour ? (
                      <div className="space-y-3">
                        {salesData.by_hour.map((hour, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span>{hour.hour}h</span>
                            <div className="flex items-center gap-4">
                              <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full mx-4">
                                <div 
                                  className="h-2 bg-green-600 rounded-full" 
                                  style={{ width: `${hour.percentage}%` }}
                                />
                              </div>
                              <span className="font-medium">{formatCurrency(hour.amount)}</span>
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
            </TabsContent>

            <TabsContent value="stock" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BarChart
                  data={stockChartData}
                  title="Stock par catégorie"
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Rotation des stocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stockData?.rotation ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Rotation rapide (A)</span>
                          <div className="flex items-center gap-4">
                            <div className="w-full max-w-xs h-3 bg-gray-200 rounded-full mx-4">
                              <div 
                                className="h-3 bg-green-600 rounded-full" 
                                style={{ width: `${stockData.rotation.fast * 100}%` }}
                              />
                            </div>
                            <span className="font-medium">{stockData.rotation.fast * 100}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Rotation moyenne (B)</span>
                          <div className="flex items-center gap-4">
                            <div className="w-full max-w-xs h-3 bg-gray-200 rounded-full mx-4">
                              <div 
                                className="h-3 bg-blue-600 rounded-full" 
                                style={{ width: `${stockData.rotation.medium * 100}%` }}
                              />
                            </div>
                            <span className="font-medium">{stockData.rotation.medium * 100}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Rotation lente (C)</span>
                          <div className="flex items-center gap-4">
                            <div className="w-full max-w-xs h-3 bg-gray-200 rounded-full mx-4">
                              <div 
                                className="h-3 bg-red-600 rounded-full" 
                                style={{ width: `${stockData.rotation.slow * 100}%` }}
                              />
                            </div>
                            <span className="font-medium">{stockData.rotation.slow * 100}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
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
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {product.barcode}
                              </p>
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

            <TabsContent value="products" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BarChart
                  data={topProductsChartData}
                  title="Top 10 des produits les plus vendus"
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Classement des produits</CardTitle>
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
              </div>
              
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

export default AnalyticsPage

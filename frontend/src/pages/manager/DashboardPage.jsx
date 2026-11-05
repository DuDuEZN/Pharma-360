import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Calendar, DollarSign, Package, AlertTriangle, TrendingUp, TrendingDown, Users, FileText, RefreshCw, Clock, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Separator } from '../../components/ui/Separator';
import { api } from '../../lib/api';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
//import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Color palette for charts
const chartColors = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  background: '#f8fafc',
  text: '#1e293b'
};

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    activeUsers: 0,
    pendingInvoices: 0
  });
  
  const [salesData, setSalesData] = useState({
    labels: [],
    data: []
  });
  
  const [topProducts, setTopProducts] = useState({
    labels: [],
    data: []
  });
  
  const [categoryDistribution, setCategoryDistribution] = useState({
    labels: [],
    data: []
  });
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  const timeRangeOptions = [
    { value: 'week', label: '7 jours' },
    { value: 'month', label: '30 jours' },
    { value: 'quarter', label: '90 jours' },
    { value: 'year', label: '1 an' },
    { value: 'custom', label: 'Personnalisé' }
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await api.get('/sale-history/stats', {
        params: {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString()
        }
      });
      
      if (statsResponse?.data) {
        setStats({
          totalSales: statsResponse.data.total_sales || 0,
          totalRevenue: statsResponse.data.total_revenue || 0,
          totalProducts: statsResponse.data.total_products || 0,
          lowStock: statsResponse.data.low_stock_count || 0,
          expiringSoon: statsResponse.data.expiring_soon_count || 0,
          activeUsers: statsResponse.data.active_users || 0,
          pendingInvoices: statsResponse.data.pending_invoices || 0
        });
      }
      
      // Fetch sales data
      const salesResponse = await api.get('/sale-history/daily', {
        params: {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString()
        }
      });
      
      if (salesResponse.data) {
        const labels = salesResponse.data.map(item => new Date(item.date).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short' 
        }));
        const data = salesResponse.data.map(item => item.total_sales);
        setSalesData({ labels, data });
      }
      
      // Fetch top products
      const productsResponse = await api.get('/sale-history/top-products', {
        params: { limit: 5 }
      });
      
      if (productsResponse.data) {
        const labels = productsResponse.data.map(item => item.product_name || item.name);
        const data = productsResponse.data.map(item => item.total_quantity);
        setTopProducts({ labels, data });
      }
      
      // Fetch category distribution
      const categoryResponse = await api.get('/products/categories/stats');
      
      //if (categoryResponse?.data) {
      if (categoryResponse.data) {
        const labels = categoryResponse.data.map(item => item.category);
        const data = categoryResponse.data.map(item => item.count);
        setCategoryDistribution({ labels, data });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    
    const now = new Date();
    let fromDate = new Date();
    
    switch (value) {
      case 'week':
        fromDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        fromDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        fromDate.setDate(now.getDate() - 90);
        break;
      case 'year':
        fromDate.setDate(now.getDate() - 365);
        break;
      default:
        fromDate = dateRange.from;
    }
    
    setDateRange({
      from: fromDate,
      to: now
    });
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Chart data configurations
  const salesChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: 'Ventes par jour',
        data: salesData.data,
        backgroundColor: chartColors.primary,
        borderColor: chartColors.primary,
        borderWidth: 1,
      }
    ],
  };

  const topProductsChartData = {
    labels: topProducts.labels,
    datasets: [
      {
        label: 'Top Produits Vendus',
        data: topProducts.data,
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.danger,
          chartColors.info
        ],
        borderWidth: 1,
      }
    ],
  };

  const categoryChartData = {
    labels: categoryDistribution.labels,
    datasets: [
      {
        label: 'Répartition par Catégorie',
        data: categoryDistribution.data,
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.danger,
          chartColors.info,
          chartColors.purple
        ],
        borderWidth: 1,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: chartColors.text,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: chartColors.text,
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: chartColors.text,
          font: {
            size: 11
          },
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: chartColors.text,
          padding: 15,
          font: {
            size: 11
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Tableau de Bord Gestionnaire</CardTitle>
          <CardDescription>
            Vue d'ensemble des ventes, stocks et performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Time Range Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ventes Totales
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalSales.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                      +12% par rapport à la période précédente
                    </p>
                  </div>
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Chiffre d'Affaires
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                      +8% par rapport à la période précédente
                    </p>
                  </div>
                  <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <DollarSign className="w-6 h-6 text-success-600 dark:text-success-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Produits en Stock
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalProducts.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stats.lowStock} en rupture ou stock faible
                    </p>
                  </div>
                  <div className="p-3 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                    <Package className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Alertes
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.expiringSoon + stats.lowStock}
                    </p>
                    <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                      {stats.expiringSoon} péremptions proches, {stats.lowStock} stocks faibles
                    </p>
                  </div>
                  <div className="p-3 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info-100 dark:bg-info-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-info-600 dark:text-info-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Utilisateurs Actifs
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {stats.activeUsers.toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Factures en Attente
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {stats.pendingInvoices.toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Meilleure Vente
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {topProducts.labels[0] || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Dernière Mise à Jour
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatDate(new Date())}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Separator />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par Jour</CardTitle>
            <CardDescription>
              Évolution des ventes sur la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <Bar options={chartOptions} data={salesChartData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produits Vendus</CardTitle>
            <CardDescription>
              Produits les plus vendus sur la période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <Pie options={pieChartOptions} data={topProductsChartData} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Catégorie</CardTitle>
          <CardDescription>
            Distribution des produits par catégorie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Doughnut options={pieChartOptions} data={categoryChartData} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Accès rapide aux fonctionnalités fréquentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/manager/inventory">
              <Button variant="outline" className="w-full justify-start">
                <Package className="w-4 h-4 mr-2" />
                Vérifier l'Inventaire
              </Button>
            </Link>
            <Link to="/manager/suppliers">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Gérer les Fournisseurs
              </Button>
            </Link>
            <Link to="/manager/orders">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Passer une Commande
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Doughnut chart component (re-export from react-chartjs-2)
import { Doughnut } from 'react-chartjs-2';

export default DashboardPage;

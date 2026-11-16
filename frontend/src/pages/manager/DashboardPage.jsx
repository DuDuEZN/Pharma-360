import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Calendar, DollarSign, Package, AlertTriangle, TrendingUp, TrendingDown, Users, FileText, RefreshCw, Clock, ShoppingCart, Boxes, PackageX, CalendarClock, Archive, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/badge.jsx';
import { Separator } from '@/components/ui/Separator';
import apiClient from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

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
    pendingInvoices: 0,
    itemsSold: 0,
    averageBasket: 0,
    customers: 0
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
  const [overviewData, setOverviewData] = useState(null);
  const [salesStats, setSalesStats] = useState(null);
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

  const toDateParam = (value) => {
    const d = new Date(value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const params = {
        start_date: toDateParam(dateRange.from),
        end_date: toDateParam(dateRange.to),
      };

      // Statistiques de ventes (source réelle : sales / sale_items) et
      // rubriques stock du tableau de bord.
      const [overviewResponse, salesStatsResponse] = await Promise.all([
        apiClient.get('/dashboard/overview'),
        apiClient.get('/dashboard/sales-stats', { params: { ...params, limit: 5 } }),
      ]);

      const overview = overviewResponse.data || null;
      setOverviewData(overview);

      const statsData = salesStatsResponse.data || {};
      const totals = statsData.totals || {};
      setSalesStats(statsData);

      setStats({
        totalSales: totals.sales_count || 0,
        totalRevenue: totals.revenue || 0,
        totalProducts: overview?.overview?.total_products || 0,
        lowStock: overview?.overview?.out_of_stock || 0,
        expiringSoon: overview?.overview?.expiring_soon || 0,
        activeUsers: 0,
        pendingInvoices: 0,
        itemsSold: totals.items_sold || 0,
        averageBasket: totals.average_basket || 0,
        customers: totals.customers || 0,
      });

      const daily = statsData.daily || [];
      setSalesData({
        labels: daily.map(item =>
          new Date(`${item.date}T00:00:00`).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
          })
        ),
        data: daily.map(item => item.revenue),
        counts: daily.map(item => item.sales_count),
      });

      const top = statsData.top_products || [];
      setTopProducts({
        labels: top.map(item => item.name),
        data: top.map(item => item.quantity),
        revenue: top.map(item => item.revenue),
      });

      const categories = statsData.categories || [];
      setCategoryDistribution({
        labels: categories.map(item => item.category),
        data: categories.map(item => item.revenue),
      });
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

  const variationLabel = (value) => {
    if (value === null || value === undefined) {
      return 'Pas de référence sur la période précédente';
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}% par rapport à la période précédente`;
  };

  const variationClass = (value) =>
    value === null || value === undefined
      ? 'text-gray-500 dark:text-gray-400'
      : value >= 0
        ? 'text-success-600 dark:text-success-400'
        : 'text-danger-600 dark:text-danger-400';

  // Chart data configurations
  const salesChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: "Chiffre d'affaires",
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
              label += context.dataset.label === "Chiffre d'affaires"
                ? formatCurrency(context.parsed.y)
                : context.parsed.y;
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
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            const formatted = context.dataset.label === 'Répartition par Catégorie'
              ? formatCurrency(value)
              : `${value.toLocaleString('fr-FR')} unité(s)`;
            return `${label}: ${formatted} (${percentage}%)`;
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

      {/* Rubriques du tableau de bord */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Vue Générale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary-600" />
              Vue Générale
            </CardTitle>
            <CardDescription>État instantané du stock de la pharmacie</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !overviewData ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/[0.10] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <Package className="h-3.5 w-3.5" /> Produits en stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {overviewData?.overview?.in_stock ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-red-500/[0.10] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300">
                    <PackageX className="h-3.5 w-3.5" /> En rupture
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                    {overviewData?.overview?.out_of_stock ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-500/[0.10] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> Périmés
                  </p>
                  <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {overviewData?.overview?.expired ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/[0.10] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <CalendarClock className="h-3.5 w-3.5" /> Péremption proche
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {overviewData?.overview?.expiring_soon ?? 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activités */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary-600" />
              Activités
            </CardTitle>
            <CardDescription>Dynamique des produits en stock</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !overviewData ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/[0.08] px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Produits en stock</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {overviewData?.activity?.in_stock ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-500/[0.08] px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Produits dormants (90 jours sans vente)
                  </span>
                  <span className="text-lg font-bold">
                    {overviewData?.activity?.dormant ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-500/[0.08] px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Produits en surstock</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {overviewData?.activity?.overstocked ?? 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valorisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary-600" />
              Valorisation
            </CardTitle>
            <CardDescription>Synthèse financière du stock</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !overviewData ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                  <p className="text-xs text-gray-500">Valorisation à l'achat</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(overviewData?.valuation?.purchase_value ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                  <p className="text-xs text-gray-500">Valorisation à la vente</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(overviewData?.valuation?.sale_value ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/[0.10] p-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Marge potentielle</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(overviewData?.valuation?.margin ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-red-500/[0.10] p-3">
                  <p className="text-xs text-red-700 dark:text-red-300">Stock périmé</p>
                  <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(overviewData?.valuation?.expired_value ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mouvements de stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Mouvements de stock
            </CardTitle>
            <CardDescription>Entrées et sorties des deux dernières semaines</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !overviewData ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Entrées :{' '}
                    {overviewData?.movements?.totals?.inbound ?? 0}
                  </span>
                  <span className="flex items-center gap-1 text-red-700 dark:text-red-300">
                    <ArrowDownRight className="h-3.5 w-3.5" /> Sorties :{' '}
                    {overviewData?.movements?.totals?.outbound ?? 0}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(overviewData?.movements?.daily || []).map((day) => {
                    const daily = overviewData?.movements?.daily || [];
                    const maxValue = Math.max(
                      1,
                      ...daily.map((d) => Math.max(d.inbound, d.outbound))
                    );
                    return (
                      <div key={day.date} className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 shrink-0 text-gray-500">
                          {new Date(day.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                        <div className="flex flex-1 items-center gap-1">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${(day.inbound / maxValue) * 100}%` }}
                            />
                          </div>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${(day.outbound / maxValue) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-16 shrink-0 text-right text-gray-500">
                          +{day.inbound} / -{day.outbound}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <p className={cn('text-xs mt-1', variationClass(salesStats?.variation?.sales_count))}>
                      {variationLabel(salesStats?.variation?.sales_count)}
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
                    <p className={cn('text-xs mt-1', variationClass(salesStats?.variation?.revenue))}>
                      {variationLabel(salesStats?.variation?.revenue)}
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
                      {overviewData?.overview?.in_stock ?? stats.totalProducts.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {overviewData?.overview?.out_of_stock ?? stats.lowStock} en rupture de stock
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
                      {(overviewData?.overview?.expiring_soon ?? 0) + (overviewData?.overview?.expired ?? 0)}
                    </p>
                    <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                      {overviewData?.overview?.expiring_soon ?? 0} péremptions proches, {overviewData?.overview?.expired ?? 0} périmés
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
                    <ShoppingCart className="w-5 h-5 text-info-600 dark:text-info-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Articles Vendus
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {(stats.itemsSold || 0).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                    <Wallet className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Panier Moyen
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(stats.averageBasket || 0)}
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
              Chiffre d'affaires quotidien sur la période sélectionnée
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
            Chiffre d'affaires par catégorie sur la période
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

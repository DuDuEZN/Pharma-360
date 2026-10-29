import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Calendar, DollarSign, Package, AlertTriangle, TrendingUp, TrendingDown, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { DatePickerWithRange } from '@/components/ui/date-range-picker.jsx';
import { api } from '@/services/api.js';

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
      
      if (statsResponse.data) {
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
        const labels = salesResponse.data.map(item => new Date(item.date).toLocaleDateString());
        const data = salesResponse.data.map(item => item.total_sales);
        setSalesData({ labels, data });
      }
      
      // Fetch top products
      const productsResponse = await api.get('/sale-history/top-products', {
        params: { limit: 5 }
      });
      
      if (productsResponse.data) {
        const labels = productsResponse.data.map(item => item.product_name);
        const data = productsResponse.data.map(item => item.quantity_sold);
        setTopProducts({ labels, data });
      }
      
      // Fetch category distribution
      const categoryResponse = await api.get('/products/categories/stats');
      
      if (categoryResponse.data) {
        const labels = categoryResponse.data.map(item => item.category_name);
        const data = categoryResponse.data.map(item => item.product_count);
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
  }, [dateRange, timeRange]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    const now = new Date();
    
    if (value === 'week') {
      setDateRange({
        from: new Date(now.setDate(now.getDate() - 7)),
        to: new Date()
      });
    } else if (value === 'month') {
      setDateRange({
        from: new Date(now.setDate(now.getDate() - 30)),
        to: new Date()
      });
    } else if (value === 'quarter') {
      setDateRange({
        from: new Date(now.setDate(now.getDate() - 90)),
        to: new Date()
      });
    } else if (value === 'year') {
      setDateRange({
        from: new Date(now.setDate(now.getDate() - 365)),
        to: new Date()
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  // Bar chart data for sales
  const salesChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: 'Ventes par jour',
        data: salesData.data,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }
    ]
  };

  // Pie chart data for top products
  const productsChartData = {
    labels: topProducts.labels,
    datasets: [
      {
        label: 'Top Produits',
        data: topProducts.data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(139, 92, 246, 0.5)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Pie chart data for category distribution
  const categoryChartData = {
    labels: categoryDistribution.labels,
    datasets: [
      {
        label: 'Répartition par catégorie',
        data: categoryDistribution.data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(139, 92, 246, 0.5)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const statCards = [
    {
      title: 'Ventes Totales',
      value: stats.totalSales,
      icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
      color: 'blue',
      subtitle: 'Nombre de ventes'
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.totalRevenue),
      icon: <DollarSign className="h-6 w-6 text-green-500" />,
      color: 'green',
      subtitle: 'Revenu total'
    },
    {
      title: 'Produits',
      value: stats.totalProducts,
      icon: <Package className="h-6 w-6 text-orange-500" />,
      color: 'orange',
      subtitle: 'Produits en stock'
    },
    {
      title: 'Stock Faible',
      value: stats.lowStock,
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      color: 'red',
      subtitle: 'Produits en rupture'
    },
    {
      title: 'Péremption Proche',
      value: stats.expiringSoon,
      icon: <Calendar className="h-6 w-6 text-yellow-500" />,
      color: 'yellow',
      subtitle: 'Lots expirant bientôt'
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats.activeUsers,
      icon: <Users className="h-6 w-6 text-purple-500" />,
      color: 'purple',
      subtitle: 'Utilisateurs connectés'
    },
    {
      title: 'Factures en attente',
      value: stats.pendingInvoices,
      icon: <FileText className="h-6 w-6 text-indigo-500" />,
      color: 'indigo',
      subtitle: 'Factures à traiter'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de la pharmacie</p>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 jours</SelectItem>
              <SelectItem value="month">30 jours</SelectItem>
              <SelectItem value="quarter">90 jours</SelectItem>
              <SelectItem value="year">1 an</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} disabled={loading}>
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: `var(--${card.color}-500)` }}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ventes Quotidiennes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top'
                    },
                    title: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top 5 Produits Vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Pie
                data={productsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right'
                    },
                    title: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Répartition par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Pie
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right'
                    },
                    title: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Statistiques Supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Ventes ce mois</span>
                <span className="font-semibold">{stats.totalSales}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Revenu ce mois</span>
                <span className="font-semibold">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Produits en stock</span>
                <span className="font-semibold">{stats.totalProducts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alertes actives</span>
                <span className="font-semibold text-red-500">{stats.lowStock + stats.expiringSoon}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

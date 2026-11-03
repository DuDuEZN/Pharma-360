a/frontend/src/pages/manager/DashboardPage.jsx b/frontend/src/pages/manager/DashboardPage.jsx
++ b/frontend/src/pages/manager/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  AlertTriangle, Banknote, CalendarClock, Package, RefreshCw, TrendingUp, Users, FileText,
} from 'lucide-react';
import { api } from '@/services/api.js';

/**
 * Tableau de bord gestionnaire — refonte « Menthe & Sable »
 * 4 KPI lisibles, sélecteur de période en chips, graphiques teal,
 * bannière d'alertes priorisée (rupture avant péremption).
 */

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

const TEAL = '13, 148, 136';
const PALETTE = ['#0D9488', '#14B8A6', '#F59E0B', '#E11D48', '#78716C', '#0F766E', '#D97706'];

const fmt = (amount) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';
const fmtN = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const RANGES = [
  { key: 'week', label: '7 j', days: 7 },
  { key: 'month', label: '30 j', days: 30 },
  { key: 'quarter', label: '90 j', days: 90 },
  { key: 'year', label: '1 an', days: 365 },
];

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    lowStock: 0,
    expiringSoon: 0,
    activeUsers: 0,
    pendingInvoices: 0,
  });

  const [salesData, setSalesData] = useState({ labels: [], data: [] });
  const [topProducts, setTopProducts] = useState({ labels: [], data: [] });
  const [categoryDistribution, setCategoryDistribution] = useState({ labels: [], data: [] });

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Chaque bloc est indépendant : un endpoint en erreur ne vide plus tout le tableau de bord.
    setLoading(true);
    const range = {
      start_date: dateRange.from.toISOString().slice(0, 10),
      end_date: dateRange.to.toISOString().slice(0, 10),
    };

    const [statsData, dailyData, topData, categoryData] = await Promise.all([
      safeGet('/sale-history/stats'),
      safeGet('/sale-history/daily'),
      safeGet('/sale-history/products/top', { params: { limit: 5, ...range } }),
      safeGet('/products/categories/stats'),
    ]);

    if (statsData) {
        lowStock: statsData.low_stock_count || 0,
        expiringSoon: statsData.expiring_soon_count || 0,
        activeUsers: statsData.active_users || 0,
        pendingInvoices: statsData.pending_invoices || 0,
      });
    }

    if (Array.isArray(dailyData)) {
      setSalesData({
        labels: dailyData.map((item) => new Date(item.date ?? item.sale_day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        data: dailyData.map((item) => item.total_revenue ?? item.total_sales ?? 0),
      });
    }

    const topList = Array.isArray(topData) ? topData : topData?.top_products;
    if (Array.isArray(topList)) {
      setTopProducts({
        labels: topList.map((item) => item.product_name),
        data: topList.map((item) => item.quantity_sold ?? item.total_quantity ?? 0),
      });
    }

    if (Array.isArray(categoryData)) {
      setCategoryDistribution({
        labels: categoryData.map((item) => item.category_name),
        data: categoryData.map((item) => item.product_count),
      });
    }


  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, timeRange]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    const days = RANGES.find((r) => r.key === value)?.days ?? 30;
    setDateRange({
      from: new Date(new Date().setDate(new Date().getDate() - days)),
      to: new Date(),
    });
  };

  const kpis = [
    {
      title: 'Chiffre d\u2019affaires',
      value: fmt(stats.totalRevenue),
      subtitle: `sur ${RANGES.find((r) => r.key === timeRange)?.label ?? ''}`,
      icon: Banknote,
      cls: 'bg-teal-50 text-teal-700 ring-teal-100',
    },
    {
      title: 'Ventes',
      value: fmtN(stats.totalSales),
      subtitle: 'transactions enregistrées',
      icon: TrendingUp,
      cls: 'bg-stone-100 text-stone-600 ring-stone-200',
    },
    {
      title: 'Ruptures de stock',
      value: fmtN(stats.lowStock),
      subtitle: 'produits à recommander',
      icon: AlertTriangle,
      cls: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    {
      title: 'Péremption ≤ 90 j',
      value: fmtN(stats.expiringSoon),
      subtitle: 'lots à écouler en priorité',
      icon: CalendarClock,
      cls: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
  ];

  const alertCount = stats.lowStock + stats.expiringSoon;

  const salesChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: 'CA (FCFA)',
        data: salesData.data,
        backgroundColor: `rgba(${TEAL}, 0.85)`,
        hoverBackgroundColor: `rgba(${TEAL}, 1)`,
        borderRadius: 6,
        maxBarThickness: 32,
      },
    ],
  };

  const topChartData = {
    labels: topProducts.labels,
    datasets: [
      {
        label: 'Unités vendues',
        data: topProducts.data,
        backgroundColor: PALETTE.slice(0, Math.max(topProducts.data.length, 1)),
        borderRadius: 6,
      },
    ],
  };

  const categoryTotal = categoryDistribution.data.reduce((s, v) => s + v, 0);
  const categoryChartData = {
    labels: categoryDistribution.labels,
    datasets: [
      {
        data: categoryDistribution.data,
        backgroundColor: PALETTE,
        borderColor: '#FAFAF9',
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  // Total produits au centre du donut
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1C1917';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(fmtN(categoryTotal), x, y - 8);
      ctx.fillStyle = '#78716C';
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('produits', x, y + 12);
      ctx.restore();
    },
  };

  const cardCls = 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm';
  const chartOptionsBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  return (
    <div className="space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ============ En-tête ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Tableau de bord</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Vue d&rsquo;ensemble de la pharmacie — période sélectionnée en un clic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => handleTimeRangeChange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  timeRange === r.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* ============ KPI ============ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className={cardCls}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{kpi.title}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${kpi.cls}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            {loading ? (
              <div className="mt-2.5 h-7 w-28 animate-pulse rounded-lg bg-stone-100" />
            ) : (
              <p
                className="mt-2 text-xl font-extrabold text-stone-900"
                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              >
                {kpi.value}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-stone-400">{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      {/* ============ Bannière d'alertes ============ */}
      {!loading && alertCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs leading-relaxed text-amber-900">
              <p className="text-sm font-bold">
                {alertCount} alerte{alertCount > 1 ? 's' : ''} à traiter
              </p>
              <p>
                Priorité FEFO : {fmtN(stats.lowStock)} rupture(s) de stock · {fmtN(stats.expiringSoon)} lot(s) en
                péremption ≤ 90 jours.
              </p>
            </div>
          </div>
          <Link
            to="/manager/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
          >
            <Package className="h-3.5 w-3.5" /> Ouvrir l&rsquo;inventaire
          </Link>
        </div>
      )}

      {/* ============ Graphiques ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">Évolution du chiffre d&rsquo;affaires</h2>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-100">
              {fmt(stats.totalRevenue)}
            </span>
          </div>
          <div className="h-[280px]">
            <Bar
              data={salesChartData}
              options={{
                ...chartOptionsBase,
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#78716C', font: { size: 10 } } },
                  y: {
                    grid: { color: '#F5F5F4' },
                    ticks: {
                      color: '#78716C',
                      font: { size: 10 },
                      callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v),
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="mb-4 text-sm font-bold text-stone-900">Catégories</h2>
          <div className="relative h-[280px]">
            <Doughnut
              data={categoryChartData}
              plugins={[centerTextPlugin]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: '#78716C' } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-2`}>
          <h2 className="mb-4 text-sm font-bold text-stone-900">Top 5 des produits vendus</h2>
          <div className="h-[240px]">
            <Bar
              data={topChartData}
              options={{
                ...chartOptionsBase,
                indexAxis: 'y',
                scales: {
                  x: { grid: { color: '#F5F5F4' }, ticks: { color: '#78716C', font: { size: 10 } } },
                  y: { grid: { display: false }, ticks: { color: '#44403C', font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="mb-4 text-sm font-bold text-stone-900">Autres indicateurs</h2>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-stone-500">
                <Package className="h-4 w-4 text-stone-400" /> Produits en stock
              </span>
              <span className="font-bold text-stone-900">{fmtN(stats.totalProducts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-stone-500">
                <Users className="h-4 w-4 text-stone-400" /> Utilisateurs actifs
              </span>
              <span className="font-bold text-stone-900">{fmtN(stats.activeUsers)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-stone-500">
                <FileText className="h-4 w-4 text-stone-400" /> Factures en attente
              </span>
              <span className="font-bold text-stone-900">{fmtN(stats.pendingInvoices)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-4">
              <span className="flex items-center gap-2 text-stone-500">
                <AlertTriangle className="h-4 w-4 text-rose-400" /> Alertes actives
              </span>
              <span className="font-bold text-rose-600">{fmtN(alertCount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
import React, { useState, useEffect } from 'react'
import { FileText, Download, Calendar, BarChart3, PieChart, TrendingUp, TrendingDown, Filter, Search } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

/**
 * Reports Page for Pharmacie 360
 * Sales, stock, and financial reports
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function ReportsPage() {
  const { addToast } = useToast()
  
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [reportType, setReportType] = useState('sales')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Report types
  const reportTypes = [
    { value: 'sales', label: 'Ventes', icon: TrendingUp },
    { value: 'stock', label: 'Stock', icon: BarChart3 },
    { value: 'financial', label: 'Financier', icon: PieChart },
    { value: 'returns', label: 'Retours', icon: TrendingDown },
  ]

  // Date ranges
  const dateRanges = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this_week', label: 'Cette semaine' },
    { value: 'last_week', label: 'Semaine dernière' },
    { value: 'this_month', label: 'Ce mois' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  // Fetch reports
  useEffect(() => {
    fetchReports()
  }, [reportType, dateRange, customStartDate, customEndDate])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const params = {
        type: reportType,
        range: dateRange,
        start_date: dateRange === 'custom' ? customStartDate : undefined,
        end_date: dateRange === 'custom' ? customEndDate : undefined,
      }
      
      const response = await api.get('/reports', { params })
      setReports(response.data.reports || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de générer les rapports'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Export report
  const handleExport = async (format = 'pdf') => {
    try {
      const params = {
        type: reportType,
        range: dateRange,
        start_date: dateRange === 'custom' ? customStartDate : undefined,
        end_date: dateRange === 'custom' ? customEndDate : undefined,
        format,
      }
      
      const response = await api.get('/reports/export', { 
        params,
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rapport_${reportType}_${new Date().toISOString().slice(0, 10)}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      addToast({
        type: 'success',
        title: 'Export réussi',
        message: `Le rapport a été exporté en format ${format.toUpperCase()}`
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'exporter le rapport'
      })
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0)
  }

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Rapports
        </h1>
        <p className="text-gray-500 mt-1">
          Générez et exportez des rapports sur les ventes, stocks et performances
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Type de rapport"
            as="select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Input>
          
          <Input
            label="Période"
            as="select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </Input>
          
          {dateRange === 'custom' && (
            <>
              <Input
                label="Date de début"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <Input
                label="Date de fin"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="primary" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Reports Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-sm text-gray-500">Ventes totales</p>
          <p className="text-2xl font-bold text-gray-900">1,234</p>
          <p className="text-xs text-gray-500 mt-1">Nombre de ventes</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <PieChart className="w-6 h-6 text-success-600" />
          </div>
          <p className="text-sm text-gray-500">Chiffre d'affaires</p>
          <p className="text-2xl font-bold text-gray-900">2,345,000 XOF</p>
          <p className="text-xs text-gray-500 mt-1">Total des ventes</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-warning-600" />
          </div>
          <p className="text-sm text-gray-500">Produits en stock</p>
          <p className="text-2xl font-bold text-gray-900">856</p>
          <p className="text-xs text-gray-500 mt-1">Articles disponibles</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingDown className="w-6 h-6 text-danger-600" />
          </div>
          <p className="text-sm text-gray-500">Alertes</p>
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-xs text-gray-500 mt-1">Stocks critiques</p>
        </div>
      </div>

      {/* Reports Content */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {reportTypes.find(r => r.value === reportType)?.label || reportType}
          </h2>
          <span className="text-sm text-gray-500">
            {dateRanges.find(r => r.value === dateRange)?.label || dateRange}
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="mx-auto w-12 h-12 mb-4" />
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        ) : reportType === 'sales' ? (
          <SalesReport reports={reports} formatCurrency={formatCurrency} formatDate={formatDate} />
        ) : reportType === 'stock' ? (
          <StockReport reports={reports} formatCurrency={formatCurrency} formatDate={formatDate} />
        ) : reportType === 'financial' ? (
          <FinancialReport reports={reports} formatCurrency={formatCurrency} formatDate={formatDate} />
        ) : (
          <ReturnsReport reports={reports} formatCurrency={formatCurrency} formatDate={formatDate} />
        )}
      </div>
    </div>
  )
}

// Sales Report Component
function SalesReport({ reports, formatCurrency, formatDate }) {
  return (
    <div className="space-y-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Date</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">N° Vente</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Client</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Produits</th>
            <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Montant</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-4 text-sm">{formatDate(report.date)}</td>
              <td className="py-2 px-4 text-sm">#{report.id || report.sale_id}</td>
              <td className="py-2 px-4 text-sm">{report.customer || 'Client'}</td>
              <td className="py-2 px-4 text-sm">{report.items_count || report.product_count}</td>
              <td className="py-2 px-4 text-sm text-right">{formatCurrency(report.total || report.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Stock Report Component
function StockReport({ reports, formatCurrency, formatDate }) {
  return (
    <div className="space-y-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Produit</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Code-barres</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Catégorie</th>
            <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Stock</th>
            <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Péremption</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-4 text-sm">{report.product_name || report.name}</td>
              <td className="py-2 px-4 text-sm">{report.barcode || 'N/A'}</td>
              <td className="py-2 px-4 text-sm">{report.category || 'Non classé'}</td>
              <td className="py-2 px-4 text-sm text-right">{report.stock || report.quantity}</td>
              <td className="py-2 px-4 text-sm text-right">{formatDate(report.expiry_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Financial Report Component
function FinancialReport({ reports, formatCurrency, formatDate }) {
  return (
    <div className="space-y-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Date</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Type</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Description</th>
            <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Montant</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-4 text-sm">{formatDate(report.date)}</td>
              <td className="py-2 px-4 text-sm">{report.type || 'Transaction'}</td>
              <td className="py-2 px-4 text-sm">{report.description || report.details}</td>
              <td className="py-2 px-4 text-sm text-right">
                {formatCurrency(report.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Returns Report Component
function ReturnsReport({ reports, formatCurrency, formatDate }) {
  return (
    <div className="space-y-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Date</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">N° Retour</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Produit</th>
            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Raison</th>
            <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Montant</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-4 text-sm">{formatDate(report.date)}</td>
              <td className="py-2 px-4 text-sm">#{report.id || report.return_id}</td>
              <td className="py-2 px-4 text-sm">{report.product_name || report.product}</td>
              <td className="py-2 px-4 text-sm">{report.reason || 'Non spécifié'}</td>
              <td className="py-2 px-4 text-sm text-right">{formatCurrency(report.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReportsPage

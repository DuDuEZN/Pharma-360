import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, Calendar, DollarSign, Package, ShoppingCart, BarChart3, Filter, RefreshCw, Eye, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/common/Toast'
import api from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useTable } from '@/hooks/useTable'
import { useDebounce } from '@/hooks/useDebounce'

function ManagerReportsPage() {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [reportTypes, setReportTypes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { addToast } = useToast()

  const reportTypeOptions = [
    { value: 'all', label: 'Tous les types' },
    { value: 'daily_sales', label: 'Ventes quotidiennes' },
    { value: 'weekly_sales', label: 'Ventes hebdomadaires' },
    { value: 'monthly_sales', label: 'Ventes mensuelles' },
    { value: 'stock', label: 'Stock' },
    { value: 'expiry', label: 'Péremption' },
    { value: 'supplier', label: 'Fournisseurs' },
    { value: 'returns', label: 'Retours' },
  ]

  const dateFilterOptions = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
  ]

  const {
    paginatedData: paginatedReports,
    handleSearch,
    handlePageChange,
    totalPages,
    currentPage,
  } = useTable(reports, {
    searchKeys: ['title', 'report_type', 'generated_at'],
    initialPageSize: 10
  })

  const debouncedSearch = useDebounce(searchQuery, 500)

  // Convertit le filtre de période en dates ISO pour l'API.
  const getDateRange = () => {
    const now = new Date()
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const start = new Date(now)
    if (dateFilter === 'today') {
      return { from: fmt(now), to: fmt(now) }
    }
    if (dateFilter === 'week') {
      start.setDate(now.getDate() - 6)
      return { from: fmt(start), to: fmt(now) }
    }
    if (dateFilter === 'month') {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }
    }
    if (dateFilter === 'quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3
      return { from: fmt(new Date(now.getFullYear(), qStartMonth, 1)), to: fmt(now) }
    }
    if (dateFilter === 'year') {
      return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) }
    }
    return { from: undefined, to: undefined }
  }

  useEffect(() => {
    fetchReports()
  }, [typeFilter, dateFilter])

  useEffect(() => {
    handleSearch()
  }, [debouncedSearch])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const { from, to } = getDateRange()
      const response = await api.get('/manager/reports', {
        params: {
          report_type: typeFilter !== 'all' ? typeFilter : undefined,
          date_from: from,
          date_to: to,
          page_size: 100
        }
      })
      setReports(response.data.reports || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les rapports'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async (type) => {
    try {
      setIsLoading(true)
      const { from, to } = getDateRange()
      const today = new Date()
      const defaultStart = from || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      const defaultEnd = to || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const response = await api.post('/manager/reports/generate', {
        report_type: type,
        data_range_start: defaultStart,
        data_range_end: defaultEnd,
        file_format: 'pdf',
        filters: {}
      })
      
      addToast({
        type: 'success',
        title: 'Succès',
        message: `Rapport généré (${response.data?.total_records ?? 0} enregistrement(s))`
      })
      
      fetchReports()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de générer le rapport'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
  }

  const handleDownloadReport = async (reportId, format = 'pdf') => {
    try {
      const response = await api.get(`/manager/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob'
      })
      
      let filename = `rapport_${reportId}.${format}`
      const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition']
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/)
        if (match) filename = match[1]
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Téléchargement démarré'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de télécharger le rapport'
      })
    }
  }

  const handleDeleteReport = async (reportId) => {
    try {
      await api.delete(`/manager/reports/${reportId}`)
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Rapport supprimé avec succès'
      })
      fetchReports()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de supprimer le rapport'
      })
    }
  }

  const getReportIcon = (type) => {
    const icons = {
      daily_sales: DollarSign,
      weekly_sales: BarChart3,
      monthly_sales: Calendar,
      stock: Package,
      expiry: Calendar,
      supplier: ShoppingCart,
      returns: Package,
    }
    return icons[type] || FileText
  }

  const getReportTypeLabel = (type) => {
    const labels = {
      daily_sales: 'Ventes quotidiennes',
      weekly_sales: 'Ventes hebdomadaires',
      monthly_sales: 'Ventes mensuelles',
      stock: 'Rapport de stock',
      expiry: 'Péremption',
      supplier: 'Fournisseurs',
      returns: 'Retours',
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-600" />
            Rapports de gestion
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Génération et gestion des rapports d'activité
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild>
            <Link to="/manager/reports/new">
              <FileText className="w-4 h-4 mr-2" />
              Nouveau rapport
            </Link>
          </Button>
          <Button variant="outline" onClick={() => handleGenerateReport('daily_sales')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Générer maintenant
          </Button>
        </div>
      </div>

      {/* Quick Generate Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Générer un rapport rapide</CardTitle>
          <CardDescription>Sélectionnez un type de rapport à générer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {reportTypeOptions.slice(1).map((option) => (
              <Button
                key={option.value}
                variant="outline"
                onClick={() => handleGenerateReport(option.value)}
                className="h-auto p-4 text-left justify-start"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm text-gray-500">{option.value}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Rechercher par nom ou type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par date" />
              </SelectTrigger>
              <SelectContent>
                {dateFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des rapports</CardTitle>
          <CardDescription>
            {reports.length} rapports trouvés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : paginatedReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun rapport trouvé</p>
              <p className="text-sm mt-1">Générez votre premier rapport</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReports.map((report) => {
                    const Icon = getReportIcon(report.report_type)
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-primary-600" />
                          {report.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getReportTypeLabel(report.report_type)}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(report.generated_at)}</TableCell>
                        <TableCell>{report.total_records ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={['generated', 'completed'].includes(report.status) ? 'success' : 'warning'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReport(report.id, 'pdf')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Affichage {paginatedReports.length} sur {reports.length} rapports
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalHeader>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            Détails du rapport
          </h2>
        </ModalHeader>
        <ModalBody>
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations du rapport</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Nom</p>
                    <p className="font-medium">{selectedReport.title}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Type</p>
                    <Badge variant="secondary">{getReportTypeLabel(selectedReport.report_type)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Statut</p>
                    <Badge variant={['generated', 'completed'].includes(selectedReport.status) ? 'success' : 'warning'}>
                      {selectedReport.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date de création</p>
                    <p className="font-medium">{formatDate(selectedReport.generated_at)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date de début</p>
                    <p className="font-medium">{formatDate(selectedReport.data_range_start)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date de fin</p>
                    <p className="font-medium">{formatDate(selectedReport.data_range_end)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Report Summary */}
              {selectedReport.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Résumé du rapport</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {selectedReport.summary.total_sales && (
                        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Ventes totales</p>
                          <p className="text-xl font-bold text-primary-600">{formatCurrency(selectedReport.summary.total_sales)}</p>
                        </div>
                      )}
                      {selectedReport.summary.total_transactions && (
                        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Transactions</p>
                          <p className="text-xl font-bold text-primary-600">{selectedReport.summary.total_transactions}</p>
                        </div>
                      )}
                      {selectedReport.summary.total_items && (
                        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Articles vendus</p>
                          <p className="text-xl font-bold text-primary-600">{selectedReport.summary.total_items}</p>
                        </div>
                      )}
                      {selectedReport.summary.avg_transaction && (
                        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Panier moyen</p>
                          <p className="text-xl font-bold text-primary-600">{formatCurrency(selectedReport.summary.avg_transaction)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Report Preview */}
              {selectedReport.preview && (
                <Card>
                  <CardHeader>
                    <CardTitle>Aperçu du rapport</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        {selectedReport.preview}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Fermer
          </Button>
          <Button onClick={() => handleDownloadReport(selectedReport?.id, 'pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default ManagerReportsPage

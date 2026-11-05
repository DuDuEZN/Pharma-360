import React, { useState, useEffect, useMemo } from 'react'
import { FileText, Download, Calendar, BarChart3, PieChart, TrendingUp, TrendingDown, Filter, Search, RefreshCw, Printer, Eye, File, Xlsx, Pdf } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table'
import { Separator } from '../../components/ui/Separator'
import { Skeleton } from '../../components/ui/Skeleton'
import { Alert } from '../../components/ui/Alert'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs'
import { cn, formatCurrency, formatDate } from '../../lib/utils'

/**
 * Reports Page for Pharma 360
 * Sales, stock, and financial reports
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 * BKND-015: Module Rapports (ventes, stocks, caisse)
 */
function ReportsPage() {
  const { addToast } = useToast()
  
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('this_month')
  const [reportType, setReportType] = useState('sales')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetails, setReportDetails] = useState(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const {
    isOpen: isDetailsModalOpen,
    onOpen: openDetailsModal,
    onClose: closeDetailsModal
  } = useDisclosure()

  // Report types
  const reportTypes = [
    { value: 'sales', label: 'Ventes', icon: TrendingUp, description: 'Rapport des ventes et revenus' },
    { value: 'stock', label: 'Stock', icon: BarChart3, description: 'Rapport des stocks et mouvements' },
    { value: 'financial', label: 'Financier', icon: PieChart, description: 'Rapport financier et comptabilité' },
    { value: 'returns', label: 'Retours', icon: TrendingDown, description: 'Rapport des retours et annulations' },
    { value: 'cash', label: 'Caisse', icon: FileText, description: 'Rapport de caisse et encaissements' },
  ]

  // Date ranges
  const dateRanges = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this_week', label: 'Cette semaine' },
    { value: 'last_week', label: 'Semaine dernière' },
    { value: 'this_month', label: 'Ce mois' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'this_year', label: 'Cette année' },
    { value: 'last_year', label: 'Année dernière' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  // Export formats
  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: Pdf },
    { value: 'xlsx', label: 'Excel', icon: Xlsx },
    { value: 'csv', label: 'CSV', icon: File },
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
        message: error.response?.data?.message || 'Impossible de générer les rapports'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch report details
  const fetchReportDetails = async (reportId) => {
    try {
      setIsDetailsLoading(true)
      const response = await api.get(`/reports/${reportId}`)
      setReportDetails(response.data)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de charger les détails du rapport'
      })
    } finally {
      setIsDetailsLoading(false)
    }
  }

  // Export report
  const handleExport = async (format = 'pdf') => {
    try {
      setIsExporting(true)
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
      link.setAttribute('download', `rapport_${reportType}_${format}_${formatDate(new Date(), 'yyyy-MM-dd')}.${format}`)
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
        message: error.response?.data?.message || `Impossible d'exporter en format ${format}`
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Print report
  const handlePrint = async () => {
    try {
      setIsExporting(true)
      const params = {
        type: reportType,
        range: dateRange,
        start_date: dateRange === 'custom' ? customStartDate : undefined,
        end_date: dateRange === 'custom' ? customEndDate : undefined,
        format: 'print',
      }
      
      const response = await api.get('/reports/export', { 
        params,
        responseType: 'blob'
      })
      
      // Open in new tab for printing
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const printWindow = window.open(url, '_blank')
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
      
      addToast({
        type: 'success',
        title: 'Impression',
        message: 'Le rapport est prêt pour l\'impression'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible d\'imprimer le rapport'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Delete report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      return
    }
    
    try {
      await api.delete(`/reports/${reportId}`)
      addToast({
        type: 'success',
        title: 'Rapport supprimé',
        message: 'Le rapport a été supprimé avec succès'
      })
      fetchReports()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de supprimer le rapport'
      })
    }
  }

  // View report details
  const handleViewDetails = async (report) => {
    setSelectedReport(report)
    openDetailsModal()
    await fetchReportDetails(report.id)
  }

  // Get report type config
  const getReportTypeConfig = (type) => {
    return reportTypes.find(rt => rt.value === type) || reportTypes[0]
  }

  // Get date range label
  const getDateRangeLabel = (range) => {
    return dateRanges.find(dr => dr.value === range)?.label || range
  }

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (reports.length === 0) return {}
    
    const stats = {
      total: reports.length,
      total_amount: 0,
      by_type: {}
    }
    
    reports.forEach(report => {
      stats.total_amount += report.total_amount || 0
      if (report.type) {
        stats.by_type[report.type] = (stats.by_type[report.type] || 0) + 1
      }
    })
    
    return stats
  }, [reports])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Rapports</CardTitle>
          <CardDescription>
            Générez et consultez les rapports de ventes, stocks et finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="info" className="flex items-start gap-3">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Génération de Rapports</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sélectionnez le type de rapport et la période pour générer des rapports détaillés.
                Vous pouvez exporter les rapports dans différents formats.
              </p>
            </div>
          </Alert>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type de Rapport</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une période" />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Date de Début</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de Fin</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={fetchReports}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Générer
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium mr-2">Exporter:</span>
            {exportFormats.map((format) => (
              <Button
                key={format.value}
                variant="outline"
                size="sm"
                onClick={() => handleExport(format.value)}
                isLoading={isExporting}
                className="flex items-center gap-1"
              >
                <format.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{format.label}</span>
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              isLoading={isExporting}
              className="flex items-center gap-1"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryStats.total}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Rapports
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(summaryStats.total_amount || 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Montant Total
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {Object.keys(summaryStats.by_type || {}).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Types de Rapports
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getDateRangeLabel(dateRange)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Période Sélectionnée
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Rapports ({reports.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun rapport généré</p>
              <p className="text-sm text-gray-400 mt-2">
                Sélectionnez un type de rapport et une période, puis cliquez sur Générer
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Date de Génération</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Nombre d'Enregistrements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const reportConfig = getReportTypeConfig(report.type)
                  const dateRangeLabel = getDateRangeLabel(report.range || dateRange)
                  
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <reportConfig.icon className="w-4 h-4 text-gray-600" />
                          <span>{reportConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {dateRangeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(report.created_at || report.generated_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-primary-600 dark:text-primary-400">
                          {formatCurrency(report.total_amount || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">
                          {report.total_records || report.record_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(report)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExport('pdf', report.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-danger-500 hover:text-danger-600"
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
          )}
        </CardContent>
      </Card>

      {/* Report Details Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={closeDetailsModal} size="xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <span>Détails du Rapport</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {isDetailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : reportDetails ? (
            <div className="space-y-6">
              {/* Report Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations du Rapport</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium">{getReportTypeConfig(reportDetails.type).label}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Période</p>
                      <p className="font-medium">{getDateRangeLabel(reportDetails.range)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Date de Génération</p>
                      <p className="font-medium">{formatDate(reportDetails.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Résumé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(reportDetails.total_amount || 0)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Montant Total
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                        {reportDetails.total_records || 0}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enregistrements
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                        {reportDetails.average_amount ? formatCurrency(reportDetails.average_amount) : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Moyenne
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Details Table */}
              {reportDetails.items && reportDetails.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Détails ({reportDetails.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Quantité</TableHead>
                          <TableHead>Prix Unitaire</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportDetails.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name || item.name || 'N/A'}</TableCell>
                            <TableCell>{item.quantity || 0}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Alert variant="warning" className="flex items-center gap-3">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Aucun détail disponible</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Les détails de ce rapport ne sont pas disponibles
                </p>
              </div>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeDetailsModal}>
            Fermer
          </Button>
          <Button onClick={() => handleExport('pdf', selectedReport?.id)}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default ReportsPage

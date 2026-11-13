import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Plus, Search, Eye, Check, X, Package, Calendar, Clock, Filter, Download, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useTable } from '@/hooks/useTable'
import { useDebounce } from '@/hooks/useDebounce'
import DeliveryLabelSheet from '@/components/delivery/DeliveryLabelSheet'

function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [printDelivery, setPrintDelivery] = useState(null)
  const { addToast } = useToast()
  const { user } = useAuth()
  // Le manager valide/rejette. Le vendeur (et l'admin) initie la livraison.
  const canValidate = user?.role === 'admin' || user?.role === 'manager'
  const canCreate = user?.role === 'seller' || user?.role === 'admin'

  const statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'pending', label: 'En attente de validation' },
    { value: 'in_transit', label: 'En transit' },
    { value: 'delivered', label: 'Livré' },
    { value: 'rejected', label: 'Rejeté' },
    { value: 'partial', label: 'Partiel' },
    { value: 'cancelled', label: 'Annulé' },
  ]

  const statusColors = {
    pending: 'warning',
    in_transit: 'info',
    delivered: 'success',
    rejected: 'danger',
    partial: 'warning',
    cancelled: 'danger',
  }

  const statusLabels = {
    pending: 'En attente de validation',
    in_transit: 'En transit',
    delivered: 'Livré',
    rejected: 'Rejeté',
    partial: 'Partiel',
    cancelled: 'Annulé',
  }

  const {
    paginatedData: paginatedDeliveries,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    totalPages,
    currentPage,
    pageSize
  } = useTable(deliveries, {
    searchKeys: ['supplier_name', 'reference', 'status', 'tracking_number'],
    initialPageSize: 10
  })

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    fetchDeliveries()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [debouncedSearch, statusFilter])

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/manager/deliveries', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100
        }
      })
      setDeliveries(response.data.deliveries || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les livraisons'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { limit: 50 } })
      setSuppliers(response.data.suppliers || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const handleViewDelivery = async (delivery) => {
    // Ouvre le détail puis recharge la livraison complète (articles + facture).
    setSelectedDelivery(delivery)
    setIsModalOpen(true)
    try {
      const response = await api.get(`/manager/deliveries/${delivery.id}`)
      setSelectedDelivery(response.data)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger le détail de la livraison'
      })
    }
  }

  const handleValidateDelivery = async (deliveryId) => {
    if (!window.confirm('Valider cette livraison ? Les quantités reçues entreront immédiatement en stock.')) {
      return
    }
    try {
      const response = await api.post(`/manager/deliveries/${deliveryId}/validate`)
      addToast({ type: 'success', title: 'Succès', message: 'Livraison validée, stock mis à jour. Impression des étiquettes…' })
      setIsModalOpen(false)
      setSelectedDelivery(null)
      fetchDeliveries()
      // Impression automatique des étiquettes de tous les produits livrés.
      if (response.data) {
        setPrintDelivery(response.data)
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de valider la livraison'
      })
    }
  }

  const handleRejectDelivery = async (deliveryId) => {
    const reason = window.prompt('Motif du rejet de la livraison (optionnel) :')
    if (reason === null) return
    try {
      await api.post(`/manager/deliveries/${deliveryId}/reject`, { status: reason || '' })
      addToast({ type: 'success', title: 'Succès', message: 'Livraison rejetée' })
      setIsModalOpen(false)
      setSelectedDelivery(null)
      fetchDeliveries()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de rejeter la livraison'
      })
    }
  }

  const handleDownloadInvoice = async (deliveryId) => {
    try {
      const response = await api.get(`/manager/deliveries/${deliveryId}/invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'ouvrir la facture'
      })
    }
  }

  const handleUpdateStatus = async (deliveryId, newStatus) => {
    try {
      await api.put(`/manager/deliveries/${deliveryId}/status`, {
        status: newStatus
      })
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Statut de la livraison mis à jour'
      })
      fetchDeliveries()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de mettre à jour le statut'
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/manager/deliveries/export', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `livraisons_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`)
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
        message: 'Impossible d\'exporter les livraisons'
      })
    }
  }

  const getStatusBadge = (status) => {
    const variant = statusColors[status] || 'secondary'
    const label = statusLabels[status] || status
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary-600" />
            Livraisons fournisseurs
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Suivi des livraisons et réception des marchandises
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button asChild variant="outline">
              <Link to="/manager/deliveries/new">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle livraison
              </Link>
            </Button>
          )}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher par fournisseur, référence ou numéro de suivi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des livraisons</CardTitle>
          <CardDescription>
            {deliveries.length} livraisons trouvées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : paginatedDeliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune livraison trouvée</p>
              {canCreate && (
                <>
                  <p className="text-sm mt-1">Créez votre première livraison</p>
                  <Button asChild className="mt-4">
                    <Link to="/manager/deliveries/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvelle livraison
                    </Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Date livraison</TableHead>
                    <TableHead>N° suivi</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDeliveries.map((delivery) => (
                    <TableRow
                      key={delivery.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleViewDelivery(delivery)}
                    >
                      <TableCell className="font-mono">{delivery.reference}</TableCell>
                      <TableCell>{delivery.supplier_name}</TableCell>
                      <TableCell>{formatDate(delivery.delivery_date)}</TableCell>
                      <TableCell className="font-mono text-sm">{delivery.tracking_number || 'N/A'}</TableCell>
                      <TableCell>{delivery.items_count}</TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {canCreate && !delivery.invoice_path && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const formData = new FormData()
                                  formData.append('file', file)
                                  try {
                                    await api.post(`/manager/deliveries/${delivery.id}/invoice`, formData)
                                    addToast({ type: 'success', title: 'Succès', message: 'Facture uploadée' })
                                    fetchDeliveries()
                                  } catch (err) {
                                    addToast({ type: 'error', title: 'Erreur', message: 'Echec upload' })
                                  }
                                }}
                              />
                              <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700" title="Scanner la facture">
                                <span><FileText className="w-4 h-4" /></span>
                              </Button>
                            </label>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDelivery(delivery)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canValidate && delivery.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleValidateDelivery(delivery.id)}
                                className="text-green-600 hover:text-green-700"
                                title="Valider la livraison"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectDelivery(delivery.id)}
                                className="text-red-500 hover:text-red-600"
                                title="Rejeter la livraison"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Affichage {paginatedDeliveries.length} sur {deliveries.length} livraisons
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

      {/* Delivery Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalHeader>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary-600" />
            Détails de la livraison
          </h2>
        </ModalHeader>
        <ModalBody>
          {selectedDelivery && (
            <div className="space-y-6">
              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations de la livraison</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Référence</p>
                    <p className="font-mono font-medium">{selectedDelivery.reference}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date prévue</p>
                    <p className="font-medium">{formatDate(selectedDelivery.delivery_date)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date de réception</p>
                    <p className="font-medium">{selectedDelivery.received_at ? formatDate(selectedDelivery.received_at) : 'Non reçu'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">N° de suivi</p>
                    <p className="font-mono font-medium">{selectedDelivery.tracking_number || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Statut</p>
                    {getStatusBadge(selectedDelivery.status)}
                  </div>
                  {selectedDelivery.order_reference && (
                    <div className="md:col-span-3 space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Commande associée</p>
                      <p className="font-mono font-medium">{selectedDelivery.order_reference}</p>
                    </div>
                  )}
                  <div className="md:col-span-3 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Fournisseur</p>
                    <p className="font-medium">{selectedDelivery.supplier_name}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Articles livrés</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Code-barres</TableHead>
                        <TableHead>Commandé</TableHead>
                        <TableHead>Reçu</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead>Péremption</TableHead>
                        <TableHead>Écart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDelivery.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="font-mono">{item.barcode || item.product_barcode || '—'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.received_quantity || 0}</TableCell>
                          <TableCell className="font-mono">{item.batch_number || '—'}</TableCell>
                          <TableCell>{item.expiry_date ? formatDate(item.expiry_date) : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={(item.non_conforming_quantity || 0) > 0 ? 'warning' : 'success'}>
                              {item.non_conforming_quantity || 0} non conforme(s)
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Reception Notes */}
              {selectedDelivery.reception_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes de réception</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedDelivery.reception_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Invoice */}
              <Card>
                <CardHeader>
                  <CardTitle>Facture scannée</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDelivery.invoice_path ? (
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">{selectedDelivery.invoice_path.split(/[\\/]/).pop()}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(selectedDelivery.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Voir / Télécharger
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucune facture scannée</p>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              {selectedDelivery.documents?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedDelivery.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span>{doc.name}</span>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        </div>
                      ))}
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
          {canValidate && selectedDelivery?.status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                onClick={() => handleRejectDelivery(selectedDelivery.id)}
              >
                <X className="w-4 h-4 mr-2" />
                Rejeter la livraison
              </Button>
              <Button
                onClick={() => handleValidateDelivery(selectedDelivery.id)}
              >
                <Check className="w-4 h-4 mr-2" />
                Valider et entrer en stock
              </Button>
            </div>
          )}
        </ModalFooter>
      </Modal>

      {/* Étiquettes imprimées automatiquement après validation */}
      <DeliveryLabelSheet
        delivery={printDelivery}
        onDone={() => setPrintDelivery(null)}
      />
    </div>
  )
}

export default DeliveriesPage

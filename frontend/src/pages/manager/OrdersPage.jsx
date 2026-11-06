import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Eye, Edit, Trash2, Package, Calendar, DollarSign, CheckCircle, XCircle, Clock, Filter, Download } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { cn, formatCurrency, formatDate } from '../../lib/utils'
import { useTable } from '../../hooks/useTable'
import { useDebounce } from '../../hooks/useDebounce'

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { addToast } = useToast()

  const statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'delivered', label: 'Livré' },
    { value: 'cancelled', label: 'Annulé' },
    { value: 'partial', label: 'Partiel' },
  ]

  const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    delivered: 'success',
    cancelled: 'danger',
    partial: 'warning',
  }

  const statusLabels = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    delivered: 'Livré',
    cancelled: 'Annulé',
    partial: 'Partiel',
  }

  const {
    paginatedData: paginatedOrders,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    totalPages,
    currentPage,
    pageSize
  } = useTable(orders, {
    searchKeys: ['supplier_name', 'reference', 'status'],
    initialPageSize: 10
  })

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    fetchOrders()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [debouncedSearch, statusFilter])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/manager/orders', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100
        }
      })
      setOrders(response.data.orders || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les commandes'
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

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleDeleteOrder = async (orderId) => {
    try {
      await api.delete(`/manager/orders/${orderId}`)
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Commande supprimée avec succès'
      })
      fetchOrders()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de supprimer la commande'
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/manager/orders/export', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `commandes_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`)
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
        message: 'Impossible d\'exporter les commandes'
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
            <ShoppingCart className="w-7 h-7 text-primary-600" />
            Commandes d'approvisionnement
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gestion des commandes auprès des fournisseurs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/manager/orders/new">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle commande
            </Link>
          </Button>
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
                placeholder="Rechercher par fournisseur ou référence..."
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des commandes</CardTitle>
          <CardDescription>
            {orders.length} commandes trouvées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune commande trouvée</p>
              <p className="text-sm mt-1">Créez votre première commande</p>
              <Button asChild className="mt-4">
                <Link to="/manager/orders/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle commande
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.reference}</TableCell>
                      <TableCell>{order.supplier_name}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>{order.items_count}</TableCell>
                      <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/manager/orders/${order.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Affichage {paginatedOrders.length} sur {orders.length} commandes
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

      {/* Order Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <ModalHeader>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            Détails de la commande
          </h2>
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations de la commande</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Référence</p>
                    <p className="font-mono font-medium">{selectedOrder.reference}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Date</p>
                    <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Statut</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Fournisseur</p>
                    <p className="font-medium">{selectedOrder.supplier_name}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Articles commandés</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Code-barres</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="font-mono">{item.barcode}</TableCell>
                          <TableCell>{item.quantity} {item.unit}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="flex justify-end mt-4 border-t pt-4">
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between gap-8">
                        <span>Sous-total:</span>
                        <span>{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between gap-8">
                          <span>Remise:</span>
                          <span>-{formatCurrency(selectedOrder.discount)}</span>
                        </div>
                      )}
                      {selectedOrder.tax > 0 && (
                        <div className="flex justify-between gap-8">
                          <span>Taxe:</span>
                          <span>{formatCurrency(selectedOrder.tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-8 font-bold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{selectedOrder.notes}</p>
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
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default OrdersPage

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Filter, Calendar, ArrowUp, ArrowDown, Warehouse, RefreshCw, DollarSign, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useTable } from '@/hooks/useTable'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { DatePickerInput } from '@/components/ui/DatePicker'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

/**
 * Inventory Management Page for Manager
 * FRNT-008: Session Gestionnaire - Gestion des stocks
 */
function InventoryPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const isStockManager = user && (user.role === 'admin' || user.role === 'manager')
  
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [formData, setFormData] = useState({
    product_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
    location: '',
    supplier_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteBatchId, setDeleteBatchId] = useState(null)
  const [importing, setImporting] = useState(false)

  const {
    isOpen: isBatchModalOpen,
    onOpen: openBatchModal,
    onClose: closeBatchModal
  } = useDisclosure()

  const {
    isOpen: isEditModalOpen,
    onOpen: openEditModal,
    onClose: closeEditModal
  } = useDisclosure()

  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal
  } = useDisclosure()

  const statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'low', label: 'Stock Faible' },
    { value: 'expiring', label: 'Péremption Proche' },
    { value: 'expired', label: 'Périmé' },
  ]

  const {
    paginatedData: paginatedBatches,
    handleSearch,
    handlePageChange,
    totalPages,
    currentPage
  } = useTable(batches, { 
    searchKeys: ['product_name', 'batch_number', 'location', 'supplier_name'],
    initialPageSize: 10
  })

  // Fetch products, batches and suppliers
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch products
      const productsResponse = await api.get('/products', {
        params: { 
          page: 1, 
          page_size: 100,
          is_active: true 
        }
      })
      setProducts(productsResponse.data.products || [])
      
      // Fetch batches
      const batchesResponse = await api.get('/batches', {
        params: { 
          page: 1, 
          page_size: 100,
          status: 'active' 
        }
      })
      setBatches(batchesResponse.data.batches || [])
      
      // Fetch suppliers
      const suppliersResponse = await api.get('/suppliers', {
        params: { page: 1, page_size: 100 }
      })
      setSuppliers(suppliersResponse.data.suppliers || [])
      
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Échec du chargement de l\'inventaire'
      })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    handleSearch()
  }, [searchTerm, filterStatus])

  // Filter batches based on search and status
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const matchesSearch = !searchTerm || (
        (batch.product_name && batch.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (batch.batch_number && batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (batch.location && batch.location.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'low' && batch.quantity < 10) ||
        (filterStatus === 'expiring' && batch.is_expiring_soon) ||
        (filterStatus === 'expired' && batch.is_expired)
      
      return matchesSearch && matchesStatus
    })
  }, [batches, searchTerm, filterStatus])

  // Calculate stock status
  const getStockStatus = (batch) => {
    if (batch.is_expired) return { label: 'Périmé', variant: 'danger' }
    if (batch.is_expiring_soon) return { label: 'Péremption proche', variant: 'warning' }
    if (batch.quantity < 10) return { label: 'Stock faible', variant: 'warning' }
    if (batch.quantity === 0) return { label: 'Rupture', variant: 'danger' }
    return { label: 'OK', variant: 'success' }
  }

  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.product_id || !formData.batch_number || !formData.quantity) {
      addToast({
        type: 'error',
        title: 'Champs requis',
        message: 'Veuillez remplir tous les champs obligatoires'
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      await api.post('/batches', formData)
      addToast({
        type: 'success',
        title: 'Lot ajouté',
        message: `Le lot ${formData.batch_number} a été ajouté avec succès`
      })
      closeBatchModal()
      setFormData({
        product_id: '',
        batch_number: '',
        expiry_date: '',
        quantity: '',
        cost_price: '',
        selling_price: '',
        location: '',
        supplier_id: ''
      })
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec de l\'ajout du lot'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle update
  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!selectedBatch || !formData.batch_number || !formData.quantity) return
    
    setIsSubmitting(true)
    try {
      await api.put(`/batches/${selectedBatch.id}`, formData)
      addToast({
        type: 'success',
        title: 'Lot mis à jour',
        message: `Le lot ${formData.batch_number} a été mis à jour`
      })
      closeEditModal()
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec de la mise à jour'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteBatchId) return
    
    setIsSubmitting(true)
    try {
      await api.delete(`/batches/${deleteBatchId}`)
      addToast({
        type: 'success',
        title: 'Lot supprimé',
        message: 'Le lot a été supprimé avec succès'
      })
      closeDeleteModal()
      setDeleteBatchId(null)
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec de la suppression'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============ Stock Management (Gestionnaire + Admin) ============

  const handleRemoveExpired = async () => {
    if (!isStockManager) {
      addToast({
        type: 'error',
        title: 'Accès refusé',
        message: 'Seul le gestionnaire de stock peut retirer les produits périmés'
      })
      return
    }
    if (!window.confirm('Voulez-vous retirer tous les lots périmés du stock ?')) return

    setIsSubmitting(true)
    try {
      const response = await api.post('/inventory/remove-expired')
      addToast({
        type: 'success',
        title: 'Périmés retirés',
        message: `${response.data.batches_removed} lot(s) retiré(s), ${response.data.quantity_removed} unité(s)`
      })
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec du retrait des périmés'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdjustStock = async () => {
    if (!adjustBatchId) return

    setIsSubmitting(true)
    try {
      await api.post('/inventory/adjust', {
        batch_id: adjustBatchId,
        quantity: parseInt(adjustQuantity) || 0,
        movement_type: 'adjustment',
        reason: adjustReason || 'Réajustement stock',
        reference: `INV-${adjustBatchId}`
      })
      addToast({
        type: 'success',
        title: 'Stock réajusté',
        message: 'Le stock a été mis à jour avec succès'
      })
      setAdjustBatchId(null)
      setAdjustQuantity('')
      setAdjustReason('')
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec du réajustement'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportStock = async (e) => {
    if (!isStockManager) {
      addToast({
        type: 'error',
        title: 'Accès refusé',
        message: 'Seul le gestionnaire de stock peut importer un fichier'
      })
      return
    }
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/inventory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      addToast({
        type: 'success',
        title: 'Import terminé',
        message: `${response.data.imported} lot(s) importé(s)` + (response.data.errors?.length ? `, ${response.data.errors.length} erreur(s)` : '')
      })
      if (response.data.errors?.length) {
        console.warn('Import errors:', response.data.errors)
      }
      fetchInventory()
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec de l\'import'
      })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleOpenEditModal = (batch) => {
    setSelectedBatch(batch)
    setFormData({
      product_id: batch.product_id || '',
      batch_number: batch.batch_number || '',
      expiry_date: batch.expiry_date || '',
      quantity: batch.quantity || '',
      cost_price: batch.cost_price || '',
      selling_price: batch.selling_price || '',
      location: batch.location || '',
      supplier_id: batch.supplier_id || ''
    })
    openEditModal()
  }

  const handleOpenDeleteModal = (batchId) => {
    setDeleteBatchId(batchId)
    openDeleteModal()
  }

  const productOptions = useMemo(() => {
    return products.map(p => ({
      value: p.id,
      label: `${p.name} (${p.barcode})`
    }))
  }, [products])

  const supplierOptions = useMemo(() => {
    return suppliers.map(s => ({
      value: s.id,
      label: s.name
    }))
  }, [suppliers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion de l'Inventaire</CardTitle>
          <CardDescription>
            Suivi des stocks, lots et dates de péremption avec sélection FEFO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit ou un lot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              placeholder="Filtrer par statut"
              className="w-48"
            />
            {isStockManager && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveExpired}
                  className="text-danger-600 hover:text-danger-700 border-danger-200"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Retirer Périmés
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('import-stock-file')?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Importer CSV
                </Button>
                <input
                  id="import-stock-file"
                  type="file"
                  accept=".csv"
                  onChange={handleImportStock}
                  className="hidden"
                />
              </div>
            )}
            <Button onClick={openBatchModal}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Lot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
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
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Lots
                    </p>
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">
                      {batches.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      En Stock
                    </p>
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">
                      {batches.filter(b => b.quantity > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Stock Faible
                    </p>
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">
                      {batches.filter(b => b.quantity < 10 && b.quantity > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
                    <XCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rupture/Périmé
                    </p>
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">
                      {batches.filter(b => b.quantity === 0 || b.is_expired).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Lots ({filteredBatches.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchInventory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun lot trouvé</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix d'Achat</TableHead>
                    <TableHead>Prix de Vente</TableHead>
                    <TableHead>Péremption</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBatches.map((batch) => {
                    const status = getStockStatus(batch)
                    const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date)
                    
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{batch.product_name}</span>
                            {batch.product_barcode && (
                              <span className="text-xs text-gray-500 font-mono">
                                {batch.product_barcode}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{batch.batch_number}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{batch.quantity}</span>
                            {batch.quantity > 0 && (
                              <Badge variant="success" size="xs">
                                {batch.quantity > 50 ? '↑' : batch.quantity > 20 ? '→' : '↓'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(batch.cost_price || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(batch.selling_price || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(batch.expiry_date)}</span>
                            {daysUntilExpiry !== null && (
                              <span className={cn(
                                'text-xs',
                                daysUntilExpiry <= 0 ? 'text-danger-600' :
                                daysUntilExpiry <= 30 ? 'text-warning-600' :
                                'text-success-600'
                              )}>
                                {daysUntilExpiry <= 0 ? 'Périmé' : `${daysUntilExpiry} jours`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(batch)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isStockManager && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newQty = window.confirm(
                                    `Réajuster le stock du lot ${batch.batch_number} ?\nQuantité actuelle : ${batch.quantity}\nNouvelle quantité :`
                                  )
                                  if (newQty !== null) {
                                    const qty = prompt('Nouvelle quantité :', batch.quantity.toString())
                                    if (qty !== null) {
                                      setAdjustBatchId(batch.id)
                                      setAdjustQuantity(qty)
                                      setAdjustReason('Réajustement après inventaire')
                                      handleAdjustStock()
                                    }
                                  }
                                }}
                              >
                                <RefreshCw className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteModal(batch.id)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} sur {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Batch Modal */}
      <Modal isOpen={isBatchModalOpen || isEditModalOpen} onClose={isBatchModalOpen ? closeBatchModal : closeEditModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            <span>{isBatchModalOpen ? 'Ajouter un Lot' : 'Modifier le Lot'}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={isBatchModalOpen ? handleSubmit : handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Produit *
                </label>
                <Select
                  value={formData.product_id}
                  onChange={(value) => handleSelectChange('product_id', value)}
                  options={productOptions}
                  placeholder="Sélectionnez un produit"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Numéro de Lot *
                </label>
                <Input
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleInputChange}
                  placeholder="LOT-2024-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date de Péremption *
                </label>
                <Input
                  name="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  placeholder="Sélectionnez une date"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantité *
                </label>
                <Input
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="100"
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prix d'Achat (XOF)
                </label>
                <Input
                  name="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  placeholder="500"
                  leftIcon={DollarSign}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prix de Vente (XOF)
                </label>
                <Input
                  name="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  placeholder="800"
                  leftIcon={DollarSign}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Emplacement
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Étagère A, Rayon 1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Fournisseur
                </label>
                <Select
                  value={formData.supplier_id}
                  onChange={(value) => handleSelectChange('supplier_id', value)}
                  options={supplierOptions}
                  placeholder="Sélectionnez un fournisseur"
                />
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={isBatchModalOpen ? closeBatchModal : closeEditModal}>
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={isBatchModalOpen ? handleSubmit : handleUpdate}
            isLoading={isSubmitting}
          >
            {isBatchModalOpen ? 'Ajouter le Lot' : 'Mettre à jour'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-danger-600" />
            <span>Supprimer le Lot</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Êtes-vous sûr de vouloir supprimer ce lot ?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cette action est irréversible. Toutes les données associées à ce lot seront également supprimées.
              </p>
            </div>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeDeleteModal}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isSubmitting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default InventoryPage

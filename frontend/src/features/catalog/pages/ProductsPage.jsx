import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Search, Plus, Edit, Trash2, Barcode, X, Eye, AlertTriangle, Tag } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select } from '@/components/ui/Select/Select'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { useToast } from '@/components/common/Toast'
import { useAlerts } from '@/hooks/useAlerts'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import catalogApi from '../api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useTable } from '@/hooks/useTable'
import { useDebounce } from '@/hooks/useDebounce'

function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDesc, setCategoryDesc] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const { addToast } = useToast()
  const { hasAlerts, getAlertCountForProduct, getProductAlertSeverity } = useAlerts()
  const { user } = useAuth()
  // Seul le gestionnaire de stock (manager) ou l'admin peut créer/modifier un produit.
  const canManageProducts = ['admin', 'manager'].includes(user?.role)
  // La suppression reste réservée à l'administrateur (règle backend).
  const canDeleteProducts = user?.role === 'admin'
  const isStockManager = ['admin', 'manager'].includes(user?.role)

  // Consultation des lots d'un produit (au clic sur le nom).
  const [batchProduct, setBatchProduct] = useState(null)
  const [productBatches, setProductBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [deletingBatchId, setDeletingBatchId] = useState(null)

  const { 
    searchQuery, 
    setSearchQuery, 
    filters, 
    setFilters, 
    paginatedData: paginatedProducts,
    handlePageChange,
    totalPages,
    currentPage,
  } = useTable(products, { 
    searchable: false,
    filterable: false,
    pageSize: 10
  })

  const debouncedSearch = useDebounce(searchQuery, 400)
  const selectedCategory = filters.category || 'all'

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategory])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await catalogApi.list({
        search: debouncedSearch || undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        page_size: 100,
      })
      setProducts(response.data.products || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les produits'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await catalogApi.listCategories()
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const openCategoryModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDesc('')
    setCategoryModalOpen(true)
  }

  const startEditCategory = (cat) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setCategoryDesc(cat.description || '')
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDesc('')
  }

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      addToast({ type: 'error', title: 'Erreur', message: 'Le nom de la catégorie est obligatoire' })
      return
    }
    setCategorySaving(true)
    try {
      if (editingCategory) {
        await catalogApi.updateCategory(editingCategory.id, { name: categoryName.trim(), description: categoryDesc.trim() || null })
        addToast({ type: 'success', title: 'Succès', message: 'Catégorie mise à jour' })
      } else {
        await catalogApi.createCategory({ name: categoryName.trim(), description: categoryDesc.trim() || null })
        addToast({ type: 'success', title: 'Succès', message: 'Catégorie créée' })
      }
      cancelEditCategory()
      fetchCategories()
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.detail || 'Impossible d’enregistrer la catégorie' })
    } finally {
      setCategorySaving(false)
    }
  }

  const deleteCategory = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie « ${cat.name} » ?`)) return
    try {
      await catalogApi.deleteCategory(cat.id)
      addToast({ type: 'success', title: 'Succès', message: 'Catégorie supprimée' })
      fetchCategories()
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.detail || 'Impossible de supprimer la catégorie' })
    }
  }

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      scanBarcode(barcodeInput.trim())
    }
  }

  const scanBarcode = async (barcode) => {
    try {
      const response = await api.post('/barcode/scan', {
        barcode: barcode
      })
      
      if (response.data.product) {
        addToast({
          type: 'success',
          title: 'Produit trouvé',
          message: `Produit: ${response.data.product.name}`
        })
        setSearchQuery(response.data.product.name)
      } else {
        addToast({
          type: 'error',
          title: 'Produit introuvable',
          message: response.data.error || 'Ce code-barres ne correspond à aucun produit'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de scan',
        message: 'Impossible de scanner le code-barres'
      })
    }
  }

  const getStockStatus = (product) => {
    const boxes = Number(product.current_stock || 0)
    const bulkUnits = Number(product.current_bulk_stock || 0)
    if (boxes === 0 && bulkUnits === 0) return { text: 'Rupture', variant: 'danger' }
    if (boxes <= (product.stock_min || 5) && bulkUnits === 0) return { text: 'Stock faible', variant: 'warning' }
    if (boxes >= (product.stock_max || 100)) return { text: 'Surstock', variant: 'warning' }
    return { text: 'OK', variant: 'success' }
  }

  const getExpiryStatus = (product) => {
    if (product.has_expiring_soon) {
      return { text: 'Péremption proche', variant: 'warning' }
    }
    return null
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Supprimer définitivement « ${product.name} » ?`)) return

    try {
      await catalogApi.deleteProduct(product.id)
      setProducts((prev) => prev.filter((item) => item.id !== product.id))
      addToast({
        type: 'success',
        title: 'Produit supprimé',
        message: product.name
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer ce produit'
      })
    }
  }

  const loadProductBatches = async (product) => {
    setBatchesLoading(true)
    try {
      const response = await api.get('/batches', {
        params: { product_id: product.id, page: 1, page_size: 100 }
      })
      setProductBatches(response.data.batches || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les lots de ce produit'
      })
    } finally {
      setBatchesLoading(false)
    }
  }

  const handleOpenBatches = async (product) => {
    setBatchProduct(product)
    setProductBatches([])
    await loadProductBatches(product)
  }

  const handleDeleteBatch = async (batch) => {
    if (!isStockManager) return
    if (!batch.is_expired && Number(batch.quantity || 0) > 0) {
      addToast({
        type: 'error',
        title: 'Suppression impossible',
        message: 'Seuls les lots périmés ou vides peuvent être supprimés'
      })
      return
    }
    if (!window.confirm(`Supprimer le lot « ${batch.batch_number} » ?`)) return

    setDeletingBatchId(batch.id)
    try {
      await api.delete(`/batches/${batch.id}`)
      addToast({
        type: 'success',
        title: 'Lot supprimé',
        message: `Le lot ${batch.batch_number} a été sorti du stock`
      })
      if (batchProduct) await loadProductBatches(batchProduct)
      fetchProducts()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer ce lot'
      })
    } finally {
      setDeletingBatchId(null)
    }
  }

  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'Toutes les catégories' },
    ...categories
      .filter(cat => cat.id !== undefined && cat.id !== null)
      .map(cat => ({ value: cat.id, label: cat.name }))
  ], [categories])

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({ category: 'all' })
    setBarcodeInput('')
  }

  const hasActiveFilters = Boolean(searchQuery) || selectedCategory !== 'all' || Boolean(barcodeInput)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Produits</CardTitle>
          <CardDescription>
            Liste de tous les produits de votre pharmacie
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={selectedCategory}
                onChange={(value) => setFilters({ ...filters, category: value })}
                options={categoryOptions}
                placeholder="Filtrer par catégorie"
                className="w-48"
              />
              
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Code-barres"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  className="w-48 pl-10"
                />
              </div>
              
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Effacer</span>
                </Button>
              )}
              
              {canManageProducts && (
                <>
                  <Button variant="outline" size="sm" onClick={openCategoryModal}>
                    <Tag className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Catégories</span>
                  </Button>
                  <Button size="sm" onClick={() => navigate('/products/new')}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Ajouter</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Produits ({products.length})</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {paginatedProducts.length} / {products.length} produits
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun produit trouvé</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">
                  Essayez de modifier votre recherche
                </p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code racine</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => {
                    const stockStatus = getStockStatus(product)
                    const expiryStatus = getExpiryStatus(product)
                    const alertSeverity = getProductAlertSeverity(product.id)
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">
                          <div>{product.code || '—'}</div>
                          {product.barcode && product.barcode !== product.code && (
                            <div className="text-[11px] text-gray-500">
                              {product.barcode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenBatches(product)}
                              className="font-medium text-left hover:text-primary-600 hover:underline"
                              title="Voir les lots enregistrés"
                            >
                              {product.name}
                            </button>
                            {product.is_bulk && (
                              <Badge variant="primary" size="xs">
                                Vrac · {product.units_per_box || 1}/boîte
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {product.category_name || 'Sans catégorie'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(product.price || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span>{product.current_stock || 0} boîte(s)</span>
                              {product.is_bulk && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {product.current_bulk_stock || 0} unité(s) vrac
                                </span>
                              )}
                              {Number(product.expired_stock || 0) > 0 && (
                                <span className="text-xs font-medium text-danger-600">
                                  {product.expired_stock} périmé(s)
                                </span>
                              )}
                            </div>
                            {hasAlerts && getAlertCountForProduct(product.id) > 0 && (
                              <Badge variant={alertSeverity === 'high' ? 'danger' : 'warning'}>
                                {getAlertCountForProduct(product.id)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.text}
                            </Badge>
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant}>
                                {expiryStatus.text}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canManageProducts && (
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/products/${product.id}/edit`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                            )}
                            {canDeleteProducts && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 className="w-4 h-4 text-danger-500" />
                              </Button>
                            )}
                            {!canManageProducts && !canDeleteProducts && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
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

      {/* Quick Stats */}
      {!isLoading && products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {products.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Produits
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {products.filter(p => getStockStatus(p).variant === 'success').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  En Stock
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                  {products.filter(p => getStockStatus(p).variant === 'warning').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Stock Faible
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                  {products.filter(p => getStockStatus(p).variant === 'danger').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Rupture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal : lots du produit */}
      <Modal isOpen={Boolean(batchProduct)} onClose={() => setBatchProduct(null)}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-600" />
            <span>Lots de {batchProduct?.name}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {batchesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : productBatches.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Aucun lot enregistré pour ce produit.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot</TableHead>
                    <TableHead>Péremption</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Vrac</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productBatches.map((batch) => {
                    const removable = isStockManager && (batch.is_expired || Number(batch.quantity || 0) === 0)
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-xs">{batch.batch_number}</TableCell>
                        <TableCell>{batch.expiry_date ? formatDate(batch.expiry_date) : '—'}</TableCell>
                        <TableCell>{batch.quantity || 0}</TableCell>
                        <TableCell>{batch.bulk_quantity || 0}</TableCell>
                        <TableCell>{batch.location || '—'}</TableCell>
                        <TableCell>
                          {batch.is_expired ? (
                            <Badge variant="danger">Périmé</Badge>
                          ) : batch.is_expiring_soon ? (
                            <Badge variant="warning">Péremption proche</Badge>
                          ) : (
                            <Badge variant="success">Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {removable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBatch(batch)}
                              disabled={deletingBatchId === batch.id}
                              title="Supprimer le lot périmé"
                            >
                              <Trash2 className="w-4 h-4 text-danger-500" />
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!isStockManager && (
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              La suppression d'un lot périmé est réservée au gestionnaire de stock.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setBatchProduct(null)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Gestion des catégories (admin/manager) */}
      <Modal isOpen={categoryModalOpen} onClose={() => { setCategoryModalOpen(false); cancelEditCategory() }} size="lg">
        <ModalHeader>
          <h2 className="text-xl font-bold">Gestion des catégories</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la catégorie"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <Input
                placeholder="Description (optionnel)"
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
              />
              <Button size="sm" onClick={saveCategory} disabled={categorySaving}>
                {editingCategory ? 'Mettre à jour' : 'Ajouter'}
              </Button>
              {editingCategory && (
                <Button variant="outline" size="sm" onClick={cancelEditCategory}>
                  Annuler
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">Aucune catégorie</TableCell>
                  </TableRow>
                ) : categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{cat.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEditCategory(cat)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteCategory(cat)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setCategoryModalOpen(false); cancelEditCategory() }}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default ProductsPage

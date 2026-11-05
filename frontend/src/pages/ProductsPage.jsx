import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search, Plus, Edit, Trash2, Barcode, Calendar, AlertTriangle, Filter, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton'
import { useToast } from '../components/common/Toast'
import { useAlerts } from '../hooks/useAlerts'
import api from '../services/api'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import { useTable } from '../hooks/useTable'
import { useDebounce } from '../hooks/useDebounce'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const { addToast } = useToast()
  const { hasAlerts, getAlertCountForProduct, getProductAlertSeverity } = useAlerts()

  const { 
    searchQuery, 
    setSearchQuery, 
    filters, 
    setFilters, 
    paginatedData: paginatedProducts,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    totalPages,
    currentPage,
    pageSize
  } = useTable(products, { 
    searchKeys: ['name', 'barcode', 'category', 'description'],
    initialPageSize: 10
  })

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [debouncedSearch, filters])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/products', {
        params: {
          search: debouncedSearch || undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
          limit: 100
        }
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
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
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
    if (product.current_stock === 0) return { text: 'Rupture', variant: 'danger' }
    if (product.current_stock <= (product.stock_min || 5)) return { text: 'Stock faible', variant: 'warning' }
    if (product.current_stock >= (product.stock_max || 100)) return { text: 'Surstock', variant: 'warning' }
    return { text: 'OK', variant: 'success' }
  }

  const getExpiryStatus = (product) => {
    if (!product.batches || product.batches.length === 0) return null
    
    const soonExpiring = product.batches.some(batch => {
      const expiryDate = new Date(batch.expiry_date)
      const today = new Date()
      const daysDiff = (expiryDate - today) / (1000 * 60 * 60 * 24)
      return daysDiff <= 30 && daysDiff >= 0
    })
    
    if (soonExpiring) return { text: 'Péremption proche', variant: 'warning' }
    return null
  }

  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'Toutes les catégories' },
    ...categories.map(cat => ({ value: cat.id || cat.name, label: cat.name }))
  ], [categories])

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({ category: 'all' })
    setBarcodeInput('')
  }

  const hasActiveFilters = searchQuery || filters.category !== 'all' || barcodeInput

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
                value={filters.category || 'all'}
                onChange={(value) => setFilters({ ...filters, category: value })}
                options={categoryOptions}
                placeholder="Filtrer par catégorie"
                className="w-48"
              />
              
              <div className="relative">
                <Input
                  placeholder="Code-barres"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  leftIcon={Barcode}
                  className="w-48"
                />
              </div>
              
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Effacer</span>
                </Button>
              )}
              
              <Button size="sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Ajouter</span>
              </Button>
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
                    <TableHead>Code-barres</TableHead>
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
                          {product.barcode}
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
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(product.selling_price || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.current_stock || 0}</span>
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
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/products/${product.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-danger-500" />
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
    </div>
  )
}

export default ProductsPage

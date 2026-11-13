import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Barcode, Trash2, Check, Package, ArrowRight, Minus, Plus as PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCart, getItemUnitPrice } from '@/providers/CartProvider'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useDisclosure } from '@/hooks/useDisclosure'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Skeleton } from '@/components/ui/Skeleton'
import { Separator } from '@/components/ui/Separator'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

/**
 * Sales Page for Pharma 360
 * Point of sale interface with barcode scanning and FEFO selection
 * 
 * FRNT-005: Session Vente (Recherche + FEFO + envoi Caisse)
 */
function SalesPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  const {
    items: cartItems,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    cartTotal,
    cartCount,
  } = useCart()
  
  const { scanBarcode, isScanning } = useBarcodeScanner()
  
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    isOpen: isProductModalOpen,
    onOpen: openProductModal,
    onClose: closeProductModal
  } = useDisclosure()

  const {
    isOpen: isConfirmOpen,
    onOpen: openConfirm,
    onClose: closeConfirm
  } = useDisclosure()

  // Fetch products (la recherche est faite côté API)
  const fetchProducts = useCallback(async (query = '') => {
    setIsLoading(true)
    try {
      const response = await api.get('/products/', {
        params: {
          search: query.trim() || undefined,
          page_size: 50
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
  }, [addToast])

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(searchQuery), 350)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchProducts])

  // Charge les lots du produit (la liste /products ne les renvoie pas)
  const openProduct = useCallback(async (product) => {
    if (!product?.id) return

    setSelectedProduct(product)
    setSelectedBatch(null)
    setQuantity(1)
    setIsLoadingBatches(true)
    openProductModal()

    try {
      const response = await api.get(`/products/${product.id}`)
      const detail = response.data

      setSelectedProduct(detail)

      // Sélection FEFO : lot disponible dont la péremption est la plus proche.
      const fefoBatch = (detail.batches || [])
        .filter(batch => Number(batch.quantity) > 0 && batch.is_available !== false)
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))[0] || null

      setSelectedBatch(fefoBatch)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les lots de ce produit'
      })
    } finally {
      setIsLoadingBatches(false)
    }
  }, [openProductModal, addToast])

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    if (!scannedBarcode.trim()) return

    const result = await scanBarcode(scannedBarcode.trim())

    if (result?.product) {
      if (result.batch) {
        addItem(result.product, result.batch, 1)
        addToast({
          type: 'success',
          title: 'Produit ajouté',
          message: `${result.product.name} - Lot ${result.batch.batch_number}${
            result.batch.location ? ` - Rayon ${result.batch.location}` : ''
          }`
        })
      } else {
        // Pas de lot sélectionnable automatiquement : ouverture du choix manuel.
        await openProduct(result.product)
      }
    }

    setBarcode('')
  }, [scanBarcode, addItem, addToast, openProduct])

  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      handleBarcodeScan(barcode.trim())
    }
  }

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch)
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return

    if (!selectedBatch) {
      addToast({
        type: 'warning',
        title: 'Aucun lot disponible',
        message: 'Sélectionnez un lot avant d\'ajouter le produit'
      })
      return
    }

    const maxQuantity = Number(selectedBatch.quantity ?? 0)
    if (quantity > maxQuantity) {
      addToast({
        type: 'warning',
        title: 'Stock insuffisant',
        message: `Il reste ${maxQuantity} unité(s) dans ce lot`
      })
      return
    }

    addItem(selectedProduct, selectedBatch, quantity)
    addToast({
      type: 'success',
      title: 'Produit ajouté',
      message: `${selectedProduct.name} x${quantity}`
    })
    closeProductModal()
    setQuantity(1)
    setSelectedBatch(null)
    setSelectedProduct(null)
  }

  const handleUpdateQuantity = (productId, batchId, delta) => {
    const currentItem = cartItems.find(
      item => item.product.id === productId && item.batch?.id === batchId
    )
    if (!currentItem) return

    const newQuantity = currentItem.quantity + delta
    if (newQuantity > 0) {
      updateItemQuantity(productId, batchId, newQuantity)
    } else {
      removeItem(productId, batchId)
    }
  }

  const handleSendToCashier = async () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Panier vide',
        message: 'Ajoutez des produits avant d\'envoyer à la caisse'
      })
      return
    }

    if (!user?.id) {
      addToast({
        type: 'error',
        title: 'Session expirée',
        message: 'Reconnectez-vous pour envoyer la vente à la caisse'
      })
      return
    }

    if (cartItems.some(item => !item.batch?.id)) {
      addToast({
        type: 'error',
        title: 'Lot manquant',
        message: 'Chaque produit doit être associé à un lot'
      })
      return
    }

    const total = cartItems.reduce(
      (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
      0
    )

    const saleData = {
      user_id: user.id,
      status: 'pending',
      subtotal: total,
      tax_amount: 0,
      discount: 0,
      total,
      items: cartItems.map(item => ({
        product_id: item.product.id,
        batch_id: item.batch?.id,
        quantity: item.quantity,
        unit_price: getItemUnitPrice(item)
      }))
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/sales/', saleData)
      const payload = response.data || {}

      if (payload.success === false) {
        addToast({
          type: 'error',
          title: 'Vente refusée',
          message: (payload.errors || []).join(' · ') || 'La vente n\'a pas pu être créée'
        })
        return
      }

      clearCart()
      addToast({
        type: 'success',
        title: 'Vente préparée',
        message: 'Les produits ont été envoyés à la caisse'
      })

      navigate('/cashier', {
        state: { saleId: payload.sale_id }
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Erreur',
        message: typeof detail === 'string' ? detail : 'Impossible de préparer la vente'
      })
    } finally {
      setIsSubmitting(false)
      closeConfirm()
    }
  }

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return products

    return products.filter(product => {
      const haystack = [product.name, product.barcode, product.category_name, product.dci]
        .filter(Boolean)
        .map(value => String(value).toLowerCase())
      return haystack.some(value => value.includes(query))
    })
  }, [products, searchQuery])

  const getBatchStatus = (batch) => {
    const expiryDate = new Date(batch.expiry_date)
    const daysDiff = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return { text: 'Périmé', variant: 'danger' }
    if (daysDiff <= 30) return { text: 'Péremption proche', variant: 'warning' }
    return { text: 'OK', variant: 'success' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Session Vente</CardTitle>
          <CardDescription>
            Recherchez et ajoutez des produits à la vente - Sélection automatique FEFO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barcode Scanner */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Scanner le code-barres..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeInput}
                  className="pl-10"
                  disabled={isScanning}
                />
              </div>
              {isScanning && (
                <p className="text-sm text-primary-600 mt-1">
                  Scan en cours...
                </p>
              )}
            </div>
            
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
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Produits Disponibles ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openProduct(product)}
                  >
                    <div className="flex items-start gap-4">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {product.barcode || 'Sans code-barres'}
                            </p>
                          </div>
                          
                          <Badge variant="secondary">
                            {product.category_name || 'Sans catégorie'}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Stock: {product.current_stock ?? 0}
                            </p>
                            {product.next_expiring_batch && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Prochain lot: {product.next_expiring_batch}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-primary-600 dark:text-primary-400">
                              {formatCurrency(product.price || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="sticky top-6 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Panier de Vente</span>
              <Badge variant={cartCount > 0 ? 'primary' : 'secondary'}>
                {cartCount}
              </Badge>
            </CardTitle>
            <CardDescription>
              {cartItems.length} produit(s) - {formatCurrency(cartTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Panier vide</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableBody>
                    {cartItems.map((item) => (
                      <TableRow key={`${item.product.id}-${item.batch?.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateQuantity(item.product.id, item.batch?.id, -1)
                              }}
                              className="h-6 w-6"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span>{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateQuantity(item.product.id, item.batch?.id, 1)
                              }}
                              className="h-6 w-6"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{item.product.name}</span>
                            {item.product.barcode && (
                              <span className="text-xs text-gray-500">
                                Code-barres: {item.product.barcode}
                              </span>
                            )}
                            {item.batch && (
                              <span className="text-xs text-gray-500">
                                Lot: {item.batch.batch_number}
                                {item.batch.location ? ` · Rayon: ${item.batch.location}` : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(getItemUnitPrice(item) * item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeItem(item.product.id, item.batch?.id)
                            }}
                            className="h-6 w-6 text-danger-500 hover:text-danger-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between text-sm">
                  <span>Sous-total:</span>
                  <span className="font-medium">{formatCurrency(cartTotal)}</span>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={openConfirm}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Envoyer à la Caisse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={closeProductModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            <span>Sélectionner un Lot</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code-barres: {selectedProduct.barcode || '—'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Catégorie: {selectedProduct.category_name || 'Sans catégorie'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prix: {formatCurrency(selectedProduct.price || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lots Disponibles (Sélection FEFO automatique)
                </h4>
                
                {isLoadingBatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.batches
                      .filter(batch => Number(batch.quantity) > 0)
                      .sort((a, b) => {
                        const dateA = new Date(a.expiry_date)
                        const dateB = new Date(b.expiry_date)
                        return dateA - dateB // Sort by nearest expiry date
                      })
                      .map((batch) => {
                        const expiryDate = new Date(batch.expiry_date)
                        const daysDiff = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24))
                        
                        return (
                          <Card
                            key={batch.id}
                            className={cn(
                              'p-3 cursor-pointer transition-all',
                              selectedBatch?.id === batch.id 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                            onClick={() => handleSelectBatch(batch)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  Lot: {batch.batch_number}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Péremption: {formatDate(batch.expiry_date)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Rayon: {batch.location || '—'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Stock: {batch.quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">
                                  {formatCurrency(batch.selling_price ?? selectedProduct.price ?? 0)}
                                </p>
                                {daysDiff <= 30 && (
                                  <Badge variant={daysDiff < 0 ? 'danger' : 'warning'} size="xs" className="mt-1">
                                    {daysDiff < 0 ? 'Périmé' : `${daysDiff} jours`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucun lot disponible
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {selectedBatch && (
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-300">
                      Lot sélectionné: <span className="font-medium">{selectedBatch.batch_number}</span>
                      {' · '}Rayon: <span className="font-medium">{selectedBatch.location || '—'}</span>
                      {' · '}Expire le: <span className="font-medium">{formatDate(selectedBatch.expiry_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center"
                      min={1}
                      max={selectedBatch?.quantity || undefined}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={Boolean(selectedBatch) && quantity >= Number(selectedBatch.quantity)}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeProductModal}>
            Annuler
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={!selectedBatch || isLoadingBatches}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter au Panier
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={isConfirmOpen} onClose={closeConfirm}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <span>Confirmer l'envoi à la caisse</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            Vous allez envoyer {cartItems.length} produit(s) à la caisse pour un total de {formatCurrency(cartTotal)}.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            La sélection FEFO a été appliquée automatiquement pour chaque produit.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeConfirm}>
            Annuler
          </Button>
          <Button
            onClick={handleSendToCashier}
            isLoading={isSubmitting}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default SalesPage

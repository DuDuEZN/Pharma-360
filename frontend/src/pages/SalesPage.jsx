import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Barcode, Trash2, Check, X, Package, Clock, AlertTriangle, ArrowRight, Minus, Plus as PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useDisclosure } from '@/hooks/useDisclosure'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/select.jsx'
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
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
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

  // Fetch products
  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => fetchProducts(), 500)
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/products', {
        params: {
          search: searchQuery || undefined,
          limit: 20
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

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    if (!scannedBarcode.trim()) return
    
    try {
      const result = await scanBarcode(scannedBarcode)
      
      if (result && result.product) {
        // Check if we need to select a batch
        if (result.batch) {
          // Add directly to cart
          addItem(result.product, result.batch, 1)
          addToast({
            type: 'success',
            title: 'Produit ajouté',
            message: `${result.product.name} - ${result.batch.batch_number}`
          })
        } else {
          // No batch available, show product for manual selection
          setSelectedProduct(result.product)
          openProductModal()
        }
      }
      
      // Clear barcode input
      setBarcode('')
    } catch (error) {
      // Error is already handled by scanBarcode
    }
  }, [scanBarcode, addItem, openProductModal])

  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      handleBarcodeScan(barcode.trim())
    }
  }

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch)
  }

  const handleAddToCart = () => {
    if (selectedProduct && selectedBatch && quantity > 0) {
      addItem(selectedProduct, selectedBatch, quantity)
      addToast({
        type: 'success',
        title: 'Produit ajouté',
        message: `${selectedProduct.name} x${quantity}`
      })
      closeProductModal()
      setQuantity(1)
      setSelectedBatch(null)
    }
  }

  const handleUpdateQuantity = (productId, batchId, delta) => {
    const currentItem = cartItems.find(
      item => item.product.id === productId && item.batch?.id === batchId
    )
    if (currentItem) {
      const newQuantity = currentItem.quantity + delta
      if (newQuantity > 0) {
        updateItemQuantity(productId, batchId, newQuantity)
      } else {
        removeItem(productId, batchId)
      }
    }
  }

  const handleSendToCashier = async () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Panier vide',
        message: 'Ajoutez des produits avant de envoyer à la caisse'
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare cart data for submission
      const saleData = cartItems.map(item => ({
        product_id: item.product.id,
        batch_id: item.batch?.id,
        quantity: item.quantity,
        unit_price: item.batch?.selling_price || item.product.selling_price
      }))

      // Send to backend
      const response = await api.post('/sales/prepare', {
        items: saleData,
        user_id: user.id
      })

      // Clear cart and redirect to cashier
      clearCart()
      addToast({
        type: 'success',
        title: 'Vente préparée',
        message: 'Les produits ont été envoyés à la caisse'
      })
      
      navigate('/cashier', {
        state: { saleId: response.data.sale_id }
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de préparer la vente'
      })
    } finally {
      setIsSubmitting(false)
      closeConfirm()
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query) ||
        (product.category && product.category.toLowerCase().includes(query))
      )
    })
  }, [products, searchQuery])

  const getBatchStatus = (batch) => {
    const expiryDate = new Date(batch.expiry_date)
    const today = new Date()
    const daysDiff = (expiryDate - today) / (1000 * 60 * 60 * 24)
    
    if (daysDiff <= 30) return { text: 'Péremption proche', variant: 'warning' }
    if (daysDiff <= 0) return { text: 'Périmé', variant: 'danger' }
    return { text: 'OK', variant: 'success' }
  }

//  const cartSummary = getSummary ? getSummary() : { itemCount: 0, totalItems: 0, subtotal: 0, tax: 0, discount: 0, total: 0 }

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
                {filteredProducts.map((product) => {
                  // Find the FEFO batch (nearest expiry date with stock)
                  const fefoBatch = product.batches?.reduce((nearest, batch) => {
                    if (batch.current_stock > 0) {
                      const expiryDate = new Date(batch.expiry_date)
                      const nearestExpiry = new Date(nearest?.expiry_date || '9999-12-31')
                      return expiryDate < nearestExpiry ? batch : nearest
                    }
                    return nearest
                  }, null)

                  return (
                    <Card
                      key={product.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product)
                        setSelectedBatch(fefoBatch)
                        openProductModal()
                      }}
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
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {product.barcode}
                              </p>
                            </div>
                            
                            <Badge variant="secondary">
                              {product.category}
                            </Badge>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Stock: {product.current_stock || 0}
                              </p>
                              {fefoBatch && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Lot: {fefoBatch.batch_number} - Péremption: {formatDate(fefoBatch.expiry_date)}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="font-bold text-primary-600 dark:text-primary-400">
                                {formatCurrency(product.selling_price || 0)}
                              </p>
                              {fefoBatch && (
                                <Badge 
                                  variant={getBatchStatus(fefoBatch).variant}
                                  size="xs"
                                  className="mt-1"
                                >
                                  {getBatchStatus(fefoBatch).text}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
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
                            {item.batch && (
                              <span className="text-xs text-gray-500">
                                Lot: {item.batch.batch_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency((item.batch?.selling_price || item.product.selling_price || 0) * item.quantity)}
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
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code: {selectedProduct.barcode}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Catégorie: {selectedProduct.category}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prix: {formatCurrency(selectedProduct.selling_price || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lots Disponibles (Sélection FEFO automatique)
                </h4>
                
                {selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.batches
                      .filter(batch => batch.current_stock > 0)
                      .sort((a, b) => {
                        const dateA = new Date(a.expiry_date)
                        const dateB = new Date(b.expiry_date)
                        return dateA - dateB // Sort by nearest expiry date
                      })
                      .map((batch) => {
                        const expiryDate = new Date(batch.expiry_date)
                        const today = new Date()
                        const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                        
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
                                  Stock: {batch.current_stock}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">
                                  {formatCurrency(batch.selling_price || selectedProduct.selling_price || 0)}
                                </p>
                                {daysDiff <= 30 && (
                                  <Badge variant={daysDiff <= 0 ? 'danger' : 'warning'} size="xs" className="mt-1">
                                    {daysDiff <= 0 ? 'Périmé' : `${daysDiff} jours`}
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
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
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
            disabled={!selectedBatch}
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

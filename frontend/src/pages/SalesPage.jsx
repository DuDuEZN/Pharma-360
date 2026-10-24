import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Barcode, Trash2, Check, X, Package, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import BarcodeInput from '../components/common/BarcodeInput'
import ProductCard from '../components/common/ProductCard'
import Modal, { ConfirmModal } from '../components/common/Modal'

/**
 * Sales Page for Pharmacie 360
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
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getSummary,
    prepareForSubmission
  } = useCart()
  
  const { scanBarcode, isScanning } = useBarcodeScanner()
  
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [quantity, setQuantity] = useState(1)

  // Fetch products
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/products', {
        params: {
          search: searchQuery || undefined,
          limit: 50
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
        } else {
          // No batch available, show product for manual selection
          setSelectedProduct(result.product)
          setShowProductModal(true)
        }
      }
      
      // Clear barcode input
      setBarcode('')
    } catch (error) {
      // Error is already handled by scanBarcode
    }
  }, [scanBarcode, addItem])

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchProducts()
  }

  // Handle product selection from list
  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setSelectedBatch(product.batches?.[0] || null)
    setQuantity(1)
    setShowProductModal(true)
  }

  // Handle add to cart from modal
  const handleAddToCart = () => {
    if (!selectedProduct) return
    
    addItem(selectedProduct, selectedBatch, quantity)
    setShowProductModal(false)
    setSelectedProduct(null)
    setSelectedBatch(null)
    setQuantity(1)
  }

  // Handle clear barcode
  const handleClearBarcode = () => {
    setBarcode('')
  }

  // Submit sale to cashier
  const handleSubmit = () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'error',
        title: 'Panier vide',
        message: 'Ajoutez des produits avant de valider'
      })
      return
    }
    
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    try {
      const saleData = prepareForSubmission()
      saleData.user_id = user?.id
      
      // Create sale
      const response = await api.post('/sales', saleData)
      
      addToast({
        type: 'success',
        title: 'Vente créée',
        message: `Vente #${response.data.id} envoyée à la caisse`
      })
      
      // Clear cart and navigate
      clearCart()
      setBarcode('')
      setShowConfirm(false)
      
      // Navigate to cashier
      navigate('/cashier')
    } catch (error) {
      const message = error.response?.data?.detail || 
                     error.response?.data?.message ||
                     'Impossible de créer la vente'
      addToast({
        type: 'error',
        title: 'Erreur',
        message
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

  // Get stock status for a product/batch
  const getStockStatus = (product, batch) => {
    if (!batch) return { label: 'Pas de lot', color: 'danger' }
    
    if (batch.quantity === 0) return { label: 'Rupture', color: 'danger' }
    if (batch.quantity <= (product?.stock_min || 5)) return { label: 'Stock faible', color: 'warning' }
    if (batch.days_until_expiry && batch.days_until_expiry <= 30) {
      return { label: `Péremption ${batch.days_until_expiry}j`, color: 'danger' }
    }
    if (batch.days_until_expiry && batch.days_until_expiry <= 60) {
      return { label: `Péremption ${batch.days_until_expiry}j`, color: 'warning' }
    }
    
    return { label: 'OK', color: 'success' }
  }

  const cartSummary = getSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Point de Vente
          </h1>
          <p className="text-gray-500 mt-1">
            Scannez ou recherchez des produits pour créer une vente
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={clearCart} disabled={cartItems.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={cartItems.length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Valider ({cartSummary.itemCount})
          </Button>
        </div>
      </div>

      {/* Barcode Scanner */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <BarcodeInput
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onScan={handleBarcodeScan}
              onClear={handleClearBarcode}
              placeholder="Scanner un code-barres..."
              disabled={isScanning}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary" isLoading={isLoading}>
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={() => fetchProducts()}>
            <Package className="w-4 h-4 mr-2" />
            Tous les produits
          </Button>
          <Button variant="outline" size="sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Stock faible
          </Button>
          <Button variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Péremption proche
          </Button>
        </div>
      </div>

      {/* Cart Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Panier de vente
          </h2>
          <span className="text-sm text-gray-500">
            {cartSummary.itemCount} produit(s) | {cartSummary.totalItems} unités
          </span>
        </div>
        
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="mx-auto w-12 h-12 mb-4" />
            <p>Le panier est vide</p>
            <p className="text-xs mt-1">Scannez ou recherchez un produit pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item, index) => {
              const status = getStockStatus(item.product, item.batch)
              
              return (
                <div
                  key={`${item.product.id}-${index}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <img
                    src={item.product.image || `/placeholder-product.png`}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center object-cover"
                  >
                    {!item.product.image && <Package className="w-6 h-6 text-primary-600" />}
                  </img>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.batch?.batch_number ? `Lot: ${item.batch.batch_number}` : item.product.barcode}
                    </p>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className={`badge badge-${status.color}`}>
                        {status.label}
                      </span>
                      {item.batch?.expiry_date && (
                        <span className="text-gray-500">
                          Péremption: {new Date(item.batch.expiry_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => decrementQuantity(index)}
                      disabled={item.quantity <= 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <span className="min-w-[2rem] text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => incrementQuantity(index)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-danger-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency((item.batch?.selling_price || item.product.price) * item.quantity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      x {formatCurrency(item.batch?.selling_price || item.product.price)}
                    </p>
                  </div>
                </div>
              )
            })}
            
            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Sous-total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(cartSummary.total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Produits disponibles
          </h2>
          <span className="text-sm text-gray-500">
            {products.length} produit(s)
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto w-12 h-12 mb-4" />
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => {
              const status = getStockStatus(product, product.batches?.[0])
              
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  batch={product.batches?.[0]}
                  onClick={() => handleProductSelect(product)}
                  showBatch={true}
                  showBarcode={true}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Product Selection Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={selectedProduct?.name || 'Sélectionner un produit'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowProductModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAddToCart}
              disabled={!selectedProduct || quantity <= 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter au panier
            </Button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-12 h-12 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.name}</h3>
                {selectedProduct.dci && (
                  <p className="text-sm text-gray-500">DCI: {selectedProduct.dci}</p>
                )}
                {selectedProduct.barcode && (
                  <p className="text-sm text-gray-500">Code-barres: {selectedProduct.barcode}</p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  {selectedProduct.description}
                </p>
              </div>
            </div>

            {/* Batch Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Sélectionner un lot (FEFO)
              </h4>
              {selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProduct.batches.map((batch) => {
                    const status = getStockStatus(selectedProduct, batch)
                    const isSelected = selectedBatch?.id === batch.id
                    
                    return (
                      <div
                        key={batch.id}
                        onClick={() => {
                          if (batch.quantity > 0 && !batch.is_expired) {
                            setSelectedBatch(batch)
                          }
                        }}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : batch.quantity > 0 && !batch.is_expired
                              ? 'border-gray-200 hover:border-primary-300'
                              : 'border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{batch.batch_number}</p>
                            <p className="text-xs text-gray-500">
                              Stock: {batch.quantity} {selectedProduct.unit}
                            </p>
                            <p className="text-xs text-gray-500">
                              Péremption: {new Date(batch.expiry_date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {formatCurrency(batch.selling_price)}
                            </p>
                            <span className={`badge badge-${status.color} mt-1`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <AlertTriangle className="mx-auto w-8 h-8 mb-2" />
                  <p>Aucun lot disponible pour ce produit</p>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-20 text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedBatch) {
                      const max = selectedBatch.quantity
                      setQuantity(Math.min(quantity + 1, max))
                    } else {
                      setQuantity(quantity + 1)
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {selectedBatch && (
                <p className="text-xs text-gray-500 mt-1">
                  Maximum disponible: {selectedBatch.quantity}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prix unitaire:</span>
                <span className="font-medium">
                  {formatCurrency(selectedBatch?.selling_price || selectedProduct.price)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-1">
                <span>Total:</span>
                <span>
                  {formatCurrency((selectedBatch?.selling_price || selectedProduct.price) * quantity)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Confirmer la vente"
        message={`Vous allez envoyer ${cartSummary.itemCount} produit(s) pour un total de ${formatCurrency(cartSummary.total)} à la caisse. Confirmez-vous ?`}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
    </div>
  )
}

export default SalesPage

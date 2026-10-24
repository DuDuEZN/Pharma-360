import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Barcode, Trash2, Check, X, Package } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import BarcodeInput from '../components/common/BarcodeInput'
import ProductCard from '../components/common/ProductCard'
import Modal, { ConfirmModal } from '../components/common/Modal'

/**
 * Sales Page for Pharmacie 360
 * Point of sale interface with barcode scanning and product selection
 * 
 * FRNT-005: Session Vente (Recherche + FEFO + envoi Caisse)
 */
function SalesPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
  const handleBarcodeScan = async (scannedBarcode) => {
    setIsScanning(true)
    
    try {
      const response = await api.post('/barcode/scan', {
        barcode: scannedBarcode
      })
      
      if (response.data.error) {
        addToast({
          type: 'error',
          title: 'Produit introuvable',
          message: response.data.error
        })
        return null
      }
      
      const product = response.data.product
      const batch = response.data.batch
      
      // Check if product is already in cart
      const existingIndex = selectedProducts.findIndex(
        p => p.product.id === product.id
      )
      
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...selectedProducts]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        }
        setSelectedProducts(updated)
      } else {
        // Add new product to cart
        setSelectedProducts([...selectedProducts, {
          product,
          batch,
          quantity: 1
        }])
      }
      
      setBarcode('')
      addToast({
        type: 'success',
        title: 'Produit ajouté',
        message: `${product.name} ajouté au panier`
      })
      
      return { product, batch }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de scan',
        message: 'Impossible de scanner le code-barres'
      })
      return null
    } finally {
      setIsScanning(false)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchProducts()
  }

  // Update quantity
  const updateQuantity = (index, delta) => {
    const updated = [...selectedProducts]
    const newQuantity = updated[index].quantity + delta
    
    if (newQuantity <= 0) {
      // Remove if quantity is 0 or less
      updated.splice(index, 1)
    } else {
      // Check if batch has enough stock
      const batch = updated[index].batch
      if (batch && newQuantity > batch.quantity) {
        addToast({
          type: 'error',
          title: 'Stock insuffisant',
          message: `Seulement ${batch.quantity} unités disponibles`
        })
        return
      }
      updated[index] = { ...updated[index], quantity: newQuantity }
    }
    
    setSelectedProducts(updated)
  }

  // Remove product from cart
  const removeProduct = (index) => {
    const updated = [...selectedProducts]
    updated.splice(index, 1)
    setSelectedProducts(updated)
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      const price = item.batch?.selling_price || item.product?.price || 0
      return sum + (price * item.quantity)
    }, 0)
    
    return { subtotal, total: subtotal }
  }

  const totals = calculateTotals()

  // Submit sale to cashier
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
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
      // Prepare sale data
      const saleData = {
        items: selectedProducts.map(item => ({
          product_id: item.product.id,
          batch_id: item.batch?.id,
          quantity: item.quantity,
          unit_price: item.batch?.selling_price || item.product.price
        })),
        user_id: user?.id,
        total_amount: totals.total
      }
      
      // Create sale
      const response = await api.post('/sales', saleData)
      
      addToast({
        type: 'success',
        title: 'Vente créée',
        message: `Vente #${response.data.id} envoyée à la caisse`
      })
      
      // Navigate to cashier or clear cart
      setSelectedProducts([])
      setBarcode('')
      setShowConfirm(false)
      
      // Navigate to cashier page
      navigate('/cashier')
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de créer la vente'
      })
    }
  }

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
          <Button variant="outline" onClick={() => setSelectedProducts([])}>
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={selectedProducts.length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Valider ({selectedProducts.length})
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
      </div>

      {/* Cart Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Panier de vente
          </h2>
          <span className="text-sm text-gray-500">
            {selectedProducts.length} produit(s)
          </span>
        </div>
        
        {selectedProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="mx-auto w-12 h-12 mb-4" />
            <p>Le panier est vide</p>
            <p className="text-xs mt-1">Scannez ou recherchez un produit pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map((item, index) => (
              <div
                key={`${item.product.id}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <img
                  src={item.product.image || `/placeholder-product.png`}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.batch?.batch_number ? `Lot: ${item.batch.batch_number}` : item.product.barcode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuantity(index, -1)}
                    disabled={item.quantity <= 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <span className="min-w-[2rem] text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuantity(index, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    className="text-danger-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format((item.batch?.selling_price || item.product.price) * item.quantity)}
                  </p>
                  <p className="text-xs text-gray-500">
                    x {item.batch?.selling_price || item.product.price} XOF
                  </p>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Sous-total</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(totals.subtotal)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Produits disponibles
        </h2>
        
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
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => {
                  // Add product to cart when clicked
                  const existingIndex = selectedProducts.findIndex(
                    p => p.product.id === product.id
                  )
                  
                  if (existingIndex >= 0) {
                    const updated = [...selectedProducts]
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      quantity: updated[existingIndex].quantity + 1
                    }
                    setSelectedProducts(updated)
                  } else {
                    setSelectedProducts([...selectedProducts, {
                      product,
                      batch: product.batches?.[0],
                      quantity: 1
                    }])
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Confirmer la vente"
        message={`Vous allez envoyer ${selectedProducts.length} produit(s) à la caisse pour un total de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(totals.total)}. Confirmez-vous ?`}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
    </div>
  )
}

export default SalesPage

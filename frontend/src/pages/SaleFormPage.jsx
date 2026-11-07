import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { ShoppingCart, ChevronLeft, Save, X, Package, Plus, Minus, Trash2, Search, Barcode, User, CreditCard, Receipt, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/Separator'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import api from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

function SaleFormPage() {
  const navigate = useNavigate()
  const { id } = useParams() // For editing existing sale
  const { addToast } = useToast()
  const { user } = useAuth()
  const { scanBarcode } = useBarcodeScanner()
  
  const [sale, setSale] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    items: [],
    subtotal: 0,
    discount: 0,
    discount_type: 'percentage', // percentage or fixed
    tax: 0,
    total: 0,
    payment_method: 'cash',
    payment_status: 'paid',
    notes: '',
    cashier_id: user?.id || '',
  })
  
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(!!id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const paymentMethods = [
    { value: 'cash', label: 'Espèces' },
    { value: 'credit_card', label: 'Carte de crédit' },
    { value: 'debit_card', label: 'Carte de débit' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'bank_transfer', label: 'Virement bancaire' },
    { value: 'credit', label: 'À crédit' },
  ]

  const paymentStatuses = [
    { value: 'paid', label: 'Payé' },
    { value: 'pending', label: 'En attente' },
    { value: 'partial', label: 'Partiel' },
    { value: 'cancelled', label: 'Annulé' },
  ]

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
    if (id) {
      fetchSale()
    }
  }, [id])

  useEffect(() => {
    // Calculate totals whenever items change
    calculateTotals()
  }, [sale.items, sale.discount, sale.tax])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/products', {
        params: { limit: 50, in_stock: true }
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

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { limit: 50 } })
      setCustomers(response.data.customers || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const fetchSale = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/sales/${id}`)
      setSale(response.data.sale)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger la vente'
      })
      navigate('/sales')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotals = () => {
    const subtotal = sale.items.reduce((sum, item) => 
      sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
    )
    
    let discountAmount = 0
    if (sale.discount_type === 'percentage') {
      discountAmount = subtotal * (parseFloat(sale.discount) || 0) / 100
    } else {
      discountAmount = parseFloat(sale.discount) || 0
    }
    
    const taxAmount = subtotal * (parseFloat(sale.tax) || 0) / 100
    const total = subtotal - discountAmount + taxAmount
    
    setSale(prev => ({
      ...prev,
      subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: Math.round(total * 100) / 100
    }))
  }

  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    if (!scannedBarcode.trim()) return
    setBarcode(scannedBarcode)
    await searchProductByBarcode(scannedBarcode)
  }, [])

  const searchProductByBarcode = async (barcode) => {
    try {
      const response = await api.post('/barcode/scan', { barcode })
      if (response.data.product) {
        setSelectedProduct(response.data.product)
        setQuantity(1)
      } else {
        addToast({
          type: 'warning',
          title: 'Produit non trouvé',
          message: `Aucun produit trouvé avec le code-barres: ${barcode}`
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de scanner le produit'
      })
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchProductByBarcode(searchQuery.trim())
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setQuantity(1)
    setSearchQuery('')
  }

  const addItemToCart = () => {
    if (!selectedProduct) return
    
    const existingItemIndex = sale.items.findIndex(
      item => item.product_id === selectedProduct.id
    )
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const updatedItems = [...sale.items]
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity
      }
      setSale(prev => ({ ...prev, items: updatedItems }))
    } else {
      // Add new item
      const newItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        barcode: selectedProduct.barcode,
        price: parseFloat(selectedProduct.selling_price) || 0,
        cost_price: parseFloat(selectedProduct.purchase_price) || 0,
        quantity: quantity,
        unit: selectedProduct.unit || 'unité',
      }
      setSale(prev => ({ ...prev, items: [...prev.items, newItem] }))
    }
    
    setSelectedProduct(null)
    setQuantity(1)
    setBarcode('')
    addToast({
      type: 'success',
      title: 'Produit ajouté',
      message: `${selectedProduct.name} a été ajouté au panier`
    })
  }

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(index)
      return
    }
    const updatedItems = [...sale.items]
    updatedItems[index] = { ...updatedItems[index], quantity: newQuantity }
    setSale(prev => ({ ...prev, items: updatedItems }))
  }

  const removeItem = (index) => {
    const updatedItems = [...sale.items]
    updatedItems.splice(index, 1)
    setSale(prev => ({ ...prev, items: updatedItems }))
  }

  const handleCustomerChange = (value) => {
    const selectedCustomer = customers.find(c => c.id.toString() === value)
    if (selectedCustomer) {
      setSale(prev => ({
        ...prev,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone || ''
      }))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setSale(prev => ({ ...prev, [name]: value }))
  }

  const handleDiscountChange = (e) => {
    const { name, value } = e.target
    setSale(prev => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (sale.items.length === 0) {
      newErrors.items = 'Le panier ne peut pas être vide'
    }
    
    if (sale.payment_method === 'credit' && !sale.customer_id) {
      newErrors.customer_id = 'Le client est obligatoire pour les ventes à crédit'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const payload = {
        ...sale,
        items: sale.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          cost_price: item.cost_price
        })),
        subtotal: sale.subtotal,
        discount: sale.discount_type === 'percentage' ? parseFloat(sale.discount) : parseFloat(sale.discount),
        discount_type: sale.discount_type,
        tax: parseFloat(sale.tax),
        total: sale.total,
        cashier_id: user?.id,
      }
      
      if (id) {
        // Update existing sale
        await api.put(`/sales/${id}`, payload)
        addToast({
          type: 'success',
          title: 'Succès',
          message: 'Vente mise à jour avec succès'
        })
      } else {
        // Create new sale
        const response = await api.post('/sales', payload)
        addToast({
          type: 'success',
          title: 'Succès',
          message: `Vente créée avec succès (N°${response.data.sale.id})`
        })
        
        // Navigate to cashier for payment if needed
        if (sale.payment_status === 'pending' || sale.payment_status === 'partial') {
          navigate(`/cashier?sale_id=${response.data.sale.id}`)
        } else {
          navigate('/sales')
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || 
                      error.response?.data?.detail ||
                      'Une erreur est survenue lors de l\'enregistrement de la vente'
      addToast({
        type: 'error',
        title: 'Erreur',
        message: message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/sales')
  }

  const handlePrintReceipt = () => {
    // This would open a print dialog for the receipt
    addToast({
      type: 'info',
      title: 'Impression',
      message: 'Fonctionnalité d\'impression à implémenter'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sales" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <ChevronLeft className="w-4 h-4" />
              Retour aux ventes
            </Link>
          </Button>
          
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-7 h-7 text-primary-600" />
              {id ? `Modifier la vente #${id}` : 'Nouvelle vente'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {id ? 'Mettez à jour les détails de la vente' : 'Créez une nouvelle vente'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3">Chargement...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={sale.customer_id}
                    onValueChange={handleCustomerChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Client occasionnel</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer_id && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.customer_id}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    name="customer_name"
                    value={sale.customer_name}
                    onChange={handleChange}
                    placeholder="Nom du client"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    name="customer_phone"
                    value={sale.customer_phone}
                    onChange={handleChange}
                    placeholder="Téléphone"
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ajouter des produits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barcode Scanner */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Scannez un code-barres ou recherchez..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchProductByBarcode(barcode)}
                      disabled={isSubmitting}
                      className="pl-12"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => searchProductByBarcode(barcode)}
                    disabled={!barcode || isSubmitting}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {/* Product Selection */}
                {selectedProduct && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Package className="w-8 h-8 text-primary-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Code: {selectedProduct.barcode} | Catégorie: {selectedProduct.category?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary-600">
                          {formatCurrency(selectedProduct.selling_price)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Stock: {selectedProduct.stock?.quantite_totale || 0} {selectedProduct.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <Label htmlFor="quantity">Quantité</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={isSubmitting}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-20 text-center"
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={isSubmitting}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={addItemToCart}
                        disabled={isSubmitting}
                        className="ml-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </div>
                )}

                {/* Product Search Results */}
                {searchQuery && !selectedProduct && products.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    {products
                      .filter(p => p.barcode.includes(searchQuery) || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{product.barcode}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary-600">{formatCurrency(product.selling_price)}</p>
                              <Badge variant={product.stock?.quantite_totale > 0 ? 'success' : 'danger'} size="xs">
                                {product.stock?.quantite_totale || 0} {product.unit}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Panier ({sale.items.length} articles)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sale.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Le panier est vide</p>
                    <p className="text-sm mt-1">Ajoutez des produits pour commencer</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Prix</TableHead>
                          <TableHead>Quantité</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{item.barcode}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                  disabled={isSubmitting}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="min-w-[40px] text-center">{item.quantity}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                  disabled={isSubmitting}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <Separator className="my-4" />
                    
                    {/* Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sous-total</span>
                        <span>{formatCurrency(sale.subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Remise</span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={sale.discount_type}
                            onValueChange={(value) => setSale(prev => ({ ...prev, discount_type: value }))}
                            disabled={isSubmitting}
                            className="w-20"
                          >
                            <SelectTrigger size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">MAD</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={sale.discount}
                            onChange={handleDiscountChange}
                            placeholder="0"
                            className="w-24 text-right"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Taxe</span>
                        <Input
                          type="number"
                          value={sale.tax}
                          onChange={(e) => setSale(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-24 text-right"
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                        <span>Total</span>
                        <span className="text-primary-600">{formatCurrency(sale.total)}</span>
                      </div>
                    </div>
                  </>
                )}
                {errors.items && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-4">
                    <AlertCircle className="w-4 h-4" />
                    {errors.items}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Informations de paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Méthode de paiement</Label>
                  <Select
                    value={sale.payment_method}
                    onValueChange={(value) => setSale(prev => ({ ...prev, payment_method: value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut de paiement</Label>
                  <Select
                    value={sale.payment_status}
                    onValueChange={(value) => setSale(prev => ({ ...prev, payment_status: value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Notes (Optionnel)</Label>
                  <Input
                    name="notes"
                    value={sale.notes}
                    onChange={handleChange}
                    placeholder="Notes sur la vente..."
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardFooter className="flex justify-end gap-3 border-t pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrintReceipt}
                  disabled={isSubmitting || sale.items.length === 0}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || sale.items.length === 0}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {id ? 'Mettre à jour' : 'Finaliser la vente'}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </div>
    </div>
  )
}

export default SaleFormPage

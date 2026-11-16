import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Search,
  Barcode,
  Trash2,
  Check,
  Package,
  ArrowRight,
  Minus,
  Plus as PlusIcon,
  UserRound,
  UserPlus,
  X,
  Percent,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCart, getItemUnitPrice } from '@/providers/CartProvider'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useDisclosure } from '@/hooks/useDisclosure'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Skeleton } from '@/components/ui/Skeleton'
import { Separator } from '@/components/ui/Separator'
import BulkLabelSheet from '@/components/sales/BulkLabelSheet'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

/**
 * Sales Page for Pharma 360
 * Point of sale interface with barcode scanning and FEFO selection.
 *
 * - Client anonyme par défaut, ou client enregistré recherché/ajouté.
 * - Ajout de produits par recherche ou scan (aucune liste complète affichée).
 * - Panier avec remise (% ou montant fixe) et bouton « Vider ».
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
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [saleUnit, setSaleUnit] = useState('box')
  const [bulkLabels, setBulkLabels] = useState([])
  const [pendingSaleId, setPendingSaleId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Client
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)

  // Remise
  const [discountType, setDiscountType] = useState('percentage')
  const [discountValue, setDiscountValue] = useState('')

  const {
    isOpen: isProductModalOpen,
    onOpen: openProductModal,
    onClose: closeProductModal,
  } = useDisclosure()

  const {
    isOpen: isConfirmOpen,
    onOpen: openConfirm,
    onClose: closeConfirm,
  } = useDisclosure()

  const {
    isOpen: isCustomerModalOpen,
    onOpen: openCustomerModal,
    onClose: closeCustomerModal,
  } = useDisclosure()

  // --- Recherche produits -------------------------------------------------
  const fetchProducts = useCallback(async (query = '') => {
    const trimmed = query.trim()
    if (!trimmed) {
      setProducts([])
      return
    }
    setIsLoading(true)
    try {
      const response = await api.get('/products/', {
        params: {
          search: trimmed,
          page_size: 12,
        },
      })
      setProducts(response.data.products || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les produits',
      })
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchProducts])

  // --- Recherche clients --------------------------------------------------
  useEffect(() => {
    const trimmed = customerQuery.trim()
    if (!trimmed) {
      setCustomerResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const response = await api.get('/customers/', {
          params: { name: trimmed, limit: 8 },
        })
        if (!cancelled) {
          const data = response.data
          setCustomerResults(Array.isArray(data) ? data : data?.customers || [])
        }
      } catch (error) {
        if (!cancelled) setCustomerResults([])
      } finally {
        if (!cancelled) setIsSearchingCustomers(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [customerQuery])

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setCustomerQuery('')
    setCustomerResults([])
  }

  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerQuery('')
    setCustomerResults([])
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!newCustomer.name.trim()) return
    setIsSavingCustomer(true)
    try {
      const response = await api.post('/customers/', {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || null,
        email: newCustomer.email.trim() || null,
      })
      setSelectedCustomer(response.data)
      setNewCustomer({ name: '', phone: '', email: '' })
      closeCustomerModal()
      addToast({
        type: 'success',
        title: 'Client enregistré',
        message: `${response.data.name} a été ajouté et sélectionné`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'enregistrer le client',
      })
    } finally {
      setIsSavingCustomer(false)
    }
  }

  // --- Lots / FEFO --------------------------------------------------------
  const openProduct = useCallback(async (product) => {
    if (!product?.id) return

    setSelectedProduct(product)
    setSelectedBatch(null)
    setQuantity(1)
    setSaleUnit('box')
    setIsLoadingBatches(true)
    openProductModal()

    try {
      const response = await api.get(`/products/${product.id}`)
      const detail = response.data

      setSelectedProduct(detail)

      const availableBatches = (detail.batches || []).filter(
        (batch) => batch.is_available !== false
      )
      const fefoOf = (list) =>
        [...list].sort(
          (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)
        )[0] || null

      let fefoBatch = fefoOf(
        availableBatches.filter((batch) => Number(batch.quantity) > 0)
      )

      if (!fefoBatch && detail.is_bulk) {
        fefoBatch = fefoOf(
          availableBatches.filter(
            (batch) => Number(batch.bulk_quantity || 0) > 0
          )
        )
        if (fefoBatch) setSaleUnit('bulk')
      }

      setSelectedBatch(fefoBatch)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les lots de ce produit',
      })
    } finally {
      setIsLoadingBatches(false)
    }
  }, [openProductModal, addToast])

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
          }`,
        })
      } else {
        await openProduct(result.product)
      }
    }

    setBarcode('')
    setSearchQuery('')
  }, [scanBarcode, addItem, addToast, openProduct])

  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      handleBarcodeScan(barcode.trim())
    }
  }

  const handleSelectBatch = (batch) => {
    if (
      selectedProduct &&
      saleUnit === 'box' &&
      Number(batch.quantity || 0) === 0 &&
      Number(batch.bulk_quantity || 0) > 0
    ) {
      setSaleUnit('bulk')
    }
    setSelectedBatch(batch)
  }

  const getUnitsPerBox = (product) => {
    const units = Number(product?.units_per_box || 1)
    return units > 0 ? units : 1
  }

  const getSaleUnitPrice = (product, batch, unit = saleUnit) => {
    if (unit === 'bulk') {
      const bulkPrice = Number(product?.bulk_price || 0)
      if (bulkPrice > 0) return bulkPrice
      return Number(product?.price || 0) / getUnitsPerBox(product)
    }
    const batchPrice = batch?.selling_price
    if (batchPrice !== undefined && batchPrice !== null) return Number(batchPrice)
    return Number(product?.price || 0)
  }

  const getMaxQuantity = (product, batch, unit = saleUnit) => {
    if (!batch) return 0
    if (unit === 'bulk') {
      return Number(batch.bulk_quantity || 0) +
        Number(batch.quantity || 0) * getUnitsPerBox(product)
    }
    return Number(batch.quantity || 0)
  }

  const handleSaleUnitChange = (unit) => {
    setSaleUnit(unit)
    setQuantity(1)
    if (selectedProduct && selectedBatch) {
      if (getMaxQuantity(selectedProduct, selectedBatch, unit) <= 0) {
        setSelectedBatch(null)
      }
    }
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return

    if (!selectedBatch) {
      addToast({
        type: 'warning',
        title: 'Aucun lot disponible',
        message: 'Sélectionnez un lot avant d\'ajouter le produit',
      })
      return
    }

    const maxQuantity = getMaxQuantity(selectedProduct, selectedBatch)
    if (quantity > maxQuantity) {
      addToast({
        type: 'warning',
        title: 'Stock insuffisant',
        message: saleUnit === 'bulk'
          ? `Il reste ${maxQuantity} unité(s) de vrac disponible(s)`
          : `Il reste ${maxQuantity} unité(s) dans ce lot`,
      })
      return
    }

    addItem(selectedProduct, selectedBatch, quantity, saleUnit)
    addToast({
      type: 'success',
      title: 'Produit ajouté',
      message: `${selectedProduct.name} x${quantity}${
        saleUnit === 'bulk' ? ' (vrac)' : ''
      }`,
    })
    closeProductModal()
    setQuantity(1)
    setSelectedBatch(null)
    setSelectedProduct(null)
    setSaleUnit('box')
    setSearchQuery('')
  }

  const handleUpdateQuantity = (productId, batchId, unit, delta) => {
    const currentItem = cartItems.find(
      (item) =>
        item.product.id === productId &&
        item.batch?.id === batchId &&
        (item.saleUnit || 'box') === unit
    )
    if (!currentItem) return

    const newQuantity = currentItem.quantity + delta
    if (newQuantity > 0) {
      updateItemQuantity(productId, batchId, unit, newQuantity)
    } else {
      removeItem(productId, batchId, unit)
    }
  }

  const handleClearCart = () => {
    clearCart()
    setDiscountValue('')
    setDiscountType('percentage')
    addToast({
      type: 'info',
      title: 'Panier vidé',
      message: 'Tous les articles ont été retirés du panier',
    })
  }

  // --- Remise -------------------------------------------------------------
  const discountAmount = useMemo(() => {
    const value = parseFloat(discountValue) || 0
    if (value <= 0) return 0
    if (discountType === 'percentage') {
      const percent = Math.min(value, 100)
      return Math.round(cartTotal * percent) / 100
    }
    return Math.min(value, cartTotal)
  }, [cartTotal, discountValue, discountType])

  const netTotal = Math.max(0, cartTotal - discountAmount)

  const handleSendToCashier = async () => {
    if (cartItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Panier vide',
        message: 'Ajoutez des produits avant d\'envoyer à la caisse',
      })
      return
    }

    if (!user?.id) {
      addToast({
        type: 'error',
        title: 'Session expirée',
        message: 'Reconnectez-vous pour envoyer la vente à la caisse',
      })
      return
    }

    if (cartItems.some((item) => !item.batch?.id)) {
      addToast({
        type: 'error',
        title: 'Lot manquant',
        message: 'Chaque produit doit être associé à un lot',
      })
      return
    }

    const saleData = {
      user_id: user.id,
      customer_id: selectedCustomer?.id ?? null,
      status: 'pending',
      subtotal: cartTotal,
      tax_amount: 0,
      discount: discountAmount,
      total: netTotal,
      notes: selectedCustomer
        ? `Client : ${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}`
        : 'Client anonyme',
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        batch_id: item.batch?.id,
        quantity: item.quantity,
        unit_price: getItemUnitPrice(item),
        sale_unit: item.saleUnit === 'bulk' ? 'bulk' : 'box',
      })),
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/sales/', saleData)
      const payload = response.data || {}

      if (payload.success === false) {
        addToast({
          type: 'error',
          title: 'Vente refusée',
          message: (payload.errors || []).join(' · ') || 'La vente n\'a pas pu être créée',
        })
        return
      }

      clearCart()
      setDiscountValue('')
      setDiscountType('percentage')
      setSelectedCustomer(null)

      const labels = payload.bulk_labels || []
      if (labels.length > 0) {
        addToast({
          type: 'success',
          title: 'Vente préparée',
          message:
            `Les produits ont été envoyés à la caisse. ` +
            `${payload.reconditioned_boxes || 0} boîte(s) reconditionnée(s) : ` +
            `impression des étiquettes de vrac.`,
        })
        setBulkLabels(labels)
        setPendingSaleId(payload.sale_id)
        return
      }

      addToast({
        type: 'success',
        title: 'Vente préparée',
        message: 'Les produits ont été envoyés à la caisse',
      })

      navigate('/cashier', {
        state: { saleId: payload.sale_id },
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Erreur',
        message: typeof detail === 'string' ? detail : 'Impossible de préparer la vente',
      })
    } finally {
      setIsSubmitting(false)
      closeConfirm()
    }
  }

  const hasSearchQuery = Boolean(searchQuery.trim())

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-600" />
            Nouvelle vente
          </CardTitle>
          <CardDescription>
            Choisissez un client (ou restez en anonyme), ajoutez les produits puis envoyez à la caisse.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche : client + ajout produit */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cadre Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary-600" />
                Client
              </CardTitle>
              <CardDescription>
                Vente sous client anonyme par défaut, ou recherchez un client enregistré.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer ? (
                <div className="flex flex-col gap-3 rounded-xl border border-primary-500/20 bg-primary-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-secondary-900 dark:text-white">
                        {selectedCustomer.name}
                      </p>
                      <Badge variant="primary" size="xs">Client enregistré</Badge>
                    </div>
                    <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                      {[selectedCustomer.phone, selectedCustomer.email]
                        .filter(Boolean)
                        .join(' · ') || 'Aucun contact renseigné'}
                    </p>
                    {Number(selectedCustomer.loyalty_points || 0) > 0 && (
                      <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                        Points de fidélité : {selectedCustomer.loyalty_points}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleClearCustomer}>
                      <X className="mr-1 h-4 w-4" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Rechercher un client par nom..."
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={openCustomerModal}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Nouveau client
                    </Button>
                  </div>

                  {isSearchingCustomers && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recherche...</p>
                  )}

                  {!isSearchingCustomers && customerQuery.trim() && customerResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-black/[0.08] dark:border-white/10">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="flex w-full items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-3 text-left transition-colors last:border-0 hover:bg-black/[0.03] dark:border-white/[0.06] dark:hover:bg-white/[0.05]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-secondary-900 dark:text-white">
                              {customer.name}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
                              {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </div>
                          <Check className="h-4 w-4 shrink-0 text-primary-600" />
                        </button>
                      ))}
                    </div>
                  )}

                  {!isSearchingCustomers && customerQuery.trim() && customerResults.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aucun client trouvé. Vous pouvez créer un nouveau client.
                    </p>
                  )}

                  <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-secondary-500 dark:bg-white/[0.05] dark:text-secondary-400">
                    <UserRound className="h-3.5 w-3.5" />
                    Client anonyme sélectionné : la vente ne sera rattachée à aucun compte client.
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cadre Ajouter un produit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-600" />
                Ajouter un produit
              </CardTitle>
              <CardDescription>
                Scannez un code-barres ou recherchez un produit. Aucune liste complète n'est affichée.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Scanner le code-barres..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleBarcodeInput}
                    className="pl-10"
                    disabled={isScanning}
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher un produit à vendre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {isScanning && (
                <p className="text-sm text-primary-600">Scan en cours...</p>
              )}

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : hasSearchQuery && products.length > 0 ? (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-black/[0.08] dark:border-white/10">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => openProduct(product)}
                      className="flex w-full items-center justify-between gap-4 border-b border-black/[0.05] px-4 py-3 text-left transition-colors last:border-0 hover:bg-black/[0.03] dark:border-white/[0.06] dark:hover:bg-white/[0.05]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.08]">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-secondary-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-secondary-500 dark:text-secondary-400">
                            {product.barcode || 'Sans code-barres'}
                            {product.category_name ? ` · ${product.category_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-primary-600 dark:text-primary-400">
                          {formatCurrency(product.price || 0)}
                        </p>
                        <Badge
                          variant={(product.current_stock ?? 0) > 0 ? 'success' : 'danger'}
                          size="xs"
                        >
                          {product.current_stock ?? 0} en stock
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : hasSearchQuery && !isLoading && products.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Aucun produit trouvé pour « {searchQuery} ».
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Saisissez un nom ou scannez un code-barres pour trouver un produit.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panier */}
        <Card className="sticky top-6 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Panier</span>
              <Badge variant={cartCount > 0 ? 'primary' : 'secondary'}>{cartCount}</Badge>
            </CardTitle>
            <CardDescription>
              {cartItems.length} produit(s) · {formatCurrency(cartTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cartItems.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">Panier vide</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableBody>
                    {cartItems.map((item) => (
                      <TableRow key={`${item.product.id}-${item.batch?.id}-${item.saleUnit || 'box'}`}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleUpdateQuantity(item.product.id, item.batch?.id, item.saleUnit || 'box', -1)
                              }
                              className="h-6 w-6"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[24px] text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleUpdateQuantity(item.product.id, item.batch?.id, item.saleUnit || 'box', 1)
                              }
                              className="h-6 w-6"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {item.product.name}
                              {item.saleUnit === 'bulk' && (
                                <Badge variant="primary" size="xs" className="ml-2">Vrac</Badge>
                              )}
                            </span>
                            {item.batch && (
                              <span className="text-xs text-gray-500">
                                Lot: {item.batch.batch_number}
                                {item.batch.location ? ` · ${item.batch.location}` : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(getItemUnitPrice(item) * item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              removeItem(item.product.id, item.batch?.id, item.saleUnit || 'box')
                            }
                            className="h-6 w-6 text-danger-500 hover:text-danger-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                {/* Remise */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <Percent className="h-3.5 w-3.5" />
                      Remise
                    </span>
                    <div className="flex items-center gap-2">
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">F CFA</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                        className="h-8 w-24 text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Sous-total</span>
                    <span className="font-medium">{formatCurrency(cartTotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-red-500">
                      <span>Remise appliquée</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-2 text-lg font-bold dark:border-white/10">
                    <span>Total</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatCurrency(netTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={openConfirm}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Envoyer à la caisse
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleClearCart}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Vider le panier
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Modale nouveau client */}
      <Modal isOpen={isCustomerModalOpen} onClose={closeCustomerModal}>
        <form onSubmit={handleCreateCustomer}>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-600" />
              <span>Nouveau client</span>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">Nom *</Label>
              <Input
                id="new-customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nom complet du client"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-phone">Téléphone</Label>
              <Input
                id="new-customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Numéro de téléphone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-email">Email</Label>
              <Input
                id="new-customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Adresse email"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeCustomerModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSavingCustomer || !newCustomer.name.trim()}>
              {isSavingCustomer ? 'Enregistrement...' : 'Enregistrer et sélectionner'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modale sélection de lot */}
      <Modal isOpen={isProductModalOpen} onClose={closeProductModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <span>Sélectionner un lot</span>
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
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code-barres: {selectedProduct.barcode || '—'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Catégorie: {selectedProduct.category_name || 'Sans catégorie'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prix boîte: {formatCurrency(selectedProduct.price || 0)}
                  </p>
                  {selectedProduct.is_bulk && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Vrac: {formatCurrency(
                        Number(selectedProduct.bulk_price) > 0
                          ? selectedProduct.bulk_price
                          : (selectedProduct.price || 0) / getUnitsPerBox(selectedProduct)
                      )} / unité · {getUnitsPerBox(selectedProduct)} unités / boîte
                    </p>
                  )}
                </div>
              </div>

              {selectedProduct.is_bulk && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type de vente
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={saleUnit === 'box' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSaleUnitChange('box')}
                    >
                      Boîte
                    </Button>
                    <Button
                      type="button"
                      variant={saleUnit === 'bulk' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSaleUnitChange('bulk')}
                    >
                      Vrac (à l'unité)
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lots disponibles (sélection FEFO automatique)
                </h4>
                {isLoadingBatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.batches
                      .filter((batch) => Number(batch.quantity) > 0 ||
                        (selectedProduct.is_bulk && Number(batch.bulk_quantity || 0) > 0))
                      .sort((a, b) => {
                        const dateA = new Date(a.expiry_date)
                        const dateB = new Date(b.expiry_date)
                        return dateA - dateB
                      })
                      .map((batch) => {
                        const expiryDate = new Date(batch.expiry_date)
                        const daysDiff = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24))

                        return (
                          <Card
                            key={batch.id}
                            className={cn(
                              'cursor-pointer p-3 transition-all',
                              selectedBatch?.id === batch.id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                            onClick={() => handleSelectBatch(batch)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  Lot: {batch.batch_number}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Péremption: {formatDate(batch.expiry_date)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Rayon: {batch.location || '—'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Stock: {batch.quantity} boîte(s)
                                  {selectedProduct.is_bulk && Number(batch.bulk_quantity || 0) > 0
                                    ? ` · ${batch.bulk_quantity} unité(s) vrac`
                                    : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {formatCurrency(getSaleUnitPrice(selectedProduct, batch))}
                                  {saleUnit === 'bulk' && selectedProduct.is_bulk && (
                                    <span className="text-xs text-gray-500"> / unité</span>
                                  )}
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
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center"
                      min={1}
                      max={selectedBatch ? getMaxQuantity(selectedProduct, selectedBatch) : undefined}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={Boolean(selectedBatch) && quantity >= getMaxQuantity(selectedProduct, selectedBatch)}
                    >
                      <PlusIcon className="h-4 w-4" />
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
            <PlusIcon className="mr-2 h-4 w-4" />
            Ajouter au panier
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modale confirmation */}
      <Modal isOpen={isConfirmOpen} onClose={closeConfirm}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-600" />
            <span>Confirmer l'envoi à la caisse</span>
          </div>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <div className="rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/[0.05]">
            <p className="text-gray-700 dark:text-gray-200">
              <span className="font-medium">Client :</span>{' '}
              {selectedCustomer ? selectedCustomer.name : 'Client anonyme'}
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">
              <span className="font-medium">Articles :</span> {cartItems.length} produit(s)
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">
              <span className="font-medium">Sous-total :</span> {formatCurrency(cartTotal)}
            </p>
            {discountAmount > 0 && (
              <p className="mt-1 text-red-500">
                <span className="font-medium">Remise :</span> -{formatCurrency(discountAmount)}
              </p>
            )}
            <p className="mt-1 font-semibold text-primary-600 dark:text-primary-400">
              <span className="font-medium text-gray-700 dark:text-gray-200">Total :</span>{' '}
              {formatCurrency(netTotal)}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            La sélection FEFO a été appliquée automatiquement pour chaque produit.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeConfirm}>
            Annuler
          </Button>
          <Button onClick={handleSendToCashier} isLoading={isSubmitting}>
            <Check className="mr-2 h-4 w-4" />
            Confirmer
          </Button>
        </ModalFooter>
      </Modal>

      {bulkLabels.length > 0 && (
        <BulkLabelSheet
          labels={bulkLabels}
          onDone={() => {
            const saleId = pendingSaleId
            setBulkLabels([])
            setPendingSaleId(null)
            navigate('/cashier', { state: { saleId } })
          }}
        />
      )}
    </div>
  )
}

export default SalesPage

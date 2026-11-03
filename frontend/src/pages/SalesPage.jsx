a/frontend/src/pages/SalesPage.jsx b/frontend/src/pages/SalesPage.jsx
++ b/frontend/src/pages/SalesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Search, Barcode, Trash2, Check, Minus, Package, Clock, AlertTriangle, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import BarcodeInput from '../components/common/BarcodeInput'
import Modal, { ConfirmModal } from '../components/common/Modal'

/**
 * Sales Page — refonte « Menthe & Sable »
 * Point de vente en écran partagé : catalogue à gauche, panier sticky à droite.
 * FRNT-005 : session vente — recherche, FEFO 1-clic, envoi caisse.
 * (Contrats API inchangés : GET /products, POST /sales via prepareForSubmission.)
 */

const fmt = (amount) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA'

/** Lots actifs triés FEFO (péremption la plus proche d'abord). */
const getActiveBatches = (product) =>
  (product.batches || [])
    .filter((b) => b.quantity > 0 && !b.is_expired)
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))

function SalesPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const {
    items: cartItems,
    addItem,
    getSummary,
    prepareForSubmission
  } = useCart()

  const { scanBarcode, isScanning } = useBarcodeScanner()

  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [quickFilter, setQuickFilter] = useState('all')

  // Fetch products
  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProducts = async () => {
    }
  }

  // Handle barcode scan — inchangé
  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    if (!scannedBarcode.trim()) return

    try {
      const result = await scanBarcode(scannedBarcode)

      if (result && result.product) {
        if (result.batch) {
          addItem(result.product, result.batch, 1)
        } else {
          openBatchModal(result.product)
        }
      }

      setBarcode('')
    } catch (error) {
      // Error is already handled by scanBarcode
    }
  }, [scanBarcode, addItem])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchProducts()
  }

  /** Ouvre la modale de sélection de lot (cas multi-lots). */
  const openBatchModal = (product) => {
    setSelectedProduct(product)
    setSelectedBatch(getActiveBatches(product)[0] || null)
    setQuantity(1)
    setShowProductModal(true)
  }

  /** Ajout 1-clic : FEFO direct si un seul lot actif, modale sinon. */
  const handleQuickAdd = (product) => {
    const active = getActiveBatches(product)
    if (active.length === 0) {
      addToast({
        type: 'error',
        title: 'Aucun lot disponible',
        message: `${product.name} est en rupture — réceptionnez du stock.`
      })
      return
    }
    if (active.length === 1) {
      addItem(product, active[0], 1)
      addToast({ type: 'success', title: 'Ajouté au panier', message: `${product.name} · lot ${active[0].batch_number} (FEFO)` })
      return
    }
    openBatchModal(product)
  }

  // Handle add to cart from modal — inchangé
  const handleAddToCart = () => {
    if (!selectedProduct) return

    addItem(selectedProduct, selectedBatch, quantity)
    setShowProductModal(false)
    setSelectedProduct(null)
    setQuantity(1)
  }

  const handleClearBarcode = () => {
    setBarcode('')
  }

  // Submit sale to cashier — inchangé
  const handleSubmit = () => {
    if (cartItems.length === 0) {
      addToast({
      })
      return
    }

    setShowConfirm(true)
  }

    try {
      const saleData = prepareForSubmission()
      saleData.user_id = user?.id

      const response = await api.post('/api/v1/sales', saleData)

      addToast({
        type: 'success',
        title: 'Vente créée',
        message: `Vente #${response.data.id} envoyée à la caisse`
      })

      clearCart()
      setBarcode('')
      setShowConfirm(false)

      navigate('/cashier')
    } catch (error) {
      const message = error.response?.data?.detail ||
                     error.response?.data?.message ||
                     'Impossible de créer la vente'
      addToast({
    }
  }

  // Statut stock/péremption d'un lot
  const getStockStatus = (product, batch) => {
    if (!batch) return { label: 'Pas de lot', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
    if (batch.quantity === 0) return { label: 'Rupture', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
    if (batch.quantity <= (product?.stock_min || 5)) return { label: 'Stock faible', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
    if (batch.days_until_expiry && batch.days_until_expiry <= 30) {
      return { label: `Péremption ${batch.days_until_expiry}j`, cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
    }
    if (batch.days_until_expiry && batch.days_until_expiry <= 60) {
      return { label: `Péremption ${batch.days_until_expiry}j`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
    }
    return { label: 'OK', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  }

  /** Filtres rapides câblés côté client. */
  const filterCounts = useMemo(() => {
    const c = { all: products.length, low: 0, expiring: 0 }
    products.forEach((p) => {
      const active = getActiveBatches(p)
      const totalQty = active.reduce((s, b) => s + b.quantity, 0)
      if (totalQty > 0 && totalQty <= (p.stock_min ?? 5)) c.low += 1
      if (active.some((b) => b.days_until_expiry != null && b.days_until_expiry <= 90)) c.expiring += 1
    })
    return c
  }, [products])

  const visibleProducts = useMemo(() => {
    if (quickFilter === 'all') return products
    return products.filter((p) => {
      const active = getActiveBatches(p)
      const totalQty = active.reduce((s, b) => s + b.quantity, 0)
      if (quickFilter === 'low') return totalQty > 0 && totalQty <= (p.stock_min ?? 5)
      if (quickFilter === 'expiring')
        return active.some((b) => b.days_until_expiry != null && b.days_until_expiry <= 90)
      return true
    })
  }, [products, quickFilter])

  const cartSummary = getSummary ? getSummary() : { itemCount: 0, totalItems: 0, subtotal: 0, tax: 0, discount: 0, total: 0 }

  const quickFilters = [
    { key: 'all', label: 'Tous', icon: Package },
    { key: 'low', label: 'Stock faible', icon: AlertTriangle },
    { key: 'expiring', label: 'Péremption ≤ 90 j', icon: Clock },
  ]

  return (
    <div className="space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ============ En-tête ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Point de Vente</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Scannez ou recherchez des produits — le premier lot FEFO est proposé automatiquement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearCart} disabled={cartItems.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={cartItems.length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Envoyer à la caisse ({cartSummary.itemCount})
          </Button>
        </div>
      </div>

      {/* ============ Écran partagé ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        {/* ---------- Colonne gauche : recherche + catalogue ---------- */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <BarcodeInput
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onScan={handleBarcodeScan}
                  onClear={handleClearBarcode}
                  placeholder="Scanner un code-barres…"
                  disabled={isScanning}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                      type="text"
                      placeholder="Rechercher un produit…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full !pl-10"
                    />
                  </div>
                  <Button type="submit" variant="primary" isLoading={isLoading} aria-label="Rechercher">
                    <Search className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>

            {/* Filtres rapides câblés */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
              {quickFilters.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setQuickFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    quickFilter === key
                      ? 'bg-teal-600 text-white ring-teal-600'
                      : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      quickFilter === key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {filterCounts[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Produits disponibles</h2>
              <span className="text-xs text-stone-400">{visibleProducts.length} produit(s)</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-stone-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 rounded bg-stone-100" />
                        <div className="h-2.5 w-20 rounded bg-stone-100" />
                      </div>
                    </div>
                    <div className="mt-3 h-8 w-full rounded-lg bg-stone-100" />
                  </div>
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                  <Package className="h-6 w-6 text-stone-400" />
                </div>
                <p className="mt-3 text-sm font-bold text-stone-700">Aucun produit trouvé</p>
                <p className="mt-1 text-xs text-stone-400">Modifiez la recherche ou les filtres rapides.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visibleProducts.map((product) => {
                  const active = getActiveBatches(product)
                  const fefo = active[0]
                  const multi = active.length > 1
                  const totalQty = active.reduce((s, b) => s + b.quantity, 0)
                  const status = fefo
                    ? getStockStatus(product, fefo)
                    : { label: 'Rupture', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }

                  return (
                    <div
                      key={product.id}
                      className={`group rounded-xl border p-3.5 transition ${
                        fefo
                          ? 'border-stone-200 bg-white hover:border-teal-300 hover:shadow-md'
                          : 'border-stone-200 bg-stone-50 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 ring-1 ring-teal-100">
                            <Package className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-stone-900">{product.name}</p>
                            <p className="truncate text-[11px] text-stone-400">
                              {product.dci ? `${product.dci} · ` : ''}
                              {product.barcode || 'sans code-barres'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>

                      {fefo ? (
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                          <div className="min-w-0">
                            <p className="text-[11px] text-stone-400">
                              {multi ? `${active.length} lots actifs · ` : ''}Lot {fefo.batch_number}
                              {fefo.days_until_expiry != null && fefo.days_until_expiry <= 90 && (
                                <span className="font-semibold text-amber-600"> · péremption {fefo.days_until_expiry}j</span>
                              )}
                            </p>
                            <p
                              className="text-sm font-extrabold text-stone-900"
                              style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                            >
                              {fmt(fefo.selling_price || product.price)}
                              <span className="ml-1 text-[10px] font-normal text-stone-400">
                                · {totalQty} {product.unit || 'u.'} dispo
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleQuickAdd(product)}
                            className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {multi ? 'Choisir le lot' : 'Ajouter'}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                          <p className="text-[11px] text-stone-400">Aucun lot actif</p>
                          <button
                            onClick={() => handleQuickAdd(product)}
                            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-400"
                            disabled
                          >
                            Indisponible
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Colonne droite : panier sticky ---------- */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <ShoppingCart className="h-4 w-4 text-teal-600" />
                Panier de vente
              </h2>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                {cartSummary.itemCount} produit(s) · {cartSummary.totalItems} u.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="mx-auto h-10 w-10 text-stone-300" />
                  <p className="mt-3 text-sm font-bold text-stone-700">Le panier est vide</p>
                  <p className="mt-1 text-xs text-stone-400">Scannez ou recherchez un produit pour commencer</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {cartItems.map((item, index) => {
                    const status = getStockStatus(item.product, item.batch)
                    return (
                      <li key={`${item.product.id}-${index}`} className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-stone-900">{item.product.name}</p>
                            <p className="text-[11px] text-stone-400">
                              {item.batch?.batch_number ? `Lot ${item.batch.batch_number}` : item.product.barcode}
                              {item.batch?.expiry_date &&
                                ` · exp. ${new Date(item.batch.expiry_date).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            aria-label={`Retirer ${item.product.name}`}
                            className="rounded-lg p-1.5 text-stone-300 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-0.5">
                            <button
                              onClick={() => decrementQuantity(index)}
                              disabled={item.quantity <= 1}
                              aria-label="Diminuer la quantité"
                              className="rounded-md bg-white p-1.5 shadow-sm transition hover:bg-stone-50 disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3 text-stone-600" />
                            </button>
                            <span
                              className="min-w-[2rem] text-center text-sm font-bold text-stone-900"
                              style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => incrementQuantity(index)}
                              aria-label="Augmenter la quantité"
                              className="rounded-md bg-white p-1.5 shadow-sm transition hover:bg-stone-50"
                            >
                              <Plus className="h-3 w-3 text-stone-600" />
                            </button>
                          </div>
                          <p
                            className="text-sm font-extrabold text-stone-900"
                            style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                          >
                            {fmt((item.batch?.selling_price || item.product.price) * item.quantity)}
                          </p>
                        </div>

                        {item.batch?.days_until_expiry != null && item.batch.days_until_expiry <= 90 && (
                          <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.cls}`}>
                            {status.label}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-stone-100 p-4">
                <div className="flex items-end justify-between">
                  <p className="text-xs font-semibold text-stone-400">Total</p>
                  <p
                    className="text-xl font-extrabold text-stone-900"
                    style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                  >
                    {fmt(cartSummary.total)}
                  </p>
                </div>
                <button
                  onClick={handleSubmit}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                  <Check className="h-4 w-4" />
                  Envoyer à la caisse
                </button>
                <p className="mt-2 text-center text-[10px] text-stone-400">
                  La vente sera encaissée par le caissier
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ Modale de sélection de lot ============ */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
            <Button
              variant="primary"
              onClick={handleAddToCart}
              disabled={!selectedProduct || !selectedBatch || quantity <= 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter au panier
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
                <Package className="h-9 w-9 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">{selectedProduct.name}</h3>
                {selectedProduct.dci && (
                  <p className="text-sm text-stone-500">DCI : {selectedProduct.dci}</p>
                )}
                {selectedProduct.barcode && (
                  <p className="text-sm text-stone-500">Code-barres : {selectedProduct.barcode}</p>
                )}
                <p className="mt-2 text-sm text-stone-500">{selectedProduct.description}</p>
              </div>
            </div>

            {/* Sélection du lot — FEFO */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900">
                <Barcode className="h-4 w-4 text-teal-600" />
                Choisir un lot (FEFO — péremption la plus proche d'abord)
              </h4>
              {selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {[...selectedProduct.batches]
                    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                    .map((batch, i) => {
                      const status = getStockStatus(selectedProduct, batch)
                      const isSelected = selectedBatch?.id === batch.id
                      const fefoFirst = i === 0 && batch.quantity > 0 && !batch.is_expired
                      return (
                        <div
                          key={batch.id}
                          onClick={() => {
                            if (batch.quantity > 0 && !batch.is_expired) {
                              setSelectedBatch(batch)
                            }
                          }}
                          className={`relative cursor-pointer rounded-xl border-2 p-3 transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50'
                              : batch.quantity > 0 && !batch.is_expired
                                ? 'border-stone-200 hover:border-teal-300'
                                : 'cursor-not-allowed border-stone-200 opacity-50'
                          }`}
                        >
                          {fefoFirst && (
                            <span className="absolute -top-2 left-2 rounded-full bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              FEFO 1er
                            </span>
                          )}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-stone-900">{batch.batch_number}</p>
                              <p className="text-xs text-stone-400">
                                Stock : {batch.quantity} {selectedProduct.unit}
                              </p>
                              <p className="text-xs text-stone-400">
                                Péremption : {new Date(batch.expiry_date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className="text-sm font-bold text-stone-900"
                                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                              >
                                {fmt(batch.selling_price)}
                              </p>
                              <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.cls}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="rounded-xl bg-stone-50 py-6 text-center">
                  <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
                  <p className="text-sm text-stone-500">Aucun lot disponible pour ce produit</p>
                </div>
              )}
            </div>

            {/* Quantité */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Quantité</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Diminuer"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                      setQuantity(quantity + 1)
                    }
                  }}
                  aria-label="Augmenter"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {selectedBatch && (
                <p className="mt-1 text-xs text-stone-400">Maximum disponible : {selectedBatch.quantity}</p>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="rounded-xl bg-stone-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Prix unitaire :</span>
                <span className="font-semibold text-stone-700" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt(selectedBatch?.selling_price || selectedProduct.price)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-lg font-extrabold">
                <span className="text-stone-700">Total :</span>
                <span className="text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt((selectedBatch?.selling_price || selectedProduct.price) * quantity)}
                </span>
              </div>
            </div>
        )}
      </Modal>

      {/* ============ Confirmation d'envoi caisse ============ */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSubmit}
        title="Envoyer à la caisse ?"
        message={`Vous allez envoyer ${cartSummary.itemCount} produit(s) pour un total de ${fmt(cartSummary.total)} à la caisse. Confirmez-vous ?`}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Package, Search, Plus, Edit, Trash2, AlertTriangle, XCircle, Eye,
  Layers, CalendarClock, ShoppingCart, X, Minus, Banknote,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

/**
 * Inventory Management Page — refonte « Menthe & Sable »
 * FRNT-008 : session gestionnaire — stocks, lots FEFO, réception, commandes.
 * (Contrats API inchangés : GET /products, GET /batches, POST /batches.)
 */
function InventoryPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [view, setView] = useState('products')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [orderProduct, setOrderProduct] = useState(null)
  const [orderQty, setOrderQty] = useState(0)
  const [withdrawBatch, setWithdrawBatch] = useState(null)
  const [withdrawReason, setWithdrawReason] = useState('expired')
  const [batchSort, setBatchSort] = useState({ key: 'expiry', dir: 1 })
  const searchRef = useRef(null)

  const [formData, setFormData] = useState({
    product_id: '',
    batch_number: '',
    supplier_id: ''
  })

  const fmt = (amount) =>
    new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA'

  const daysUntil = (date) =>
    date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) : null

  // Fetch products and batches + suppliers (silencieux si l'endpoint n'existe pas)
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)

      const productsResponse = await api.get('/api/v1/products', {
        params: {
          page: 1,
          page_size: 100,
          is_active: true
        }
      })
      setProducts(productsResponse.data.products || [])

      const batchesResponse = await api.get('/api/v1/batches', {
        params: {
          page: 1,
          page_size: 100,
          status: 'active'
        }
      })
      setBatches(batchesResponse.data.batches || [])

      try {
        const suppliersResponse = await api.get('/api/v1/suppliers')
        setSuppliers(suppliersResponse.data.suppliers || suppliersResponse.data || [])
      } catch {
        setSuppliers([])
      }
    } catch (err) {
      setError(err.message)
      window.toast.error("Échec du chargement de l'inventaire")
    } finally {
      setLoading(false)
    }
    fetchInventory()
  }, [fetchInventory])

  // Raccourcis clavier : « / » recherche, « Échap » ferme la modale au premier plan
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (showBatchModal) setShowBatchModal(false)
        else if (orderProduct) setOrderProduct(null)
        else if (withdrawBatch) setWithdrawBatch(null)
        else if (showModal) setShowModal(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showBatchModal, orderProduct, withdrawBatch, showModal])

  /** Jointure produits ↔ lots (stock_min/stock_max/unit côté produit). */
  const productById = useMemo(() => {
    const m = new Map()
    products.forEach((p) => m.set(p.id, p))
    return m
  }, [products])

  const productStats = useMemo(() => {
    const activeByProduct = new Map()
    batches.forEach((b) => {
      if (b.quantity > 0 && !b.is_expired) {
        const arr = activeByProduct.get(b.product_id) || []
        arr.push(b)
        activeByProduct.set(b.product_id, arr)
      }
    })
    return products.map((p) => {
      const active = (activeByProduct.get(p.id) || [])
        .slice()
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
      const totalQty = active.reduce((s, b) => s + b.quantity, 0)
      const min = p.stock_min ?? 10
      const max = p.stock_max ?? min * 2
      const fefo = active[0] || null
      const status =
        totalQty === 0 ? 'rupture'
          : totalQty <= min ? 'low'
            : active.some((b) => (daysUntil(b.expiry_date) ?? 999) <= 90) ? 'expiring'
              : 'ok'
      return { product: p, active, totalQty, min, max, fefo, status }
    })
  }, [products, batches])

  /** Premier lot FEFO par produit (pour le badge « FEFO 1er » en vue lots). */
  const fefoIds = useMemo(() => {
    const ids = new Set()
    productStats.forEach((s) => {
      if (s.fefo) ids.add(s.fefo.id)
    })
    return ids
  }, [productStats])

  const stats = useMemo(() => {
    const valeurStock = batches
      .filter((b) => !b.is_expired && b.quantity > 0)
      .reduce((s, b) => s + b.quantity * (b.cost_price || 0), 0)
    const lotsActifs = batches.filter((b) => !b.is_expired && b.quantity > 0).length
    const aCommander = productStats.filter((s) => s.status === 'rupture' || s.status === 'low').length
    const peremption = batches.filter((b) => {
      const d = daysUntil(b.expiry_date)
      return !b.is_expired && d != null && d > 0 && d <= 90
    }).length
    return { valeurStock, lotsActifs, aCommander, peremption }
  }, [batches, productStats])

  const chipCounts = useMemo(() => {
    const batchLow = new Set(
      productStats.filter((s) => s.status === 'low').map((s) => s.product.id)
    )
    const batchRupture = new Set(
      productStats.filter((s) => s.status === 'rupture').map((s) => s.product.id)
    )
    const batchExpiring = new Set(
      productStats.filter((s) => s.status === 'expiring').map((s) => s.product.id)
    )
    return {
      all: products.length,
      low: batchLow.size,
      rupture: batchRupture.size,
      expiring: batchExpiring.size,
      expired: batches.filter((b) => b.is_expired).length,
    }
  }, [products, productStats, batches])

  const visibleProductStats = useMemo(() => {
    return productStats.filter((s) => {
      const name = s.product.name || ''
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'low' && s.status === 'low') ||
        (filterStatus === 'rupture' && s.status === 'rupture') ||
        (filterStatus === 'expiring' && s.status === 'expiring')
      return matchesSearch && matchesStatus
    })
  }, [productStats, searchTerm, filterStatus])

  const filteredBatches = useMemo(() => {
    const list = batches.filter((batch) => {
      const matchesSearch =
        (batch.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (batch.batch_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      const d = daysUntil(batch.expiry_date)
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'low' && productStats.find((s) => s.product.id === batch.product_id)?.status === 'low') ||
        (filterStatus === 'rupture' && productStats.find((s) => s.product.id === batch.product_id)?.status === 'rupture') ||
        (filterStatus === 'expiring' && d != null && d > 0 && d <= 90) ||
        (filterStatus === 'expired' && batch.is_expired)
      return matchesSearch && matchesStatus
    })
    return [...list].sort((a, b) => {
      const k = batchSort.key
      const dir = batchSort.dir
      if (k === 'expiry') return ((new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0)) || 0) * dir
      if (k === 'quantity') return ((a.quantity || 0) - (b.quantity || 0)) * dir
      return String(a.product_name || '').localeCompare(String(b.product_name || '')) * dir
    })
  }, [batches, searchTerm, filterStatus, productStats, batchSort])

  // Statut d'un lot
  const getStockStatus = (batch) => {
    if (batch.is_expired) return { label: 'Périmé', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
    const d = daysUntil(batch.expiry_date)
    if (d != null && d <= 90) return { label: `Péremption ${d} j`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
    if (batch.quantity < 10) return { label: 'Stock faible', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
    return { label: 'OK', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  }

  // Handle form submission — payload inchangé
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setShowBatchModal(false)
      fetchInventory()
    } catch (err) {
      window.toast.error("Échec de l'ajout du lot")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const openReceiveModal = (preset = null) => {
    setFormData(preset || {
      product_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      cost_price: '',
      selling_price: '',
      location: '',
      supplier_id: ''
    })
    setShowBatchModal(true)
  }

  /** Commander un produit : qté suggérée = stock_max − stock. */
  const openOrderModal = (stat) => {
    setOrderProduct(stat)
    const suggested = Math.max(0, stat.max - stat.totalQty)
    setOrderQty(suggested)
  }

  const submitOrder = async () => {
    if (!orderProduct || orderQty <= 0) return
    try {
      await api.post('/api/v1/orders', {
        product_id: orderProduct.product.id,
        quantity: orderQty,
      })
      window.toast.success(`Commande passée : ${orderQty} × ${orderProduct.product.name}`)
      setOrderProduct(null)
    } catch (err) {
      const detail = err?.response?.data?.detail
      window.toast.error(
        typeof detail === 'string'
          ? detail
          : "Impossible de passer la commande (endpoint /orders à brancher côté serveur)"
      )
    }
  }

  /** Retrait d'un lot périmé : motif + perte calculée. */
  const openWithdrawModal = (batch) => {
    setWithdrawBatch(batch)
    setWithdrawReason('expired')
  }

  const submitWithdraw = async () => {
    if (!withdrawBatch) return
    try {
      await api.post(`/api/v1/batches/${withdrawBatch.id}/withdraw`, {
        reason: withdrawReason,
        quantity: withdrawBatch.quantity,
      })
      window.toast.success(`Lot ${withdrawBatch.batch_number} retiré de l'inventaire`)
      setBatches((prev) => prev.filter((b) => b.id !== withdrawBatch.id))
      setWithdrawBatch(null)
    } catch (err) {
      const detail = err?.response?.data?.detail
      window.toast.error(
        typeof detail === 'string'
          ? detail
          : "Impossible de retirer le lot (endpoint /batches/{id}/withdraw à brancher côté serveur)"
      )
    }
  }

  const chips = [
    { key: 'all', label: 'Tous' },
    { key: 'low', label: 'Stock faible' },
    { key: 'rupture', label: 'Ruptures' },
    { key: 'expiring', label: 'Péremption ≤ 90 j' },
    { key: 'expired', label: 'Périmés' },
  ]

  const KpiCard = ({ icon: Icon, tone, label, value, sub, onClick }) => (
    <button
      onClick={onClick}
      className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-stone-400">{label}</p>
          <p
            className={`truncate text-lg font-extrabold text-stone-900 ${onClick ? 'cursor-pointer' : ''}`}
            style={typeof value === 'number' && label.includes('Valeur') ? { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" } : undefined}
          >
            {typeof value === 'number' && label.includes('Valeur') ? fmt(value) : value}
          </p>
          {sub && <p className="text-[10px] text-stone-400">{sub}</p>}
        </div>
      </div>
    </button>
  )

  return (
    <div className="space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ============ En-tête ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Gestion de l'Inventaire</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Stocks, lots et péremptions — premier lot FEFO signalé sur chaque produit.
          </p>
        </div>
        <button
          onClick={() => openReceiveModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Réceptionner un lot
        </button>
      </div>

      {/* ============ KPI ============ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Banknote}
          tone="bg-teal-50 text-teal-600 ring-teal-100"
          label="Valeur du stock"
          value={stats.valeurStock}
          sub="Prix d'achat · lots actifs"
        />
        <KpiCard
          icon={Layers}
          tone="bg-stone-50 text-stone-600 ring-stone-200"
          label="Lots actifs"
          value={stats.lotsActifs}
          sub="Quantité disponible > 0"
        />
        <KpiCard
          icon={ShoppingCart}
          tone="bg-amber-50 text-amber-600 ring-amber-200"
          label="À commander"
          value={stats.aCommander}
          sub="Sous le seuil minimum → cliquer pour filtrer"
          onClick={() => { setFilterStatus('low'); setView('products') }}
        />
        <KpiCard
          icon={CalendarClock}
          tone="bg-rose-50 text-rose-600 ring-rose-200"
          label="Péremption ≤ 90 j"
          value={stats.peremption}
          sub="Lots à écouler en priorité → cliquer pour filtrer"
          onClick={() => { setFilterStatus('expiring'); setView('batches') }}
        />
      </div>

      {/* ============ Recherche + chips + vues ============ */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Rechercher par produit ou n° de lot…   (raccourci : /)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher dans l'inventaire"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="inline-flex rounded-xl bg-stone-100 p-1">
            <button
              onClick={() => setView('products')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                view === 'products' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              <Package className="h-3.5 w-3.5" /> Par produit
            </button>
            <button
              onClick={() => setView('batches')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                view === 'batches' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Par lot
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilterStatus(chip.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                filterStatus === chip.key
                  ? 'bg-teal-600 text-white ring-teal-600'
                  : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
              }`}
            >
              {chip.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filterStatus === chip.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {chipCounts[chip.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============ Contenu ============ */}
      {loading ? (
        <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 animate-pulse rounded bg-stone-100" />
                <div className="h-2.5 w-32 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-6 w-24 animate-pulse rounded-full bg-stone-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-bold text-rose-700">Erreur : {error}</p>
          <button onClick={fetchInventory} className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700">
            Réessayer
          </button>
        </div>
      ) : view === 'products' ? (
        /* ---------- Vue Par produit ---------- */
        visibleProductStats.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white py-12 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-stone-300" />
            <p className="mt-3 text-sm font-bold text-stone-700">Aucun produit ne correspond</p>
            <p className="mt-1 text-xs text-stone-400">Modifiez la recherche ou les filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleProductStats.map((s) => {
              const pct = Math.min(100, Math.round((s.totalQty / s.max) * 100))
              const minPct = Math.round((s.min / s.max) * 100)
              const statusCls =
                s.status === 'rupture'
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : s.status === 'low'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : s.status === 'expiring'
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              const statusLabel =
                s.status === 'rupture' ? 'Rupture'
                  : s.status === 'low' ? 'Stock faible'
                    : s.status === 'expiring' ? 'Péremption proche'
                      : 'En stock'
              return (
                <div key={s.product.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-teal-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-900">{s.product.name}</p>
                      <p className="text-[11px] text-stone-400">
                        {s.active.length} lot(s) actif(s) · seuil min {s.min}
                      </p>
                    </div>
                    <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusCls}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-lg font-extrabold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                        {s.totalQty}
                        <span className="text-[10px] font-normal text-stone-400"> {s.product.unit || 'u.'}</span>
                      </p>
                      <p className="text-[10px] text-stone-400">max {s.max}</p>
                    </div>
                    <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${
                          s.status === 'rupture' ? 'bg-rose-500' : s.status === 'low' ? 'bg-amber-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${s.totalQty === 0 ? 2 : pct}%` }}
                      />
                      <div className="absolute top-0 h-full w-0.5 bg-stone-400/70" style={{ left: `${minPct}%` }} />
                    </div>
                  </div>

                  {s.fefo ? (
                    <p className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 ring-1 ring-teal-100">
                      <Layers className="h-3 w-3" />
                      FEFO — sortir le lot {s.fefo.batch_number} d'abord
                      {daysUntil(s.fefo.expiry_date) != null && ` (exp. ${new Date(s.fefo.expiry_date).toLocaleDateString('fr-FR')})`}
                    </p>
                  ) : (
                    <p className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                      <XCircle className="h-3 w-3" /> Aucun lot actif — réceptionner du stock
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                    <span
                      className="text-[11px] font-semibold text-stone-400"
                      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                    >
                      {fmt(s.active.reduce((sum, b) => sum + b.quantity * (b.cost_price || 0), 0))}
                    </span>
                    <div className="flex items-center gap-1">
                      {(s.status === 'low' || s.status === 'rupture') && (
                        <button
                          onClick={() => openOrderModal(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-amber-600"
                        >
                          <ShoppingCart className="h-3 w-3" /> Commander
                        </button>
                      )}
                      <button
                        onClick={() => openReceiveModal({
                          product_id: s.product.id,
                          batch_number: '',
                          expiry_date: '',
                          quantity: '',
                          cost_price: s.fefo?.cost_price || '',
                          selling_price: s.fefo?.selling_price || s.product.price || '',
                          location: s.fefo?.location || '',
                          supplier_id: ''
                        })}
                        title="Réceptionner un lot pour ce produit"
                        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-teal-50 hover:text-teal-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ---------- Vue Par lot ---------- */
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  {[
                    { label: 'Produit', key: 'product' },
                    { label: 'N° Lot', key: null },
                    { label: 'Quantité', key: 'quantity', className: 'text-right' },
                    { label: 'Péremption', key: 'expiry' },
                    { label: 'Statut', key: null },
                    { label: 'Emplacement', key: null },
                    { label: 'Actions', key: null, className: 'text-right' },
                  ].map((h) => (
                    <th key={h.label} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400 ${h.className || ''}`}>
                      {h.key ? (
                        <button
                          onClick={() =>
                            setBatchSort((s) => (s.key === h.key ? { key: h.key, dir: -s.dir } : { key: h.key, dir: 1 }))
                          }
                          className="inline-flex items-center gap-1 hover:text-stone-600"
                        >
                          {h.label}
                          {batchSort.key === h.key && <span className="text-teal-600">{batchSort.dir === 1 ? '↑' : '↓'}</span>}
                        </button>
                      ) : (
                        h.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    const status = getStockStatus(batch)
                    const isFefo = fefoIds.has(batch.id)
                    const expired = !!batch.is_expired
                    return (
                      <tr key={batch.id} className={`transition hover:bg-stone-50 ${expired ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-stone-900">{batch.product_name || 'N/A'}</p>
                          <p className="text-[10px] text-stone-400">#{batch.product_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-sm text-stone-700" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                            {batch.batch_number}
                            {isFefo && !expired && (
                              <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">FEFO 1er</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                          {batch.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('fr-FR') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{batch.location || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedProduct(batch); setShowModal(true) }}
                              className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openReceiveModal({
                                product_id: batch.product_id,
                                batch_number: batch.batch_number,
                                expiry_date: batch.expiry_date,
                                quantity: batch.quantity,
                                cost_price: batch.cost_price,
                                selling_price: batch.selling_price,
                                location: batch.location,
                                supplier_id: batch.supplier_id || ''
                              })}
                              className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {expired && (
                              <button
                                onClick={() => openWithdrawModal(batch)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                                title="Retirer le lot périmé"
                              >
                                <Trash2 className="h-3 w-3" /> Retirer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center">
                      <Layers className="mx-auto h-10 w-10 text-stone-300" />
                      <p className="mt-2 text-sm font-bold text-stone-700">Aucun lot trouvé</p>
                      <p className="mt-1 text-xs text-stone-400">Modifiez la recherche ou les filtres.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ Modale Réception / Édition de lot ============ */}
      {showBatchModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={(e) => e.target === e.currentTarget && setShowBatchModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-stone-900">
                {formData.batch_number ? 'Modifier le lot' : 'Réceptionner un lot'}
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Produit *</label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Fournisseur</label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Non renseigné</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Numéro de lot *</label>
                  <input
                    type="text"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="LOT-2025-001"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Quantité *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, quantity: String(Math.max(1, (parseInt(p.quantity) || 1) - 1)) }))}
                      className="rounded-lg bg-stone-100 p-2 text-stone-600 transition hover:bg-stone-200"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                      min="1"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, quantity: String((parseInt(p.quantity) || 0) + 1) }))}
                      className="rounded-lg bg-stone-100 p-2 text-stone-600 transition hover:bg-stone-200"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Prix d'achat (FCFA) *</label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Prix de vente (FCFA) *</label>
                  <input
                    type="number"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Date de péremption *</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date ? formData.expiry_date.slice(0, 10) : ''}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-500">Emplacement</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="Étagère A1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                >
                  {formData.batch_number ? 'Enregistrer' : 'Ajouter le lot'}
                </button>
              </div>
            </form>
        </div>
      )}

      {/* ============ Modale Commander ============ */}
      {orderProduct && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={(e) => e.target === e.currentTarget && setOrderProduct(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-stone-900">Commander du stock</h3>
              <button onClick={() => setOrderProduct(null)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-stone-500">
              <span className="font-bold text-stone-900">{orderProduct.product.name}</span> — stock actuel{' '}
              <span className="font-bold" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>{orderProduct.totalQty}</span>
              , seuil max <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>{orderProduct.max}</span>.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                className="rounded-lg bg-stone-100 p-2 text-stone-600 transition hover:bg-stone-200"
                aria-label="Diminuer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={orderQty}
                onChange={(e) => setOrderQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center text-lg font-extrabold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                min="0"
              />
              <button
                onClick={() => setOrderQty((q) => q + 1)}
                className="rounded-lg bg-stone-100 p-2 text-stone-600 transition hover:bg-stone-200"
                aria-label="Augmenter"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-center text-[11px] text-stone-400">
              Quantité suggérée : {Math.max(0, orderProduct.max - orderProduct.totalQty)} (pour atteindre le seuil max)
            </p>

            <div className="mt-4 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Coût estimé ({orderQty} × prix d'achat)</span>
                <span className="font-extrabold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt(orderQty * (orderProduct.product.cost_price || orderProduct.fefo?.cost_price || orderProduct.product.price || 0))}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOrderProduct(null)}
                className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-200"
              >
                Annuler
              </button>
              <button
                onClick={submitOrder}
                disabled={orderQty <= 0}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> Passer la commande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Modale Retrait lot périmé ============ */}
      {withdrawBatch && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={(e) => e.target === e.currentTarget && setWithdrawBatch(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-stone-900">Retirer le lot périmé</h3>
              <button onClick={() => setWithdrawBatch(null)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
              <p className="text-sm font-bold text-stone-900">
                {withdrawBatch.product_name} — lot {withdrawBatch.batch_number}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                Quantité : {withdrawBatch.quantity} · Péremption :{' '}
                {withdrawBatch.expiry_date ? new Date(withdrawBatch.expiry_date).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
              <p className="mt-2 text-sm font-bold text-rose-700">
                Perte estimée :{' '}
                <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt(withdrawBatch.quantity * (withdrawBatch.cost_price || 0))}
                </span>
              </p>
            </div>

            <label className="mb-1 mt-4 block text-xs font-bold text-stone-500">Motif du retrait</label>
            <select
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="expired">Périmé</option>
              <option value="damaged">Endommagé / cassé</option>
              <option value="recall">Rappel fournisseur</option>
              <option value="other">Autre</option>
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setWithdrawBatch(null)}
                className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-200"
              >
                Annuler
              </button>
              <button
                onClick={submitWithdraw}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" /> Retirer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Modale Détails du lot ============ */}
      {showModal && selectedProduct && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-stone-900">Détails du lot</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: 'Produit', value: selectedProduct.product_name || 'N/A' },
                  { label: 'Numéro de lot', value: selectedProduct.batch_number, mono: true },
                  { label: 'Quantité', value: `${selectedProduct.quantity} unités`, mono: true },
                  {
                    label: 'Date de péremption',
                    value: selectedProduct.expiry_date ? new Date(selectedProduct.expiry_date).toLocaleDateString('fr-FR') : 'N/A',
                  },
                  { label: "Prix d'achat", value: fmt(selectedProduct.cost_price), mono: true },
                  { label: 'Prix de vente', value: fmt(selectedProduct.selling_price), mono: true },
                  { label: 'Emplacement', value: selectedProduct.location || 'N/A' },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-stone-400">{f.label}</p>
                    <p className="text-sm font-semibold text-stone-900" style={f.mono ? { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" } : undefined}>
                      {f.value}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-stone-400">Statut</p>
                  {(() => {
                    const status = getStockStatus(selectedProduct)
                    return (
                      <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}>
                        {status.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs text-stone-400">Date de réception</p>
                <p className="text-sm font-semibold text-stone-900">
                  {selectedProduct.received_date ? new Date(selectedProduct.received_date).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
              </div>
            </div>
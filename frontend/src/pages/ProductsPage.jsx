a/frontend/src/pages/ProductsPage.jsx b/frontend/src/pages/ProductsPage.jsx
++ b/frontend/src/pages/ProductsPage.jsx
import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpDown, ArrowUp, ArrowDown, Barcode, Edit, Package, Plus, Search, Trash2,
} from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import { useAlerts } from '../hooks/useAlerts'
import { useAuth } from '../hooks/useAuth'
import { AlertBadge } from '../components/common'
import { ConfirmModal } from '../components/common/Modal'

/**
 * Catalogue produits — refonte « Menthe & Sable »
 * Une seule recherche (détection code-barres automatique), chips de statut
 * avec compteurs, table triable, barres min/max et suppression confirmée.
 */

const fmt = (amount) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA'

const STATUS_STYLES = {
  rupture: { label: 'Rupture', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  low: { label: 'Stock faible', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  over: { label: 'Surstock', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ok: { label: 'En stock', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
}

function getStockStatus(product) {
  if (product.current_stock === 0) return 'rupture'
  if (product.current_stock <= (product.stock_min ?? 0)) return 'low'
  if (product.stock_max && product.current_stock >= product.stock_max) return 'over'
  return 'ok'
}

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState(1)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const canDelete = user?.role === 'admin'
  const { addToast } = useToast()
  const { hasAlerts } = useAlerts()

  const barcodeMode = /^\d{8,}$/.test(searchQuery.trim())

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      // Une recherche composée uniquement de chiffres (≥ 8) est traitée comme un code-barres.
      const isBarcode = /^\d{8,}$/.test(searchQuery.trim())
      const response = await api.get('/api/v1/products', {
        params: {
          search: searchQuery || undefined,
          barcode: isBarcode ? searchQuery.trim() : undefined,
          page_size: 50,
        },
      })
      setProducts(response.data.products || [])
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les produits' })
    } finally {
      setIsLoading(false)
    }
  }

  const scanBarcode = async (barcode) => {
    try {
      const response = await api.post('/api/v1/barcode/scan', { barcode })
      if (response.data.product) {
        addToast({
          type: 'success',
          title: 'Produit trouvé',
          message: `Produit : ${response.data.product.name}`,
        })
        setSearchQuery(response.data.product.name || '')
      } else {
        addToast({
          type: 'error',
          title: 'Produit introuvable',
          message: response.data.error || 'Ce code-barres ne correspond à aucun produit',
        })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur de scan', message: 'Impossible de scanner le code-barres' })
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (barcodeMode) {
      scanBarcode(searchQuery.trim())
    } else {
      fetchProducts()
    }
  }

  const handleEdit = (product) => {
    navigate(`/products/${product.id}/edit`)
  }

  const handleDelete = (product) => {
    setDeletingProduct(product)
  }

  const confirmDelete = async () => {
    const product = deletingProduct
    if (!product) return
    try {
      await api.delete(`/products/${product.id}`)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
            ? 'Seul un administrateur peut supprimer un produit.'
            : typeof detail === 'string'
              ? detail
              : 'Impossible de supprimer le produit.',
      })
    } finally {
      setDeletingProduct(null)
    }
  }

  const counts = useMemo(() => {
    const c = { all: products.length, rupture: 0, low: 0, over: 0, ok: 0 }
    products.forEach((p) => {
      c[getStockStatus(p)] += 1
    })
    return c
  }, [products])

  const visibleProducts = useMemo(() => {
    let list = products
    if (statusFilter !== 'all') {
      list = list.filter((p) => getStockStatus(p) === statusFilter)
    }
    return [...list].sort((a, b) => {
      let r = 0
      if (sortKey === 'name') r = (a.name || '').localeCompare(b.name || '')
      else if (sortKey === 'price') r = (a.price || 0) - (b.price || 0)
      else if (sortKey === 'stock') r = (a.current_stock || 0) - (b.current_stock || 0)
      return r * sortDir
    })
  }, [products, statusFilter, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d)
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const chips = [
    { key: 'all', label: 'Tous' },
    { key: 'rupture', label: 'Ruptures' },
    { key: 'low', label: 'Stock faible' },
    { key: 'over', label: 'Surstock' },
    { key: 'ok', label: 'En stock' },
  ]

  const SortHeader = ({ label, k, className = '' }) => (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400 transition hover:text-stone-600"
      >
        {label}
        {sortKey === k ? (
          sortDir === 1 ? (
            <ArrowUp className="h-3 w-3 text-teal-600" />
          ) : (
            <ArrowDown className="h-3 w-3 text-teal-600" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-stone-300" />
        )}
      </button>
    </th>
  )

  return (
    <div className="space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ============ En-tête ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Produits</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {isLoading ? 'Chargement…' : `${products.length} produits référencés — ${visibleProducts.length} affichés`}
          </p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" /> Nouveau produit
        </Link>
      </div>

      {/* ============ Recherche unique + chips statut ============ */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, DCI ou code-barres…"
            aria-label="Rechercher un produit"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-32 text-sm shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {barcodeMode ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 ring-1 ring-teal-200">
                <Barcode className="h-3 w-3" /> Code-barres détecté
              </span>
            ) : (
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-stone-800"
              >
                Rechercher
              </button>
            )}
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                statusFilter === chip.key
                  ? 'bg-teal-600 text-white ring-teal-600'
                  : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
              }`}
            >
              {chip.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  statusFilter === chip.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {counts[chip.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============ Table ============ */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-stone-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="animate-pulse rounded-lg bg-stone-100" style={{ width: 36, height: 36 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-44 animate-pulse rounded bg-stone-100" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-stone-100" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <Package className="h-6 w-6 text-stone-400" />
            </div>
            <p className="mt-3 text-sm font-bold text-stone-700">
              {products.length === 0 ? 'Aucun produit référencé' : 'Aucun résultat'}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {products.length === 0
                ? 'Créez votre premier produit pour commencer le catalogue.'
                : 'Modifiez la recherche ou les filtres de statut.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <SortHeader label="Produit" k="name" />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">DCI</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">Catégorie</th>
                  <SortHeader label="Prix" k="price" />
                  <SortHeader label="Stock" k="stock" />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">Statut</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleProducts.map((product) => {
                  const status = STATUS_STYLES[getStockStatus(product)]
                  const min = product.stock_min ?? 0
                  const max = product.stock_max ?? Math.max(min * 2, 1)
                  const pct = Math.min(100, Math.round(((product.current_stock || 0) / max) * 100))
                  const minPct = Math.round((min / max) * 100)
                  return (
                    <tr key={product.id} className="transition hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">{product.name}</span>
                          {product.is_active === false && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 ring-1 ring-stone-200">
                              Inactif
                            </span>
                          )}
                          {hasAlerts(product.id) && <AlertBadge productId={product.id} size="sm" />}
                        </div>
                        <p className="max-w-xs truncate text-xs text-stone-400">
                          {product.barcode ? `${product.barcode}` : '—'} {product.description ? `· ${product.description}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.dci || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.category_name || 'Non classé'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                        {fmt(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[120px]">
                          <p className="text-sm font-semibold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                            {product.current_stock ?? 0}
                            <span className="text-[10px] font-normal text-stone-400"> {product.unit || ''}</span>
                          </p>
                          <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                            <div
                              className={`h-full rounded-full ${
                                product.current_stock === 0
                                  ? 'bg-rose-500'
                                  : product.current_stock <= min
                                    ? 'bg-amber-500'
                                    : 'bg-teal-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                            <div className="absolute top-0 h-full w-0.5 bg-stone-400/70" style={{ left: `${minPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(product)}
                              aria-label={`Modifier ${product.name}`}
                              className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(product)}
                              aria-label={`Supprimer ${product.name}`}
                              className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Confirmation de suppression ============ */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={confirmDelete}
        title="Supprimer ce produit ?"
        message={`« ${deletingProduct?.name} » sera définitivement retiré du catalogue. Cette action est irréversible.`}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

/**
 * Création / modification d'un produit - Pharma 360
 * - /products/new       -> POST /api/v1/products/
 * - /products/:id/edit  -> PUT  /api/v1/products/:id
 * (réservé aux rôles manager et admin côté backend)
 */
const INITIAL = {
  name: '',
  category_id: '',
  dci: '',
  barcode: '',
  manufacturer: '',
  description: '',
  price: '0',
  cost_price: '0',
  stock_min: '0',
  stock_max: '100',
  unit: 'unité',
  requires_prescription: false,
  is_active: true,
}

function errorMessage(error) {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail
  if (status === 403) return 'Seuls les gestionnaires et administrateurs peuvent créer ou modifier un produit.'
  if (Array.isArray(detail)) return detail.map((d) => `${(d.loc || []).slice(-1)[0]} : ${d.msg}`).join(' ; ')
  if (typeof detail === 'string') return detail
  return 'Impossible de créer le produit.'
}

function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { addToast } = useToast()
  const [form, setForm] = useState(INITIAL)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [categories, setCategories] = useState([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  // Charger les catégories
  useEffect(() => {
    let cancelled = false
    api.get('/categories/')
      .then((res) => { if (!cancelled) setCategories(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {
        if (!cancelled) addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les catégories' })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // En modification : charger le produit
  useEffect(() => {
    if (!isEdit) return undefined
    let cancelled = false
    setIsLoading(true)
    api.get(`/products/${id}`)
      .then((res) => {
        if (cancelled) return
        const p = res.data
        setForm({
          name: p.name ?? '',
          category_id: p.category_id != null ? String(p.category_id) : '',
          dci: p.dci ?? '',
          barcode: p.barcode ?? '',
          manufacturer: p.manufacturer ?? '',
          description: p.description ?? '',
          price: String(p.price ?? 0),
          cost_price: String(p.cost_price ?? 0),
          stock_min: String(p.stock_min ?? 0),
          stock_max: String(p.stock_max ?? 0),
          unit: p.unit ?? 'unité',
          requires_prescription: Boolean(p.requires_prescription),
          is_active: p.is_active !== false,
        })
      })
      .catch((error) => {
        if (cancelled) return
        addToast({
          type: 'error',
          title: 'Erreur',
          message: error?.response?.status === 404 ? 'Produit introuvable' : 'Impossible de charger le produit',
        })
        navigate('/products')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setIsAddingCategory(true)
    try {
      const res = await api.post('/categories/', { name })
      setCategories((prev) => [...prev, res.data].sort((x, y) => x.name.localeCompare(y.name, 'fr')))
      setForm((prev) => ({ ...prev, category_id: String(res.data.id) }))
      setNewCategoryName('')
      setShowNewCategory(false)
      addToast({ type: 'success', title: 'Catégorie ajoutée', message: res.data.name })
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: errorMessage(error) })
    } finally {
      setIsAddingCategory(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      dci: form.dci.trim() || null,
      barcode: form.barcode.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      cost_price: Number(form.cost_price) || 0,
      stock_min: parseInt(form.stock_min, 10) || 0,
      stock_max: parseInt(form.stock_max, 10) || 0,
      unit: form.unit.trim() || 'unité',
      requires_prescription: form.requires_prescription,
      is_active: form.is_active,
    }

    if (!payload.name) {
      addToast({ type: 'error', title: 'Champ requis', message: 'Le nom du produit est obligatoire.' })
      return
    }
    if (payload.stock_max < payload.stock_min) {
      addToast({ type: 'error', title: 'Stock invalide', message: 'Le stock maximum doit être supérieur ou égal au stock minimum.' })
      return
    }

    setIsSaving(true)
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, payload)
        addToast({ type: 'success', title: 'Produit modifié', message: `${payload.name} a été mis à jour.` })
      } else {
        await api.post('/products/', payload)
        addToast({ type: 'success', title: 'Produit créé', message: `${payload.name} a été ajouté.` })
      }
      navigate('/products')
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: errorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="card text-center py-12 text-gray-500">Chargement du produit...</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux produits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <Input label="Nom" required value={form.name} onChange={setField('name')} maxLength={200} />

        <div>
          <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <div className="flex gap-2">
            <select
              id="product-category"
              value={form.category_id}
              onChange={setField('category_id')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Non classé</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory((v) => !v)}
              className="px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-200 hover:bg-primary-50"
            >
              + Nouvelle catégorie
            </button>
          </div>
          {showNewCategory && (
            <div className="flex gap-2 mt-2">
              <input
                aria-label="Nom de la nouvelle catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                maxLength={50}
                placeholder="Ex : Antipaludéens"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isAddingCategory || !newCategoryName.trim()}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="DCI" value={form.dci} onChange={setField('dci')} maxLength={100} />
          <Input label="Code-barres" value={form.barcode} onChange={setField('barcode')} maxLength={50} />
          <Input label="Fabricant" value={form.manufacturer} onChange={setField('manufacturer')} maxLength={100} />
          <Input label="Unité" value={form.unit} onChange={setField('unit')} />
          <Input label="Prix de vente" type="number" min="0" step="0.01" value={form.price} onChange={setField('price')} />
          <Input label="Prix d'achat" type="number" min="0" step="0.01" value={form.cost_price} onChange={setField('cost_price')} />
          <Input label="Stock minimum" type="number" min="0" step="1" value={form.stock_min} onChange={setField('stock_min')} />
          <Input label="Stock maximum" type="number" min="0" step="1" value={form.stock_max} onChange={setField('stock_max')} />
        </div>

        <div>
          <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="product-description"
            rows={3}
            value={form.description}
            onChange={setField('description')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.requires_prescription} onChange={setField('requires_prescription')} />
            Ordonnance requise
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_active} onChange={setField('is_active')} />
            Produit actif
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/products" className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100">
            Annuler
          </Link>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ProductFormPage

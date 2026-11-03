import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

/**
 * Création d'un produit - Pharma 360
 * POST /api/v1/products/ (réservé aux rôles manager et admin côté backend)
 */
const INITIAL = {
  name: '',
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
  if (status === 403) return 'Seuls les gestionnaires et administrateurs peuvent créer un produit.'
  if (Array.isArray(detail)) return detail.map((d) => `${(d.loc || []).slice(-1)[0]} : ${d.msg}`).join(' ; ')
  if (typeof detail === 'string') return detail
  return 'Impossible de créer le produit.'
}

function ProductFormPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [form, setForm] = useState(INITIAL)
  const [isSaving, setIsSaving] = useState(false)

  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
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
      await api.post('/products/', payload)
      addToast({ type: 'success', title: 'Produit créé', message: `${payload.name} a été ajouté.` })
      navigate('/products')
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: errorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux produits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouveau produit</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <Input label="Nom" required value={form.name} onChange={setField('name')} maxLength={200} />

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
            Créer le produit
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ProductFormPage

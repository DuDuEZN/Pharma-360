import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Package, Search } from 'lucide-react'

const BASE = '/preorders'

const STATUS_COLORS = {
  EN_ATTENTE: 'warning',
  DISPONIBLE: 'success',
  LIVRE: 'secondary',
  ANNULE: 'danger',
}

export default function PreordersPage() {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [pickupCode, setPickupCode] = useState('')
  const [found, setFound] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(`${BASE}/`, { params: { search, status: status || undefined, page_size: 50 } })
      setItems(r.data?.items || [])
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, status])

  const lookup = async () => {
    if (!pickupCode.trim()) return
    try {
      const r = await api.get(`${BASE}/lookup/${pickupCode.trim()}`)
      setFound(r.data)
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: 'Code inconnu' })
      setFound(null)
    }
  }

  const deliver = async (id) => {
    try {
      await api.post(`${BASE}/${id}/deliver`)
      addToast({ type: 'success', title: 'OK', message: 'Précommande remise' })
      setFound(null)
      setPickupCode('')
      load()
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: e.response?.data?.detail || 'Échec' })
    }
  }

  const cancel = async (id) => {
    try {
      await api.post(`${BASE}/${id}/cancel`, { reason: 'Annulation manuelle' })
      addToast({ type: 'success', title: 'OK', message: 'Précommande annulée' })
      load()
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: e.response?.data?.detail || 'Échec' })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" /> Précommandes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Code de retrait" value={pickupCode} onChange={(e) => setPickupCode(e.target.value)} />
            <Button onClick={lookup}>Rechercher</Button>
          </div>
          {found && (
            <div className="border rounded p-3 space-y-2">
              <div className="font-medium">{found.product_name} × {found.quantity}</div>
              <div className="text-sm text-gray-500">{found.customer_name} · {found.customer_phone}</div>
              <div className="text-sm">Statut : <Badge variant={STATUS_COLORS[found.status] || 'secondary'}>{found.status}</Badge></div>
              {found.status === 'DISPONIBLE' && (
                <Button size="sm" onClick={() => deliver(found.id)}>Remettre au client</Button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input placeholder="Rechercher (nom, téléphone, code)" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="border rounded p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="LIVRE">Livré</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>

          {loading ? <p>Chargement…</p> : (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {items.map((p) => (
                <div key={p.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{p.pickup_code}</span>
                    <Badge variant={STATUS_COLORS[p.status] || 'secondary'}>{p.status}</Badge>
                  </div>
                  <div className="font-medium mt-1">{p.product_name} × {p.quantity}</div>
                  <div className="text-xs text-gray-500">{p.customer_name} · {p.customer_phone}</div>
                  <div className="flex gap-2 mt-2">
                    {p.status === 'EN_ATTENTE' && (
                      <Button size="xs" variant="outline" onClick={() => api.post(`${BASE}/${p.id}/mark-available`).then(load)}>Réserver</Button>
                    )}
                    {p.status === 'DISPONIBLE' && (
                      <Button size="xs" onClick={() => deliver(p.id)}>Remettre</Button>
                    )}
                    {(p.status === 'EN_ATTENTE' || p.status === 'DISPONIBLE') && (
                      <Button size="xs" variant="ghost" onClick={() => cancel(p.id)}>Annuler</Button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-500">Aucune précommande.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

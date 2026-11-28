import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { FileText } from 'lucide-react'

const BASE = '/prescriptions'

export default function PrescriptionsPage() {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(`${BASE}/`, { params: { search, page_size: 50 } })
      setItems(r.data?.items || [])
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const exportCsv = () => {
    window.open(`/api/v1${BASE}/export`, '_blank')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" /> Ordonnancier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Rechercher (patient, prescripteur, n°)" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={exportCsv} variant="outline">Exporter CSV</Button>
          </div>
          {loading ? <p>Chargement…</p> : (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {items.map((p) => (
                <div key={p.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{p.prescription_number}</span>
                    <Badge variant="secondary">{p.prescription_type}</Badge>
                  </div>
                  <div className="font-medium mt-1">{p.patient_name}</div>
                  <div className="text-xs text-gray-500">
                    Prescripteur : {p.prescriber_name} ({p.prescriber_registration}) · {p.health_structure}
                  </div>
                  {p.sale_number && <div className="text-xs text-gray-400">Vente : {p.sale_number}</div>}
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-500">Aucune ordonnance.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

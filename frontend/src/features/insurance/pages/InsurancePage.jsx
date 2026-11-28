import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Shield } from 'lucide-react'

const BASE = '/insurance'

export default function InsurancePage() {
  const { addToast } = useToast()
  const [structures, setStructures] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [newStruct, setNewStruct] = useState({ name: '', code: '', default_rate: 0 })
  const [newClient, setNewClient] = useState({ structure_id: '', name: '', phone: '', policy_number: '', coverage_rate: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([
        api.get(`${BASE}/structures`),
        api.get(`${BASE}/clients`),
      ])
      setStructures(s.data || [])
      setClients(c.data || [])
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createStructure = async (e) => {
    e.preventDefault()
    try {
      await api.post(`${BASE}/structures`, { ...newStruct, default_rate: Number(newStruct.default_rate) || 0 })
      addToast({ type: 'success', title: 'OK', message: 'Structure créée' })
      setNewStruct({ name: '', code: '', default_rate: 0 })
      load()
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', message: e.response?.data?.detail || 'Échec' })
    }
  }

  const createClient = async (e) => {
    e.preventDefault()
    try {
      await api.post(`${BASE}/clients`, {
        ...newClient,
        structure_id: Number(newClient.structure_id),
        coverage_rate: Number(newClient.coverage_rate) || 0,
      })
      addToast({ type: 'success', title: 'OK', message: 'Client assuré créé' })
      setNewClient({ structure_id: '', name: '', phone: '', policy_number: '', coverage_rate: 0 })
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
            <Shield className="h-5 w-5 text-primary-600" /> Assurances
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Structures</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={createStructure} className="space-y-2">
              <Input placeholder="Nom" value={newStruct.name} onChange={(e) => setNewStruct({ ...newStruct, name: e.target.value })} required />
              <Input placeholder="Code" value={newStruct.code} onChange={(e) => setNewStruct({ ...newStruct, code: e.target.value })} />
              <Input type="number" placeholder="Taux défaut %" value={newStruct.default_rate} onChange={(e) => setNewStruct({ ...newStruct, default_rate: e.target.value })} />
              <Button type="submit" size="sm">Ajouter structure</Button>
            </form>
            <div className="space-y-1 max-h-64 overflow-auto">
              {structures.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <span>{s.name}</span>
                  <Badge variant="secondary">{s.default_rate}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clients assurés</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={createClient} className="space-y-2">
              <select className="w-full border rounded p-2 text-sm" value={newClient.structure_id} onChange={(e) => setNewClient({ ...newClient, structure_id: e.target.value })} required>
                <option value="">Structure…</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input placeholder="Nom client" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required />
              <Input placeholder="Téléphone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              <Input placeholder="N° police/matricule" value={newClient.policy_number} onChange={(e) => setNewClient({ ...newClient, policy_number: e.target.value })} />
              <Input type="number" placeholder="Taux %" value={newClient.coverage_rate} onChange={(e) => setNewClient({ ...newClient, coverage_rate: e.target.value })} />
              <Button type="submit" size="sm">Ajouter client assuré</Button>
            </form>
            <div className="space-y-1 max-h-64 overflow-auto">
              {clients.map((c) => (
                <div key={c.id} className="border rounded p-2 text-sm">
                  <div className="font-medium">{c.name} <Badge variant="secondary">{c.coverage_rate}%</Badge></div>
                  <div className="text-xs text-gray-500">{c.structure_name} · {c.policy_number || '-'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

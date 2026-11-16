import React, { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  UserRound,
  ChevronDown,
  ChevronUp,
  CreditCard,
  History,
  Wallet,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

/**
 * Page Clients (route /customers)
 *
 * - Accessible à tous sauf au caissier.
 * - Vendeur : création uniquement.
 * - Gestionnaire / administrateur : création, modification et suppression.
 * - Sous chaque client : historique d'achats, solde de crédit et achats à crédit.
 */

const EMPTY_FORM = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Bénin',
  tax_id: '',
  loyalty_points: 0,
}

const STATUS_LABELS = {
  pending: 'À crédit',
  partial: 'Partiel',
  paid: 'Réglé',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
}

const statusVariant = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'cancelled' || status === 'refunded') return 'destructive'
  return 'warning'
}

const CustomersPage = () => {
  const { addToast } = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const [customers, setCustomers] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Détail / historique
  const [expandedId, setExpandedId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState({ stats: null, purchases: [], credit: null })

  const fetchCustomers = useCallback(async (query = '') => {
    try {
      setLoading(true)
      const response = await apiClient.get('/customers/', {
        params: {
          name: query.trim() || undefined,
          limit: 100,
        },
      })
      const data = response.data
      setCustomers(Array.isArray(data) ? data : data?.customers || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les clients',
      })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchCustomers])

  const loadDetail = async (customerId) => {
    setDetailLoading(true)
    try {
      const [statsRes, purchasesRes, creditRes] = await Promise.all([
        apiClient.get(`/customers/${customerId}/stats`),
        apiClient.get(`/customers/${customerId}/purchases`),
        apiClient.get(`/customers/${customerId}/credit`),
      ])
      setDetail({
        stats: statsRes.data || null,
        purchases: Array.isArray(purchasesRes.data) ? purchasesRes.data : [],
        credit: creditRes.data || null,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: "Impossible de charger l'historique du client",
      })
      setDetail({ stats: null, purchases: [], credit: null })
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleDetail = (customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(customer.id)
    loadDetail(customer.id)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const openNewDialog = () => {
    setCurrentCustomer(null)
    setFormData(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const openEditDialog = (customer) => {
    setCurrentCustomer(customer)
    setFormData({
      name: customer.name || '',
      contact: customer.contact || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || 'Bénin',
      tax_id: customer.tax_id || '',
      loyalty_points: customer.loyalty_points || 0,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (customer) => {
    setCurrentCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        country: formData.country.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        loyalty_points: Number(formData.loyalty_points) || 0,
      }

      if (currentCustomer) {
        await apiClient.put(`/customers/${currentCustomer.id}`, payload)
        addToast({
          type: 'success',
          title: 'Client mis à jour',
          message: `${payload.name} a été modifié`,
        })
      } else {
        await apiClient.post('/customers/', payload)
        addToast({
          type: 'success',
          title: 'Client enregistré',
          message: `${payload.name} a été ajouté`,
        })
      }

      setIsDialogOpen(false)
      fetchCustomers(searchQuery)
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Erreur',
        message: typeof detail === 'string' ? detail : "Impossible d'enregistrer le client",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!currentCustomer) return
    setDeleting(true)
    try {
      await apiClient.delete(`/customers/${currentCustomer.id}`)
      addToast({
        type: 'success',
        title: 'Client supprimé',
        message: `${currentCustomer.name} a été supprimé`,
      })
      setIsDeleteDialogOpen(false)
      if (expandedId === currentCustomer.id) setExpandedId(null)
      fetchCustomers(searchQuery)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de supprimer le client',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary-600" />
                Clients
              </CardTitle>
              <CardDescription>
                Historique d'achats, solde de crédit et achats à crédit de chaque client.
              </CardDescription>
            </div>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clients ({customers.length})</CardTitle>
          <CardDescription>
            Cliquez sur un client pour afficher son historique, son crédit et ses achats à crédit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              <UserRound className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>Aucun client trouvé.</p>
              <p className="text-sm">Commencez par enregistrer un client.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => {
                      const isExpanded = expandedId === customer.id
                      return (
                        <React.Fragment key={customer.id}>
                          <TableRow
                            className={cn('cursor-pointer', isExpanded && 'bg-primary-500/[0.06]')}
                            onClick={() => toggleDetail(customer)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-primary-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                                )}
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  {customer.contact && (
                                    <p className="text-xs text-gray-500">Contact : {customer.contact}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{customer.phone || '—'}</TableCell>
                            <TableCell>{customer.email || '—'}</TableCell>
                            <TableCell>{customer.city || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{customer.loyalty_points || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div
                                className="flex justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canManage && (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(customer)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteDialog(customer)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {!canManage && (
                                  <span className="text-xs text-gray-400">Lecture</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-black/[0.015] hover:bg-black/[0.015] dark:bg-white/[0.02]">
                              <TableCell colSpan={6} className="p-0">
                                <CustomerDetail
                                  customer={customer}
                                  detail={detail}
                                  loading={detailLoading}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{currentCustomer ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Nom complet du client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Personne de contact</Label>
                <Input
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="Contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Numéro de téléphone"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Adresse email"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Adresse complète"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Ville"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Pays"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Numéro fiscal</Label>
                <Input
                  id="tax_id"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                  placeholder="NIF / IFU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loyalty_points">Points de fidélité</Label>
                <Input
                  id="loyalty_points"
                  name="loyalty_points"
                  type="number"
                  min="0"
                  value={formData.loyalty_points}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </p>
            {currentCustomer && (
              <div className="mt-4 rounded-lg bg-black/[0.04] p-3 dark:bg-white/[0.06]">
                <p className="font-medium">{currentCustomer.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {currentCustomer.phone || '—'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CustomerDetail({ customer, detail, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const stats = detail.stats
  const credit = detail.credit
  const purchases = detail.purchases || []
  const creditPurchases = credit?.credit_purchases || []

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Coordonnées + synthèse */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-primary-600" />
            {customer.name}
          </p>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {customer.phone && (
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {customer.phone}
              </p>
            )}
            {customer.email && (
              <p className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {customer.email}
              </p>
            )}
            {(customer.address || customer.city) && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {[customer.address, customer.city].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.05]">
              <p className="text-gray-500">Achats</p>
              <p className="font-semibold">{stats?.purchase_count ?? 0}</p>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.05]">
              <p className="text-gray-500">Total acheté</p>
              <p className="font-semibold">{formatCurrency(stats?.total_purchases ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Solde de crédit */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.08] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <Wallet className="h-4 w-4" />
            Solde de crédit
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formatCurrency(credit?.credit_balance ?? 0)}
          </p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
            {credit?.credit_purchases_count ?? 0} achat(s) à crédit ·{' '}
            {credit?.paid_purchases_count ?? 0} réglé(s)
          </p>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Total réglé : {formatCurrency(credit?.total_paid ?? stats?.total_paid ?? 0)}
          </p>
        </div>

        {/* Dernières dates */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-primary-600" />
            Dernières informations
          </p>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <p>
              <span className="text-gray-500">Dernier achat :</span>{' '}
              {stats?.last_purchase_date ? formatDate(stats.last_purchase_date) : '—'}
            </p>
            <p>
              <span className="text-gray-500">Premier achat :</span>{' '}
              {stats?.first_purchase_date ? formatDate(stats.first_purchase_date) : '—'}
            </p>
            <p>
              <span className="text-gray-500">Panier moyen :</span>{' '}
              {formatCurrency(stats?.avg_purchase_value ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Historique d'achats */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-primary-600" />
            Historique d'achats ({purchases.length})
          </p>
          {purchases.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-500">Aucun achat enregistré.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg bg-black/[0.03] p-2 text-xs dark:bg-white/[0.05]"
                >
                  <div>
                    <p className="font-medium">
                      {purchase.sale_number || `Vente #${purchase.id}`}
                    </p>
                    <p className="text-gray-500">
                      {formatDate(purchase.date)} · {purchase.items?.length || 0} article(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(purchase.total)}</p>
                    <Badge variant={statusVariant(purchase.status)}>
                      {STATUS_LABELS[purchase.status] || purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achats à crédit */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-amber-600" />
            Achats à crédit ({creditPurchases.length})
          </p>
          {creditPurchases.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-500">Aucun achat à crédit.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {creditPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg bg-amber-500/[0.08] p-2 text-xs"
                >
                  <div>
                    <p className="font-medium">
                      {purchase.sale_number || `Vente #${purchase.id}`}
                    </p>
                    <p className="text-gray-500">
                      {formatDate(purchase.date)} · {purchase.items_count} article(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                      {formatCurrency(purchase.total)}
                    </p>
                    <Badge variant={statusVariant(purchase.status)}>
                      {STATUS_LABELS[purchase.status] || purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomersPage

a/frontend/src/pages/CashierPage.jsx b/frontend/src/pages/CashierPage.jsx
++ b/frontend/src/pages/CashierPage.jsx
import React, { useState, useEffect, useMemo } from 'react'
import { CreditCard, Clock, Check, X, ShoppingCart, User, Printer, Wifi, WifiOff, Banknote, Phone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../services/api'
import Modal from '../components/common/Modal'

/**
 * Cashier Page — refonte « Menthe & Sable »
 * File d'attente priorisée par temps d'attente, encaissement clavier d'abord,
 * billets rapides, décomposition de la monnaie, reçu ticket.
 * FRNT-006 : session caisse. (Contrats API/WebSocket inchangés :
 * GET /sales?status=pending, POST /sales/{id}/pay, sendPaymentValidated.)
 */

const fmt = (amount) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA'

const BILLS = [500, 1000, 2000, 5000, 10000]
const DENOMINATIONS = [10000, 5000, 2000, 1000, 500]

/** Décompose un montant de monnaie par dénomination FCFA. */
const breakdownChange = (change) => {
  let rest = Math.round(change || 0)
  return DENOMINATIONS.map((d) => {
    const count = Math.floor(rest / d)
    rest -= count * d
    return { denom: d, count }
  }).filter((b) => b.count > 0)
}

/** Modes de paiement — MTN/Moov sont visuels, les deux envoient `payment_method: 'mobile'`. */
const PAYMENT_METHODS = [
  { key: 'cash', value: 'cash', label: 'Espèces', icon: Banknote, activeCls: 'border-teal-600 bg-teal-50 text-teal-800', ringCls: 'ring-teal-200' },
  { key: 'card', value: 'card', label: 'Carte', icon: CreditCard, activeCls: 'border-stone-900 bg-stone-100 text-stone-900', ringCls: 'ring-stone-300' },
  { key: 'mtn', value: 'mobile', label: 'MTN MoMo', operator: 'MTN MoMo', icon: Phone, activeCls: 'border-yellow-400 bg-yellow-50 text-yellow-800', ringCls: 'ring-yellow-300' },
  { key: 'moov', value: 'mobile', label: 'Moov Money', operator: 'Moov Money', icon: Phone, activeCls: 'border-sky-500 bg-sky-50 text-sky-800', ringCls: 'ring-sky-300' },
]

function CashierPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isConnected, isConnecting, queueItems, lastMessage, sendPaymentValidated } = useWebSocket()

  const [pendingSales, setPendingSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentMethodKey, setPaymentMethodKey] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [sessionEarnings, setSessionEarnings] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [, setTick] = useState(0)

  // Horloge légère : rafraîchit les temps d'attente toutes les 30 s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // Sync queue items with pending sales — inchangé
  useEffect(() => {
    if (queueItems.length > 0) {
      setPendingSales(queueItems)
    }
  }, [queueItems])

  // Fetch pending sales on mount and when WebSocket is not connected — inchangé
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      fetchPendingSales()

      const interval = setInterval(fetchPendingSales, 5000)
      return () => clearInterval(interval)
    }
    }
  }

  // Process payment — payload EXACT inchangé
  const handleProcessPayment = async () => {
    if (!selectedSale) return

    const paidAmount = parseFloat(amountPaid) || 0
    const totalAmount = selectedSale.total_amount || 0

    if (paidAmount < totalAmount) {
      addToast({
        type: 'error',
        title: 'Montant insuffisant',
        message: `Le montant payé doit être au moins ${fmt(totalAmount)}`
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post(`/api/v1/sales/${selectedSale.id}/pay`, {
        payment_method: paymentMethod,
        change: paidAmount - totalAmount,
        cashier_id: user?.id
      })

      setReceipt(response.data)
      setShowPaymentModal(false)
      setShowReceipt(true)
      setSessionEarnings((s) => s + (selectedSale.total_amount || 0))
      setSessionCount((c) => c + 1)
      setAmountPaid('')
      setPaymentMethod('cash')
      setPaymentMethodKey('cash')

      setPendingSales(pendingSales.filter(s => s.id !== selectedSale.id))
      setSelectedSale(null)

      sendPaymentValidated({
        sale_id: selectedSale.id,
        sale_number: selectedSale.sale_number || `SALE-${selectedSale.id}`
      })

      addToast({
        type: 'success',
        title: 'Paiement validé',
    }
  }

  const handleSelectSale = (sale) => {
    setSelectedSale(sale)
    setAmountPaid('')
    setPaymentMethod('cash')
    setPaymentMethodKey('cash')
    setShowPaymentModal(true)
  }

  const calculateChange = () => {
    const paid = parseFloat(amountPaid) || 0
    const total = selectedSale?.total_amount || 0
    return paid - total
  }

  /** Minutes d'attente d'une vente en file. */
  const waitMinutes = (sale) => {
    if (!sale.created_at) return 0
    return Math.max(0, Math.floor((Date.now() - new Date(sale.created_at).getTime()) / 60000))
  }

  const sortedQueue = useMemo(
    () => [...pendingSales].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
    [pendingSales]
  )

  const changeBreakdown = breakdownChange(Math.max(0, calculateChange()))

  const currentMethod = PAYMENT_METHODS.find((m) => m.key === paymentMethodKey) || PAYMENT_METHODS[0]

  return (
    <div className="space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ============ En-tête ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Caisse</h1>
          <p className="mt-0.5 text-sm text-stone-500">Encaissez les ventes envoyées depuis le point de vente.</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : isConnecting
                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                  : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? 'Temps réel' : isConnecting ? 'Connexion…' : 'Déconnecté'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">
            <User className="h-3.5 w-3.5" /> {user?.username || 'Caissier'}
          </span>
        </div>
      </div>

      {/* ============ Écran partagé ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        {/* ---------- File d'attente ---------- */}
        <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">File d'attente</h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
              {pendingSales.length} en attente
            </span>
          </div>

          {sortedQueue.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-stone-300" />
              <p className="mt-3 text-sm font-bold text-stone-700">Aucune vente en attente</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-stone-400">
                Les ventes apparaîtront ici dès qu'elles seront envoyées depuis le point de vente.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sortedQueue.map((sale, index) => {
                const wait = waitMinutes(sale)
                const urgent = wait >= 10
                const soon = wait >= 5 && !urgent
                return (
                  <li
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm"
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ring-1 ${
                        index === 0
                          ? 'bg-teal-600 text-white ring-teal-600'
                          : 'bg-stone-100 text-stone-500 ring-stone-200'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-stone-900">Vente #{sale.id}</p>
                        <span className="text-[11px] text-stone-400">{sale.items?.length || 0} article(s)</span>
                        {urgent && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                            Priorité · {wait} min
                          </span>
                        )}
                        {soon && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                            {wait} min
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-400">
                        <Clock className="h-3 w-3" />
                        {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        · dans la file depuis {wait} min
                        {sale.user?.username ? ` · ${sale.user.username}` : ''}
                      </p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-extrabold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                        {fmt(sale.total_amount)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectSale(sale)
                      }}
                      className="flex-shrink-0 !text-teal-700"
                    >
                      <Check className="w-4 h-4" />
                      Traiter
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ---------- Panneau session sticky ---------- */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900">Ma session</h2>
            <p className="mt-0.5 text-[11px] text-stone-400">Depuis l'ouverture de la caisse</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-100">
                <p className="text-[11px] font-semibold text-teal-700">Encaissé</p>
                <p className="mt-0.5 text-xl font-extrabold text-teal-800" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt(sessionEarnings)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <p className="text-[10px] font-semibold text-stone-400">Traitées</p>
                  <p className="mt-0.5 text-lg font-extrabold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                    {sessionCount}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <p className="text-[10px] font-semibold text-amber-700">En file</p>
                  <p className="mt-0.5 text-lg font-extrabold text-amber-800" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                    {pendingSales.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-stone-100 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
                {isConnected
                  ? 'Mises à jour WebSocket en temps réel'
                  : 'Recherche de nouvelles ventes toutes les 5 s'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Modale de paiement ============ */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setAmountPaid('')
          setPaymentMethod('cash')
          setPaymentMethodKey('cash')
        }}
        title={`Paiement — Vente #${selectedSale?.id}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
              variant="primary"
              onClick={handleProcessPayment}
              isLoading={isLoading}
              disabled={!amountPaid || calculateChange() < 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Valider le paiement
      >
        {selectedSale && (
          <div className="space-y-4">
            {/* Récapitulatif */}
            <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-stone-400">{selectedSale.items?.length || 0} article(s)</p>
                  <p className="text-xs text-stone-400">
                    {currentMethod.operator ? `${currentMethod.operator}` : currentMethod.label} à encaisser
                  </p>
                </div>
                <p className="text-2xl font-extrabold text-stone-900" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                  {fmt(selectedSale.total_amount)}
                </p>
              </div>
            </div>

            {/* Mode de paiement */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Mode de paiement</h3>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethodKey === m.key
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        setPaymentMethodKey(m.key)
                        setPaymentMethod(m.value)
                      }}
                      className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2.5 text-sm font-semibold transition ${
                        active ? m.activeCls : 'border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  )
                })}
              </div>
              {paymentMethodKey === 'mtn' || paymentMethodKey === 'moov' ? (
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Confirmez le paiement sur le téléphone du client, puis validez.
                </p>
              ) : null}
            </div>

            {/* Montant reçu */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">
                Montant reçu (FCFA)
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-lg font-bold text-stone-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              />

              {/* Billets rapides */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {BILLS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setAmountPaid(String((parseFloat(amountPaid) || 0) + b))}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-bold text-stone-600 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
                    style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                  >
                    +{new Intl.NumberFormat('fr-FR').format(b)}
                  </button>
                ))}
                <button
                  onClick={() => setAmountPaid(String(selectedSale.total_amount || 0))}
                  className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700"
                >
                  Montant exact
                </button>
              </div>

              {/* Monnaie + décomposition */}
              {amountPaid && (
                <div className="mt-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">Monnaie à rendre</span>
                    <span
                      className={`font-extrabold ${calculateChange() >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                    >
                      {fmt(calculateChange())}
                    </span>
                  </div>
                  {changeBreakdown.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-stone-200 pt-2">
                      <span className="text-[10px] font-semibold text-stone-400">Rendre :</span>
                      {changeBreakdown.map((b) => (
                        <span
                          key={b.denom}
                          className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600 ring-1 ring-stone-200"
                        >
                          {b.count} × {new Intl.NumberFormat('fr-FR').format(b.denom)}
                        </span>
                      ))}
                    </div>
                  )}
                  {calculateChange() < 0 && (
                    <p className="mt-1.5 text-[11px] font-semibold text-rose-500">
                      Il manque {fmt(-calculateChange())}.
                    </p>
                  )}
                </div>
              )}
            </div>
        )}
      </Modal>

      {/* ============ Reçu ============ */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        }
      >
        {receipt && (
          <div
            className="mx-auto max-w-sm rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5"
            style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
          >
            <div className="text-center">
              <h2 className="text-base font-bold tracking-widest text-stone-900">PHARMACIE 360</h2>
              <p className="mt-1 text-[11px] text-stone-400">Reçu de vente</p>
              <p className="mt-1 text-[11px] text-stone-400">{new Date().toLocaleString('fr-FR')}</p>
            </div>

            <div className="my-3 border-t border-dashed border-stone-300" />

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
              <span className="text-stone-400">Vente #</span>
              <span className="text-right font-semibold text-stone-900">{receipt.sale_id}</span>
              <span className="text-stone-400">Caissier</span>
              <span className="text-right font-semibold text-stone-900">{user?.username}</span>
              <span className="text-stone-400">Paiement</span>
              <span className="text-right font-semibold capitalize text-stone-900">{receipt.payment_method}</span>
              <span className="text-stone-400">Client</span>
              <span className="text-right font-semibold text-stone-900">Client</span>
            </div>

            <div className="my-3 border-t border-dashed border-stone-300" />

            <div className="space-y-1.5">
              {(receipt.items || []).map((item, index) => (
                <div key={index} className="text-[12px]">
                  <div className="flex justify-between">
                    <span className="truncate pr-2 font-semibold text-stone-900">{item.product_name}</span>
                    <span className="text-stone-900">{fmt(item.quantity * item.unit_price)}</span>
                  </div>
                  <p className="text-right text-[10px] text-stone-400">
                    {item.quantity} × {fmt(item.unit_price)}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-stone-300" />

            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-stone-400">Sous-total</span>
                <span className="text-stone-900">{fmt(receipt.subtotal || receipt.total_amount)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Remise</span>
                  <span className="text-rose-600">-{fmt(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold">
                <span className="text-stone-900">TOTAL</span>
                <span className="text-stone-900">{fmt(receipt.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Payé</span>
                <span className="text-stone-900">{fmt(receipt.amount_paid)}</span>
              </div>
              {receipt.change > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Monnaie</span>
                  <span className="font-semibold text-emerald-600">{fmt(receipt.change)}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-dashed border-stone-300" />

            <div className="text-center text-[10px] leading-relaxed text-stone-400">
              <p>Merci de votre confiance !</p>
              <p>Pharmacie 360 — Tous droits réservés</p>
            </div>
          </div>
        )}
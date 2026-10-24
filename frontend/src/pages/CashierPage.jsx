import React, { useState, useEffect } from 'react'
import { CreditCard, Clock, Check, X, ShoppingCart, User, Printer, FileText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'

/**
 * Cashier Page for Pharmacie 360
 * Point of sale cashier interface for processing payments
 * 
 * FRNT-006: Session Caisse (File d'attente + encaissement)
 */
function CashierPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [pendingSales, setPendingSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState(null)

  // Fetch pending sales
  useEffect(() => {
    fetchPendingSales()
    
    // Poll for new sales
    const interval = setInterval(fetchPendingSales, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchPendingSales = async () => {
    try {
      const response = await api.get('/sales', {
        params: { status: 'pending', limit: 10 }
      })
      setPendingSales(response.data.sales || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  // Process payment
  const handleProcessPayment = async () => {
    if (!selectedSale) return
    
    const paidAmount = parseFloat(amountPaid) || 0
    const totalAmount = selectedSale.total_amount || 0
    
    if (paidAmount < totalAmount) {
      addToast({
        type: 'error',
        title: 'Montant insuffisant',
        message: `Le montant payé doit être au moins ${totalAmount} XOF`
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await api.post(`/sales/${selectedSale.id}/pay`, {
        payment_method: paymentMethod,
        amount_paid: paidAmount,
        change: paidAmount - totalAmount,
        cashier_id: user?.id
      })
      
      setReceipt(response.data)
      setShowPaymentModal(false)
      setShowReceipt(true)
      setAmountPaid('')
      setPaymentMethod('cash')
      
      // Remove from pending list
      setPendingSales(pendingSales.filter(s => s.id !== selectedSale.id))
      setSelectedSale(null)
      
      addToast({
        type: 'success',
        title: 'Paiement validé',
        message: `Vente #${selectedSale.id} payée avec succès`
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de paiement',
        message: 'Impossible de valider le paiement'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Select sale to process
  const handleSelectSale = (sale) => {
    setSelectedSale(sale)
    setShowPaymentModal(true)
  }

  // Calculate change
  const calculateChange = () => {
    const paid = parseFloat(amountPaid) || 0
    const total = selectedSale?.total_amount || 0
    return paid - total
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0)
  }

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Caisse
          </h1>
          <p className="text-gray-500 mt-1">
            Gestion des paiements et encaissements
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Caissier: {user?.username}
          </span>
        </div>
      </div>

      {/* Queue Display */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            File d'attente
          </h2>
          <span className="text-sm text-gray-500">
            {pendingSales.length} vente(s) en attente
          </span>
        </div>
        
        {pendingSales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingCart className="mx-auto w-16 h-16 mb-4" />
            <p className="text-lg">Aucune vente en attente</p>
            <p className="text-sm mt-2">
              Les ventes apparaitront ici lorsqu'elles seront envoyées depuis le point de vente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSales.map((sale, index) => (
              <div
                key={sale.id}
                onClick={() => handleSelectSale(sale)}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">#{index + 1}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      Vente #{sale.id}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {sale.items?.length || 0} produit(s)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(sale.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {sale.user?.username || 'Utilisateur'}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(sale.total_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Total
                  </p>
                </div>
                
                <Button variant="ghost" size="sm" onClick={(e) => {
                  e.stopPropagation()
                  handleSelectSale(sale)
                }}>
                  <Check className="w-4 h-4" />
                  Traiter
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-sm text-gray-500">Aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">0 XOF</p>
          <p className="text-xs text-gray-500 mt-1">Chiffre d'affaires</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-success-600" />
          </div>
          <p className="text-sm text-gray-500">Aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500 mt-1">Ventes traitées</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-warning-600" />
          </div>
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-gray-900">{pendingSales.length}</p>
          <p className="text-xs text-gray-500 mt-1">Ventes en file</p>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setAmountPaid('')
          setPaymentMethod('cash')
        }}
        title={`Paiement - Vente #${selectedSale?.id}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleProcessPayment}
              isLoading={isLoading}
              disabled={!amountPaid}
            >
              <Check className="w-4 h-4 mr-2" />
              Valider le paiement
            </Button>
          </div>
        }
      >
        {selectedSale && (
          <div className="space-y-4">
            {/* Sale Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Récapitulatif
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Produits:</span>
                  <span>{selectedSale.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium">{formatCurrency(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Mode de paiement
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'primary' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="justify-start"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Espèces
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'primary' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="justify-start"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Carte
                </Button>
                <Button
                  variant={paymentMethod === 'mobile' ? 'primary' : 'outline'}
                  onClick={() => setPaymentMethod('mobile')}
                  className="justify-start col-span-2"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Mobile Money
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant reçu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  XOF
                </span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {/* Change */}
              {amountPaid && selectedSale && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monnaie:</span>
                    <span className={calculateChange() >= 0 ? 'text-success-600' : 'text-danger-600'}>
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Reçu de paiement"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              Fermer
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        }
      >
        {receipt && (
          <div className="space-y-4">
            {/* Receipt Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                PHARMACIE 360
              </h2>
              <p className="text-sm text-gray-500">
                Reçu de vente
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date().toLocaleString('fr-FR')}
              </p>
            </div>

            {/* Receipt Details */}
            <div className="border-t border-b border-gray-200 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Vente #</p>
                  <p className="font-medium">{receipt.sale_id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Caissier</p>
                  <p className="font-medium">{user?.username}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mode de paiement</p>
                  <p className="font-medium capitalize">{receipt.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">Client</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Articles
              </h3>
              <div className="space-y-2 text-sm">
                {receipt.items?.map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Sous-total:</span>
                <span>{formatCurrency(receipt.subtotal || receipt.total_amount)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Remise:</span>
                  <span className="text-danger-600">-{formatCurrency(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-medium">
                <span>Total:</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
              {receipt.change > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Monnaie:</span>
                  <span className="text-success-600">{formatCurrency(receipt.change)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-bold text-lg">
                <span>Montant payé:</span>
                <span>{formatCurrency(receipt.amount_paid)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              <p>Merci de votre confiance !</p>
              <p className="mt-1">Pharmacie 360 - Tous droits réservés</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CashierPage

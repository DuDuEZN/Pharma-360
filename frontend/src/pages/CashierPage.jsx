import React, { useState, useEffect, useCallback } from 'react'
import { CreditCard, Clock, Check, X, ShoppingCart, User, Printer, FileText, Wifi, WifiOff, DollarSign, CreditCard as CreditCardIcon, Banknote, Receipt, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useDisclosure } from '../hooks/useDisclosure'
import api from '../services/api'
import { useToast } from '../components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Separator } from '../components/ui/Separator'
import { Skeleton } from '../components/ui/Skeleton'
import { Alert } from '../components/ui/Alert'
import { cn, formatCurrency, formatDate } from '../lib/utils'

/**
 * Cashier Page for Pharma 360
 * Point of sale cashier interface for processing payments
 * 
 * FRNT-006: Session Caisse (File d'attente + encaissement)
 */
function CashierPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { 
    isConnected, 
    isConnecting, 
    messages: queueMessages,
    send 
  } = useWebSocket()
  
  const [pendingSales, setPendingSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const {
    isOpen: isPaymentModalOpen,
    onOpen: openPaymentModal,
    onClose: closePaymentModal
  } = useDisclosure()

  const {
    isOpen: isReceiptModalOpen,
    onOpen: openReceiptModal,
    onClose: closeReceiptModal
  } = useDisclosure()

  const paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: Banknote },
    { value: 'card', label: 'Carte', icon: CreditCardIcon },
    { value: 'mobile', label: 'Mobile Money', icon: DollarSign },
  ]

  // Parse queue messages to get pending sales
  useEffect(() => {
    const salesFromMessages = queueMessages
      .filter(msg => msg.type === 'sale' && msg.content?.status === 'pending')
      .map(msg => msg.content)
    
    if (salesFromMessages.length > 0) {
      setPendingSales(prev => {
        // Merge with existing, avoiding duplicates
        const newSales = salesFromMessages.filter(
          newSale => !prev.some(existing => existing.id === newSale.id)
        )
        return [...prev, ...newSales]
      })
    }
  }, [queueMessages])

  // Fetch pending sales on mount and when WebSocket is not connected
  useEffect(() => {
    fetchPendingSales()
    
    if (!isConnected && !isConnecting) {
      // Poll for new sales when WebSocket is not connected
      const interval = setInterval(fetchPendingSales, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected, isConnecting])

  const fetchPendingSales = async () => {
    try {
      const response = await api.get('/sales', {
        params: { status: 'pending', limit: 20 }
      })
      setPendingSales(response.data.sales || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les ventes en attente'
      })
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
        message: `Le montant payé doit être au moins ${formatCurrency(totalAmount)}`
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
      closePaymentModal()
      openReceiptModal()
      setAmountPaid('')
      setPaymentMethod('cash')
      
      // Remove from pending list
      setPendingSales(pendingSales.filter(s => s.id !== selectedSale.id))
      setSelectedSale(null)
      
      // Send WebSocket notification
      send({
        type: 'payment_validated',
        sale_id: selectedSale.id,
        sale_number: selectedSale.sale_number || `SALE-${selectedSale.id}`,
        amount: paidAmount,
        cashier: user?.username
      })
      
      addToast({
        type: 'success',
        title: 'Paiement validé',
        message: `Vente ${selectedSale.sale_number || selectedSale.id} - ${formatCurrency(paidAmount)}`
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de paiement',
        message: error.response?.data?.message || 'Impossible de traiter le paiement'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSale = (sale) => {
    setSelectedSale(sale)
    openPaymentModal()
  }

  const handlePrintReceipt = useCallback(async () => {
    if (!receipt) return
    
    setIsPrinting(true)
    try {
      // In a real application, this would trigger the actual printer
      // For now, we'll simulate the print action
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      addToast({
        type: 'success',
        title: 'Ticket imprimé',
        message: `Ticket de caisse #${receipt.sale_number} imprimé`
      })
      
      // Close the receipt modal after printing
      closeReceiptModal()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur d'impression',
        message: 'Impossible d\'imprimer le ticket'
      })
    } finally {
      setIsPrinting(false)
    }
  }, [receipt, addToast, closeReceiptModal])

  const calculateChange = () => {
    const paidAmount = parseFloat(amountPaid) || 0
    const totalAmount = selectedSale?.total_amount || 0
    return paidAmount - totalAmount
  }

  const connectionStatus = {
    connected: {
      icon: Wifi,
      color: 'success',
      text: 'Connecté en temps réel'
    },
    connecting: {
      icon: Wifi,
      color: 'warning',
      text: 'Connexion en cours...'
    },
    disconnected: {
      icon: WifiOff,
      color: 'danger',
      text: 'Mode hors ligne (rafraîchissement toutes les 5s)'
    }
  }

  const getStatusConfig = () => {
    if (isConnecting) return connectionStatus.connecting
    if (isConnected) return connectionStatus.connected
    return connectionStatus.disconnected
  }

  const statusConfig = getStatusConfig()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Session Caisse</CardTitle>
          <CardDescription>
            File d'attente des ventes et encaissement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert
            variant={statusConfig.color}
            className="flex items-center gap-3"
          >
            <statusConfig.icon className="w-5 h-5" />
            <span>{statusConfig.text}</span>
          </Alert>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Sales Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ventes en Attente ({pendingSales.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingSales}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Rafraîchir
            </Button>
          </CardHeader>
          <CardContent>
            {pendingSales.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucune vente en attente</p>
                <p className="text-sm text-gray-400 mt-2">
                  Les ventes apparaîtront ici lorsqu'elles seront envoyées
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Vente</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSelectSale(sale)}
                    >
                      <TableCell>
                        <Badge variant="primary" className="font-mono">
                          {sale.sale_number || `SALE-${sale.id}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(sale.created_at || sale.date)}
                      </TableCell>
                      <TableCell>
                        {sale.items?.length || sale.product_count || 0}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-primary-600 dark:text-primary-400">
                          {formatCurrency(sale.total_amount || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Encaisser
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Selected Sale Details / Cashier Panel */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSale ? `Vente #${selectedSale.sale_number || selectedSale.id}` : 'Sélectionnez une vente'}
            </CardTitle>
            {selectedSale && (
              <CardDescription>
                {selectedSale.items?.length || 0} produit(s) - {formatCurrency(selectedSale.total_amount || 0)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedSale ? (
              <div className="space-y-4">
                {/* Sale Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Détails de la vente
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{item.product_name || item.name}</span>
                              {item.batch_number && (
                                <span className="text-xs text-gray-500">
                                  Lot: {item.batch_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {formatCurrency(item.unit_price || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sous-total:</span>
                    <span>{formatCurrency(selectedSale.subtotal || selectedSale.total_amount || 0)}</span>
                  </div>
                  {selectedSale.tax_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span>TVA:</span>
                      <span>{formatCurrency(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  {selectedSale.discount_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Remise:</span>
                      <span className="text-danger-600 dark:text-danger-400">
                        -{formatCurrency(selectedSale.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatCurrency(selectedSale.total_amount || 0)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Payment Form */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paiement
                  </h4>
                  
                  <Select
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={paymentMethods.map(method => ({
                      value: method.value,
                      label: method.label,
                      icon: method.icon
                    }))}
                    placeholder="Sélectionnez un mode de paiement"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Montant payé
                      </label>
                      <span className="text-sm text-gray-500">
                        Total: {formatCurrency(selectedSale.total_amount || 0)}
                      </span>
                    </div>
                    <Input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="Montant payé"
                      leftIcon={<Banknote className="w-4 h-4" />}
                    />
                  </div>

                  {amountPaid && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Monnaie à rendre:</span>
                      <span className={cn(
                        calculateChange() >= 0 
                          ? 'text-success-600 dark:text-success-400' 
                          : 'text-danger-600 dark:text-danger-400'
                      )}>
                        {formatCurrency(Math.abs(calculateChange()))}
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleProcessPayment}
                    disabled={isLoading || !amountPaid}
                    isLoading={isLoading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Valider le Paiement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Sélectionnez une vente pour commencer l'encaissement
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            <span>Paiement - Vente #{selectedSale?.sale_number || selectedSale?.id}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {selectedSale && (
            <div className="space-y-4">
              <Alert variant="info" className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Vérifiez le montant avant validation</p>
                  <p className="text-sm">
                    Total à payer: {formatCurrency(selectedSale.total_amount || 0)}
                  </p>
                </div>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Mode de paiement
                </label>
                <Select
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={paymentMethods.map(method => ({
                    value: method.value,
                    label: method.label,
                    icon: method.icon
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Montant payé
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Montant payé"
                  leftIcon={<Banknote className="w-4 h-4" />}
                  rightIcon={amountPaid && (
                    <span className={cn(
                      calculateChange() >= 0 
                        ? 'text-success-600 dark:text-success-400' 
                        : 'text-danger-600 dark:text-danger-400'
                    )}>
                      {formatCurrency(Math.abs(calculateChange()))}
                    </span>
                  )}
                />
              </div>

              {calculateChange() < 0 && (
                <Alert variant="danger" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Le montant payé est insuffisant
                  </span>
                </Alert>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closePaymentModal}>
            Annuler
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={isLoading || calculateChange() < 0}
            isLoading={isLoading}
          >
            <Check className="w-4 h-4 mr-2" />
            Valider
          </Button>
        </ModalFooter>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={closeReceiptModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <span>Ticket de Caisse</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {receipt && (
            <div className="space-y-4">
              {/* Receipt Header */}
              <div className="text-center">
                <h3 className="font-bold text-lg">PHARMACIE 360</h3>
                <p className="text-sm text-gray-500">
                  Ticket de caisse
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(receipt.created_at || new Date())}
                </p>
              </div>

              <Separator />

              {/* Receipt Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">N° Vente:</span>
                  <span className="font-mono text-sm">{receipt.sale_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Caissier:</span>
                  <span className="text-sm">{receipt.cashier || user?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mode de paiement:</span>
                  <span className="text-sm">
                    {paymentMethods.find(m => m.value === receipt.payment_method)?.label || receipt.payment_method}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Produit</TableHead>
                      <TableHead className="text-sm text-center">Qté</TableHead>
                      <TableHead className="text-sm text-right">Prix</TableHead>
                      <TableHead className="text-sm text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{item.product_name || item.name}</span>
                            {item.batch_number && (
                              <span className="text-xs text-gray-500">
                                Lot: {item.batch_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                        <TableCell className="text-sm text-right">
                          {formatCurrency(item.unit_price || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sous-total:</span>
                  <span className="text-sm">{formatCurrency(receipt.subtotal || receipt.total_amount || 0)}</span>
                </div>
                {receipt.tax_amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">TVA:</span>
                    <span className="text-sm">{formatCurrency(receipt.tax_amount)}</span>
                  </div>
                )}
                {receipt.discount_amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Remise:</span>
                    <span className="text-sm text-danger-600 dark:text-danger-400">
                      -{formatCurrency(receipt.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(receipt.total_amount || 0)}</span>
                </div>
                {receipt.change && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monnaie rendue:</span>
                    <span className="text-sm text-success-600 dark:text-success-400">
                      {formatCurrency(receipt.change)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeReceiptModal}>
            Fermer
          </Button>
          <Button
            onClick={handlePrintReceipt}
            isLoading={isPrinting}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default CashierPage

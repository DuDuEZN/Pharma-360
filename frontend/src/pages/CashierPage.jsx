import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, Clock, Check, Printer, Wifi, WifiOff, DollarSign, CreditCard as CreditCardIcon, Banknote, Receipt, ArrowLeft, Barcode, ScanLine, CheckCircle2, Circle, MapPin, Lock, Unlock, Wallet, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useDisclosure } from '@/hooks/useDisclosure'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

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
    lastMessage,
    sendMessage: send
  } = useWebSocket()
  
  const [pendingSales, setPendingSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Contrôle des produits par code-barres avant encaissement
  const [scanCode, setScanCode] = useState('')
  const [scannedByProduct, setScannedByProduct] = useState({})
  const [scanFeedback, setScanFeedback] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const scanInputRef = useRef(null)

  // Session de caisse : ouverture obligatoire avant tout encaissement
  const [cashState, setCashState] = useState({
    session: null,
    has_open_session: false
  })
  const [isCashLoading, setIsCashLoading] = useState(true)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [isOpeningCash, setIsOpeningCash] = useState(false)
  const [isClosingCash, setIsClosingCash] = useState(false)
  const [cashReport, setCashReport] = useState(null)

  const {
    isOpen: isReceiptModalOpen,
    onOpen: openReceiptModal,
    onClose: closeReceiptModal
  } = useDisclosure()

  const {
    isOpen: isCloseCashOpen,
    onOpen: openCloseCashModal,
    onClose: closeCloseCashModal
  } = useDisclosure()

  const {
    isOpen: isCashReportOpen,
    onOpen: openCashReportModal,
    onClose: closeCashReportModal
  } = useDisclosure()

  const paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: Banknote },
    { value: 'card', label: 'Carte', icon: CreditCardIcon },
    { value: 'mobile', label: 'Mobile Money', icon: DollarSign },
  ]

  const getSaleTotal = (sale) => Number(sale?.total ?? sale?.total_amount ?? 0)

  const saleItems = selectedSale?.items || []

  // Quantité attendue par produit (un produit peut apparaître sur plusieurs lots)
  const requiredByProduct = useMemo(() => {
    const map = {}
    saleItems.forEach((item) => {
      const key = String(item.product_id ?? item.id)
      map[key] = (map[key] || 0) + Number(item.quantity || 0)
    })
    return map
  }, [saleItems])

  const totalRequired = useMemo(
    () => Object.values(requiredByProduct).reduce((sum, qty) => sum + qty, 0),
    [requiredByProduct]
  )

  const totalScanned = useMemo(
    () => Object.entries(requiredByProduct).reduce(
      (sum, [key, qty]) => sum + Math.min(scannedByProduct[key] || 0, qty),
      0
    ),
    [requiredByProduct, scannedByProduct]
  )

  // Tous les produits doivent être vérifiés (scan ou validation manuelle)
  const isScanComplete =
    saleItems.length > 0 && totalRequired > 0 && totalScanned >= totalRequired

  const resetScanState = useCallback(() => {
    setScanCode('')
    setScannedByProduct({})
    setScanFeedback(null)
    setLastScanned(null)
  }, [])

  const findSaleItemForCode = useCallback((rawCode) => {
    const code = String(rawCode || '').trim().toLowerCase()
    if (!code) return null

    // Code-barres produit, puis code interne, puis numéro de lot
    const byProductCode = saleItems.find((item) =>
      [item.product_barcode, item.product_code]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === code)
    )
    if (byProductCode) return byProductCode

    return (
      saleItems.find(
        (item) => String(item.batch_number || '').trim().toLowerCase() === code
      ) || null
    )
  }, [saleItems])

  const markProductScanned = useCallback((item, quantityToAdd = 1) => {
    const key = String(item.product_id ?? item.id)
    const required = requiredByProduct[key] || Number(item.quantity || 1)
    const already = scannedByProduct[key] || 0
    const nextCount = Math.min(already + quantityToAdd, required)
    const next = { ...scannedByProduct, [key]: nextCount }

    setScannedByProduct(next)
    setLastScanned({
      name: item.product_name,
      barcode: item.product_barcode || item.product_code || null,
      batchNumber: item.batch_number,
      location: item.batch_location
    })

    const complete = Object.entries(requiredByProduct).every(
      ([productKey, qty]) => (next[productKey] || 0) >= qty
    )
    if (complete) {
      addToast({
        type: 'success',
        title: 'Contrôle terminé',
        message: 'Tous les produits de la vente ont été vérifiés. Vous pouvez encaisser.'
      })
    }

    return { required, nextCount, complete }
  }, [requiredByProduct, scannedByProduct, addToast])

  const handleScanSubmit = (event) => {
    if (event?.preventDefault) event.preventDefault()

    const code = scanCode.trim()
    if (!code) return

    const item = findSaleItemForCode(code)
    if (!item) {
      setScanFeedback({
        type: 'error',
        message: `Code « ${code} » introuvable dans cette vente. Vérifiez le produit scanné.`
      })
      setScanCode('')
      scanInputRef.current?.focus()
      return
    }

    const key = String(item.product_id ?? item.id)
    const required = requiredByProduct[key] || Number(item.quantity || 1)
    if ((scannedByProduct[key] || 0) >= required) {
      setScanFeedback({
        type: 'warning',
        message: `${item.product_name} : quantité déjà contrôlée (${required}/${required}).`
      })
      setScanCode('')
      scanInputRef.current?.focus()
      return
    }

    const result = markProductScanned(item, Math.max(required - (scannedByProduct[key] || 0), 1))
    setScanFeedback({
      type: 'success',
      message: `${item.product_name} validé : ${result.nextCount}/${result.required} unité(s) contrôlée(s).`
    })
    setScanCode('')
    scanInputRef.current?.focus()
  }

  const handleValidateItemManually = (item) => {
    const key = String(item.product_id ?? item.id)
    const required = requiredByProduct[key] || Number(item.quantity || 1)
    const already = scannedByProduct[key] || 0
    const result = markProductScanned(item, Math.max(required - already, 1))
    setScanFeedback({
      type: 'info',
      message: `${item.product_name} : validation manuelle enregistrée (${result.nextCount}/${result.required}).`
    })
  }

  const fetchPendingSales = useCallback(async () => {
    try {
      const response = await api.get('/sales/', {
        params: { status: 'pending', page_size: 50 }
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
  }, [addToast])

  // État de la caisse (session ouverte ou dernière session clôturée)
  const fetchCashState = useCallback(async () => {
    try {
      const response = await api.get('/cash/current')
      setCashState({
        session: response.data.session || null,
        has_open_session: Boolean(response.data.has_open_session)
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Caisse indisponible',
        message: typeof detail === 'string' ? detail : 'Impossible de charger l\'état de la caisse'
      })
    } finally {
      setIsCashLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchCashState()
  }, [fetchCashState])

  // Chargement initial de la file d'attente
  useEffect(() => {
    fetchPendingSales()
  }, [fetchPendingSales])

  // Rafraîchissement périodique lorsque le WebSocket n'est pas disponible
  useEffect(() => {
    if (isConnected || isConnecting) return undefined

    const interval = setInterval(fetchPendingSales, 5000)
    return () => clearInterval(interval)
  }, [isConnected, isConnecting, fetchPendingSales])

  // Une nouvelle vente reçue en temps réel rafraîchit la file
  useEffect(() => {
    if (lastMessage) fetchPendingSales()
  }, [lastMessage, fetchPendingSales])

  // Ouvre la caisse avec le fonds initial saisi
  const handleOpenCash = async () => {
    const amount = parseFloat(openingAmount)
    if (openingAmount === '' || Number.isNaN(amount) || amount < 0) {
      addToast({
        type: 'error',
        title: 'Fonds initial requis',
        message: 'Saisissez le fonds de caisse initial avant d\'ouvrir la caisse.'
      })
      return
    }

    setIsOpeningCash(true)
    try {
      const response = await api.post('/cash/open', { opening_amount: amount })
      setCashState({ session: response.data, has_open_session: true })
      setOpeningAmount('')
      addToast({
        type: 'success',
        title: 'Caisse ouverte',
        message: `Fonds initial : ${formatCurrency(amount)}`
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Ouverture impossible',
        message: typeof detail === 'string' ? detail : 'Impossible d\'ouvrir la caisse'
      })
    } finally {
      setIsOpeningCash(false)
    }
  }

  const handleOpenCloseCashModal = async () => {
    setClosingAmount('')
    await fetchCashState()
    openCloseCashModal()
  }

  // Clôture : le caissier saisit uniquement le montant compté
  const handleCloseCash = async () => {
    const amount = parseFloat(closingAmount)
    if (closingAmount === '' || Number.isNaN(amount) || amount < 0) {
      addToast({
        type: 'error',
        title: 'Montant compté requis',
        message: 'Saisissez le montant final réellement compté en caisse.'
      })
      return
    }

    setIsClosingCash(true)
    try {
      const response = await api.post('/cash/close', { closing_amount: amount })
      setCashReport(response.data)
      setCashState({ session: response.data, has_open_session: false })
      setClosingAmount('')
      closeCloseCashModal()
      openCashReportModal()
      addToast({
        type: 'success',
        title: 'Caisse clôturée',
        message: `Rapport généré à ${formatDateTime(response.data.closing_at)}`
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Clôture impossible',
        message: typeof detail === 'string' ? detail : 'Impossible de clôturer la caisse'
      })
    } finally {
      setIsClosingCash(false)
    }
  }

  // Process payment
  const handleProcessPayment = async () => {
    if (!selectedSale) return

    if (!hasOpenCashSession) {
      addToast({
        type: 'warning',
        title: 'Caisse fermée',
        message: 'Ouvrez la caisse avec un fonds initial avant d\'encaisser une vente.'
      })
      return
    }

    if (saleItems.length === 0) {
      addToast({
        type: 'error',
        title: 'Détail indisponible',
        message: 'Impossible de contrôler les produits de cette vente. Réessayez ou reconnectez-vous.'
      })
      return
    }

    if (!isScanComplete) {
      addToast({
        type: 'warning',
        title: 'Contrôle incomplet',
        message: 'Scannez le code-barres de chaque produit avant de valider le paiement.'
      })
      scanInputRef.current?.focus()
      return
    }
    
    const paidAmount = parseFloat(amountPaid) || 0
    const totalAmount = getSaleTotal(selectedSale)
    
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
      // L'API n'accepte que le mode de paiement et une référence.
      const response = await api.post(`/sales/${selectedSale.id}/pay`, {
        payment_method: paymentMethod,
        payment_reference: null
      })
      const payload = response.data || {}

      if (payload.success === false) {
        addToast({
          type: 'error',
          title: 'Paiement refusé',
          message: payload.error || 'Impossible de valider le paiement'
        })
        return
      }

      // La réponse ne contient pas les lignes : on construit le ticket localement.
      const paidSale = {
        ...selectedSale,
        sale_number: payload.sale_number || selectedSale.sale_number,
        payment_method: paymentMethod,
        payment_date: payload.payment_date || new Date().toISOString(),
        cashier: user?.username || user?.full_name,
        amount_paid: paidAmount,
        change: paidAmount - totalAmount,
        subtotal: Number(selectedSale.subtotal ?? totalAmount),
        tax_amount: Number(selectedSale.tax_amount ?? 0),
        discount_amount: Number(selectedSale.discount ?? 0),
        total_amount: totalAmount,
        items: selectedSale.items || []
      }

      setReceipt(paidSale)
      openReceiptModal()
      setAmountPaid('')
      setPaymentMethod('cash')
      resetScanState()
      
      // Remove from pending list
      const paidSaleId = selectedSale.id
      setPendingSales(prev => prev.filter(s => s.id !== paidSaleId))
      setSelectedSale(null)

      // Resynchronise la file et les totaux de caisse (source de vérité).
      fetchPendingSales()
      fetchCashState()
      
      // Send WebSocket notification (format attendu par le backend)
      send({
        type: 'payment_validated',
        data: {
          sale_id: selectedSale.id,
          sale_number: paidSale.sale_number,
          amount: totalAmount,
          cashier: user?.username
        }
      })
      
      addToast({
        type: 'success',
        title: 'Paiement validé',
        message: `Vente ${paidSale.sale_number || selectedSale.id} - ${formatCurrency(totalAmount)}`
      })
    } catch (error) {
      const detail = error.response?.data?.detail
      addToast({
        type: 'error',
        title: 'Erreur de paiement',
        message: typeof detail === 'string' ? detail : 'Impossible de traiter le paiement'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSale = async (sale) => {
    setSelectedSale(sale)
    resetScanState()

    // La liste ne contient pas les lignes d'articles : on charge le détail
    // pour connaître les codes-barres et les rayons à contrôler.
    try {
      const response = await api.get(`/sales/${sale.id}`)
      setSelectedSale(response.data)
      window.setTimeout(() => scanInputRef.current?.focus(), 150)
    } catch (error) {
      addToast({
        type: 'warning',
        title: 'Détail indisponible',
        message: 'Impossible de charger les articles de cette vente : le contrôle par code-barres est indisponible.'
      })
    }
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
        title: 'Erreur d\'impression',
        message: 'Impossible d\'imprimer le ticket'
      })
    } finally {
      setIsPrinting(false)
    }
  }, [receipt, addToast, closeReceiptModal])

  // Impression du rapport de clôture : seule la version imprimable est rendue.
  const handlePrintCashReport = useCallback(() => {
    if (!cashReport) return
    window.print()
  }, [cashReport])

  const calculateChange = () => {
    const paidAmount = parseFloat(amountPaid) || 0
    const totalAmount = getSaleTotal(selectedSale)
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
  const saleTotal = getSaleTotal(selectedSale)

  const cashSession = cashState.session
  const hasOpenCashSession = Boolean(cashState.has_open_session)

  const formatDateTime = (value) => (
    value
      ? new Date(value).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short'
        })
      : '—'
  )

  const countedAmount = parseFloat(closingAmount)
  const countedValid = closingAmount !== '' && !Number.isNaN(countedAmount) && countedAmount >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Session Caisse</CardTitle>
            <CardDescription>
              Ouverture, encaissement et clôture de la caisse
            </CardDescription>
          </div>
          <Badge variant={hasOpenCashSession ? 'success' : 'danger'}>
            {hasOpenCashSession ? 'Caisse ouverte' : 'Caisse fermée'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant={statusConfig.color}
            className="flex items-center gap-3"
          >
            <statusConfig.icon className="w-5 h-5" />
            <span>{statusConfig.text}</span>
          </Alert>

          {isCashLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : hasOpenCashSession && cashSession ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-1 text-sm">
                <p className="font-medium">Session de caisse ouverte</p>
                <p className="text-gray-600 dark:text-gray-400">
                  <Unlock className="w-4 h-4 inline mr-1" />
                  Ouverte le {formatDateTime(cashSession.opening_at)} · Caissier : {cashSession.user_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Les montants de contrôle (fonds initial, ventes théoriques, attendu,
                  écart) figurent uniquement dans le rapport de clôture.
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="danger" onClick={handleOpenCloseCashModal}>
                  <Lock className="w-4 h-4 mr-2" />
                  Clôturer la caisse
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Fonds de caisse initial <span className="text-danger-600">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="Montant en espèces à l'ouverture"
                  leftIcon={<Wallet className="w-4 h-4" />}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Montant réellement présent dans le tiroir-caisse à l'ouverture.
                </p>
                <Button
                  className="w-full"
                  onClick={handleOpenCash}
                  disabled={openingAmount === '' || isOpeningCash}
                  isLoading={isOpeningCash}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Ouvrir la caisse
                </Button>
              </div>

              <div className="space-y-2">
                <Alert variant="warning" className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>
                    L'encaissement est bloqué tant que la caisse n'est pas ouverte.
                  </span>
                </Alert>
                {cashSession && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-2">
                    <p className="font-medium">Dernière session clôturée</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {formatDateTime(cashSession.closing_at)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCashReport(cashSession)
                        openCashReportModal()
                      }}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Voir le rapport
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
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
                        {sale.item_count ?? sale.items?.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-primary-600 dark:text-primary-400">
                          {formatCurrency(getSaleTotal(sale))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasOpenCashSession}
                          title={!hasOpenCashSession ? 'Ouvrez la caisse pour encaisser' : undefined}
                        >
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
                {selectedSale.items?.length || selectedSale.item_count || 0} produit(s) - {formatCurrency(saleTotal)}
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
                      {selectedSale.items?.map((item, index) => {
                        const key = String(item.product_id ?? item.id ?? index)
                        const required = requiredByProduct[key] || Number(item.quantity || 0)
                        const checked = required > 0 && (scannedByProduct[key] || 0) >= required
                        return (
                          <TableRow key={item.id ?? index}>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                {checked ? (
                                  <CheckCircle2 className="w-4 h-4 text-success-600 mt-0.5 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">
                                    {item.product_name || item.name}
                                    {item.sale_unit === 'bulk' && (
                                      <Badge variant="primary" size="xs" className="ml-2">Vrac</Badge>
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Code-barres: {item.product_barcode || '—'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Lot: {item.batch_number || '—'} · Rayon: {item.batch_location || '—'}
                                  </span>
                                </div>
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
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Contrôle des produits par code-barres */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-primary-600" />
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Contrôle des produits
                      </h4>
                    </div>
                    <Badge variant={isScanComplete ? 'success' : 'warning'}>
                      {totalScanned}/{totalRequired}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Scannez ou saisissez le code-barres de chaque produit pour vérifier
                    que les articles sortis correspondent bien à la vente.
                  </p>

                  <form onSubmit={handleScanSubmit} className="flex gap-2">
                    <Input
                      ref={scanInputRef}
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      placeholder="Scanner ou saisir le code-barres..."
                      leftIcon={<Barcode className="w-4 h-4" />}
                      autoComplete="off"
                      autoFocus
                    />
                    <Button type="submit" variant="outline" disabled={!scanCode.trim()}>
                      Valider
                    </Button>
                  </form>

                  {scanFeedback && (
                    <p className={cn(
                      'text-xs',
                      scanFeedback.type === 'error' && 'text-danger-600 dark:text-danger-400',
                      scanFeedback.type === 'warning' && 'text-warning-600 dark:text-warning-400',
                      scanFeedback.type === 'success' && 'text-success-600 dark:text-success-400',
                      scanFeedback.type === 'info' && 'text-primary-600 dark:text-primary-400'
                    )}>
                      {scanFeedback.message}
                    </p>
                  )}

                  {lastScanned && (
                    <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-2 text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Dernier produit :</span> {lastScanned.name}
                      {lastScanned.barcode ? ` · Code-barres: ${lastScanned.barcode}` : ''}
                      {lastScanned.batchNumber ? ` · Lot: ${lastScanned.batchNumber}` : ''}
                      {' · '}
                      <span className="inline-flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3" />
                        Rayon: {lastScanned.location || '—'}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(selectedSale.items || []).map((item, index) => {
                      const key = String(item.product_id ?? item.id ?? index)
                      const required = requiredByProduct[key] || Number(item.quantity || 0)
                      const scanned = Math.min(scannedByProduct[key] || 0, required)
                      const checked = required > 0 && scanned >= required
                      return (
                        <div
                          key={`scan-${key}-${index}`}
                          className={cn(
                            'flex items-start justify-between gap-3 rounded-md border p-2',
                            checked
                              ? 'border-success-300 bg-success-50/60 dark:bg-success-900/10'
                              : 'border-gray-200 dark:border-gray-700'
                          )}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            {checked ? (
                              <CheckCircle2 className="w-4 h-4 text-success-600 mt-0.5 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.product_name || item.name}
                                {item.sale_unit === 'bulk' && (
                                  <Badge variant="primary" size="xs" className="ml-2">Vrac</Badge>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Code-barres: {item.product_barcode || '—'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Lot: {item.batch_number || '—'} · Rayon: {item.batch_location || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium">{scanned}/{required}</span>
                            {!checked && !item.product_barcode && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleValidateItemManually(item)}
                              >
                                Valider
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {selectedSale.items?.length === 0 && (
                    <Alert variant="warning">
                      <span className="text-sm">
                        Détail des articles indisponible : impossible de contrôler les produits.
                      </span>
                    </Alert>
                  )}

                  {!isScanComplete && selectedSale.items?.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Le paiement sera débloqué lorsque tous les produits auront été contrôlés.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sous-total:</span>
                    <span>{formatCurrency(Number(selectedSale.subtotal ?? saleTotal))}</span>
                  </div>
                  {selectedSale.tax_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span>TVA:</span>
                      <span>{formatCurrency(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  {Number(selectedSale.discount ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Remise:</span>
                      <span className="text-danger-600 dark:text-danger-400">
                        -{formatCurrency(Number(selectedSale.discount))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatCurrency(saleTotal)}
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
                        Total: {formatCurrency(saleTotal)}
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
                    disabled={isLoading || !amountPaid || !isScanComplete || !hasOpenCashSession}
                    isLoading={isLoading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Valider le Paiement
                  </Button>
                  {!hasOpenCashSession && (
                    <p className="text-xs text-center text-danger-600 dark:text-danger-400">
                      Ouvrez la caisse avec un fonds initial pour débloquer l'encaissement.
                    </p>
                  )}
                  {hasOpenCashSession && !isScanComplete && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Contrôlez d'abord tous les produits par code-barres pour débloquer le paiement.
                    </p>
                  )}
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

      {/* Close Cash Modal : rapport de synthèse avant clôture */}
      <Modal isOpen={isCloseCashOpen} onClose={closeCloseCashModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-danger-600" />
            <span>Clôture de caisse</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {cashSession && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Ouverture</span>
                  <span className="font-medium">{formatDateTime(cashSession.opening_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Caissier</span>
                  <span className="font-medium">{cashSession.user_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Montant final compté <span className="text-danger-600">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Montant réellement compté en caisse"
                  leftIcon={<Banknote className="w-4 h-4" />}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Saisissez uniquement le montant total compté. Les montants de contrôle
                  (fonds initial, ventes théoriques, attendu, recette et écart) seront
                  calculés dans le rapport de clôture.
                </p>
              </div>

              <Alert variant="warning" className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  Une fois clôturée, cette session ne pourra plus recevoir de ventes.
                </span>
              </Alert>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeCloseCashModal}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleCloseCash}
            disabled={!countedValid || isClosingCash}
            isLoading={isClosingCash}
          >
            <Lock className="w-4 h-4 mr-2" />
            Clôturer et générer le rapport
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cash Closing Report Modal */}
      <Modal isOpen={isCashReportOpen} onClose={closeCashReportModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <span>Rapport de clôture de caisse</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {cashReport && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <CheckCircle2 className="w-12 h-12 mx-auto text-success-600" />
                <h3 className="text-lg font-semibold">Caisse clôturée</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Session #{cashReport.id} · {cashReport.user_name}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Ouverture horodatée</span>
                  <span className="font-medium">{formatDateTime(cashReport.opening_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Clôture horodatée</span>
                  <span className="font-medium">{formatDateTime(cashReport.closing_at)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Fonds de caisse initial</span>
                  <span className="font-medium">{formatCurrency(cashReport.opening_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Montant final compté</span>
                  <span className="font-medium">{formatCurrency(cashReport.closing_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    Ventes théoriques espèces ({cashReport.cash_sales_count})
                  </span>
                  <span className="font-medium">{formatCurrency(cashReport.cash_sales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    Ventes tous modes ({cashReport.sales_count})
                  </span>
                  <span className="font-medium">{formatCurrency(cashReport.total_sales)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Attendu en caisse</span>
                  <span className="font-medium">{formatCurrency(cashReport.expected_cash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Recette réelle (compté − fonds)</span>
                  <span className="font-semibold">{formatCurrency(cashReport.actual_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Écart constaté</span>
                  <span className={cn(
                    'font-semibold',
                    Number(cashReport.difference || 0) === 0
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-danger-600 dark:text-danger-400'
                  )}>
                    {formatCurrency(cashReport.difference || 0)}
                  </span>
                </div>
              </div>

              <Alert
                variant={Number(cashReport.difference || 0) === 0 ? 'success' : 'danger'}
                className="flex items-start gap-2"
              >
                {Number(cashReport.difference || 0) === 0 ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <span>
                  {Number(cashReport.difference || 0) === 0
                    ? 'Caisse équilibrée : aucun écart constaté.'
                    : Number(cashReport.difference || 0) > 0
                      ? `Excédent de ${formatCurrency(cashReport.difference)} en caisse.`
                      : `Manquant de ${formatCurrency(Math.abs(Number(cashReport.difference || 0)))} en caisse.`}
                </span>
              </Alert>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeCashReportModal}>
            Fermer
          </Button>
          <Button onClick={handlePrintCashReport}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer le rapport
          </Button>
        </ModalFooter>
      </Modal>

      {/* Version imprimable du rapport de clôture (masquée à l'écran) */}
      {cashReport && createPortal(
        <div id="cash-report-print" className="cash-report-print">
          <div className="report-header">
            <h1>PHARMACIE 360</h1>
            <h2>Rapport de clôture de caisse</h2>
            <p>
              Session #{cashReport.id} · {cashReport.user_name}
            </p>
            <p>
              Généré le {formatDateTime(new Date().toISOString())}
            </p>
          </div>

          <table>
            <tbody>
              <tr>
                <th>Ouverture horodatée</th>
                <td>{formatDateTime(cashReport.opening_at)}</td>
              </tr>
              <tr>
                <th>Clôture horodatée</th>
                <td>{formatDateTime(cashReport.closing_at)}</td>
              </tr>
              <tr>
                <th>Fonds de caisse initial</th>
                <td className="amount">{formatCurrency(cashReport.opening_amount)}</td>
              </tr>
              <tr>
                <th>Montant final compté</th>
                <td className="amount">{formatCurrency(cashReport.closing_amount)}</td>
              </tr>
              <tr>
                <th>Ventes théoriques espèces ({cashReport.cash_sales_count})</th>
                <td className="amount">{formatCurrency(cashReport.cash_sales)}</td>
              </tr>
              <tr>
                <th>Ventes tous modes ({cashReport.sales_count})</th>
                <td className="amount">{formatCurrency(cashReport.total_sales)}</td>
              </tr>
              <tr>
                <th>Attendu en caisse</th>
                <td className="amount">{formatCurrency(cashReport.expected_cash)}</td>
              </tr>
              <tr>
                <th>Recette réelle (compté − fonds)</th>
                <td className="amount">{formatCurrency(cashReport.actual_revenue)}</td>
              </tr>
              <tr>
                <th>Écart constaté</th>
                <td className="amount">{formatCurrency(cashReport.difference || 0)}</td>
              </tr>
            </tbody>
          </table>

          <p className="report-footer">
            {Number(cashReport.difference || 0) === 0
              ? 'Caisse équilibrée : aucun écart constaté.'
              : Number(cashReport.difference || 0) > 0
                ? `Excédent de ${formatCurrency(cashReport.difference)} en caisse.`
                : `Manquant de ${formatCurrency(Math.abs(Number(cashReport.difference || 0)))} en caisse.`}
          </p>
        </div>,
        document.body
      )}

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
                            <span>
                              {item.product_name || item.name}
                              {item.sale_unit === 'bulk' && ' (vrac)'}
                            </span>
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
                {Number(receipt.tax_amount ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">TVA:</span>
                    <span className="text-sm">{formatCurrency(receipt.tax_amount)}</span>
                  </div>
                )}
                {Number(receipt.discount_amount ?? 0) > 0 && (
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
                {receipt.change != null && (
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

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Truck, ChevronLeft, Save, X, Package, Calendar, User, FileText, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/label.jsx'
import { Alert } from '@/components/ui/Alert'
import { Separator } from '@/components/ui/Separator'
import { useToast } from '@/components/common/Toast'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

/**
 * Delivery Form Page
 * Form for creating and editing deliveries
 * 
 * FRNT-006: Gestion des livraisons
 */
function DeliveryFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const [delivery, setDelivery] = useState({
    supplier_id: '',
    reference: '',
    delivery_date: new Date().toISOString().slice(0, 10),
    expected_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: '',
    order_id: '',
    reception_notes: '',
    items: []
  })
  const [invoiceFile, setInvoiceFile] = useState(null)

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [availableOrders, setAvailableOrders] = useState([])
  const [isLoading, setIsLoading] = useState(!!id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminée' },
    { value: 'cancelled', label: 'Annulée' }
  ]

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
    fetchAvailableOrders()
    if (id) {
      fetchDelivery()
    }
  }, [id])

  const fetchAvailableOrders = async () => {
    try {
      // Commandes validées par le gestionnaire : elles passent en
      // "pending_delivery" (anciennement "confirmed"). On filtre côté client
      // car l'API n'accepte qu'un seul statut à la fois.
      const response = await api.get('/manager/orders', {
        params: { limit: 100 }
      })
      const orders = response.data.orders || []
      setAvailableOrders(
        orders.filter(o => ['pending_delivery', 'confirmed'].includes(o.status))
      )
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { limit: 100 } })
      setSuppliers(response.data.suppliers || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
      addToast({ type: 'error', title: 'Erreur', message: 'Échec du chargement des fournisseurs' })
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { limit: 100 } })
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchDelivery = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/manager/deliveries/${id}`)
      const data = response.data || {}
      setDelivery({
        ...data,
        supplier_id: data.supplier_id ? String(data.supplier_id) : '',
        order_id: data.order_id ? String(data.order_id) : '',
        delivery_date: data.delivery_date || new Date().toISOString().slice(0, 10),
        expected_date: data.expected_date || '',
        status: data.status || 'pending',
        notes: data.notes || '',
        reception_notes: data.reception_notes || '',
        items: (data.items || []).map((item) => ({
          ...item,
          product_id: item.product_id ? String(item.product_id) : '',
          product_barcode: item.product_barcode || '',
          barcode: item.product_barcode || item.barcode || '',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          selling_price: Number(item.selling_price ?? item.product_price ?? 0),
          received_quantity: Number(item.received_quantity || 0),
          non_conforming_quantity: Number(item.non_conforming_quantity || 0),
          expiry_date: item.expiry_date || '',
          location: item.location || '',
          notes: item.notes || '',
          batch_number: item.batch_number || '',
        })),
      })
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: 'Livraison non trouvée' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setDelivery(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAddItem = () => {
    setDelivery(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '', product_barcode: '', barcode: '', quantity: 1, unit_price: 0, selling_price: 0,
        received_quantity: 1, non_conforming_quantity: 0,
        expiry_date: '', location: '', notes: '', batch_number: ''
      }]
    }))
  }

  const handleSelectOrder = (orderId) => {
    const order = availableOrders.find(o => String(o.id) === String(orderId))
    if (!order) {
      handleChange('order_id', orderId)
      return
    }
    handleChange('order_id', orderId)
    if (!delivery.supplier_id && order.supplier_id) {
      handleChange('supplier_id', String(order.supplier_id))
    }
    if (!delivery.reference) {
      handleChange('reference', `LIV-${order.reference || order.id}`)
    }
    // Load order detail to populate items
    api.get(`/manager/orders/${orderId}`).then(response => {
      const detail = response.data
      const items = (detail.items || []).map(it => ({
        product_id: String(it.product_id),
        product_barcode: it.product_barcode || '',
        barcode: it.product_barcode || '',
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
        selling_price: products.find(p => String(p.id) === String(it.product_id))?.price || 0,
        received_quantity: it.quantity || 0,
        non_conforming_quantity: 0,
        expiry_date: '',
        location: '',
        notes: '',
        batch_number: ''
      }))
      setDelivery(prev => ({ ...prev, items }))
    }).catch(() => {})
  }

  const handleRemoveItem = (index) => {
    setDelivery(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index, field, value) => {
    setDelivery(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Sélection d'un produit : le code-barres est toujours celui du produit
  // (lecture seule) ; les prix d'achat et de vente sont pré-remplis.
  const handleSelectProduct = (index, productId) => {
    const product = products.find(p => String(p.id) === String(productId))
    setDelivery(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              product_id: productId,
              product_barcode: product?.barcode || '',
              barcode: product?.barcode || '',
              unit_price: item.unit_price || product?.cost_price || product?.price || 0,
              selling_price: item.selling_price || product?.price || 0,
            }
          : item
      )
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!delivery.supplier_id) newErrors.supplier_id = 'Fournisseur requis'
    if (!delivery.reference) newErrors.reference = 'Référence requise'
    if (!delivery.delivery_date) newErrors.delivery_date = 'Date requise'
    if (!delivery.order_id) newErrors.order_id = 'Commande requise'
    if (delivery.items.length === 0) {
      addToast({ type: 'error', title: 'Erreur', message: 'Au moins un article est requis' })
      return false
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const uploadInvoice = async (deliveryId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    await api.post(`/manager/deliveries/${deliveryId}/invoice`, formData, {
      // Upload de photo : le délai par défaut (30 s) est trop court.
      timeout: 120000,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const items = (delivery.items || [])
      .filter(item => item.product_id)
      .map(item => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        selling_price: parseFloat(item.selling_price) || 0,
        received_quantity: parseInt(item.received_quantity, 10) || 0,
        non_conforming_quantity: parseInt(item.non_conforming_quantity, 10) || 0,
        expiry_date: item.expiry_date || null,
        location: item.location || null,
        notes: item.notes || null,
        batch_number: item.batch_number || null,
      }))

    if (items.length === 0) {
      addToast({ type: 'error', title: 'Erreur', message: 'Au moins un article est requis' })
      return
    }

    const payload = {
      ...delivery,
      order_id: delivery.order_id ? parseInt(delivery.order_id, 10) : null,
      items
    }

    try {
      setIsSubmitting(true)
      if (id) {
        await api.put(`/manager/deliveries/${id}`, payload)
        if (invoiceFile) {
          try {
            await uploadInvoice(id, invoiceFile)
          } catch (uploadError) {
            console.error('Invoice upload failed:', uploadError)
            addToast({
              type: 'warning',
              title: 'Attention',
              message: uploadError.response?.data?.detail || 'Livraison mise à jour mais échec de l\'upload de la facture'
            })
          }
        }
        addToast({ type: 'success', title: 'Succès', message: 'Livraison mise à jour' })
      } else {
        const response = await api.post('/manager/deliveries', payload)
        const newId = response.data?.id
        if (invoiceFile && newId) {
          try {
            await uploadInvoice(newId, invoiceFile)
          } catch (uploadError) {
            console.error('Invoice upload failed:', uploadError)
            addToast({
              type: 'warning',
              title: 'Attention',
              message: uploadError.response?.data?.detail || 'Livraison créée mais échec de l\'upload de la facture'
            })
          }
        }
        addToast({ type: 'success', title: 'Succès', message: 'Livraison créée' })
      }
      navigate('/manager/deliveries')
    } catch (error) {
      const message = error.response?.data?.message ||
                      error.response?.data?.detail ||
                      'Échec de la sauvegarde'
      addToast({ type: 'error', title: 'Erreur', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/manager/deliveries" className="hover:text-primary-600 dark:hover:text-primary-400">
              Livraisons
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white">
              {id ? `Éditer livraison ${delivery.reference}` : 'Nouvelle livraison'}
            </span>
          </nav>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              {id ? `Éditer livraison ${delivery.reference}` : 'Nouvelle livraison'}
            </CardTitle>
            <CardDescription>
              {id ? 'Modifiez les détails de cette livraison' : 'Ajoutez une nouvelle livraison de produits'}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Informations de base
                </h3>
                
                {!id && availableOrders.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="order_id">Commande associée *</Label>
                    <Select
                      value={delivery.order_id}
                      onValueChange={handleSelectOrder}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une commande confirmée" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune</SelectItem>
                        {availableOrders.map(order => (
                          <SelectItem key={order.id} value={String(order.id)}>
                            {order.reference} - {order.supplier_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.order_id && (
                      <p className="text-sm text-red-500">{errors.order_id}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference">Référence *</Label>
                    <Input
                      id="reference"
                      value={delivery.reference}
                      onChange={(e) => handleChange('reference', e.target.value)}
                      placeholder="REF-2024-001"
                      className={cn(errors.reference && 'border-red-500')}
                    />
                    {errors.reference && (
                      <p className="text-sm text-red-500">{errors.reference}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Fournisseur *</Label>
                    <Select
                      value={delivery.supplier_id}
                      onValueChange={(value) => handleChange('supplier_id', value)}
                    >
                      <SelectTrigger className={cn(errors.supplier_id && 'border-red-500')}>
                        <SelectValue placeholder="Sélectionnez un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={String(supplier.id)}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.supplier_id && (
                      <p className="text-sm text-red-500">{errors.supplier_id}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_date">Date de livraison *</Label>
                    <Input
                      id="delivery_date"
                      type="date"
                      value={delivery.delivery_date}
                      onChange={(e) => handleChange('delivery_date', e.target.value)}
                      className={cn(errors.delivery_date && 'border-red-500')}
                    />
                    {errors.delivery_date && (
                      <p className="text-sm text-red-500">{errors.delivery_date}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expected_date">Date prévue</Label>
                    <Input
                      id="expected_date"
                      type="date"
                      value={delivery.expected_date}
                      onChange={(e) => handleChange('expected_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={delivery.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={delivery.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Notes supplémentaires sur la livraison"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10 p-4">
                  <Label htmlFor="invoice" className="flex items-center gap-2 text-base font-semibold">
                    <FileText className="w-5 h-5 text-primary-600" />
                    Facture de livraison — scanner / joindre
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Photographiez ou sélectionnez la facture reçue à la livraison
                    (image ou PDF). Le gestionnaire de stock la consultera pour
                    vérifier et valider la livraison.
                  </p>
                  <Input
                    id="invoice"
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  />
                  {invoiceFile && (
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Fichier sélectionné : {invoiceFile.name}
                    </p>
                  )}
                  {id && delivery.invoice_path && !invoiceFile && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Facture déjà jointe : {String(delivery.invoice_path).split(/[\\/]/).pop()}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Delivery Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Articles de livraison
                </h3>
                
                {delivery.items.length === 0 && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="ml-2">Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.</span>
                  </Alert>
                )}

                <div className="space-y-4">
                  {delivery.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor={`item-product-${index}`}>Produit</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => handleSelectProduct(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un produit" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={String(product.id)}>
                                  {product.name} ({product.barcode})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`item-quantity-${index}`}>Quantité commandée</Label>
                          <Input
                            id={`item-quantity-${index}`}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`item-received-${index}`}>Quantité reçue</Label>
                          <Input
                            id={`item-received-${index}`}
                            type="number"
                            value={item.received_quantity || ''}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              handleItemChange(index, 'received_quantity', v === '' ? 0 : parseInt(v) || 0);
                            }}
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`item-buy-price-${index}`}>Prix d'achat unitaire</Label>
                          <Input
                            id={`item-buy-price-${index}`}
                            type="number"
                            value={item.unit_price || ''}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            placeholder="Prix d'achat"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`item-sell-price-${index}`}>Prix de vente unitaire</Label>
                          <Input
                            id={`item-sell-price-${index}`}
                            type="number"
                            value={item.selling_price || ''}
                            onChange={(e) => handleItemChange(index, 'selling_price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            placeholder="Prix de vente"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`item-nonconf-${index}`}>Non conformes</Label>
                          <Input
                            id={`item-nonconf-${index}`}
                            type="number"
                            value={item.non_conforming_quantity}
                            onChange={(e) => handleItemChange(index, 'non_conforming_quantity', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`item-expiry-${index}`}>Date de péremption</Label>
                          <Input
                            id={`item-expiry-${index}`}
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`item-location-${index}`}>Rayon / emplacement</Label>
                          <Input
                            id={`item-location-${index}`}
                            value={item.location}
                            onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                            placeholder="Rayon A1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`item-batch-${index}`}>Numéro de lot</Label>
                          <Input
                            id={`item-batch-${index}`}
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                            placeholder="LOT-2024-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`item-barcode-${index}`}>
                            Code-barres du produit
                          </Label>
                          <Input
                            id={`item-barcode-${index}`}
                            value={item.product_barcode || item.barcode || ''}
                            placeholder="Défini par le produit"
                            readOnly
                            disabled
                            className="bg-gray-100"
                            title="Le code-barres est défini par le produit et ne peut pas être modifié"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label htmlFor={`item-notes-${index}`}>Notes (non-conformité)</Label>
                        <Input
                          id={`item-notes-${index}`}
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          placeholder="Produits abîmés, manquants..."
                        />
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="mt-2 w-full md:w-auto"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </Card>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="w-full md:w-auto"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/manager/deliveries')}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default DeliveryFormPage

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Truck, ChevronLeft, Save, X, Package, Calendar, User, FileText, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Label } from '../../components/ui/Label'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { cn, formatDate } from '../../lib/utils'

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
    delivery_date: formatDate(new Date()),
    expected_date: formatDate(new Date()),
    status: 'pending',
    notes: '',
    items: []
  })
  
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
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
    if (id) {
      fetchDelivery()
    }
  }, [id])

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
      setDelivery(response.data.delivery)
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
      items: [...prev.items, { product_id: '', quantity: 1, received_quantity: 0 }]
    }))
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

  const validate = () => {
    const newErrors = {}
    if (!delivery.supplier_id) newErrors.supplier_id = 'Fournisseur requis'
    if (!delivery.reference) newErrors.reference = 'Référence requise'
    if (!delivery.delivery_date) newErrors.delivery_date = 'Date requise'
    if (delivery.items.length === 0) {
      addToast({ type: 'error', title: 'Erreur', message: 'Au moins un article est requis' })
      return false
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    try {
      setIsSubmitting(true)
      if (id) {
        await api.put(`/manager/deliveries/${id}`, delivery)
        addToast({ type: 'success', title: 'Succès', message: 'Livraison mise à jour' })
      } else {
        await api.post('/manager/deliveries', delivery)
        addToast({ type: 'success', title: 'Succès', message: 'Livraison créée' })
      }
      navigate('/manager/deliveries')
    } catch (error) {
      const message = error.response?.data?.message || 'Échec de la sauvegarde'
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
                            onValueChange={(value) => handleItemChange(index, 'product_id', value)}
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
                            value={item.received_quantity}
                            onChange={(e) => handleItemChange(index, 'received_quantity', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
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

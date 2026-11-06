import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Package, ChevronLeft, Save, X, Barcode, Tag, DollarSign, Calendar, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Switch } from '../components/ui/Switch'
import { Label } from '../components/ui/Label'
import { useToast } from '../components/common/Toast'
import api from '../services/api'
import { cn, formatCurrency } from '../lib/utils'

function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const [product, setProduct] = useState({
    name: '',
    barcode: '',
    category_id: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    cost_price: '',
    quantity: '',
    min_stock_level: 5,
    is_active: true,
    has_expiry: false,
    expiry_days: 30,
    supplier_id: '',
    sku: '',
    unit: 'unité',
  })
  
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(!!id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const units = ['unité', 'boîte', 'flacon', 'comprimé', 'gélule', 'sachet', 'ampoule', 'litre', 'kg', 'g', 'ml']

  useEffect(() => {
    fetchCategories()
    fetchSuppliers()
    if (id) {
      fetchProduct()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { limit: 100 } })
      setSuppliers(response.data.suppliers || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const fetchProduct = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/products/${id}`)
      setProduct(response.data.product)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger le produit'
      })
      navigate('/products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSwitchChange = (name, checked) => {
    setProduct(prev => ({ ...prev, [name]: checked }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!product.name.trim()) {
      newErrors.name = 'Le nom est obligatoire'
    }
    
    if (!product.barcode.trim()) {
      newErrors.barcode = 'Le code-barres est obligatoire'
    }
    
    if (!product.category_id) {
      newErrors.category_id = 'La catégorie est obligatoire'
    }
    
    if (!product.purchase_price || parseFloat(product.purchase_price) <= 0) {
      newErrors.purchase_price = 'Le prix d\'achat doit être supérieur à 0'
    }
    
    if (!product.selling_price || parseFloat(product.selling_price) <= 0) {
      newErrors.selling_price = 'Le prix de vente doit être supérieur à 0'
    } else if (parseFloat(product.selling_price) < parseFloat(product.purchase_price || 0)) {
      newErrors.selling_price = 'Le prix de vente doit être supérieur au prix d\'achat'
    }
    
    if (product.has_expiry && (!product.expiry_days || parseInt(product.expiry_days) <= 0)) {
      newErrors.expiry_days = 'Les jours d\'expiration doivent être supérieurs à 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const payload = {
        ...product,
        purchase_price: parseFloat(product.purchase_price) || 0,
        selling_price: parseFloat(product.selling_price) || 0,
        cost_price: parseFloat(product.cost_price) || 0,
        quantity: parseInt(product.quantity) || 0,
        min_stock_level: parseInt(product.min_stock_level) || 5,
        expiry_days: product.has_expiry ? parseInt(product.expiry_days) || 30 : null,
      }
      
      if (id) {
        // Update existing product
        await api.put(`/products/${id}`, payload)
        addToast({
          type: 'success',
          title: 'Succès',
          message: 'Produit mis à jour avec succès'
        })
      } else {
        // Create new product
        await api.post('/products', payload)
        addToast({
          type: 'success',
          title: 'Succès',
          message: 'Produit créé avec succès'
        })
      }
      
      navigate('/products')
    } catch (error) {
      const message = error.response?.data?.message || 
                      error.response?.data?.detail ||
                      'Une erreur est survenue'
      addToast({
        type: 'error',
        title: 'Erreur',
        message: message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/products')
  }

  const generateBarcode = () => {
    // Generate a random barcode if empty
    const randomBarcode = 'PH' + Date.now().toString(36).toUpperCase()
    setProduct(prev => ({ ...prev, barcode: randomBarcode }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/products" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <ChevronLeft className="w-4 h-4" />
              Retour aux produits
            </Link>
          </Button>
          
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-7 h-7 text-primary-600" />
              {id ? 'Modifier le produit' : 'Nouveau produit'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {id ? 'Mettez à jour les informations du produit' : 'Ajoutez un nouveau produit à votre inventaire'}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du produit</CardTitle>
            <CardDescription>
              Remplissez tous les champs obligatoires (*)
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3">Chargement...</span>
                </div>
              ) : (
                <>
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      Informations de base
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-1">
                          Nom du produit <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={product.name}
                          onChange={handleChange}
                          placeholder="Ex: Paracétamol 500mg"
                          disabled={isSubmitting}
                          className={cn(errors.name && 'border-red-500')}
                        />
                        {errors.name && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Barcode */}
                      <div className="space-y-2">
                        <Label htmlFor="barcode" className="flex items-center gap-1">
                          Code-barres <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="barcode"
                            name="barcode"
                            value={product.barcode}
                            onChange={handleChange}
                            placeholder="Ex: 123456789012"
                            disabled={isSubmitting}
                            className={cn(errors.barcode && 'border-red-500')}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={generateBarcode}
                            disabled={isSubmitting}
                          >
                            <Barcode className="w-4 h-4" />
                          </Button>
                        </div>
                        {errors.barcode && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.barcode}
                          </p>
                        )}
                      </div>

                      {/* SKU */}
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU (Optionnel)</Label>
                        <Input
                          id="sku"
                          name="sku"
                          value={product.sku}
                          onChange={handleChange}
                          placeholder="Ex: PAR-500-001"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category_id" className="flex items-center gap-1">
                          Catégorie <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          name="category_id"
                          value={product.category_id}
                          onValueChange={(value) => handleChange({ target: { name: 'category_id', value } })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className={cn(errors.category_id && 'border-red-500')}>
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.category_id && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.category_id}
                          </p>
                        )}
                      </div>

                      {/* Supplier */}
                      <div className="space-y-2">
                        <Label htmlFor="supplier_id">Fournisseur (Optionnel)</Label>
                        <Select
                          name="supplier_id"
                          value={product.supplier_id}
                          onValueChange={(value) => handleChange({ target: { name: 'supplier_id', value } })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un fournisseur" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((sup) => (
                              <SelectItem key={sup.id} value={sup.id.toString()}>
                                {sup.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Unit */}
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unité</Label>
                        <Select
                          name="unit"
                          value={product.unit}
                          onValueChange={(value) => handleChange({ target: { name: 'unit', value } })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une unité" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      Informations tarifaires
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Purchase Price */}
                      <div className="space-y-2">
                        <Label htmlFor="purchase_price" className="flex items-center gap-1">
                          Prix d'achat (MAD) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="purchase_price"
                            name="purchase_price"
                            type="number"
                            step="0.01"
                            value={product.purchase_price}
                            onChange={handleChange}
                            placeholder="0.00"
                            disabled={isSubmitting}
                            className={cn('pl-10', errors.purchase_price && 'border-red-500')}
                          />
                        </div>
                        {errors.purchase_price && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.purchase_price}
                          </p>
                        )}
                      </div>

                      {/* Selling Price */}
                      <div className="space-y-2">
                        <Label htmlFor="selling_price" className="flex items-center gap-1">
                          Prix de vente (MAD) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="selling_price"
                            name="selling_price"
                            type="number"
                            step="0.01"
                            value={product.selling_price}
                            onChange={handleChange}
                            placeholder="0.00"
                            disabled={isSubmitting}
                            className={cn('pl-10', errors.selling_price && 'border-red-500')}
                          />
                        </div>
                        {errors.selling_price && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.selling_price}
                          </p>
                        )}
                      </div>

                      {/* Cost Price */}
                      <div className="space-y-2">
                        <Label htmlFor="cost_price">Coût moyen (MAD)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="cost_price"
                            name="cost_price"
                            type="number"
                            step="0.01"
                            value={product.cost_price}
                            onChange={handleChange}
                            placeholder="0.00"
                            disabled={isSubmitting}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      Informations de stock
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Initial Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantité initiale</Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min="0"
                          value={product.quantity}
                          onChange={handleChange}
                          placeholder="0"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Min Stock Level */}
                      <div className="space-y-2">
                        <Label htmlFor="min_stock_level">Seuil minimum</Label>
                        <Input
                          id="min_stock_level"
                          name="min_stock_level"
                          type="number"
                          min="0"
                          value={product.min_stock_level}
                          onChange={handleChange}
                          placeholder="5"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Active Status */}
                      <div className="space-y-2">
                        <Label htmlFor="is_active">Produit actif</Label>
                        <Switch
                          id="is_active"
                          checked={product.is_active}
                          onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Expiry Settings */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Switch
                          id="has_expiry"
                          checked={product.has_expiry}
                          onCheckedChange={(checked) => handleSwitchChange('has_expiry', checked)}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="has_expiry" className="font-medium">
                          Ce produit a une date d'expiration
                        </Label>
                      </div>
                      
                      {product.has_expiry && (
                        <div className="space-y-2">
                          <Label htmlFor="expiry_days" className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Jours avant expiration (alerte)
                          </Label>
                          <Input
                            id="expiry_days"
                            name="expiry_days"
                            type="number"
                            min="1"
                            value={product.expiry_days}
                            onChange={handleChange}
                            placeholder="30"
                            disabled={isSubmitting}
                            className={cn(errors.expiry_days && 'border-red-500')}
                          />
                          {errors.expiry_days && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.expiry_days}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                      Description
                    </h3>
                    <Textarea
                      id="description"
                      name="description"
                      value={product.description}
                      onChange={handleChange}
                      placeholder="Décrivez le produit (composition, indication, etc.)"
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
            </CardContent>

            {/* Footer with Actions */}
            <CardFooter className="flex justify-end gap-3 border-t pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSubmitting || isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isLoading}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {id ? 'Mettre à jour' : 'Enregistrer'}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default ProductFormPage

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FileText, ChevronLeft, Save, X, BarChart3, Calendar, TrendingUp, TrendingDown, Package, DollarSign, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/label.jsx'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/common/Toast'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

/**
 * Report Form Page
 * Form for generating custom reports
 * 
 * FRNT-004: Module Rapports
 */
function ReportFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const [report, setReport] = useState({
    title: '',
    report_type: 'sales',
    start_date: '',
    end_date: formatDate(new Date()),
    category_id: '',
    product_id: '',
    include_chart: true,
    include_details: true,
    format: 'pdf',
    notes: ''
  })
  
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const reportTypes = [
    { value: 'sales', label: 'Ventes', icon: TrendingUp, description: 'Rapport des ventes et revenus' },
    { value: 'stock', label: 'Stock', icon: Package, description: 'Rapport des stocks et mouvements' },
    { value: 'financial', label: 'Financier', icon: DollarSign, description: 'Rapport financier et comptabilité' },
    { value: 'expiry', label: 'Péremption', icon: Calendar, description: 'Rapport des produits périmés ou proches de la péremption' },
    { value: 'supplier', label: 'Fournisseurs', icon: Package, description: 'Rapport par fournisseur' }
  ]

  const formatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' }
  ]

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
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

  const handleChange = (field, value) => {
    setReport(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleCheckboxChange = (field, checked) => {
    setReport(prev => ({ ...prev, [field]: checked }))
  }

  const validate = () => {
    const newErrors = {}
    if (!report.title) newErrors.title = 'Titre requis'
    if (!report.report_type) newErrors.report_type = 'Type de rapport requis'
    if (!report.start_date) newErrors.start_date = 'Date de début requise'
    if (!report.end_date) newErrors.end_date = 'Date de fin requise'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    try {
      setIsSubmitting(true)
      
      // For new reports, generate and download
      const response = await api.post('/manager/reports/generate', report, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${report.title || 'rapport'}.${report.format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      addToast({ 
        type: 'success', 
        title: 'Succès', 
        message: 'Rapport généré et téléchargé' 
      })
      
      navigate('/manager/reports')
    } catch (error) {
      const message = error.response?.data?.message || 'Échec de la génération du rapport'
      addToast({ type: 'error', title: 'Erreur', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getReportIcon = (type) => {
    const found = reportTypes.find(rt => rt.value === type)
    return found ? found.icon : FileText
  }

  const ReportTypeIcon = getReportIcon(report.report_type)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/manager/reports" className="hover:text-primary-600 dark:hover:text-primary-400">
              Rapports
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white">
              {id ? `Éditer rapport` : 'Nouveau rapport'}
            </span>
          </nav>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {id ? `Éditer rapport` : 'Nouveau rapport personnalisé'}
            </CardTitle>
            <CardDescription>
              {id ? 'Modifiez ce rapport' : 'Générez un rapport personnalisé selon vos besoins'}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Report Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Informations du rapport
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={report.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Rapport des ventes du mois de novembre"
                    className={cn(errors.title && 'border-red-500')}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report_type">Type de rapport *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportTypes.map(type => (
                      <Card
                        key={type.value}
                        className={`p-4 cursor-pointer border-2 transition-all ${report.report_type === type.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
                        onClick={() => handleChange('report_type', type.value)}
                      >
                        <div className="flex items-center gap-3">
                          <type.icon className="w-6 h-6 text-primary-600" />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{type.label}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                          </div>
                        </div>
                        {report.report_type === type.value && (
                          <div className="mt-2 flex justify-end">
                            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                  {errors.report_type && (
                    <p className="text-sm text-red-500">{errors.report_type}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Période
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Date de début *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={report.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)}
                      className={cn(errors.start_date && 'border-red-500')}
                    />
                    {errors.start_date && (
                      <p className="text-sm text-red-500">{errors.start_date}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Date de fin *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={report.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                      className={cn(errors.end_date && 'border-red-500')}
                    />
                    {errors.end_date && (
                      <p className="text-sm text-red-500">{errors.end_date}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filtres (optionnel)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Catégorie</Label>
                    <Select
                      value={report.category_id}
                      onValueChange={(value) => handleChange('category_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes les catégories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="product_id">Produit</Label>
                    <Select
                      value={report.product_id}
                      onValueChange={(value) => handleChange('product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les produits" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous les produits</SelectItem>
                        {products.map(product => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} ({product.barcode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Options de rapport
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id="include_chart"
                      checked={report.include_chart}
                      onCheckedChange={(checked) => handleCheckboxChange('include_chart', checked)}
                    />
                    <Label htmlFor="include_chart" className="cursor-pointer">
                      Inclure les graphiques
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id="include_details"
                      checked={report.include_details}
                      onCheckedChange={(checked) => handleCheckboxChange('include_details', checked)}
                    />
                    <Label htmlFor="include_details" className="cursor-pointer">
                      Inclure les détails
                    </Label>
                  </div>
                </div>
              </div>

              {/* Format */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Format de sortie
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formatOptions.map(format => (
                    <Card
                      key={format.value}
                      className={`p-4 cursor-pointer border-2 transition-all ${report.format === format.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
                      onClick={() => handleChange('format', format.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{format.label}</h4>
                        </div>
                        {report.format === format.value && (
                          <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes supplémentaires</Label>
                <Textarea
                  id="notes"
                  value={report.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Ajoutez des notes ou commentaires sur ce rapport"
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/manager/reports')}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Génération...' : 'Générer le rapport'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

// Check icon needs to be imported
import { Check } from 'lucide-react'

export default ReportFormPage

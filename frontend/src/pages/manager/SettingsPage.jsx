import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Save, X, Bell, Shield, Barcode, Printer, Database, User, Mail, Phone, Globe, Clock, FileText, Package, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { cn } from '../../lib/utils'

function ManagerSettingsPage() {
  const [settings, setSettings] = useState({
    // General settings
    pharmacy_name: '',
    pharmacy_address: '',
    pharmacy_phone: '',
    pharmacy_email: '',
    pharmacy_logo: '',
    
    // Notification settings
    notifications_enabled: true,
    low_stock_alert: true,
    low_stock_threshold: 5,
    expiry_alert_days: 30,
    email_notifications: true,
    
    // Barcode settings
    barcode_prefix: 'PH',
    barcode_length: 12,
    auto_scan_enabled: true,
    
    // Print settings
    receipt_printer: 'default',
    auto_print_receipt: true,
    receipt_template: 'standard',
    
    // Stock settings
    stock_management: 'fefo', // fefo or fifo
    default_category: '',
    
    // Currency settings
    currency: 'MAD',
    currency_symbol: 'DH',
    
    // Business settings
    tax_rate: 20,
    default_discount: 0,
    
    // Working hours
    opening_time: '08:00',
    closing_time: '20:00',
    
    // Timezone
    timezone: 'Africa/Casablanca',
    
    // Language
    language: 'fr',
    
    // Date format
    date_format: 'dd/MM/yyyy',
  })
  
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { addToast } = useToast()

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'Arabe' },
    { value: 'en', label: 'Anglais' },
  ]

  const dateFormats = [
    { value: 'dd/MM/yyyy', label: 'JJ/MM/AAAA' },
    { value: 'MM/dd/yyyy', label: 'MM/JJ/AAAA' },
    { value: 'yyyy-MM-dd', label: 'AAAA-MM-JJ' },
  ]

  const currencies = [
    { value: 'MAD', label: 'Dirham Marocain (MAD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'USD', label: 'Dollar Américain (USD)' },
  ]

  const receiptTemplates = [
    { value: 'standard', label: 'Standard' },
    { value: 'detailed', label: 'Détaillé' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  const timezones = [
    { value: 'Africa/Casablanca', label: 'Casablanca (GMT+1)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Paris', label: 'Paris (GMT+2)' },
  ]

  useEffect(() => {
    fetchSettings()
    fetchCategories()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/manager/settings')
      setSettings(response.data.settings || settings)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les paramètres'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSwitchChange = (name, checked) => {
    setSettings(prev => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    
    try {
      await api.put('/manager/settings', settings)
      addToast({
        type: 'success',
        title: 'Succès',
        message: 'Paramètres mis à jour avec succès'
      })
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

  const handleReset = () => {
    fetchSettings()
    addToast({
      type: 'info',
      title: 'Info',
      message: 'Paramètres réinitialisés'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary-600" />
            Paramètres du gestionnaire
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Configurez les paramètres spécifiques au gestionnaire
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSubmitting || isLoading}>
            <X className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="barcode">Scanner</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="business">Affaires</TabsTrigger>
              <TabsTrigger value="system">Système</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Informations de la pharmacie
                  </CardTitle>
                  <CardDescription>
                    Configurez les informations de base de votre pharmacie
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_name">Nom de la pharmacie</Label>
                      <Input
                        id="pharmacy_name"
                        name="pharmacy_name"
                        value={settings.pharmacy_name}
                        onChange={handleChange}
                        placeholder="Nom de votre pharmacie"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_email">Email</Label>
                      <Input
                        id="pharmacy_email"
                        name="pharmacy_email"
                        type="email"
                        value={settings.pharmacy_email}
                        onChange={handleChange}
                        placeholder="email@pharmacie.ma"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="opening_time">Heure d'ouverture</Label>
                      <Input
                        id="opening_time"
                        name="opening_time"
                        type="time"
                        value={settings.opening_time}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_address">Adresse</Label>
                      <Input
                        id="pharmacy_address"
                        name="pharmacy_address"
                        value={settings.pharmacy_address}
                        onChange={handleChange}
                        placeholder="Adresse complète"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_phone">Téléphone</Label>
                      <Input
                        id="pharmacy_phone"
                        name="pharmacy_phone"
                        type="tel"
                        value={settings.pharmacy_phone}
                        onChange={handleChange}
                        placeholder="+212 5 XX XX XX XX"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="closing_time">Heure de fermeture</Label>
                      <Input
                        id="closing_time"
                        name="closing_time"
                        type="time"
                        value={settings.closing_time}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Paramètres régionaux
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => handleSelectChange('language', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => handleSelectChange('timezone', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un fuseau" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_format">Format de date</Label>
                    <Select
                      value={settings.date_format}
                      onValueChange={(value) => handleSelectChange('date_format', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un format" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Configurez les alertes et notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="notifications_enabled">Activer les notifications</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir des notifications pour les événements importants
                        </p>
                      </div>
                      <Switch
                        id="notifications_enabled"
                        checked={settings.notifications_enabled}
                        onCheckedChange={(checked) => handleSwitchChange('notifications_enabled', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="email_notifications">Notifications par email</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Envoyer des notifications par email
                        </p>
                      </div>
                      <Switch
                        id="email_notifications"
                        checked={settings.email_notifications}
                        onCheckedChange={(checked) => handleSwitchChange('email_notifications', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="low_stock_alert">Alerte de stock faible</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="low_stock_alert"
                            checked={settings.low_stock_alert}
                            onCheckedChange={(checked) => handleSwitchChange('low_stock_alert', checked)}
                            disabled={isSubmitting}
                          />
                          <Input
                            type="number"
                            min="0"
                            value={settings.low_stock_threshold}
                            onChange={handleChange}
                            name="low_stock_threshold"
                            className="w-20"
                            disabled={!settings.low_stock_alert || isSubmitting}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300">unité(s)</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir une alerte lorsque le stock atteint ce seuil
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry_alert_days">Alerte d'expiration</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={settings.expiry_alert_days}
                            onChange={handleChange}
                            name="expiry_alert_days"
                            className="w-20"
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300">jour(s) avant expiration</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir une alerte lorsque les produits approchent de la date d'expiration
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Barcode Settings */}
            <TabsContent value="barcode" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Paramètres du scanner
                  </CardTitle>
                  <CardDescription>
                    Configurez le comportement du scanner de codes-barres
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode_prefix">Préfixe du code-barres</Label>
                      <Input
                        id="barcode_prefix"
                        name="barcode_prefix"
                        value={settings.barcode_prefix}
                        onChange={handleChange}
                        placeholder="PH"
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Préfixe ajouté automatiquement aux codes-barres générés
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="barcode_length">Longueur du code-barres</Label>
                      <Input
                        id="barcode_length"
                        name="barcode_length"
                        type="number"
                        min="8"
                        max="20"
                        value={settings.barcode_length}
                        onChange={handleChange}
                        placeholder="12"
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Longueur des codes-barres générés automatiquement
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto_scan_enabled">Scan automatique</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Activer la détection automatique du scanner
                        </p>
                      </div>
                      <Switch
                        id="auto_scan_enabled"
                        checked={settings.auto_scan_enabled}
                        onCheckedChange={(checked) => handleSwitchChange('auto_scan_enabled', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    Paramètres d'impression
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receipt_printer">Imprimante de reçus</Label>
                      <Select
                        value={settings.receipt_printer}
                        onValueChange={(value) => handleSelectChange('receipt_printer', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une imprimante" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Imprimante par défaut</SelectItem>
                          <SelectItem value="thermal">Imprimante thermique</SelectItem>
                          <SelectItem value="network">Imprimante réseau</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto_print_receipt">Impression automatique</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Imprimer automatiquement les reçus après une vente
                        </p>
                      </div>
                      <Switch
                        id="auto_print_receipt"
                        checked={settings.auto_print_receipt}
                        onCheckedChange={(checked) => handleSwitchChange('auto_print_receipt', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receipt_template">Modèle de reçu</Label>
                      <Select
                        value={settings.receipt_template}
                        onValueChange={(value) => handleSelectChange('receipt_template', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un modèle" />
                        </SelectTrigger>
                        <SelectContent>
                          {receiptTemplates.map((template) => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Settings */}
            <TabsContent value="stock" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Gestion des stocks
                  </CardTitle>
                  <CardDescription>
                    Configurez les paramètres de gestion des stocks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_management">Méthode de gestion des stocks</Label>
                      <Select
                        value={settings.stock_management}
                        onValueChange={(value) => handleSelectChange('stock_management', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une méthode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fefo">FEFO (Premier expiré, Premier sorti)</SelectItem>
                          <SelectItem value="fifo">FIFO (Premier entré, Premier sorti)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        FEFO est recommandé pour les produits pharmaceutiques
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="default_category">Catégorie par défaut</Label>
                      <Select
                        value={settings.default_category}
                        onValueChange={(value) => handleSelectChange('default_category', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucune</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Catégorie par défaut pour les nouveaux produits
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Settings */}
            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Paramètres commerciaux
                  </CardTitle>
                  <CardDescription>
                    Configurez les paramètres liés aux affaires
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Devise</Label>
                      <Select
                        value={settings.currency}
                        onValueChange={(value) => handleSelectChange('currency', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une devise" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currency_symbol">Symbole de la devise</Label>
                      <Input
                        id="currency_symbol"
                        name="currency_symbol"
                        value={settings.currency_symbol}
                        onChange={handleChange}
                        placeholder="DH"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tax_rate">Taux de taxe (%)</Label>
                      <Input
                        id="tax_rate"
                        name="tax_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.tax_rate}
                        onChange={handleChange}
                        placeholder="20"
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Taux de taxe par défaut appliqué aux ventes
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default_discount">Remise par défaut (%)</Label>
                      <Input
                        id="default_discount"
                        name="default_discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.default_discount}
                        onChange={handleChange}
                        placeholder="0"
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Remise par défaut appliquée aux ventes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Paramètres système
                  </CardTitle>
                  <CardDescription>
                    Paramètres avancés du système
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pharmacy_logo">Logo de la pharmacie</Label>
                        <Input
                          id="pharmacy_logo"
                          name="pharmacy_logo"
                          type="file"
                          accept="image/*"
                          onChange={handleChange}
                          disabled={isSubmitting}
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Téléchargez le logo de votre pharmacie (format: PNG, JPG)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Actions système
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <h4 className="font-medium">Sauvegarder la base de données</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Créez une sauvegarde de la base de données
                          </p>
                        </div>
                        <Button variant="outline" asChild>
                          <Link to="/manager/backup">
                            Sauvegarder
                          </Link>
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <h4 className="font-medium">Restaurer la base de données</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Restaurez à partir d'une sauvegarde
                          </p>
                        </div>
                        <Button variant="outline" asChild>
                          <Link to="/manager/restore">
                            Restaurer
                          </Link>
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <h4 className="font-medium">Nettoyer le cache</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Supprimez le cache du système
                          </p>
                        </div>
                        <Button variant="outline" disabled={isSubmitting}>
                          Nettoyer
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Footer with Actions */}
            <Card>
              <CardFooter className="flex justify-end gap-3 border-t pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSubmitting || isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser
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
                      Enregistrer
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </Tabs>
        </form>
      )}
    </div>
  )
}

export default ManagerSettingsPage

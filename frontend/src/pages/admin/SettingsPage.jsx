import React, { useState, useEffect } from 'react'
import { Settings, Save, Plus, Trash2, Edit, Image, Upload, Palette, Globe, Clock, Mail, Bell, Shield, Database, User, Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { cn, formatDate } from '@/lib/utils'

/**
 * Settings Page for Pharma 360
 * System configuration and preferences
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function SettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [settings, setSettings] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [backupList, setBackupList] = useState([])
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)

  // Tabs
  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'pharmacy', label: 'Pharmacie', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'backup', label: 'Sauvegardes', icon: Database },
  ]

  // Theme options
  const themeOptions = [
    { value: 'light', label: 'Clair' },
    { value: 'dark', label: 'Sombre' },
    { value: 'system', label: 'Système' },
  ]

  // Language options
  const languageOptions = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ]

  // Currency options
  const currencyOptions = [
    { value: 'XOF', label: 'XOF (CFA)' },
    { value: 'EUR', label: 'EUR (Euro)' },
    { value: 'USD', label: 'USD (Dollar)' },
  ]

  // Fetch settings
  useEffect(() => {
    fetchSettings()
    fetchBackups()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/settings')
      setSettings(response.data || {})
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

  const fetchBackups = async () => {
    try {
      setIsBackupLoading(true)
      const response = await api.get('/settings/backups')
      setBackupList(response.data.backups || [])
    } catch (error) {
      console.error('Error fetching backups:', error)
    } finally {
      setIsBackupLoading(false)
    }
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put('/settings', settings)
      addToast({
        type: 'success',
        title: 'Paramètres sauvegardés',
        message: 'Les paramètres ont été mis à jour avec succès'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de sauvegarder les paramètres'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle select change
  const handleSelectChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle switch change
  const handleSwitchChange = (name, checked) => {
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      await api.post('/settings/backup')
      addToast({
        type: 'success',
        title: 'Sauvegarde créée',
        message: 'Une nouvelle sauvegarde a été créée avec succès'
      })
      fetchBackups()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de créer la sauvegarde'
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  // Restore backup
  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Cette action est irréversible.')) {
      return
    }
    
    try {
      await api.post(`/settings/restore/${backupId}`)
      addToast({
        type: 'success',
        title: 'Restauration réussie',
        message: 'La sauvegarde a été restaurée avec succès'
      })
      fetchBackups()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de restaurer la sauvegarde'
      })
    }
  }

  // Delete backup
  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) {
      return
    }
    
    try {
      await api.delete(`/settings/backups/${backupId}`)
      addToast({
        type: 'success',
        title: 'Sauvegarde supprimée',
        message: 'La sauvegarde a été supprimée avec succès'
      })
      fetchBackups()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de supprimer la sauvegarde'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres Système</CardTitle>
          <CardDescription>
            Configuration et préférences de l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="info" className="flex items-start gap-3">
            <Settings className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Configuration de Pharma 360</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Modifiez les paramètres de votre application. N'oubliez pas de sauvegarder après vos modifications.
              </p>
            </div>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
              <CardDescription>
                Configuration de base de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="app_name">Nom de l'Application</Label>
                      <Input
                        id="app_name"
                        name="app_name"
                        value={settings.app_name || 'Pharma 360'}
                        onChange={handleChange}
                        placeholder="Nom de l'application"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        name="version"
                        value={settings.version || '1.0.0'}
                        onChange={handleChange}
                        placeholder="Version"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Devise</Label>
                      <Select
                        value={settings.currency || 'XOF'}
                        onValueChange={(value) => handleSelectChange('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une devise" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Langue</Label>
                      <Select
                        value={settings.language || 'fr'}
                        onValueChange={(value) => handleSelectChange('language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une langue" />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mode Maintenance</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Activez le mode maintenance pour bloquer l'accès aux utilisateurs
                        </p>
                      </div>
                      <Switch
                        checked={settings.maintenance_mode || false}
                        onCheckedChange={(checked) => handleSwitchChange('maintenance_mode', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Debug Mode</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Activez le mode debug pour afficher les logs détaillés
                        </p>
                      </div>
                      <Switch
                        checked={settings.debug_mode || false}
                        onCheckedChange={(checked) => handleSwitchChange('debug_mode', checked)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Paramètres
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres d'Apparence</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Thème</Label>
                    <Select
                      value={settings.theme || 'system'}
                      onValueChange={(value) => handleSelectChange('theme', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un thème" />
                      </SelectTrigger>
                      <SelectContent>
                        {themeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Thème Clair par Défaut</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Utiliser le thème clair comme thème par défaut
                        </p>
                      </div>
                      <Switch
                        checked={settings.default_light ?? true}
                        onCheckedChange={(checked) => handleSwitchChange('default_light', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Animations</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Activer les animations de l'interface
                        </p>
                      </div>
                      <Switch
                        checked={settings.animations !== false}
                        onCheckedChange={(checked) => handleSwitchChange('animations', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mode Sombre Automatique</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Basculer automatiquement en mode sombre selon les préférences système
                        </p>
                      </div>
                      <Switch
                        checked={settings.auto_dark_mode || false}
                        onCheckedChange={(checked) => handleSwitchChange('auto_dark_mode', checked)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Paramètres
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Pharmacy Tab */}
        <TabsContent value="pharmacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de la Pharmacie</CardTitle>
              <CardDescription>
                Informations spécifiques à votre officine
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_name">Nom de la Pharmacie</Label>
                      <Input
                        id="pharmacy_name"
                        name="pharmacy_name"
                        value={settings.pharmacy_name || ''}
                        onChange={handleChange}
                        placeholder="Nom de votre pharmacie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_address">Adresse</Label>
                      <Input
                        id="pharmacy_address"
                        name="pharmacy_address"
                        value={settings.pharmacy_address || ''}
                        onChange={handleChange}
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_phone">Téléphone</Label>
                      <Input
                        id="pharmacy_phone"
                        name="pharmacy_phone"
                        value={settings.pharmacy_phone || ''}
                        onChange={handleChange}
                        placeholder="Numéro de téléphone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_email">Email</Label>
                      <Input
                        id="pharmacy_email"
                        name="pharmacy_email"
                        type="email"
                        value={settings.pharmacy_email || ''}
                        onChange={handleChange}
                        placeholder="Email de la pharmacie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_license">Numéro de Licence</Label>
                      <Input
                        id="pharmacy_license"
                        name="pharmacy_license"
                        value={settings.pharmacy_license || ''}
                        onChange={handleChange}
                        placeholder="Numéro de licence"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy_tax_id">Identifiant Fiscal</Label>
                      <Input
                        id="pharmacy_tax_id"
                        name="pharmacy_tax_id"
                        value={settings.pharmacy_tax_id || ''}
                        onChange={handleChange}
                        placeholder="Identifiant fiscal"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="default_stock_threshold">Seuil de Stock par Défaut</Label>
                      <Input
                        id="default_stock_threshold"
                        name="default_stock_threshold"
                        type="number"
                        value={settings.default_stock_threshold || 10}
                        onChange={handleChange}
                        placeholder="Seuil minimum"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_warning_days">Jours avant Péremption</Label>
                      <Input
                        id="expiry_warning_days"
                        name="expiry_warning_days"
                        type="number"
                        value={settings.expiry_warning_days || 30}
                        onChange={handleChange}
                        placeholder="Jours avant alerte"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activer les Alertes de Stock</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir des alertes lorsque le stock est faible
                        </p>
                      </div>
                      <Switch
                        checked={settings.stock_alerts !== false}
                        onCheckedChange={(checked) => handleSwitchChange('stock_alerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activer les Alertes de Péremption</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir des alertes pour les produits proches de la péremption
                        </p>
                      </div>
                      <Switch
                        checked={settings.expiry_alerts !== false}
                        onCheckedChange={(checked) => handleSwitchChange('expiry_alerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Utiliser FEFO/FIFO</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sélection automatique des lots par date de péremption (FEFO)
                        </p>
                      </div>
                      <Switch
                        checked={settings.fefo_enabled !== false}
                        onCheckedChange={(checked) => handleSwitchChange('fefo_enabled', checked)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Paramètres
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Notifications</CardTitle>
              <CardDescription>
                Configurez les notifications de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications par Email</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir les notifications par email
                        </p>
                      </div>
                      <Switch
                        checked={settings.email_notifications !== false}
                        onCheckedChange={(checked) => handleSwitchChange('email_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications Push</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir les notifications push dans l'application
                        </p>
                      </div>
                      <Switch
                        checked={settings.push_notifications !== false}
                        onCheckedChange={(checked) => handleSwitchChange('push_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications Sonores</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Activer les alertes sonores
                        </p>
                      </div>
                      <Switch
                        checked={settings.sound_notifications !== false}
                        onCheckedChange={(checked) => handleSwitchChange('sound_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications de Vente</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir des notifications pour chaque vente
                        </p>
                      </div>
                      <Switch
                        checked={settings.sale_notifications !== false}
                        onCheckedChange={(checked) => handleSwitchChange('sale_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications de Stock</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recevoir des notifications pour les alertes de stock
                        </p>
                      </div>
                      <Switch
                        checked={settings.stock_notifications !== false}
                        onCheckedChange={(checked) => handleSwitchChange('stock_notifications', checked)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="notification_email">Email de Notification</Label>
                    <Input
                      id="notification_email"
                      name="notification_email"
                      type="email"
                      value={settings.notification_email || ''}
                      onChange={handleChange}
                      placeholder="email@pharmacie.com"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email pour recevoir les notifications (laisser vide pour utiliser l'email de l'administrateur)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Paramètres
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Sécurité</CardTitle>
              <CardDescription>
                Configuration de la sécurité de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Authentification à 2 Facteurs</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Exiger l'authentification à 2 facteurs pour les administrateurs
                        </p>
                      </div>
                      <Switch
                        checked={settings.two_factor_auth || false}
                        onCheckedChange={(checked) => handleSwitchChange('two_factor_auth', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Verrouillage de Session</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Verrouiller automatiquement la session après inactivité
                        </p>
                      </div>
                      <Switch
                        checked={settings.session_lock !== false}
                        onCheckedChange={(checked) => handleSwitchChange('session_lock', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Durée de Session (minutes)</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Durée avant verrouillage automatique de la session
                        </p>
                      </div>
                      <Input
                        type="number"
                        value={settings.session_timeout || 30}
                        onChange={(e) => handleChange(e)}
                        name="session_timeout"
                        className="w-24"
                        min={5}
                        max={1440}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Limite de Tentatives de Connexion</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Nombre maximum de tentatives de connexion avant blocage
                        </p>
                      </div>
                      <Input
                        type="number"
                        value={settings.login_attempts || 5}
                        onChange={(e) => handleChange(e)}
                        name="login_attempts"
                        className="w-24"
                        min={1}
                        max={20}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Durée de Blocage (minutes)</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Durée de blocage après dépassement des tentatives
                        </p>
                      </div>
                      <Input
                        type="number"
                        value={settings.lockout_duration || 15}
                        onChange={(e) => handleChange(e)}
                        name="lockout_duration"
                        className="w-24"
                        min={1}
                        max={1440}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Chiffrement des Données</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Activer le chiffrement des données sensibles
                        </p>
                      </div>
                      <Switch
                        checked={settings.data_encryption !== false}
                        onCheckedChange={(checked) => handleSwitchChange('data_encryption', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Audit des Actions</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Enregistrer toutes les actions des utilisateurs
                        </p>
                      </div>
                      <Switch
                        checked={settings.audit_logging !== false}
                        onCheckedChange={(checked) => handleSwitchChange('audit_logging', checked)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les Paramètres
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Sauvegardes</CardTitle>
              <CardDescription>
                Créez et gérez les sauvegardes de votre base de données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="info" className="flex items-start gap-3 mb-6">
                <Database className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Sauvegardes Automatiques</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Les sauvegardes sont créées automatiquement chaque jour à minuit.
                    Vous pouvez également créer des sauvegardes manuelles à tout moment.
                  </p>
                </div>
              </Alert>

              <div className="flex justify-end mb-6">
                <Button onClick={handleCreateBackup} isLoading={isCreatingBackup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une Sauvegarde
                </Button>
              </div>

              {isBackupLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : backupList.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucune sauvegarde disponible</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Créez une sauvegarde pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backupList.map((backup) => (
                    <Card key={backup.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                              <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Sauvegarde #{backup.id}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(backup.created_at)} à {new Date(backup.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {backup.size ? (Math.round(backup.size / 1024 / 1024 * 100) / 100).toFixed(2) + ' MB' : 'N/A'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreBackup(backup.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBackup(backup.id)}
                              className="text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateBackup} isLoading={isCreatingBackup}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une Nouvelle Sauvegarde
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage

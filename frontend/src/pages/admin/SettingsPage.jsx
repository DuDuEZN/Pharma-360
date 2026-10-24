import React, { useState, useEffect } from 'react'
import { Settings, Save, Plus, Trash2, Edit, Image, Upload, Palette, Globe, Clock, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'

/**
 * Settings Page for Pharmacie 360
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

  // Tabs
  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'pharmacy', label: 'Pharmacie', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Mail },
  ]

  // Fetch settings
  useEffect(() => {
    fetchSettings()
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
        message: 'Impossible de sauvegarder les paramètres'
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

  // Handle file upload
  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('field', field)
      
      const response = await api.post('/settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setSettings(prev => ({
        ...prev,
        [field]: response.data.url
      }))
      
      addToast({
        type: 'success',
        title: 'Fichier téléchargé',
        message: 'Le fichier a été téléchargé avec succès'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de télécharger le fichier'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Paramètres Système
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez les paramètres de votre pharmacie
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : activeTab === 'general' ? (
            <GeneralSettings
              settings={settings}
              onChange={handleChange}
            />
          ) : activeTab === 'appearance' ? (
            <AppearanceSettings
              settings={settings}
              onChange={handleChange}
              onFileUpload={handleFileUpload}
            />
          ) : activeTab === 'pharmacy' ? (
            <PharmacySettings
              settings={settings}
              onChange={handleChange}
            />
          ) : (
            <NotificationSettings
              settings={settings}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// General Settings Tab
function GeneralSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Informations générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom de la pharmacie"
            name="pharmacy_name"
            value={settings.pharmacy_name || ''}
            onChange={onChange}
            placeholder="Nom de votre pharmacie"
          />
          <Input
            label="Description"
            name="pharmacy_description"
            value={settings.pharmacy_description || ''}
            onChange={onChange}
            placeholder="Brève description"
          />
          <Input
            label="Email"
            name="pharmacy_email"
            type="email"
            value={settings.pharmacy_email || ''}
            onChange={onChange}
            placeholder="contact@pharmacie.com"
          />
          <Input
            label="Téléphone"
            name="pharmacy_phone"
            type="tel"
            value={settings.pharmacy_phone || ''}
            onChange={onChange}
            placeholder="+229 XX XX XX XX"
          />
          <Input
            label="Adresse"
            name="pharmacy_address"
            value={settings.pharmacy_address || ''}
            onChange={onChange}
            placeholder="Adresse physique"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres régionaux
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Devise"
            name="currency"
            as="select"
            value={settings.currency || 'XOF'}
            onChange={onChange}
          >
            <option value="XOF">Franc CFA (XOF)</option>
            <option value="USD">Dollar américain (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </Input>
          <Input
            label="Fuseau horaire"
            name="timezone"
            as="select"
            value={settings.timezone || 'Africa/Porto-Novo'}
            onChange={onChange}
          >
            <option value="Africa/Porto-Novo">Africa/Porto-Novo (GMT+1)</option>
            <option value="UTC">UTC</option>
          </Input>
          <Input
            label="Format de date"
            name="date_format"
            as="select"
            value={settings.date_format || 'DD/MM/YYYY'}
            onChange={onChange}
          >
            <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
            <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
            <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
          </Input>
          <Input
            label="Langue"
            name="language"
            as="select"
            value={settings.language || 'fr'}
            onChange={onChange}
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </Input>
        </div>
      </div>
    </div>
  )
}

// Appearance Settings Tab
function AppearanceSettings({ settings, onChange, onFileUpload }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Logo et favicon
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {settings.logo_url && (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileUpload(e, 'logo_url')}
                  className="hidden"
                />
                <Button variant="outline" as="span">
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir un fichier
                </Button>
              </label>
            </div>
            {settings.logo_url && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-danger-600"
                onClick={() => onChange({ target: { name: 'logo_url', value: '' } })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon
            </label>
            <div className="flex items-center gap-4">
              {settings.favicon_url && (
                <img
                  src={settings.favicon_url}
                  alt="Favicon"
                  className="w-8 h-8 object-cover rounded"
                />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileUpload(e, 'favicon_url')}
                  className="hidden"
                />
                <Button variant="outline" as="span">
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir un fichier
                </Button>
              </label>
            </div>
            {settings.favicon_url && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-danger-600"
                onClick={() => onChange({ target: { name: 'favicon_url', value: '' } })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Thème
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Couleur principale"
            name="primary_color"
            type="color"
            value={settings.primary_color || '#3b82f6'}
            onChange={onChange}
            className="w-16 h-10 p-0"
          />
          <Input
            label="Mode sombre"
            name="dark_mode"
            type="checkbox"
            checked={settings.dark_mode || false}
            onChange={onChange}
            className="pt-2"
          />
        </div>
      </div>
    </div>
  )
}

// Pharmacy Settings Tab
function PharmacySettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres de stock
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Seuil de stock minimum"
            name="stock_min_threshold"
            type="number"
            value={settings.stock_min_threshold || 5}
            onChange={onChange}
            placeholder="5"
          />
          <Input
            label="Seuil de péremption (jours)"
            name="expiry_warning_days"
            type="number"
            value={settings.expiry_warning_days || 30}
            onChange={onChange}
            placeholder="30"
          />
          <Input
            label="FEFO par défaut"
            name="fefo_enabled"
            type="checkbox"
            checked={settings.fefo_enabled !== false}
            onChange={onChange}
            className="pt-2"
          />
          <Input
            label="FIFO par défaut"
            name="fifo_enabled"
            type="checkbox"
            checked={settings.fifo_enabled || false}
            onChange={onChange}
            className="pt-2"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres de vente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="TVA par défaut (%)"
            name="default_vat_rate"
            type="number"
            value={settings.default_vat_rate || 18}
            onChange={onChange}
            step="0.01"
          />
          <Input
            label="Remise maximale (%)"
            name="max_discount_rate"
            type="number"
            value={settings.max_discount_rate || 50}
            onChange={onChange}
            step="0.01"
          />
        </div>
      </div>
    </div>
  )
}

// Notification Settings Tab
function NotificationSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notifications par email
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="email_notifications_enabled"
              checked={settings.email_notifications_enabled !== false}
              onChange={onChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Activer les notifications par email</span>
          </label>
          
          <Input
            label="Email de notification"
            name="notification_email"
            type="email"
            value={settings.notification_email || ''}
            onChange={onChange}
            placeholder="notifications@pharmacie.com"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="notify_stock_low"
                checked={settings.notify_stock_low !== false}
                onChange={onChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Stock faible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="notify_expiry_soon"
                checked={settings.notify_expiry_soon !== false}
                onChange={onChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Péremption proche</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="notify_new_sale"
                checked={settings.notify_new_sale !== false}
                onChange={onChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Nouvelle vente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="notify_daily_report"
                checked={settings.notify_daily_report !== false}
                onChange={onChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Rapport quotidien</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notifications dans l'application
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="in_app_notifications_enabled"
              checked={settings.in_app_notifications_enabled !== false}
              onChange={onChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Activer les notifications dans l'application</span>
          </label>
          
          <Input
            label="Durée d'affichage (ms)"
            name="notification_duration"
            type="number"
            value={settings.notification_duration || 5000}
            onChange={onChange}
            placeholder="5000"
          />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

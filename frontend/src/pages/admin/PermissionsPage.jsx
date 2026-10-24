import React, { useState, useEffect } from 'react'
import { Key, Plus, Search, Edit, Trash2, Shield, List, Tag } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal, { ConfirmModal } from '../../components/common/Modal'

/**
 * Permissions Management Page for Pharmacie 360
 * CRUD operations for system permissions
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function PermissionsPage() {
  const { addToast } = useToast()
  
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'products',
    is_active: true
  })

  // Categories
  const categories = [
    { value: 'all', label: 'Tous' },
    { value: 'products', label: 'Produits' },
    { value: 'sales', label: 'Ventes' },
    { value: 'inventory', label: 'Stock/Inventaire' },
    { value: 'users', label: 'Utilisateurs' },
    { value: 'reports', label: 'Rapports' },
    { value: 'system', label: 'Système' },
  ]

  // Fetch permissions
  useEffect(() => {
    fetchPermissions()
  }, [categoryFilter])

  const fetchPermissions = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/permissions', {
        params: {
          search: searchQuery || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          limit: 100
        }
      })
      setPermissions(response.data.permissions || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les permissions'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchPermissions()
  }

  // Create permission
  const handleCreate = async () => {
    try {
      await api.post('/permissions', formData)
      addToast({
        type: 'success',
        title: 'Permission créée',
        message: `La permission ${formData.name} a été créée avec succès`
      })
      setShowCreateModal(false)
      setFormData({
        name: '',
        code: '',
        description: '',
        category: 'products',
        is_active: true
      })
      fetchPermissions()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de créer la permission'
      })
    }
  }

  // Update permission
  const handleUpdate = async () => {
    try {
      await api.put(`/permissions/${selectedPermission.id}`, formData)
      addToast({
        type: 'success',
        title: 'Permission mise à jour',
        message: `La permission ${formData.name} a été mise à jour`
      })
      setShowEditModal(false)
      fetchPermissions()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour la permission'
      })
    }
  }

  // Delete permission
  const handleDelete = async () => {
    try {
      await api.delete(`/permissions/${selectedPermission.id}`)
      addToast({
        type: 'success',
        title: 'Permission supprimée',
        message: `La permission ${selectedPermission.name} a été supprimée`
      })
      setShowDeleteModal(false)
      fetchPermissions()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer la permission'
      })
    }
  }

  // Open edit modal
  const openEditModal = (permission) => {
    setSelectedPermission(permission)
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      category: permission.category || 'products',
      is_active: permission.is_active !== false
    })
    setShowEditModal(true)
  }

  // Open delete modal
  const openDeleteModal = (permission) => {
    setSelectedPermission(permission)
    setShowDeleteModal(true)
  }

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Get category label
  const getCategoryLabel = (category) => {
    const found = categories.find(c => c.value === category)
    return found ? found.label : category
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestion des Permissions
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez les permissions du système
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle permission
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            type="text"
            placeholder="Rechercher une permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <Search className="w-4 h-4" />
          </Button>
        </form>
        
        <Input
          as="select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </Input>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : permissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Key className="mx-auto w-12 h-12 mb-4" />
            <p>Aucune permission trouvée</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Permission
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Catégorie
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{permission.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {permission.code}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">
                      {getCategoryLabel(permission.category)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {permission.description || 'Aucune description'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${permission.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {permission.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(permission)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(permission)}
                        className="text-danger-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Permission Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une nouvelle permission"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!formData.name || !formData.code}>
              <Plus className="w-4 h-4 mr-2" />
              Créer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="Ex: Créer produit"
            />
            <Input
              label="Code"
              name="code"
              value={formData.code}
              onChange={handleFormChange}
              required
              placeholder="Ex: product:create"
            />
          </div>
          
          <Input
            label="Catégorie"
            name="category"
            as="select"
            value={formData.category}
            onChange={handleFormChange}
            required
          >
            {categories.slice(1).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Input>
          
          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Description de ce que permet cette permission"
            as="textarea"
            rows={3}
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Permission active</span>
          </label>
        </div>
      </Modal>

      {/* Edit Permission Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier: ${selectedPermission?.name}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleUpdate} disabled={!formData.name || !formData.code}>
              <Edit className="w-4 h-4 mr-2" />
              Mettre à jour
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Code"
              name="code"
              value={formData.code}
              onChange={handleFormChange}
              required
              disabled
            />
          </div>
          
          <Input
            label="Catégorie"
            name="category"
            as="select"
            value={formData.category}
            onChange={handleFormChange}
            required
          >
            {categories.slice(1).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Input>
          
          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            as="textarea"
            rows={3}
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Permission active</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Supprimer: ${selectedPermission?.name}`}
        message={`Êtes-vous sûr de vouloir supprimer la permission ${selectedPermission?.name} ? Cette action est irréversible et peut affecter les rôles existants.`}
        confirmText="Supprimer"
        confirmVariant="danger"
        cancelText="Annuler"
      />
    </div>
  )
}

export default PermissionsPage

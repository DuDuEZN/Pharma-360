import React, { useState, useEffect } from 'react'
import { Shield, Plus, Search, Edit, Trash2, Users, Settings, Key } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal, { ConfirmModal } from '../../components/common/Modal'
import { Badge } from '../../components/common'

/**
 * Roles Management Page for Pharmacie 360
 * CRUD operations for user roles and permissions
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function RolesPage() {
  const { user: currentUser } = useAuth()
  const { addToast } = useToast()
  
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    is_default: false
  })
  const [allPermissions, setAllPermissions] = useState([])

  // Fetch roles and permissions
  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/roles', {
        params: {
          search: searchQuery || undefined,
          limit: 50
        }
      })
      setRoles(response.data.roles || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les rôles'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions')
      setAllPermissions(response.data.permissions || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchRoles()
  }

  // Create role
  const handleCreate = async () => {
    try {
      await api.post('/roles', formData)
      addToast({
        type: 'success',
        title: 'Rôle créé',
        message: `Le rôle ${formData.name} a été créé avec succès`
      })
      setShowCreateModal(false)
      setFormData({
        name: '',
        description: '',
        permissions: [],
        is_default: false
      })
      fetchRoles()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de créer le rôle'
      })
    }
  }

  // Update role
  const handleUpdate = async () => {
    try {
      await api.put(`/roles/${selectedRole.id}`, formData)
      addToast({
        type: 'success',
        title: 'Rôle mis à jour',
        message: `Le rôle ${formData.name} a été mis à jour`
      })
      setShowEditModal(false)
      fetchRoles()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour le rôle'
      })
    }
  }

  // Delete role
  const handleDelete = async () => {
    try {
      await api.delete(`/roles/${selectedRole.id}`)
      addToast({
        type: 'success',
        title: 'Rôle supprimé',
        message: `Le rôle ${selectedRole.name} a été supprimé`
      })
      setShowDeleteModal(false)
      fetchRoles()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer le rôle'
      })
    }
  }

  // Open edit modal
  const openEditModal = (role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions?.map(p => p.id) || [],
      is_default: role.is_default || false
    })
    setShowEditModal(true)
  }

  // Open delete modal
  const openDeleteModal = (role) => {
    setSelectedRole(role)
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

  // Handle permission toggle
  const togglePermission = (permissionId) => {
    setFormData(prev => {
      const permissions = [...prev.permissions]
      const index = permissions.indexOf(permissionId)
      
      if (index >= 0) {
        permissions.splice(index, 1)
      } else {
        permissions.push(permissionId)
      }
      
      return { ...prev, permissions }
    })
  }

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  // Permission groups
  const permissionGroups = {
    'Produits': allPermissions.filter(p => p.category === 'products'),
    'Ventes': allPermissions.filter(p => p.category === 'sales'),
    'Stock': allPermissions.filter(p => p.category === 'inventory'),
    'Utilisateurs': allPermissions.filter(p => p.category === 'users'),
    'Rapports': allPermissions.filter(p => p.category === 'reports'),
    'Système': allPermissions.filter(p => p.category === 'system'),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestion des Rôles
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez les rôles et leurs permissions
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau rôle
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Rechercher un rôle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" isLoading={isLoading}>
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {/* Roles Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="mx-auto w-12 h-12 mb-4" />
            <p>Aucun rôle trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Rôle
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Permissions
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Utilisateurs
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Par défaut
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{role.name}</p>
                        <p className="text-xs text-gray-500">{role.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {role.description || 'Aucune description'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">
                      {role.permissions?.length || 0} permission(s)
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">
                      {role.user_count || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {role.is_default && (
                      <span className="badge badge-success">Oui</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(role)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(role)}
                        disabled={role.is_default}
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

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer un nouveau rôle"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!formData.name}>
              <Plus className="w-4 h-4 mr-2" />
              Créer le rôle
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom du rôle"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="Ex: Vendeur"
            />
            <Input
              label="Rôle par défaut"
              name="is_default"
              type="checkbox"
              checked={formData.is_default}
              onChange={handleFormChange}
              className="pt-2"
            />
          </div>
          
          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Description des responsabilités de ce rôle"
            as="textarea"
            rows={3}
          />
          
          {/* Permissions */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionGroups).map(([category, permissions]) => (
                permissions.length > 0 && (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-700">{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier le rôle: ${selectedRole?.name}`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleUpdate} disabled={!formData.name}>
              <Edit className="w-4 h-4 mr-2" />
              Mettre à jour
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom du rôle"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Rôle par défaut"
              name="is_default"
              type="checkbox"
              checked={formData.is_default}
              onChange={handleFormChange}
              className="pt-2"
            />
          </div>
          
          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            as="textarea"
            rows={3}
          />
          
          {/* Permissions */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionGroups).map(([category, permissions]) => (
                permissions.length > 0 && (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-700">{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Supprimer le rôle: ${selectedRole?.name}`}
        message={`Êtes-vous sûr de vouloir supprimer le rôle ${selectedRole?.name} ? Les utilisateurs avec ce rôle perdront leurs permissions.`}
        confirmText="Supprimer"
        confirmVariant="danger"
        cancelText="Annuler"
      />
    </div>
  )
}

export default RolesPage

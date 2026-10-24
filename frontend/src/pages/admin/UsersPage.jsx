import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Search, Edit, Trash2, Shield, Mail, Phone, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal, { ConfirmModal } from '../../components/common/Modal'

/**
 * Users Management Page for Pharmacie 360
 * User CRUD operations with role management
 * 
 * FRNT-004: Session Administrateur (Gestion utilisateurs/roles)
 */
function UsersPage() {
  const { user: currentUser } = useAuth()
  const { addToast } = useToast()
  
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'vendeur',
    is_active: true
  })

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/users', {
        params: {
          search: searchQuery || undefined,
          limit: 50
        }
      })
      setUsers(response.data.users || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les utilisateurs'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  // Create user
  const handleCreate = async () => {
    try {
      await api.post('/users', formData)
      addToast({
        type: 'success',
        title: 'Utilisateur créé',
        message: `L'utilisateur ${formData.username} a été créé avec succès`
      })
      setShowCreateModal(false)
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'vendeur',
        is_active: true
      })
      fetchUsers()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de créer l\'utilisateur'
      })
    }
  }

  // Update user
  const handleUpdate = async () => {
    try {
      await api.put(`/users/${selectedUser.id}`, formData)
      addToast({
        type: 'success',
        title: 'Utilisateur mis à jour',
        message: `L'utilisateur ${formData.username} a été mis à jour`
      })
      setShowEditModal(false)
      fetchUsers()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour l\'utilisateur'
      })
    }
  }

  // Delete user
  const handleDelete = async () => {
    try {
      await api.delete(`/users/${selectedUser.id}`)
      addToast({
        type: 'success',
        title: 'Utilisateur supprimé',
        message: `L'utilisateur ${selectedUser.username} a été supprimé`
      })
      setShowDeleteModal(false)
      fetchUsers()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer l\'utilisateur'
      })
    }
  }

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      role: user.role || 'vendeur',
      is_active: user.is_active !== false
    })
    setShowEditModal(true)
  }

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user)
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

  // Roles
  const roles = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'gestionnaire', label: 'Gestionnaire' },
    { value: 'vendeur', label: 'Vendeur' },
    { value: 'caissier', label: 'Caissier' },
  ]

  // Get role label
  const getRoleLabel = (role) => {
    const found = roles.find(r => r.value === role)
    return found ? found.label : role
  }

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-500 mt-1">
            Ajoutez, modifiez ou supprimez des utilisateurs
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau utilisateur
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" isLoading={isLoading}>
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {/* Users Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="mx-auto w-12 h-12 mb-4" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Utilisateur
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Téléphone
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Rôle
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Créé le
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {user.email || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {user.phone || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge badge-info">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(user)}
                        disabled={user.id === currentUser?.id}
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

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer un nouvel utilisateur"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Rôle"
              name="role"
              as="select"
              value={formData.role}
              onChange={handleFormChange}
              required
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Input>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
            />
            <Input
              label="Nom"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
            />
          </div>
          
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFormChange}
          />
          
          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleFormChange}
          />
          
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleFormChange}
            required
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Utilisateur actif</span>
          </label>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier ${selectedUser?.username}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleUpdate}>
              <Edit className="w-4 h-4 mr-2" />
              Mettre à jour
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Rôle"
              name="role"
              as="select"
              value={formData.role}
              onChange={handleFormChange}
              required
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Input>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
            />
            <Input
              label="Nom"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
            />
          </div>
          
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFormChange}
          />
          
          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleFormChange}
          />
          
          <Input
            label="Nouveau mot de passe (laisser vide pour ne pas changer)"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleFormChange}
            placeholder="Laisser vide pour conserver l'ancien"
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Utilisateur actif</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Supprimer ${selectedUser?.username}`}
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur ${selectedUser?.username} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        confirmVariant="danger"
        cancelText="Annuler"
      />
    </div>
  )
}

export default UsersPage

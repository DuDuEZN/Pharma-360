import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Search, Edit, Trash2, Shield, Mail, Phone, User, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useTable } from '../../hooks/useTable'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Separator } from '../../components/ui/Separator'
import { Skeleton } from '../../components/ui/Skeleton'
import { Alert } from '../../components/ui/Alert'
import { Switch } from '../../components/ui/Switch'
import { cn, formatDate } from '../../lib/utils'

/**
 * Users Management Page for Pharma 360
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState(null)

  const {
    isOpen: isCreateModalOpen,
    onOpen: openCreateModal,
    onClose: closeCreateModal
  } = useDisclosure()

  const {
    isOpen: isEditModalOpen,
    onOpen: openEditModal,
    onClose: closeEditModal
  } = useDisclosure()

  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal
  } = useDisclosure()

  const roleOptions = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'gestionnaire', label: 'Gestionnaire' },
    { value: 'vendeur', label: 'Vendeur' },
    { value: 'caissier', label: 'Caissier' },
  ]

  const {
    paginatedData: paginatedUsers,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    totalPages,
    currentPage,
    pageSize
  } = useTable(users, { 
    searchKeys: ['username', 'email', 'first_name', 'last_name', 'role'],
    initialPageSize: 10
  })

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [searchQuery])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/users', {
        params: {
          search: searchQuery || undefined,
          limit: 100
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Create user
  const handleCreate = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      addToast({
        type: 'error',
        title: 'Champs requis',
        message: 'Veuillez remplir tous les champs obligatoires'
      })
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/users', formData)
      addToast({
        type: 'success',
        title: 'Utilisateur créé',
        message: `L'utilisateur ${formData.username} a été créé avec succès`
      })
      closeCreateModal()
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
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update user
  const handleUpdate = async () => {
    if (!selectedUser) return
    
    setIsSubmitting(true)
    try {
      await api.put(`/users/${selectedUser.id}`, formData)
      addToast({
        type: 'success',
        title: 'Utilisateur mis à jour',
        message: `L'utilisateur ${formData.username} a été mis à jour`
      })
      closeEditModal()
      fetchUsers()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour l\'utilisateur'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete user
  const handleDelete = async () => {
    if (!deleteUserId) return
    
    setIsSubmitting(true)
    try {
      await api.delete(`/users/${deleteUserId}`)
      addToast({
        type: 'success',
        title: 'Utilisateur supprimé',
        message: 'L\'utilisateur a été supprimé avec succès'
      })
      closeDeleteModal()
      setDeleteUserId(null)
      fetchUsers()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer l\'utilisateur'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active
    })
    openEditModal()
  }

  const handleOpenDeleteModal = (userId) => {
    setDeleteUserId(userId)
    openDeleteModal()
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger'
      case 'gestionnaire': return 'warning'
      case 'vendeur': return 'info'
      case 'caissier': return 'success'
      default: return 'secondary'
    }
  }

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs</CardTitle>
          <CardDescription>
            Créer, modifier et supprimer les utilisateurs du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Utilisateur
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Utilisateurs ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(user.is_active)}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.phone || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        {formatDate(user.created_at || user.date_created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(user.id)}
                            disabled={user.id === currentUser?.id}
                            className="text-danger-500 hover:text-danger-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} sur {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <span>Ajouter un Utilisateur</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert variant="info" className="flex items-start gap-3">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  Les champs marqués d'un astérisque (*) sont obligatoires
                </p>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom d'utilisateur *
                </label>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="nom_utilisateur"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email *
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="utilisateur@pharmacie.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Mot de passe *
                </label>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Téléphone
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+221 XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prénom
                </label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Nom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rôle *
                </label>
                <Select
                  value={formData.role}
                  onChange={(value) => handleSelectChange('role', value)}
                  options={roleOptions}
                  placeholder="Sélectionnez un rôle"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Statut
                </label>
                <Switch
                  checked={formData.is_active}
                  onChange={(checked) => handleSelectChange('is_active', checked)}
                  label={formData.is_active ? 'Actif' : 'Inactif'}
                />
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeCreateModal}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isSubmitting}
          >
            <Check className="w-4 h-4 mr-2" />
            Créer l'Utilisateur
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary-600" />
            <span>Modifier l'Utilisateur</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom d'utilisateur
                </label>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="nom_utilisateur"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="utilisateur@pharmacie.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nouveau Mot de passe (laisser vide pour ne pas changer)
                </label>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Téléphone
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+221 XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prénom
                </label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Nom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rôle
                </label>
                <Select
                  value={formData.role}
                  onChange={(value) => handleSelectChange('role', value)}
                  options={roleOptions}
                  placeholder="Sélectionnez un rôle"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Statut
                </label>
                <Switch
                  checked={formData.is_active}
                  onChange={(checked) => handleSelectChange('is_active', checked)}
                  label={formData.is_active ? 'Actif' : 'Inactif'}
                />
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeEditModal}>
            Annuler
          </Button>
          <Button
            onClick={handleUpdate}
            isLoading={isSubmitting}
          >
            <Check className="w-4 h-4 mr-2" />
            Mettre à jour
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-danger-600" />
            <span>Supprimer l'Utilisateur</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Êtes-vous sûr de vouloir supprimer cet utilisateur ?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cette action est irréversible. Toutes les données associées à cet utilisateur seront également supprimées.
              </p>
            </div>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeDeleteModal}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isSubmitting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default UsersPage

import React, { useState, useEffect, useMemo } from 'react'
import { Shield, Plus, Search, Edit, Trash2, Users, Settings, Key, Check, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useTable } from '@/hooks/useTable'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table.jsx'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn, formatDate } from '@/lib/utils'

/**
 * Roles Management Page for Pharma 360
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
  const [selectedRole, setSelectedRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    is_default: false
  })
  const [allPermissions, setAllPermissions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteRoleId, setDeleteRoleId] = useState(null)

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

  const {
    paginatedData: paginatedRoles,
    handleSearch,
    handlePageChange,
    totalPages,
    currentPage
  } = useTable(roles, { 
    searchKeys: ['name', 'description'],
    initialPageSize: 10
  })

  // Fetch roles and permissions
  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [searchQuery])

  const fetchRoles = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/roles', {
        params: {
          search: searchQuery || undefined,
          limit: 100
        }
      })
      setRoles(response?.data?.roles || [])
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
      setAllPermissions(response?.data?.permissions || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les permissions'
      })
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
      return { ...prev, permissions }
    })
  }

  // Create role
  const handleCreate = async () => {
    if (!formData.name) {
      addToast({
        type: 'error',
        title: 'Champ requis',
        message: 'Le nom du rôle est obligatoire'
      })
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/roles', formData)
      addToast({
        type: 'success',
        title: 'Rôle créé',
        message: `Le rôle ${formData.name} a été créé avec succès`
      })
      closeCreateModal()
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
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update role
  const handleUpdate = async () => {
    if (!selectedRole || !formData.name) return

    setIsSubmitting(true)
    try {
      await api.put(`/roles/${selectedRole.id}`, formData)
      addToast({
        type: 'success',
        title: 'Rôle mis à jour',
        message: `Le rôle ${formData.name} a été mis à jour`
      })
      closeEditModal()
      fetchRoles()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour le rôle'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete role
  const handleDelete = async () => {
    if (!deleteRoleId) return

    setIsSubmitting(true)
    try {
      await api.delete(`/roles/${deleteRoleId}`)
      addToast({
        type: 'success',
        title: 'Rôle supprimé',
        message: 'Le rôle a été supprimé avec succès'
      })
      closeDeleteModal()
      setDeleteRoleId(null)
      fetchRoles()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer le rôle'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions?.map(p => p.id) || [],
      is_default: role.is_default || false
    })
    openEditModal()
  }

  const handleOpenDeleteModal = (roleId) => {
    setDeleteRoleId(roleId)
    openDeleteModal()
  }

  // Organize permissions by category
  const permissionCategories = useMemo(() => {
    const categories = {}
    allPermissions.forEach(permission => {
      const category = permission.category || 'Autres'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(permission)
    })
    return categories
  }, [allPermissions])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Rôles</CardTitle>
          <CardDescription>
            Créer, modifier et supprimer les rôles avec leurs permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un rôle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Rôle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Rôles ({roles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedRoles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun rôle trouvé</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Par défaut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{role.name}</span>
                          {role.is_default && (
                            <Badge variant="primary" size="xs">
                              Par défaut
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.description || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.permissions?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.is_default ? (
                          <Badge variant="success" size="xs">Oui</Badge>
                        ) : (
                          <Badge variant="secondary" size="xs">Non</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(role.created_at || role.date_created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(role)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(role.id)}
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

      {/* Create Role Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} size="xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <span>Ajouter un Rôle</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert variant="info" className="flex items-start gap-3">
              <Key className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  Le nom du rôle est obligatoire. Sélectionnez les permissions appropriées.
                </p>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom du Rôle *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="nom_du_role"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description
                </label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description du rôle"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rôle par défaut
                </label>
                <Switch
                  checked={formData.is_default}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  label={formData.is_default ? 'Oui' : 'Non'}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions
              </h4>
              
              {Object.entries(permissionCategories).map(([category, permissions]) => (
                <div key={category} className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {category}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {permissions.map((permission) => (
                      <Checkbox
                        key={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        label={permission.name}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
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
            Créer le Rôle
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} size="xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary-600" />
            <span>Modifier le Rôle</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom du Rôle
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="nom_du_role"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description
                </label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description du rôle"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rôle par défaut
                </label>
                <Switch
                  checked={formData.is_default}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  label={formData.is_default ? 'Oui' : 'Non'}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions
              </h4>
              
              {Object.entries(permissionCategories).map(([category, permissions]) => (
                <div key={category} className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {category}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {permissions.map((permission) => (
                      <Checkbox
                        key={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        label={permission.name}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
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

      {/* Delete Role Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-danger-600" />
            <span>Supprimer le Rôle</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Êtes-vous sûr de vouloir supprimer ce rôle ?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cette action est irréversible. Les utilisateurs ayant ce rôle seront affectés.
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

export default RolesPage

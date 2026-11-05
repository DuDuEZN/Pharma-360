import React, { useState, useEffect, useMemo } from 'react'
import { Key, Plus, Search, Edit, Trash2, Shield, List, Tag, Check, X, AlertTriangle } from 'lucide-react'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useTable } from '../../hooks/useTable'
import api from '../../services/api'
import { useToast } from '../../components/common/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
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
 * Permissions Management Page for Pharma 360
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
  const [selectedPermission, setSelectedPermission] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'products',
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletePermissionId, setDeletePermissionId] = useState(null)

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

  // Categories
  const categoryOptions = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'products', label: 'Produits' },
    { value: 'sales', label: 'Ventes' },
    { value: 'inventory', label: 'Stock/Inventaire' },
    { value: 'users', label: 'Utilisateurs' },
    { value: 'reports', label: 'Rapports' },
    { value: 'system', label: 'Système' },
  ]

  const {
    paginatedData: paginatedPermissions,
    handleSearch,
    handlePageChange,
    totalPages,
    currentPage
  } = useTable(permissions, { 
    searchKeys: ['name', 'code', 'description', 'category'],
    initialPageSize: 10
  })

  // Fetch permissions
  useEffect(() => {
    fetchPermissions()
  }, [categoryFilter])

  useEffect(() => {
    handleSearch()
  }, [searchQuery, categoryFilter])

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Create permission
  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      addToast({
        type: 'error',
        title: 'Champs requis',
        message: 'Le nom et le code de la permission sont obligatoires'
      })
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/permissions', formData)
      addToast({
        type: 'success',
        title: 'Permission créée',
        message: `La permission ${formData.name} a été créée avec succès`
      })
      closeCreateModal()
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
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update permission
  const handleUpdate = async () => {
    if (!selectedPermission || !formData.name || !formData.code) return

    setIsSubmitting(true)
    try {
      await api.put(`/permissions/${selectedPermission.id}`, formData)
      addToast({
        type: 'success',
        title: 'Permission mise à jour',
        message: `La permission ${formData.name} a été mise à jour`
      })
      closeEditModal()
      fetchPermissions()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de mettre à jour la permission'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete permission
  const handleDelete = async () => {
    if (!deletePermissionId) return

    setIsSubmitting(true)
    try {
      await api.delete(`/permissions/${deletePermissionId}`)
      addToast({
        type: 'success',
        title: 'Permission supprimée',
        message: 'La permission a été supprimée avec succès'
      })
      closeDeleteModal()
      setDeletePermissionId(null)
      fetchPermissions()
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de supprimer la permission'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (permission) => {
    setSelectedPermission(permission)
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      category: permission.category || 'products',
      is_active: permission.is_active
    })
    openEditModal()
  }

  const handleOpenDeleteModal = (permissionId) => {
    setDeletePermissionId(permissionId)
    openDeleteModal()
  }

  const getCategoryLabel = (category) => {
    const option = categoryOptions.find(opt => opt.value === category)
    return option ? option.label : category
  }

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Permissions</CardTitle>
          <CardDescription>
            Créer, modifier et supprimer les permissions du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une permission..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="Filtrer par catégorie"
              className="w-48"
            />
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Permissions ({permissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedPermissions.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune permission trouvée</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Key className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{permission.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {permission.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getCategoryLabel(permission.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {permission.description || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(permission.is_active)}>
                          {permission.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(permission.created_at || permission.date_created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(permission)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(permission.id)}
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

      {/* Create Permission Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-600" />
            <span>Ajouter une Permission</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert variant="info" className="flex items-start gap-3">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  Le nom et le code de la permission sont obligatoires.
                </p>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nom de la permission"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Code *
                </label>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="code_permission"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Catégorie
                </label>
                <Select
                  value={formData.category}
                  onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  options={categoryOptions.slice(1)} // Remove 'all' option
                  placeholder="Sélectionnez une catégorie"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Statut
                </label>
                <Switch
                  checked={formData.is_active}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  label={formData.is_active ? 'Active' : 'Inactive'}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">
                  Description
                </label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de la permission"
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
            Créer la Permission
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Permission Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary-600" />
            <span>Modifier la Permission</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nom de la permission"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Code
                </label>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="code_permission"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Catégorie
                </label>
                <Select
                  value={formData.category}
                  onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  options={categoryOptions.slice(1)}
                  placeholder="Sélectionnez une catégorie"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Statut
                </label>
                <Switch
                  checked={formData.is_active}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  label={formData.is_active ? 'Active' : 'Inactive'}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">
                  Description
                </label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de la permission"
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

      {/* Delete Permission Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-danger-600" />
            <span>Supprimer la Permission</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Êtes-vous sûr de vouloir supprimer cette permission ?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cette action est irréversible. Les rôles utilisant cette permission seront affectés.
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

export default PermissionsPage

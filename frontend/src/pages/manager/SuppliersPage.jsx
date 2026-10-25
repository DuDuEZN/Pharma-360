import React, { useState, useEffect, useCallback } from 'react'
import { Users, Search, Plus, Edit, Trash2, Building2, Mail, Phone, MapPin } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { ToastProvider } from '../../components/common/Toast'

/**
 * Suppliers Management Page for Manager
 * FRNT-008: Session Gestionnaire - Gestion des fournisseurs
 */
function SuppliersPage() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Bénin',
    tax_id: '',
    payment_terms: ''
  })
  const [editingId, setEditingId] = useState(null)

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/suppliers', {
        params: { page: 1, page_size: 100 }
      })
      setSuppliers(response.data.suppliers || [])
    } catch (err) {
      setError(err.message)
      window.toast.error('Échec du chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  // Handle search
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.phone && supplier.phone.includes(searchTerm))
  )

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, formData)
        window.toast.success('Fournisseur modifié avec succès')
      } else {
        await api.post('/suppliers', formData)
        window.toast.success('Fournisseur ajouté avec succès')
      }
      setShowModal(false)
      setEditingId(null)
      fetchSuppliers()
    } catch (err) {
      window.toast.error(`Échec ${editingId ? 'de la modification' : 'de l\'ajout'} du fournisseur`)
    }
  }

  // Handle edit
  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      contact: supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || 'Bénin',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || ''
    })
    setEditingId(supplier.id)
    setShowModal(true)
  }

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        await api.delete(`/suppliers/${id}`)
        window.toast.success('Fournisseur supprimé avec succès')
        fetchSuppliers()
      } catch (err) {
        window.toast.error('Échec de la suppression du fournisseur')
      }
    }
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Erreur: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Gestion des Fournisseurs
          </h2>
          <p className="text-gray-500 mt-1">
            Ajouter, modifier et gérer les fournisseurs
          </p>
        </div>
        
        <button
          onClick={() => {
            setFormData({
              name: '',
              contact: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              country: 'Bénin',
              tax_id: '',
              payment_terms: ''
            })
            setEditingId(null)
            setShowModal(true)
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Fournisseur
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="max-w-md">
          <label className="input-label">Rechercher</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Téléphone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ville
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-xs text-gray-500">{supplier.tax_id || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {supplier.contact || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {supplier.email || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {supplier.phone || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {supplier.city || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-gray-600 hover:text-primary-600"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-gray-600 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  Aucun fournisseur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{suppliers.length}</p>
              <p className="text-sm text-gray-500">Fournisseurs totaux</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {suppliers.filter(s => s.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Fournisseurs actifs</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <MapPin className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(suppliers.map(s => s.city).filter(Boolean)).size}
              </p>
              <p className="text-sm text-gray-500">Villes différentes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {editingId ? 'Modifier le Fournisseur' : 'Ajouter un Fournisseur'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingId(null)
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nom *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Nom du fournisseur"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="fournisseur@email.com"
                  />
                </div>
                
                <div>
                  <label className="input-label">Téléphone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="+229 12 34 56 78"
                  />
                </div>
                
                <div>
                  <label className="input-label">Contact</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Personne de contact"
                  />
                </div>
                
                <div>
                  <label className="input-label">Adresse</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Adresse complète"
                  />
                </div>
                
                <div>
                  <label className="input-label">Ville</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Cotonou"
                  />
                </div>
                
                <div>
                  <label className="input-label">Pays</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Bénin"
                  />
                </div>
                
                <div>
                  <label className="input-label">N° Contribuable</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="IFU"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="input-label">Conditions de Paiement</label>
                  <textarea
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Conditions de paiement..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
                  }}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuppliersPage

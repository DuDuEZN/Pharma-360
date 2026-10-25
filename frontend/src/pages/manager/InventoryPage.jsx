import React, { useState, useEffect, useCallback } from 'react'
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

/**
 * Inventory Management Page for Manager
 * FRNT-008: Session Gestionnaire - Gestion des stocks
 */
function InventoryPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
    location: '',
    supplier_id: ''
  })

  // Fetch products and batches
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch products
      const productsResponse = await api.get('/products', {
        params: { 
          page: 1, 
          page_size: 100,
          is_active: true 
        }
      })
      setProducts(productsResponse.data.products || [])
      
      // Fetch batches
      const batchesResponse = await api.get('/batches', {
        params: { 
          page: 1, 
          page_size: 100,
          status: 'active' 
        }
      })
      setBatches(batchesResponse.data.batches || [])
      
    } catch (err) {
      setError(err.message)
      window.toast.error('Échec du chargement de l\'inventaire')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  // Handle search
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.product_name && 
      batch.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'low' && batch.quantity < 10) ||
      (filterStatus === 'expiring' && batch.is_expiring_soon) ||
      (filterStatus === 'expired' && batch.is_expired)
    
    return matchesSearch && matchesStatus
  })

  // Calculate stock status
  const getStockStatus = (batch) => {
    if (batch.is_expired) return { label: 'Périmé', color: 'bg-red-100 text-red-800' }
    if (batch.is_expiring_soon) return { label: 'Bientôt périmé', color: 'bg-yellow-100 text-yellow-800' }
    if (batch.quantity < 10) return { label: 'Stock faible', color: 'bg-orange-100 text-orange-800' }
    return { label: 'OK', color: 'bg-green-100 text-green-800' }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/batches', formData)
      window.toast.success('Lot ajouté avec succès')
      setShowBatchModal(false)
      fetchInventory()
    } catch (err) {
      window.toast.error('Échec de l\'ajout du lot')
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
            Gestion de l'Inventaire
          </h2>
          <p className="text-gray-500 mt-1">
            Suivi des stocks et des lots de produits
          </p>
        </div>
        
        <button
          onClick={() => {
            setFormData({
              product_id: '',
              batch_number: '',
              expiry_date: '',
              quantity: '',
              cost_price: '',
              selling_price: '',
              location: '',
              supplier_id: ''
            })
            setShowBatchModal(true)
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Lot
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="input-label">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="input-label">Filtrer par</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">Tous</option>
              <option value="low">Stock faible</option>
              <option value="expiring">Bientôt périmé</option>
              <option value="expired">Périmé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Produit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Numéro Lot
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Quantité
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date Péremption
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Emplacement
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBatches.length > 0 ? (
              filteredBatches.map((batch) => {
                const status = getStockStatus(batch)
                return (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="font-medium">{batch.product_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{batch.product_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono">{batch.batch_number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium">{batch.quantity}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {batch.location || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(batch)
                            setShowModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-primary-600"
                          title="Voir les détails"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setFormData({
                              product_id: batch.product_id,
                              batch_number: batch.batch_number,
                              expiry_date: batch.expiry_date,
                              quantity: batch.quantity,
                              cost_price: batch.cost_price,
                              selling_price: batch.selling_price,
                              location: batch.location,
                              supplier_id: batch.supplier_id
                            })
                            setShowBatchModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-primary-600"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  Aucun lot trouvé
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
            <div className="p-3 bg-green-100 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{batches.length}</p>
              <p className="text-sm text-gray-500">Lots actifs</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {batches.filter(b => b.quantity < 10).length}
              </p>
              <p className="text-sm text-gray-500">Stocks faibles</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {batches.filter(b => b.is_expiring_soon || b.is_expired).length}
              </p>
              <p className="text-sm text-gray-500">À surveiller</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {formData.batch_number ? 'Modifier le Lot' : 'Ajouter un Lot'}
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Produit *</label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    className="input"
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="input-label">Numéro de Lot *</label>
                  <input
                    type="text"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="LOT-2025-001"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Quantité *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Prix d'Achat *</label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Prix de Vente *</label>
                  <input
                    type="number"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Date d'Expiration *</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Emplacement</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Étagère A1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {formData.batch_number ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Détails du Lot</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Produit</p>
                  <p className="font-medium">{selectedProduct.product_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Numéro de Lot</p>
                  <p className="font-mono font-medium">{selectedProduct.batch_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quantité</p>
                  <p className="font-medium">{selectedProduct.quantity} unités</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date d'Expiration</p>
                  <p className="font-medium">
                    {selectedProduct.expiry_date ? new Date(selectedProduct.expiry_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prix d'Achat</p>
                  <p className="font-medium">{selectedProduct.cost_price} XOF</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prix de Vente</p>
                  <p className="font-medium">{selectedProduct.selling_price} XOF</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emplacement</p>
                  <p className="font-medium">{selectedProduct.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedProduct.is_expired ? 'bg-red-100 text-red-800' :
                    selectedProduct.is_expiring_soon ? 'bg-yellow-100 text-yellow-800' :
                    selectedProduct.quantity < 10 ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedProduct.is_expired ? 'Périmé' :
                     selectedProduct.is_expiring_soon ? 'Bientôt périmé' :
                     selectedProduct.quantity < 10 ? 'Stock faible' : 'OK'}
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-gray-500">Date de Réception</p>
                <p className="font-medium">
                  {selectedProduct.received_date ? new Date(selectedProduct.received_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search, Plus, Edit, Trash2, Barcode, Calendar, AlertTriangle } from 'lucide-react'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import api from '../services/api'
import { useToast } from '../components/common/Toast'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [barcodeInput, setBarcodeInput] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/products', {
        params: {
          search: searchQuery || undefined,
          limit: 50
        }
      })
      setProducts(response.data.products || [])
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les produits'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchProducts()
  }

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      scanBarcode(barcodeInput.trim())
    }
  }

  const scanBarcode = async (barcode) => {
    try {
      const response = await api.post('/barcode/scan', {
        barcode: barcode
      })
      
      if (response.data.product) {
        addToast({
          type: 'success',
          title: 'Produit trouvé',
          message: `Produit: ${response.data.product.name}`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Produit introuvable',
          message: response.data.error || 'Ce code-barres ne correspond à aucun produit'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de scan',
        message: 'Impossible de scanner le code-barres'
      })
    }
  }

  const getStockStatus = (product) => {
    if (product.current_stock === 0) return { text: 'Rupture', color: 'danger' }
    if (product.current_stock <= product.stock_min) return { text: 'Stock faible', color: 'warning' }
    if (product.current_stock >= product.stock_max) return { text: 'Surstock', color: 'warning' }
    return { text: 'OK', color: 'success' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Produits
          </h1>
          <p className="text-gray-500 mt-1">
            Liste de tous les produits de votre pharmacie
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" leftIcon={<Barcode className="w-4 h-4" />}>
            Scanner
          </Button>
          <Button asChild variant="primary">
            <Link to="/products/new">
              <Plus className="w-4 h-4" />
              Nouveau produit
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Rechercher par nom, code-barres ou DCI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Scanner un code-barres..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              leftIcon={<Barcode className="w-4 h-4" />}
              onKeyDown={handleBarcodeScan}
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Code-barres
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Nom
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    DCI
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Catégorie
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Prix
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Stock
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
                {products.map((product) => {
                  const status = getStockStatus(product)
                  return (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.barcode || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.dci || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.category_name || 'Non classé'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF'
                        }).format(product.price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.current_stock} {product.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge badge-${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit className="w-4 h-4" />}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            className="text-danger-600 hover:text-danger-700"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductsPage

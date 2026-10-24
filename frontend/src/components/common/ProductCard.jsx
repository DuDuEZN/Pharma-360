import React from 'react'
import { Package, Calendar, AlertTriangle, CheckCircle, Barcode } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * ProductCard Component for Pharmacie 360
 * Displays product information with stock status and batch info
 * 
 * FRNT-002: Composants Communs
 */
function ProductCard({
  product,
  batch,
  onClick,
  selected = false,
  showBatch = true,
  showBarcode = true,
  className,
  ...props
}) {
  // Calculate stock status
  const getStockStatus = (product, batch) => {
    const stock = batch ? batch.quantity : product?.current_stock || 0
    
    if (stock === 0) return { 
      label: 'Rupture', 
      color: 'danger',
      icon: AlertTriangle 
    }
    if (stock <= (product?.stock_min || 5)) return { 
      label: 'Stock faible', 
      color: 'warning',
      icon: AlertTriangle 
    }
    if (stock >= (product?.stock_max || 100)) return { 
      label: 'Surstock', 
      color: 'warning',
      icon: AlertTriangle 
    }
    
    // Check if batch is expiring soon
    if (batch && batch.days_until_expiry !== undefined) {
      if (batch.days_until_expiry <= 30) return { 
        label: `Péremption ${batch.days_until_expiry}j`, 
        color: 'danger',
        icon: Calendar 
      }
      if (batch.days_until_expiry <= 60) return { 
        label: `Péremption ${batch.days_until_expiry}j`, 
        color: 'warning',
        icon: Calendar 
      }
    }
    
    return { 
      label: 'OK', 
      color: 'success',
      icon: CheckCircle 
    }
  }

  const status = getStockStatus(product, batch)
  const StatusIcon = status.icon

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(price || 0)
  }

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('fr-FR')
  }

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'card border-2 transition-all duration-200 cursor-pointer',
          'hover:shadow-lg hover:border-primary-300',
          selected ? 'border-primary-500 bg-primary-50' : 'border-transparent',
          className
        )
      )}
      {...props}
    >
      <div className="flex gap-4">
        {/* Product Image/Icon */}
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
          {showBarcode && product?.barcode ? (
            <Barcode className="w-8 h-8 text-primary-600" />
          ) : (
            <Package className="w-8 h-8 text-primary-600" />
          )}
        </div>
        
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 truncate">{product?.name}</h3>
              {product?.dci && (
                <p className="text-xs text-gray-500 mt-0.5">DCI: {product.dci}</p>
              )}
            </div>
            
            {/* Status Badge */}
            <span className={clsx(
              'badge flex-shrink-0',
              `badge-${status.color}`
            )}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </span>
          </div>
          
          {/* Additional Info */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
            {showBarcode && product?.barcode && (
              <span className="flex items-center gap-1">
                <Barcode className="w-3 h-3" />
                {product.barcode}
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {batch ? batch.quantity : product?.current_stock || 0} {product?.unit || 'unité'}
            </span>
            
            <span className="font-medium text-gray-900">
              {formatPrice(batch ? batch.selling_price : product?.price)}
            </span>
          </div>
          
          {/* Batch Info */}
          {showBatch && batch && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                Lot: {batch.batch_number}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                Péremption: {formatDate(batch.expiry_date)}
              </span>
            </div>
          )}
          
          {/* Category */}
          {product?.category_name && (
            <div className="mt-1">
              <span className="text-xs text-primary-600 font-medium">
                {product.category_name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard

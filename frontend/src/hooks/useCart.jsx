import React, { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from '../components/common/Toast'

/**
 * Cart Context for Pharmacie 360 Sales
 * Manages the shopping cart state for sales
 * 
 * FRNT-005: Session Vente (Recherche + FEFO + envoi Caisse)
 */
const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const { addToast } = useToast()

  /**
   * Add item to cart
   * @param {Object} product - Product object
   * @param {Object} batch - Batch object (with FEFO selection)
   * @param {number} quantity - Quantity to add
   */
  const addItem = useCallback((product, batch, quantity = 1) => {
    if (!product || !product.id) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Produit invalide'
      })
      return
    }

    if (quantity <= 0) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'La quantité doit être supérieure à 0'
      })
      return
    }

    // Check if batch has enough stock
    if (batch && quantity > batch.quantity) {
      addToast({
        type: 'error',
        title: 'Stock insuffisant',
        message: `Seulement ${batch.quantity} unités disponibles dans ce lot`
      })
      return
    }

    // Check if product is already in cart
    const existingIndex = items.findIndex(item => 
      item.product.id === product.id && 
      (!item.batch || !batch || item.batch.id === batch.id)
    )

    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...items]
      const existingItem = updatedItems[existingIndex]
      const newQuantity = existingItem.quantity + quantity

      // Check stock again for updated quantity
      if (batch && newQuantity > batch.quantity) {
        addToast({
          type: 'error',
          title: 'Stock insuffisant',
          message: `Impossible d'ajouter ${quantity} unités. Seulement ${batch.quantity - existingItem.quantity} disponibles`
        })
        return
      }

      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: newQuantity,
        batch: batch || existingItem.batch
      }
      setItems(updatedItems)
    } else {
      // Add new item
      setItems([...items, {
        product,
        batch,
        quantity,
        addedAt: new Date()
      }])
    }

    addToast({
      type: 'success',
      title: 'Produit ajouté',
      message: `${product.name} ajouté au panier`
    })
  }, [items, addToast])

  /**
   * Remove item from cart
   * @param {number} index - Index of item to remove
   */
  const removeItem = useCallback((index) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }, [items])

  /**
   * Update item quantity
   * @param {number} index - Index of item to update
   * @param {number} newQuantity - New quantity
   */
  const updateQuantity = useCallback((index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(index)
      return
    }

    const updatedItems = [...items]
    const item = updatedItems[index]

    // Check stock if batch is specified
    if (item.batch && newQuantity > item.batch.quantity) {
      addToast({
        type: 'error',
        title: 'Stock insuffisant',
        message: `Seulement ${item.batch.quantity} unités disponibles`
      })
      return
    }

    updatedItems[index] = {
      ...item,
      quantity: newQuantity
    }
    setItems(updatedItems)
  }, [items, removeItem, addToast])

  /**
   * Increment item quantity
   * @param {number} index - Index of item to increment
   */
  const incrementQuantity = useCallback((index) => {
    const updatedItems = [...items]
    const item = updatedItems[index]

    // Check stock if batch is specified
    if (item.batch && (item.quantity + 1) > item.batch.quantity) {
      addToast({
        type: 'error',
        title: 'Stock insuffisant',
        message: `Seulement ${item.batch.quantity} unités disponibles`
      })
      return
    }

    updatedItems[index] = {
      ...item,
      quantity: item.quantity + 1
    }
    setItems(updatedItems)
  }, [items, addToast])

  /**
   * Decrement item quantity
   * @param {number} index - Index of item to decrement
   */
  const decrementQuantity = useCallback((index) => {
    const updatedItems = [...items]
    const item = updatedItems[index]

    if (item.quantity <= 1) {
      removeItem(index)
      return
    }

    updatedItems[index] = {
      ...item,
      quantity: item.quantity - 1
    }
    setItems(updatedItems)
  }, [items, removeItem])

  /**
   * Clear all items from cart
   */
  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  /**
   * Calculate cart totals
   * @returns {Object} - Totals object with subtotal, tax, discount, total
   */
  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => {
      const price = item.batch?.selling_price || item.product?.price || 0
      return sum + (price * item.quantity)
    }, 0)

    // For now, we'll use simple calculation
    // Tax and discount can be added later
    return {
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal
    }
  }, [items])

  /**
   * Get cart summary
   * @returns {Object} - Summary with item count and total items
   */
  const getSummary = useCallback(() => {
    const itemCount = items.length
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totals = calculateTotals()

    return {
      itemCount,
      totalItems,
      ...totals
    }
  }, [items, calculateTotals])

  /**
   * Prepare cart for submission
   * @returns {Object} - Formatted cart data for API submission
   */
  const prepareForSubmission = useCallback(() => {
    return {
      items: items.map(item => ({
        product_id: item.product.id,
        batch_id: item.batch?.id,
        quantity: item.quantity,
        unit_price: item.batch?.selling_price || item.product.price
      })),
      ...calculateTotals()
    }
  }, [items, calculateTotals])

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      clearCart,
      calculateTotals,
      getSummary,
      prepareForSubmission
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export default CartProvider

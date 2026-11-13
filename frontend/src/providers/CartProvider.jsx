import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext();

// Prix unitaire d'une ligne de panier : le lot est prioritaire, sinon le produit.
export const getItemUnitPrice = (item) => {
  const batchPrice = item?.batch?.selling_price;
  if (batchPrice !== undefined && batchPrice !== null) return Number(batchPrice);
  return Number(item?.product?.price ?? 0);
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product, batch, quantity = 1) => {
    if (!product?.id) return;

    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === product.id && item.batch?.id === batch?.id
      );

      if (existingItemIndex >= 0) {
        const existingItem = prevItems[existingItemIndex];
        // Ne jamais dépasser le stock disponible du lot sélectionné.
        const maxQuantity = Number(batch?.quantity ?? existingItem.batch?.quantity ?? Infinity);
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: Math.min(existingItem.quantity + quantity, maxQuantity),
        };
        return updatedItems;
      }

      return [...prevItems, { product, batch, quantity, addedAt: new Date() }];
    });
  }, []);

  const removeItem = useCallback((productId, batchId) => {
    setItems(prevItems =>
      prevItems.filter(item =>
        !(item.product.id === productId && item.batch?.id === batchId)
      )
    );
  }, []);

  const updateItemQuantity = useCallback((productId, batchId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId, batchId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item => {
        if (item.product.id !== productId || item.batch?.id !== batchId) return item;
        const maxQuantity = Number(item.batch?.quantity ?? Infinity);
        return { ...item, quantity: Math.min(newQuantity, maxQuantity) };
      })
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const cartTotal = useMemo(() => {
    return items.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0);
  }, [items]);

  const cartCount = useMemo(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const value = {
    items,
    isOpen,
    cartTotal,
    cartCount,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartProvider;

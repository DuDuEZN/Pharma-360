import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product, batch, quantity = 1) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === product.id && item.batch?.id === batch?.id
      );
      
      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
        return updatedItems;
      }
      
      return [...prevItems, { product, batch, quantity, addedAt: new Date() }];
    });
  }, []);

  const updateItemQuantity = useCallback((productId, batchId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId, batchId);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId && item.batch?.id === batchId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((productId, batchId) => {
    setItems(prevItems => 
      prevItems.filter(item => 
        !(item.product.id === productId && item.batch?.id === batchId)
      )
    );
  }, []);

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
    return items.reduce((total, item) => {
      const itemPrice = item.batch?.selling_price || item.product.selling_price || 0;
      return total + (itemPrice * item.quantity);
    }, 0);
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

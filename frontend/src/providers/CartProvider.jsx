import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext();

// Prix unitaire d'une ligne de panier : le lot est prioritaire, sinon le produit.
// En vrac, le prix dédié au vrac prime ; sinon on divise le prix de la boîte
// par le nombre d'unités qu'elle contient.
export const getItemUnitPrice = (item) => {
  if (item?.saleUnit === 'bulk') {
    const bulkPrice = Number(item?.product?.bulk_price ?? 0);
    if (bulkPrice > 0) return bulkPrice;
    const units = Number(item?.product?.units_per_box ?? 1) || 1;
    return Number(item?.product?.price ?? 0) / units;
  }
  const batchPrice = item?.batch?.selling_price;
  if (batchPrice !== undefined && batchPrice !== null) return Number(batchPrice);
  return Number(item?.product?.price ?? 0);
};

// Quantité maximale vendable sur une ligne : boîtes scellées pour 'box',
// unités déjà reconditionnées + unités encore en boîtes pour 'bulk'.
export const getItemMaxQuantity = (item) => {
  const unitsPerBox = Number(item?.product?.units_per_box ?? 1) || 1;
  if ((item?.saleUnit || 'box') === 'bulk') {
    return (
      Number(item?.batch?.bulk_quantity ?? 0) +
      Number(item?.batch?.quantity ?? 0) * unitsPerBox
    );
  }
  return Number(item?.batch?.quantity ?? Infinity);
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product, batch, quantity = 1, saleUnit = 'box') => {
    if (!product?.id) return;

    const unit = saleUnit === 'bulk' ? 'bulk' : 'box';

    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item =>
          item.product.id === product.id &&
          item.batch?.id === batch?.id &&
          (item.saleUnit || 'box') === unit
      );

      if (existingItemIndex >= 0) {
        const existingItem = prevItems[existingItemIndex];
        // Ne jamais dépasser le stock disponible (boîtes ou unités de vrac).
        const maxQuantity = getItemMaxQuantity({ ...existingItem, saleUnit: unit });
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: Math.min(existingItem.quantity + quantity, maxQuantity),
        };
        return updatedItems;
      }

      return [...prevItems, { product, batch, quantity, saleUnit: unit, addedAt: new Date() }];
    });
  }, []);

  const removeItem = useCallback((productId, batchId, saleUnit = 'box') => {
    setItems(prevItems =>
      prevItems.filter(item =>
        !(
          item.product.id === productId &&
          item.batch?.id === batchId &&
          (item.saleUnit || 'box') === saleUnit
        )
      )
    );
  }, []);

  const updateItemQuantity = useCallback((productId, batchId, saleUnit, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId, batchId, saleUnit);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item => {
        if (
          item.product.id !== productId ||
          item.batch?.id !== batchId ||
          (item.saleUnit || 'box') !== saleUnit
        ) return item;
        const maxQuantity = getItemMaxQuantity(item);
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

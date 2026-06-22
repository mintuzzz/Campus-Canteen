import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  foodId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (foodId: string) => void;
  updateQuantity: (foodId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('canteen_cart');
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (e) {
        console.error('Error parsing stored cart:', e);
        localStorage.removeItem('canteen_cart');
      }
    }
  }, []);

  // Sync cart to localStorage whenever it changes
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('canteen_cart', JSON.stringify(items));
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const existing = cartItems.find((ci) => ci.foodId === item.foodId);
    let newCart;
    if (existing) {
      newCart = cartItems.map((ci) =>
        ci.foodId === item.foodId ? { ...ci, quantity: ci.quantity + quantity } : ci
      );
    } else {
      newCart = [...cartItems, { ...item, quantity }];
    }
    saveCart(newCart);
  };

  const removeFromCart = (foodId: string) => {
    const newCart = cartItems.filter((ci) => ci.foodId !== foodId);
    saveCart(newCart);
  };

  const updateQuantity = (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(foodId);
      return;
    }
    const newCart = cartItems.map((ci) =>
      ci.foodId === foodId ? { ...ci, quantity } : ci
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
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

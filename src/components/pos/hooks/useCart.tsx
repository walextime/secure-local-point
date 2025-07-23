
import { useState } from 'react';
import { CartItem, Product } from '../types';
import { CustomerWithCredit } from '@/types/credit';

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithCredit | null>(null);

  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      if (existingItem) {
        
        return prevItems.map(item => 
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        
        return [...prevItems, { product, quantity: 1 }];
      }
    });
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };
  
  const removeItem = (productId: string) => {
    setCartItems(prevItems => 
      prevItems.filter(item => item.product.id !== productId)
    );
  };
  
  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setSelectedPaymentMethod('cash');
    setSelectedCustomer(null);
  };

  const setPaymentMethod = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const selectCustomer = (customer: CustomerWithCredit | null) => {
    setSelectedCustomer(customer);
    
    
    setDiscount(0);
  };

  return {
    cartItems,
    discount,
    selectedPaymentMethod,
    selectedCustomer,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    setDiscount,
    setPaymentMethod,
    selectCustomer
  };
}

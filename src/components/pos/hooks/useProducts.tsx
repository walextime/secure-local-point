
import { useState, useEffect } from 'react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { Product } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        
        const storedProducts = await dbOperations.getAll<Product>(STORES.PRODUCTS);
        setProducts(storedProducts);
        
        
        const uniqueCategories = Array.from(
          new Set(storedProducts.map(product => product.category))
        );
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  return { products, categories, isLoading };
}

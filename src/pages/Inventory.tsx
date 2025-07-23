
import React, { useEffect, useState } from 'react';
import InventoryList from '../components/inventory/InventoryList';
import { Button } from "@/components/ui/button";
import { Product } from '../components/pos/ProductCard';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { StoreInfo } from '@/types/settings';
import AddProductModal from '../components/inventory/AddProductModal';
import EditProductModal from '../components/inventory/EditProductModal';
import { useTranslation } from '@/hooks/useTranslation';

const Inventory: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('XAF');
  const [categories, setCategories] = useState<string[]>([]);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      const storedProducts = await dbOperations.getAll<Product>(STORES.PRODUCTS);
      setProducts(storedProducts);
      
      
      const uniqueCategories = Array.from(
        new Set(storedProducts.map(product => product.category))
      );
      setCategories(uniqueCategories);
      
      
      const storeInfo = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info');
      if (storeInfo && storeInfo.currency) {
        setCurrency(storeInfo.currency);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditProductModalOpen(true);
  };
  
  const handleDelete = async (productId: string) => {
    try {
      
      if (!window.confirm(t.common.confirm + ' ' + t.common.delete + '?')) {
        return;
      }
      
      
      await dbOperations.delete(STORES.PRODUCTS, productId);
      
      
      setProducts(prev => prev.filter(product => product.id !== productId));
      
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete product');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.nav.inventory}</h1>
        <Button onClick={() => setAddProductModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          {t.common.add} Product
        </Button>
      </div>
      
      <InventoryList
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currencyCode={currency}
      />
      
      <AddProductModal 
        open={addProductModalOpen} 
        onOpenChange={setAddProductModalOpen}
        onProductAdded={loadData}
        categories={categories}
      />
      
      <EditProductModal 
        open={editProductModalOpen}
        onOpenChange={setEditProductModalOpen}
        product={selectedProduct}
        onProductUpdated={loadData}
        categories={categories}
      />
    </div>
  );
};

export default Inventory;

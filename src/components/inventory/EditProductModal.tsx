import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dbOperations, STORES } from '@/lib/db';
import { db } from '@/lib/dexieDb';
import { Product } from '../pos/ProductCard';
import { toast } from 'sonner';
import { generateId } from '@/lib/crypto';

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onProductUpdated: () => void;
  categories: string[];
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  open,
  onOpenChange,
  product,
  onProductUpdated,
  categories
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('0');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  
  
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice(product.price?.toString() || '');
      setStock(product.stock?.toString() || '');
      setMinStock(product.minStock?.toString() || '0');
      setBarcode(product.barcode || '');
      setDescription(product.description || '');
      setCategory(product.category || '');
      setUnit(product.unit || 'pcs');
    }
  }, [product]);
  
  
  const generateUniqueBarcode = async (): Promise<string> => {
    let newBarcode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      
      newBarcode = (Math.floor(Math.random() * 900000000000) + 100000000000).toString();
      attempts++;
      
      if (attempts >= maxAttempts) {
        
        newBarcode = Date.now().toString();
        break;
      }
    } while (await checkBarcodeExists(newBarcode));
    
    return newBarcode;
  };
  
  
  const checkBarcodeExists = async (barcodeToCheck: string): Promise<boolean> => {
    if (!barcodeToCheck || barcodeToCheck.trim() === '') return false;
    
    try {
      const existingProducts = await db.products.where('barcode').equals(barcodeToCheck).toArray();
      return existingProducts.some(p => p.id !== product?.id);
    } catch (error) {
      console.error('Error checking barcode:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    try {
      setLoading(true);
      
      const finalCategory = showNewCategory ? newCategory : category;
      
      if (!finalCategory) {
        toast.error('Please select or create a category');
        return;
      }
      
      
      let finalBarcode = barcode.trim();
      
      
      if (!finalBarcode) {
        finalBarcode = '';
      } else if (finalBarcode !== product.barcode) {
        // Only check uniqueness if barcode has changed
        const barcodeExists = await checkBarcodeExists(finalBarcode);
        if (barcodeExists) {
          // Generate a new unique barcode
          finalBarcode = await generateUniqueBarcode();
          toast.info(`Barcode already exists. Generated new unique barcode: ${finalBarcode}`);
        }
      }
      
      // Update product
      const updatedProduct: Product = {
        ...product,
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        minStock: parseInt(minStock),
        barcode: finalBarcode || undefined, // Use undefined for empty barcode
        description,
        category: finalCategory,
        unit,
        updatedAt: Date.now()
      };
      
      await dbOperations.put(STORES.PRODUCTS, updatedProduct);
      
      toast.success('Product updated successfully');
      onOpenChange(false);
      onProductUpdated();
    } catch (error) {
      console.error('Error updating product:', error);
      if (error instanceof Error && error.message.includes('barcode')) {
        toast.error('Barcode conflict detected. Please try again or leave barcode empty.');
      } else {
        toast.error('Failed to update product');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minStock">Minimum Stock</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Piece (pcs)</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="g">Gram (g)</SelectItem>
                  <SelectItem value="l">Liter (l)</SelectItem>
                  <SelectItem value="ml">Milliliter (ml)</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (Optional)</Label>
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            {showNewCategory ? (
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="newCategory">New Category</Label>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-xs p-0 h-auto"
                    onClick={() => setShowNewCategory(false)}
                  >
                    Use Existing Category
                  </Button>
                </div>
                <Input
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="category">Category</Label>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-xs p-0 h-auto"
                    onClick={() => setShowNewCategory(true)}
                  >
                    Create New Category
                  </Button>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductModal;

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/crypto';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { Product } from '../pos/ProductCard';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded?: () => void;
  categories: string[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ 
  open, 
  onOpenChange, 
  onProductAdded,
  categories
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    price?: string;
    category?: string;
    stock?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      price?: string;
      category?: string;
      stock?: string;
    } = {};

    // Validate name
    if (!name.trim()) {
      errors.name = 'Product name is required';
    }

    
    const priceValue = parseFloat(price);
    if (!price || isNaN(priceValue) || priceValue <= 0) {
      errors.price = 'Price must be a positive number';
    }

    
    const selectedCategory = showNewCategory ? newCategory : category;
    if (!selectedCategory.trim()) {
      errors.category = 'Category is required';
    }

    
    const stockValue = parseInt(stock);
    if (!stock || isNaN(stockValue) || stockValue < 0) {
      errors.stock = 'Stock must be a non-negative number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      const isValid = validateForm();
      
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }
      
      const selectedCategory = showNewCategory ? newCategory : category;
      
      
      const newProduct: Product = {
        id: generateId(),
        name,
        price: parseFloat(price),
        category: selectedCategory,
        stock: parseInt(stock),
        minStock: 5, 
        unit,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      
      await dbOperations.add(STORES.PRODUCTS, newProduct);
      
      toast.success('Product added successfully');
      
      
      setName('');
      setPrice('');
      setCategory('');
      setStock('');
      setUnit('pcs');
      setNewCategory('');
      setShowNewCategory(false);
      setFormErrors({});
      
      // Close modal
      onOpenChange(false);
      
      // Call onProductAdded callback
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product to add to your inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Portland Cement"
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9.99"
              />
              {formErrors.price && (
                <p className="text-sm text-red-500">{formErrors.price}</p>
              )}
            </div>
            {!showNewCategory && (
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="category">Category</Label>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setShowNewCategory(true)}
                  >
                    Add New Category
                  </button>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
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
                {formErrors.category && !showNewCategory && (
                  <p className="text-sm text-red-500">{formErrors.category}</p>
                )}
              </div>
            )}
            {showNewCategory && (
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="newCategory">New Category</Label>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setShowNewCategory(false)}
                  >
                    Select Existing
                  </button>
                </div>
                <Input
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Construction Materials"
                />
                {formErrors.category && showNewCategory && (
                  <p className="text-sm text-red-500">{formErrors.category}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="100"
                />
                {formErrors.stock && (
                  <p className="text-sm text-red-500">{formErrors.stock}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                    <SelectItem value="l">Liters</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="bag">Bags</SelectItem>
                    <SelectItem value="box">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;

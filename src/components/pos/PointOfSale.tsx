import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import ProductsSection from './ProductsSection';
import Cart from './Cart';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';
import { useSale } from './hooks/useSale';
import { useSettings } from './hooks/useSettings';
import { CartItem } from './types';
import { toast } from 'sonner';
import { PendingSalesService } from '@/services/pendingSalesService';
import { getCurrentUser, logoutUser, authenticateUser } from '@/lib/auth';
import { User as UserType } from '@/lib/auth';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { dbOperations, STORES } from '@/lib/db';
import { Product } from './types';

const PointOfSale: React.FC = () => {
  const navigate = useNavigate();
  const { products, categories, isLoading } = useProducts();
  const { 
    cartItems, discount, selectedPaymentMethod, selectedCustomer,
    addToCart, updateQuantity, removeItem, clearCart, 
    setDiscount, setPaymentMethod, selectCustomer
  } = useCart();
  const { isProcessingSale, processSale } = useSale();
  const { taxRate, currency, storeInfo } = useSettings();
  
  
  const [editingPendingSaleId, setEditingPendingSaleId] = useState<string | null>(null);
  const [lastSavedCartHash, setLastSavedCartHash] = useState<string>('');
  const [isPendingSaleValid, setIsPendingSaleValid] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSwitchDialog, setShowUserSwitchDialog] = useState(false);
  const [switchUsername, setSwitchUsername] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);

  // Load current user and check low stock
  useEffect(() => {
    const loadUserAndNotifications = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Check low stock products
        const allProducts = await dbOperations.getAll<Product>(STORES.PRODUCTS);
        const lowStock = allProducts.filter(product => 
          product.stock <= product.minStock
        );
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserAndNotifications();
    
    // Set up interval to check low stock every 5 minutes
    const interval = setInterval(async () => {
      try {
        const allProducts = await dbOperations.getAll<Product>(STORES.PRODUCTS);
        const lowStock = allProducts.filter(product => 
          product.stock <= product.minStock
        );
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error('Error checking low stock:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Generate a hash of the cart for change detection
  const generateCartHash = (items: CartItem[]) => {
    return JSON.stringify(items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    })));
  };

  // Check if pending sale is still valid
  const checkPendingSaleValidity = async (saleId: string): Promise<boolean> => {
    try {
      const existingSale = await PendingSalesService.getPendingSale(saleId);
      return !!existingSale;
    } catch (error) {
      console.error('Error checking pending sale validity:', error);
      return false;
    }
  };

  // Save changes to pending sale
  const savePendingSaleChanges = async () => {
    if (!editingPendingSaleId || cartItems.length === 0) return;

    try {
      const updatedSale = await PendingSalesService.updatePendingSaleItems(
        editingPendingSaleId,
        cartItems
      );

      if (updatedSale) {
        toast.success('Pending sale updated successfully');
        setEditingPendingSaleId(null);
        clearCart();
      } else {
        
        setEditingPendingSaleId(null);
        clearCart();
        toast.error('Pending sale no longer exists');
      }
    } catch (error) {
      toast.error('Failed to update pending sale');
    }
  };

  
  const clearEditingState = () => {
    setEditingPendingSaleId(null);
    clearCart();
  };

  
  useEffect(() => {
    if (editingPendingSaleId) {
      const checkPendingSale = async () => {
        const pendingSale = await PendingSalesService.getPendingSale(editingPendingSaleId);
        if (!pendingSale) {
          clearEditingState();
        }
      };
      checkPendingSale();
    }
  }, [editingPendingSaleId]);

  
  useEffect(() => {
    const recalledSaleData = sessionStorage.getItem('recalledPendingSale');
    if (recalledSaleData) {
      try {
        const recalledSale = JSON.parse(recalledSaleData);
        
        
        const checkSaleExists = async () => {
          const existingSale = await PendingSalesService.getPendingSale(recalledSale.id);
          if (existingSale) {
            setEditingPendingSaleId(recalledSale.id);
            
            
            const loadedItems = recalledSale.items.length;
            clearCart();
            
            
            recalledSale.items.forEach((item: { productId: string; productName: string; price: number; quantity: number }) => {
              const product = {
                id: item.productId,
                name: item.productName,
                price: item.price,
                category: '',
                stock: 0,
                minStock: 0,
                unit: '',
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              
              // Add to cart with correct quantity
              for (let i = 0; i < item.quantity; i++) {
                addToCart(product);
              }
            });
            
            toast.success(`Loaded ${loadedItems} items from recalled sale`);
          } else {
            toast.error('Recalled sale no longer exists in database');
          }
        };
        
        checkSaleExists();
      } catch (error) {
        toast.error('Failed to load recalled sale');
      }
      
      
      sessionStorage.removeItem('recalledPendingSale');
    }
  }, []);

  
  useEffect(() => {
    if (products.length > 0 && editingPendingSaleId) {
      const recalledSaleData = sessionStorage.getItem('recalledPendingSale');
      if (recalledSaleData) {
        try {
          const recalledSale = JSON.parse(recalledSaleData);
          const checkSaleExists = async () => {
            const existingSale = await PendingSalesService.getPendingSale(recalledSale.id);
            if (existingSale) {
              clearCart();
              
              
              recalledSale.items.forEach((item: { productId: string; productName: string; price: number; quantity: number }) => {
                const product = {
                  id: item.productId,
                  name: item.productName,
                  price: item.price,
                  category: '',
                  stock: 0,
                  minStock: 0,
                  unit: '',
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
                
                // Add to cart with correct quantity
                for (let i = 0; i < item.quantity; i++) {
                  addToCart(product);
                }
              });
            } else {
              toast.error('Recalled sale no longer exists in database');
            }
          };
          checkSaleExists();
        } catch (error) {
          toast.error('Failed to load recalled sale');
        }
      }
    }
  }, [products, editingPendingSaleId]);

  
  const handleCheckout = async (amountGiven?: number, changeDue?: number, isPaymentComplete?: boolean) => {
    const success = await processSale(
      cartItems,
      taxRate,
      discount,
      selectedPaymentMethod,
      storeInfo,
      selectedCustomer,
      amountGiven,
      changeDue,
      isPaymentComplete
    );
    
    if (success) {
      
      if (editingPendingSaleId) {
        try {
          const completionSuccess = await PendingSalesService.completePendingSale(
            editingPendingSaleId,
            amountGiven || 0, 
            selectedPaymentMethod
          );
          
          if (completionSuccess) {
            
            setEditingPendingSaleId(null);
            setLastSavedCartHash('');
            setIsPendingSaleValid(false);
            
            // Show success message
            toast.success('Pending sale completed and removed from pending sales');
          } else {
            toast.error('Failed to complete pending sale');
          }
        } catch (error) {
          console.error('Error completing pending sale:', error);
          toast.error('Failed to complete pending sale');
        }
      }
      
      clearCart();
    }
  };

  
  const handleClearCart = () => {
    if (editingPendingSaleId) {
      
      if (window.confirm('Are you sure you want to clear this pending sale? Changes will be lost.')) {
        setEditingPendingSaleId(null);
        setLastSavedCartHash('');
        setIsPendingSaleValid(false);
        clearCart();
      }
    } else {
      clearCart();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logoutUser();
    toast.success('Logged out successfully');
    
    window.location.href = '/login';
  };

  
  const handleUserSwitch = async () => {
    if (!switchUsername || !switchPassword) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsSwitchingUser(true);
    try {
      const success = await authenticateUser(switchUsername, switchPassword);
      if (success) {
        const newUser = await getCurrentUser();
        setCurrentUser(newUser);
        setShowUserSwitchDialog(false);
        setSwitchUsername('');
        setSwitchPassword('');
        toast.success(`Switched to user: ${newUser?.name}`);
      } else {
        toast.error('Invalid username or password');
      }
    } catch (error) {
      toast.error('Failed to switch user');
    } finally {
      setIsSwitchingUser(false);
    }
  };

  
  const handleViewInventory = () => {
    navigate('/inventory');
  };

  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {}
      <div className="flex-1 flex flex-col">
        {}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              {editingPendingSaleId && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                  <Clock size={14} />
                  <span>Editing Pending Sale</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {}
              <Button variant="ghost" size="sm" className="relative">
                <Bell size={20} />
                {lowStockProducts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {lowStockProducts.length}
                  </span>
                )}
              </Button>

              {}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User size={16} />
                    <span>{currentUser?.name || 'User'}</span>
                    <ChevronDown size={14} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setShowUserSwitchDialog(true)}
                    >
                      Switch User
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {}
          <div className="px-4 pb-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search products by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                onClick={() => navigate('/pending-sales')}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Clock size={16} />
                <span>Pending Sales</span>
              </Button>
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-auto p-4">
          <ProductsSection 
            products={filteredProducts} 
            categories={categories}
            onAddToCart={addToCart}
            currencyCode={currency}
          />
        </div>
      </div>

      {}
      <div className="w-96 bg-white border-l flex flex-col">
        <Cart
          items={cartItems}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          clearCart={handleClearCart}
          taxRate={taxRate}
          discount={discount}
          setDiscount={setDiscount}
          currencyCode={currency}
          onCheckout={handleCheckout}
          isProcessing={isProcessingSale}
          paymentMethod={selectedPaymentMethod}
          setPaymentMethod={setPaymentMethod}
          selectedCustomer={selectedCustomer}
          selectCustomer={selectCustomer}
          isEditingPendingSale={!!editingPendingSaleId}
          pendingSaleId={editingPendingSaleId}
        />
      </div>

      {}
      <Dialog open={showUserSwitchDialog} onOpenChange={setShowUserSwitchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                value={switchUsername}
                onChange={(e) => setSwitchUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={switchPassword}
                onChange={(e) => setSwitchPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserSwitchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUserSwitch} disabled={isSwitchingUser}>
              {isSwitchingUser ? 'Switching...' : 'Switch User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PointOfSale;

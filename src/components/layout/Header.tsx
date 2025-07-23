import React, { useState, useEffect } from 'react';
import { Bell, Menu, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { logoutUser } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { dbOperations, STORES } from '@/lib/db';
import { Product } from '../pos/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  toggleSidebar: () => void;
  username: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, username }) => {
  const navigate = useNavigate();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const checkLowStockProducts = async () => {
      try {
        const allProducts = await dbOperations.getAll<Product>(STORES.PRODUCTS);
        const lowStock = allProducts.filter(product => 
          product.stock <= product.minStock
        );
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error('Error checking low stock products:', error);
      }
    };
    
    
    checkLowStockProducts();
    
    
    const interval = setInterval(checkLowStockProducts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleLogout = async () => {
    await logoutUser();
    toast.success('Logged out successfully');
    
    window.location.href = '/login';
  };

  const handleViewInventory = () => {
    navigate('/inventory');
  };
  
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between shadow-sm">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden mr-2"
        >
          <Menu size={20} />
        </Button>
        <span className="text-2xl font-bold ml-2">Dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        {}
        <div className="relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={20} />
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-3 border-b flex justify-between items-center">
                <h3 className="font-medium">Low Stock Notifications</h3>
                {lowStockProducts.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewInventory}
                  >
                    View Inventory
                  </Button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {lowStockProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No low stock notifications
                  </div>
                ) : (
                  <div className="divide-y">
                    {lowStockProducts.map(product => (
                      <div key={product.id} className="p-3 hover:bg-gray-50">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-red-600">
                          Low stock: {product.stock} {product.unit || 'unit'}s left 
                          (Min: {product.minStock} {product.unit || 'unit'}s)
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium hidden sm:inline-block">
            {username}
          </span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

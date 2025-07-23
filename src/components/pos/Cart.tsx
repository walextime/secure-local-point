import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, X, Printer, Users, Clock, DollarSign, Loader2, Save } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { CartItem } from './types';
import { CustomerWithCredit } from '@/types/credit';
import { PendingSalesService } from '@/services/pendingSalesService';
import { useSettings } from './hooks/useSettings';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown } from 'lucide-react';
import { ShoppingCart } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  taxRate: number;
  discount: number;
  setDiscount: (discount: number) => void;
  currencyCode: string;
  onCheckout: (amountGiven: number, changeDue: number, isPaymentComplete: boolean) => void;
  isProcessing?: boolean;
  paymentMethod?: string;
  setPaymentMethod?: (method: string) => void;
  selectedCustomer?: CustomerWithCredit | null;
  selectCustomer?: (customer: CustomerWithCredit | null) => void;
  isEditingPendingSale?: boolean;
  pendingSaleId?: string | null;
}

const Cart: React.FC<CartProps> = ({
  items,
  updateQuantity,
  removeItem,
  clearCart,
  taxRate,
  discount,
  setDiscount,
  currencyCode,
  onCheckout,
  isProcessing = false,
  paymentMethod = 'cash',
  setPaymentMethod = () => {},
  selectedCustomer = null,
  selectCustomer = () => {},
  isEditingPendingSale = false,
  pendingSaleId = null
}) => {
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [holdSaleModal, setHoldSaleModal] = useState(false);
  const [saleIdentifier, setSaleIdentifier] = useState('');
  const [holdSaleLoading, setHoldSaleLoading] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { taxRate: settingsTaxRate } = useSettings();
  
  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const storedCustomers = await dbOperations.getAll<CustomerWithCredit>(STORES.CUSTOMERS);
        // Ensure customers have credit fields
        const customersWithCredit = storedCustomers.map(customer => ({
          ...customer,
          balance: customer.balance ?? 0,
          creditLimit: customer.creditLimit ?? 0
        }));
        setCustomers(customersWithCredit);
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };
    
    loadCustomers();
  }, []);
  
  // Format price with currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  
  
  const taxAmount = subtotal * (taxRate / 100);
  
  
  const total = subtotal + taxAmount - discount;

  
  const changeDue = Math.max(0, (parseFloat(amountGiven) || 0) - total);
  
  
  const handleHoldSale = async () => {
    if (items.length === 0) {
      toast.error('Cannot hold an empty sale');
      return;
    }

    if (!saleIdentifier.trim()) {
      toast.error('Please enter a sale identifier');
      return;
    }

    setHoldSaleLoading(true);
    try {
      await PendingSalesService.holdSaleAsPending(
        items,
        saleIdentifier,
        taxRate,
        discount,
        selectedCustomer?.name,
        selectedCustomer?.id
      );
      
      setHoldSaleModal(false);
      setSaleIdentifier('');
      clearCart();
      toast.success('Sale saved as pending');
    } catch (error) {
      toast.error('Failed to save pending sale');
    } finally {
      setHoldSaleLoading(false);
    }
  };

  
  const handleCompleteSale = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && (!amountGiven || parseFloat(amountGiven) < total)) {
      toast.error('Amount given must be at least the total amount');
      return;
    }

    onCheckout(parseFloat(amountGiven) || 0, changeDue, true);
    setAmountGiven('');
  };

  // Payment method options
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: DollarSign },
    { id: 'card', label: 'Card', icon: DollarSign },
    { id: 'mobile', label: 'Mobile', icon: DollarSign },
    { id: 'credit', label: 'Credit', icon: DollarSign }
  ];
  
  return (
    <div className="flex flex-col h-full">
      {}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            disabled={items.length === 0 || isProcessing}
          >
            <X size={16} className="mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {}
      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setCustomerDialogOpen(true)}
        >
          <span className="flex items-center">
            <Users size={16} className="mr-2" />
            {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
          </span>
          <ChevronDown size={14} />
        </Button>
      </div>

      {}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{item.product.name}</h3>
                  <p className="text-sm text-gray-600">{formatPrice(item.product.price)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={12} />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      <div className="p-4 border-t bg-gray-50">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({taxRate}%):</span>
            <span>{formatPrice(taxAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-20 h-6 text-sm"
              min="0"
              max={subtotal}
            />
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total Due:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {}
      <div className="p-4 border-t">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Amount Given by Client (XAF)</label>
            <Input
              type="number"
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value)}
              placeholder="0"
              min="0"
              step="100"
            />
          </div>
          <div className="flex justify-between font-medium">
            <span>Change Due (XAF):</span>
            <span className={changeDue > 0 ? 'text-green-600' : 'text-gray-600'}>
              {formatPrice(changeDue)}
            </span>
          </div>
        </div>
      </div>

      {}
      <div className="p-4 border-t">
        <label className="text-sm font-medium mb-2 block">Payment Methods</label>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant={paymentMethod === method.id ? "default" : "outline"}
              size="sm"
              onClick={() => setPaymentMethod(method.id)}
              className="justify-start"
            >
              <method.icon size={14} className="mr-2" />
              {method.label}
            </Button>
          ))}
        </div>
      </div>

      {}
      <div className="p-4 border-t space-y-2">
        <Button
          onClick={handleCompleteSale}
          disabled={items.length === 0 || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Sale'
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setHoldSaleModal(true)}
          disabled={items.length === 0 || isProcessing}
          className="w-full"
        >
          <Save size={16} className="mr-2" />
          Hold Bill / Save as Pending
        </Button>
      </div>

      {}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-60 overflow-auto space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  selectCustomer(null);
                  setCustomerDialogOpen(false);
                }}
              >
                Walk-in Customer
              </Button>
              {customers
                .filter(customer =>
                  customer.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(customer => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      selectCustomer(customer);
                      setCustomerDialogOpen(false);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-600">
                        Balance: {formatPrice(customer.balance || 0)}
                      </div>
                    </div>
                  </Button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={holdSaleModal} onOpenChange={setHoldSaleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Sale as Pending</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sale Identifier</label>
              <Input
                value={saleIdentifier}
                onChange={(e) => setSaleIdentifier(e.target.value)}
                placeholder="e.g., Table 5, Customer: John, Order #123"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>This will save the current sale as pending and clear the cart.</p>
              <p>You can retrieve it later from the Pending Sales page.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldSaleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleHoldSale} disabled={holdSaleLoading}>
              {holdSaleLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save as Pending'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;

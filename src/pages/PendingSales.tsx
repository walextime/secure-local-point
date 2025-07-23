import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Trash2, 
  CreditCard, 
  Printer,
  Loader2,
  Edit3,
  Save,
  X,
  CheckCircle
} from 'lucide-react';
import { PendingSale, PendingSaleEvent } from '@/types/sales';
import { PendingSalesService } from '@/services/pendingSalesService';
import { getCurrentUser, hasRole, User } from '@/lib/auth';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dbOperations, STORES } from '@/lib/db';
import { CartItem, Product } from '@/components/pos/types';
import { StoreInfo } from '@/types/settings';

const PendingSales: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isCashier, setIsCashier] = useState(false);
  const [showOnlyMySales, setShowOnlyMySales] = useState(false);
  
  
  const [partialPaymentModal, setPartialPaymentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<PendingSale | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [detailsModal, setDetailsModal] = useState(false);
  const [saleToView, setSaleToView] = useState<PendingSale | null>(null);
  const [completingSaleId, setCompletingSaleId] = useState<string | null>(null);
  
  // Details modal editing state
  const [editableItems, setEditableItems] = useState<Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [addItemModal, setAddItemModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  // View history state
  const [historyModal, setHistoryModal] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<PendingSaleEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load user and permissions
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        if (user) {
          const canDeleteSales = await hasRole(['admin', 'manager']);
          setCanDelete(canDeleteSales);
          const canEditSales = await hasRole(['admin', 'manager', 'cashier']);
          setCanEdit(canEditSales);
          const isCashier = await hasRole(['cashier']);
          setIsCashier(isCashier);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    
    loadUser();
  }, []);

  
  useEffect(() => {
    loadPendingSales();
  }, []);

  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPendingSales();
      }
    };

    const handleFocus = () => {
      loadPendingSales();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  
  const loadPendingSales = async () => {
    setLoading(true);
    try {
      let sales: PendingSale[];
      
      if (isCashier && showOnlyMySales) {
        
        sales = await PendingSalesService.getCashierPendingSales();
      } else if (isCashier) {
        
        sales = await PendingSalesService.getAllPendingSales();
      } else {
        
        sales = await PendingSalesService.getAllPendingSales();
      }
      
      setPendingSales(sales);
      setFilteredSales(sales); 
    } catch (error) {
      console.error('Error loading pending sales:', error);
      toast.error('Failed to load pending sales');
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const checkForCompletedSales = async () => {
      try {
        const currentSales = await PendingSalesService.getAllPendingSales();
        const currentSaleIds = currentSales.map(sale => sale.id);
        const previousSaleIds = pendingSales.map(sale => sale.id);
        
        
        const completedSales = previousSaleIds.filter(id => !currentSaleIds.includes(id));
        
        if (completedSales.length > 0) {
          
          if (completingSaleId && completedSales.includes(completingSaleId)) {
            setCompletingSaleId(null);
          }
          
          
          setPendingSales(currentSales);
          setFilteredSales(currentSales);
          toast.success(`${completedSales.length} pending sale(s) completed and removed`);
        }
      } catch (error) {
        console.error('Error checking for completed sales:', error);
      }
    };

    
    const interval = setInterval(checkForCompletedSales, 3000);

    return () => clearInterval(interval);
  }, [pendingSales.length, completingSaleId]); 

  
  useEffect(() => {
    let filtered = pendingSales;

    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.identifier.toLowerCase().includes(searchLower) ||
        sale.customerName?.toLowerCase().includes(searchLower) ||
        sale.cashierName.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSales(filtered);
  }, [pendingSales, searchTerm, statusFilter]);

  
  const formatCurrency = (amount: number) => `${amount.toLocaleString()} XAF`;

  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  
  const getStatusBadge = (status: PendingSale['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-100 text-green-800">Open</Badge>;
      case 'partially_paid':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'on_hold':
        return <Badge variant="default" className="bg-gray-100 text-gray-800">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  
  const handleRecallSale = (sale: PendingSale) => {
    
    sessionStorage.setItem('recalledPendingSale', JSON.stringify(sale));
    
    
    setCompletingSaleId(sale.id);
    
    
    navigate('/pos');
    
    toast.success('Sale recalled to POS. You can now complete the transaction.');
  };

  
  const handlePartialPayment = async () => {
    if (!selectedSale || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedSale.remainingBalance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    const success = await PendingSalesService.processPartialPayment(
      selectedSale.id,
      amount,
      paymentMethod
    );

    if (success) {
      setPartialPaymentModal(false);
      setSelectedSale(null);
      setPaymentAmount('');
      loadPendingSales(); // Refresh the list
    }
  };

  // Handle delete sale
  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    const success = await PendingSalesService.deletePendingSale(saleToDelete.id, deletionReason);
    if (success) {
      setDeleteDialog(false);
      setSaleToDelete(null);
      setDeletionReason('');
      loadPendingSales(); // Refresh the list
    }
  };

  // Handle print receipt for pending sale
  const handlePrintReceipt = async (sale: PendingSale) => {
    try {
      // Get store information
      const storeInfo = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info');
      
      
      const partialPayments = await PendingSalesService.getPartialPayments(sale.id);
      
      
      const saleDetails = {
        id: sale.identifier,
        date: new Date(sale.createdAt).toLocaleString(),
        cashierName: sale.cashierName,
        items: sale.items.map(item => ({
          product: {
            id: item.productId,
            name: item.productName,
            price: item.price,
            category: '',
            stock: 0,
            unit: ''
          },
          quantity: item.quantity
        })),
        subtotal: sale.subtotal,
        taxRate: sale.taxRate,
        taxAmount: sale.taxAmount,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: 'pending',
        customerName: sale.customerName,
        
        amountGiven: sale.amountPaid,
        changeDue: 0,
        totalPaid: sale.amountPaid,
        remainingBalance: sale.remainingBalance,
        isPendingSale: true,
        saleIdentifier: sale.identifier,
        partialPayments: partialPayments.map(payment => ({
          amount: payment.amount,
          method: payment.paymentMethod,
          date: new Date(payment.processedAt).toLocaleString(),
          processedBy: payment.processedBy
        }))
      };

      const storeDetails = {
        name: storeInfo?.storeName || storeInfo?.name || 'Store',
        address: storeInfo?.address,
        phone: storeInfo?.phone,
        email: storeInfo?.email,
        currency: 'XAF',
        logo: storeInfo?.logo,
        slogan: storeInfo?.slogan
      };

      
      const { generateReceiptPDF } = await import('@/utils/receiptGenerator');
      const doc = generateReceiptPDF(saleDetails, storeDetails, 'en', {
        showLogo: true,
        showWatermark: true,
        format: 'A5'
      });

      
      doc.autoPrint();
      const pdfData = doc.output('datauristring');
      
      
      const printWindow = window.open();
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Pending Sale Receipt - ${sale.identifier}</title>
            </head>
            <body>
              <embed width="100%" height="100%" src="${pdfData}" type="application/pdf" />
              <script>
                document.addEventListener('DOMContentLoaded', function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 1000);
                });
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        
        const saveSuccess = await PendingSalesService.savePrintedReceiptToHistory(
          sale.id,
          'pending'
        );
        
        if (saveSuccess) {
          toast.success('Receipt printed and saved to sales history');
        } else {
          toast.error('Receipt printed but failed to save to sales history');
        }
      } else {
        toast.error('Print window was blocked. Please allow popups and try again.');
      }
    } catch (error) {
      console.error('Error printing pending sale receipt:', error);
      toast.error('Failed to print receipt');
    }
  };

  
  const handleNewPendingSale = () => {
    navigate('/pos');
  };

  
  const loadAvailableProducts = async () => {
    try {
      const products = await dbOperations.getAll<Product>(STORES.PRODUCTS);
      setAvailableProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  
  const handleOpenDetailsModal = async (sale: PendingSale) => {
    setSaleToView(sale);
    setEditableItems([...sale.items]);
    setIsEditing(false);
    setDetailsModal(true);
    await loadAvailableProducts();
  };

  
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      
      setEditableItems(prev => prev.filter((_, i) => i !== index));
    } else {
      setEditableItems(prev => prev.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  
  const handleRemoveItem = (index: number) => {
    setEditableItems(prev => prev.filter((_, i) => i !== index));
  };

  
  const handleAddItem = (product: Product) => {
    const existingItemIndex = editableItems.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      
      setEditableItems(prev => prev.map((item, i) => 
        i === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      
      setEditableItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
    setAddItemModal(false);
  };

  
  const handleSaveChanges = async () => {
    if (!saleToView) return;

    setSavingChanges(true);
    try {
      
      const cartItems: CartItem[] = editableItems.map(item => {
        
        const fullProduct = availableProducts.find(p => p.id === item.productId);
        
        if (!fullProduct) {
          throw new Error(`Product ${item.productName} not found`);
        }

        return {
          product: fullProduct,
          quantity: item.quantity
        };
      });

      const updatedSale = await PendingSalesService.updatePendingSaleItems(
        saleToView.id,
        cartItems
      );

      if (updatedSale) {
        toast.success('Changes saved successfully');
        setIsEditing(false);
        
        setPendingSales(prev => prev.map(sale => 
          sale.id === saleToView.id ? updatedSale : sale
        ));
        setSaleToView(updatedSale);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSavingChanges(false);
    }
  };

  
  const calculateEditableTotals = () => {
    const subtotal = editableItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = subtotal * ((saleToView?.taxRate || 0) / 100);
    const total = subtotal + taxAmount - (saleToView?.discount || 0);
    return { subtotal, taxAmount, total };
  };

  
  const handleViewHistory = async (sale: PendingSale) => {
    setLoadingHistory(true);
    setHistoryModal(true);
    try {
      const events = await PendingSalesService.getPendingSaleHistory(sale.id);
      setHistoryEvents(events);
    } catch (e) {
      toast.error('Failed to load history');
      setHistoryEvents([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading pending sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/pos')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back to POS</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pending Sales</h1>
            <p className="text-gray-600">Manage pending sales and transactions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isCashier && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Show only my sales:</label>
              <input
                type="checkbox"
                checked={showOnlyMySales}
                onChange={(e) => {
                  setShowOnlyMySales(e.target.checked);
                  
                  setTimeout(() => loadPendingSales(), 100);
                }}
                className="rounded border-gray-300"
              />
            </div>
          )}
          
          <Button
            onClick={loadPendingSales}
            variant="outline"
            size="sm"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button onClick={handleNewPendingSale} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" />
            New Sale
          </Button>
        </div>
      </div>

      {}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search by identifier, customer, or cashier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {}
      <div className="grid gap-4">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg">No pending sales found</p>
              <p className="text-gray-400">Create a new sale or check your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{sale.identifier}</h3>
                      {getStatusBadge(sale.status)}
                      {completingSaleId === sale.id && (
                        <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Completing...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Due</p>
                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount Paid</p>
                        <p className="font-semibold text-green-600">{formatCurrency(sale.amountPaid)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Remaining</p>
                        <p className="font-semibold text-red-600">{formatCurrency(sale.remainingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="font-semibold">{sale.items.length} items</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <p>Customer: {sale.customerName || 'Walk-in'}</p>
                      <p>Created by: {sale.cashierName} • {formatDate(sale.createdAt)}</p>
                      <p>Last modified: {formatDate(sale.lastModified)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      onClick={() => handleOpenDetailsModal(sale)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View Details
                    </Button>
                    
                    {(currentUser?.id === sale.cashierId || !isCashier) && (
                      <Button
                        onClick={() => handleRecallSale(sale)}
                        size="sm"
                        className="w-full"
                      >
                        Recall Sale
                      </Button>
                    )}
                    
                    {sale.remainingBalance > 0 && (
                      <Button
                        onClick={() => {
                          setSelectedSale(sale);
                          setPartialPaymentModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <CreditCard size={14} className="mr-2" />
                        Partial Payment
                      </Button>
                    )}
                    
                    {sale.remainingBalance <= 0 && (
                      <Button
                        onClick={async () => {
                          const success = await PendingSalesService.checkAndCompleteIfFullyPaid(sale.id);
                          if (success) {
                            toast.success('Sale completed and moved to sales history');
                            loadPendingSales();
                          } else {
                            toast.error('Failed to complete sale');
                          }
                        }}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle size={14} className="mr-2" />
                        Complete Sale
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handlePrintReceipt(sale)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Printer size={14} className="mr-2" />
                      Print Receipt
                    </Button>
                    
                    {canDelete && (
                      <Button
                        onClick={() => {
                          setSaleToDelete(sale);
                          setDeleteDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleViewHistory(sale)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {}
      <Dialog open={partialPaymentModal} onOpenChange={setPartialPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Partial Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSale && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{selectedSale.identifier}</p>
                <p className="text-sm text-gray-600">
                  Remaining balance: {formatCurrency(selectedSale.remainingBalance)}
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Payment Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedSale?.remainingBalance || 0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePartialPayment}>
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pending Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pending sale? This action will archive the sale for audit purposes.
              {saleToDelete && (
                <div className="mt-2 p-2 bg-red-50 rounded">
                  <p className="font-medium">{saleToDelete.identifier}</p>
                  <p className="text-sm text-gray-600">Total: {formatCurrency(saleToDelete.total)}</p>
                  <p className="text-sm text-gray-600">Created by: {saleToDelete.cashierName}</p>
                </div>
              )}
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Reason for deletion (optional):</label>
                <Input
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
                  className="w-full"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletionReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sale Details Modal */}
      <Dialog open={detailsModal} onOpenChange={setDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pending Sale Details</span>
              {saleToView && (
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSaveChanges}
                        disabled={savingChanges}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {savingChanges ? (
                          <Loader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                          <Save size={14} className="mr-2" />
                        )}
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          setEditableItems([...saleToView.items]);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X size={14} className="mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    canEdit && (
                      // Cashiers can only edit their own sales, admin/manager can edit any sale
                      (!isCashier || (isCashier && currentUser?.id === saleToView.cashierId)) && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit3 size={14} className="mr-2" />
                          Edit
                        </Button>
                      )
                    )
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {saleToView && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-2">{saleToView.identifier}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{getStatusBadge(saleToView.status)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created by</p>
                    <p className="font-medium">{saleToView.cashierName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{saleToView.customerName || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(saleToView.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Items</h4>
                  {isEditing && canEdit && (
                    
                    (!isCashier || (isCashier && currentUser?.id === saleToView.cashierId)) && (
                      <Button
                        onClick={() => setAddItemModal(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus size={14} className="mr-2" />
                        Add Item
                      </Button>
                    )
                  )}
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(isEditing ? editableItems : saleToView.items).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      
                      {isEditing ? (
                        
                        (!isCashier || (isCashier && currentUser?.id === saleToView.cashierId)) ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <Button
                                onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                variant="outline"
                                size="sm"
                                className="w-8 h-8 p-0"
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                variant="outline"
                                size="sm"
                                className="w-8 h-8 p-0"
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              onClick={() => handleRemoveItem(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ) : (
                          <p className="font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        )
                      ) : (
                        <p className="font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {isEditing && editableItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No items in this sale. Click "Add Item" to add products.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="space-y-2">
                  {(() => {
                    const totals = isEditing ? calculateEditableTotals() : {
                      subtotal: saleToView.subtotal,
                      taxAmount: saleToView.taxAmount,
                      total: saleToView.total
                    };
                    
                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({saleToView.taxRate}%)</span>
                          <span>{formatCurrency(totals.taxAmount)}</span>
                        </div>
                        {saleToView.discount > 0 && (
                          <div className="flex justify-between">
                            <span>Discount</span>
                            <span>-{formatCurrency(saleToView.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{formatCurrency(totals.total)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModal(false)}>
              Close
            </Button>
            {saleToView && !isEditing && (
              <Button onClick={() => {
                setDetailsModal(false);
                handleRecallSale(saleToView);
              }}>
                Recall Sale
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={addItemModal} onOpenChange={setAddItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Sale</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleAddItem(product)}
                  className="flex justify-between items-center p-3 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(product.price)}</p>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={historyModal} onOpenChange={setHistoryModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending Sale History</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2" /> Loading history...
            </div>
          ) : (
            <div className="space-y-4">
              {historyEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No history found for this sale.</div>
              ) : (
                <ul className="space-y-2">
                  {historyEvents.map((event) => (
                    <li key={event.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{event.type.replace(/_/g, ' ').toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {event.userName && <span>By: {event.userName}</span>}
                        {event.details && (
                          <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto">{JSON.stringify(event.details, null, 2)}</pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingSales; 
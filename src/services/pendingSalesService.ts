import { dbOperations, STORES } from '@/lib/db';
import { PendingSale, PartialPayment, PendingSaleEvent, PendingSaleEventType } from '@/types/sales';
import { CartItem } from '@/components/pos/types';
import { generateId } from '@/lib/crypto';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';
import { generateUsernameReceiptId } from '@/utils/receiptGenerator';
import { CustomerAnalyticsService } from '@/services/customerAnalyticsService';
import { db } from '@/lib/dexieDb';

export class PendingSalesService {
  
  static async createPendingSale(
    items: CartItem[],
    identifier: string,
    taxRate: number,
    discount: number = 0,
    customerName?: string,
    customerId?: string,
    notes?: string
  ): Promise<PendingSale> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount - discount;

      const pendingSale: PendingSale = {
        id: generateId(),
        identifier,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        amountPaid: 0,
        remainingBalance: total,
        status: 'open',
        customerName,
        customerId,
        userId: currentUser.id,
        cashierName: currentUser.name,
        cashierId: currentUser.id,
        createdAt: Date.now(),
        lastModified: Date.now(),
        notes
      };

      await dbOperations.add(STORES.PENDING_SALES, pendingSale);
      await this.logPendingSaleEvent(
        pendingSale.id,
        'created',
        currentUser.id,
        currentUser.name,
        { items: pendingSale.items, identifier, taxRate, discount, customerName, customerId, notes }
      );
      toast.success('Sale saved as pending');
      return pendingSale;
    } catch (error) {
      console.error('Error creating pending sale:', error);
      toast.error('Failed to save pending sale');
      throw error;
    }
  }

  
  static async getAllPendingSales(): Promise<PendingSale[]> {
    try {
      const pendingSales = await dbOperations.getAll<PendingSale>(STORES.PENDING_SALES);
      
      const activeSales = pendingSales.filter(sale => !sale.isDeleted);
      return activeSales.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Error fetching pending sales:', error);
      toast.error('Failed to load pending sales');
      return [];
    }
  }

  
  static async getAllPendingSalesIncludingDeleted(): Promise<PendingSale[]> {
    try {
      const pendingSales = await dbOperations.getAll<PendingSale>(STORES.PENDING_SALES);
      return pendingSales.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Error fetching all pending sales:', error);
      toast.error('Failed to load pending sales');
      return [];
    }
  }

  
  static async getCashierPendingSales(): Promise<PendingSale[]> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const pendingSales = await dbOperations.getAll<PendingSale>(STORES.PENDING_SALES);
      
      const cashierSales = pendingSales.filter(sale => 
        sale.cashierId === currentUser.id && !sale.isDeleted
      );
      return cashierSales.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Error fetching cashier pending sales:', error);
      toast.error('Failed to load your pending sales');
      return [];
    }
  }

  
  static async getPendingSale(id: string): Promise<PendingSale | null> {
    try {
      const pendingSale = await dbOperations.get<PendingSale>(STORES.PENDING_SALES, id);
      return pendingSale || null;
    } catch (error) {
      console.error('Error fetching pending sale:', error);
      return null;
    }
  }

  
  static async updatePendingSale(id: string, updates: Partial<PendingSale>): Promise<PendingSale | null> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const existingSale = await this.getPendingSale(id);
      if (!existingSale) {
        throw new Error('Pending sale not found');
      }

      const updatedSale: PendingSale = {
        ...existingSale,
        ...updates,
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, updatedSale);
      toast.success('Pending sale updated');
      return updatedSale;
    } catch (error) {
      console.error('Error updating pending sale:', error);
      toast.error('Failed to update pending sale');
      return null;
    }
  }

  
  static async deletePendingSale(id: string, reason?: string): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        throw new Error('Insufficient permissions to delete pending sales');
      }

      const existingSale = await this.getPendingSale(id);
      if (!existingSale) {
        throw new Error('Pending sale not found');
      }

      
      const softDeletedSale: PendingSale = {
        ...existingSale,
        status: 'deleted',
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: currentUser.name,
        deletionReason: reason || 'Deleted by admin/manager',
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, softDeletedSale);
      await this.logPendingSaleEvent(
        id,
        'deleted',
        currentUser.id,
        currentUser.name,
        { reason }
      );
      toast.success('Pending sale deleted (archived for audit)');
      return true;
    } catch (error) {
      console.error('Error soft deleting pending sale:', error);
      toast.error('Failed to delete pending sale');
      return false;
    }
  }

  
  static async restorePendingSale(id: string): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        throw new Error('Insufficient permissions to restore pending sales');
      }

      const existingSale = await dbOperations.get<PendingSale>(STORES.PENDING_SALES, id);
      if (!existingSale) {
        throw new Error('Pending sale not found');
      }

      if (!existingSale.isDeleted) {
        throw new Error('Pending sale is not deleted');
      }

      
      const restoredSale: PendingSale = {
        ...existingSale,
        status: existingSale.remainingBalance === 0 ? 'open' : 'partially_paid',
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined,
        deletionReason: undefined,
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, restoredSale);
      await this.logPendingSaleEvent(
        id,
        'restored',
        currentUser.id,
        currentUser.name,
        {}
      );
      toast.success('Pending sale restored');
      return true;
    } catch (error) {
      console.error('Error restoring pending sale:', error);
      toast.error('Failed to restore pending sale');
      return false;
    }
  }

  
  static async processPartialPayment(
    pendingSaleId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const pendingSale = await this.getPendingSale(pendingSaleId);
      if (!pendingSale) {
        throw new Error('Pending sale not found');
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      if (amount > pendingSale.remainingBalance) {
        throw new Error('Payment amount cannot exceed remaining balance');
      }

      const newAmountPaid = pendingSale.amountPaid + amount;
      const newRemainingBalance = pendingSale.total - newAmountPaid;
      const newStatus = newRemainingBalance === 0 ? 'open' : 'partially_paid';

      const updatedSale: PendingSale = {
        ...pendingSale,
        amountPaid: newAmountPaid,
        remainingBalance: newRemainingBalance,
        status: newStatus,
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, updatedSale);

      
      const partialPayment: PartialPayment = {
        id: generateId(),
        pendingSaleId,
        amount,
        paymentMethod,
        processedBy: currentUser.name,
        processedAt: Date.now(),
        notes
      };

      
      await dbOperations.add(STORES.PARTIAL_PAYMENTS, partialPayment);
      await this.logPendingSaleEvent(
        pendingSaleId,
        'payment',
        currentUser.id,
        currentUser.name,
        { amount, paymentMethod, notes }
      );

      
      if (newRemainingBalance <= 0) {
        const completionSuccess = await this.completePendingSale(
          pendingSaleId,
          amount, 
          paymentMethod
        );
        
        if (completionSuccess) {
          toast.success(`Sale completed! Total payment of ${newAmountPaid.toFixed(2)} received`);
        } else {
          toast.success(`Partial payment of ${amount.toFixed(2)} processed. Sale is now fully paid but completion failed.`);
        }
      } else {
        toast.success(`Partial payment of ${amount.toFixed(2)} processed`);
      }
      
      return true;
    } catch (error) {
      console.error('Error processing partial payment:', error);
      toast.error('Failed to process partial payment');
      return false;
    }
  }

  
  static async getPartialPayments(pendingSaleId: string): Promise<PartialPayment[]> {
    try {
      const allPayments = await dbOperations.getAll<PartialPayment>(STORES.PARTIAL_PAYMENTS);
      return allPayments
        .filter(payment => payment.pendingSaleId === pendingSaleId)
        .sort((a, b) => a.processedAt - b.processedAt);
    } catch (error) {
      console.error('Error fetching partial payments:', error);
      return [];
    }
  }

  
  static async completePendingSale(
    pendingSaleId: string,
    finalPaymentAmount: number,
    paymentMethod: string
  ): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const pendingSale = await this.getPendingSale(pendingSaleId);
      if (!pendingSale) {
        throw new Error('Pending sale not found');
      }

      
      const totalPaid = pendingSale.amountPaid + finalPaymentAmount;
      if (totalPaid < pendingSale.total) {
        throw new Error('Final payment must cover the remaining balance');
      }

      
      const completedSale = {
        id: generateId(),
        receiptId: await generateUsernameReceiptId(),
        date: Date.now(),
        total: pendingSale.total,
        subtotal: pendingSale.subtotal,
        taxRate: pendingSale.taxRate,
        taxAmount: pendingSale.taxAmount,
        discount: pendingSale.discount,
        items: pendingSale.items,
        paymentMethod,
        cashierName: currentUser.name,
        cashierId: currentUser.id,
        userId: currentUser.id,
        status: 'completed',
        customerName: pendingSale.customerName,
        customerId: pendingSale.customerId,
        
        amountGiven: finalPaymentAmount,
        changeDue: finalPaymentAmount - (pendingSale.total - pendingSale.amountPaid),
        totalPaid: totalPaid,
        
        isPrintedReceipt: false,
        originalPendingSaleId: pendingSaleId
      };

      
      await dbOperations.add(STORES.SALES, completedSale);

      
      await CustomerAnalyticsService.updateCustomerAnalytics();
      
      
      
      
      
      
      
      
      
      
      
      

      
      await dbOperations.delete(STORES.PENDING_SALES, pendingSaleId);

      toast.success('Sale completed successfully');
      return true;
    } catch (error) {
      console.error('Error completing pending sale:', error);
      toast.error('Failed to complete sale');
      return false;
    }
  }

  
  static async searchPendingSales(query: string): Promise<PendingSale[]> {
    try {
      const allSales = await this.getAllPendingSales();
      const searchTerm = query.toLowerCase();
      
      return allSales.filter(sale => 
        sale.identifier.toLowerCase().includes(searchTerm) ||
        sale.customerName?.toLowerCase().includes(searchTerm) ||
        sale.cashierName.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching pending sales:', error);
      return [];
    }
  }

  
  static async filterPendingSalesByStatus(status: PendingSale['status']): Promise<PendingSale[]> {
    try {
      const allSales = await this.getAllPendingSales();
      return allSales.filter(sale => sale.status === status);
    } catch (error) {
      console.error('Error filtering pending sales:', error);
      return [];
    }
  }

  
  static async updatePendingSaleItems(
    pendingSaleId: string,
    items: CartItem[]
  ): Promise<PendingSale | null> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const existingSale = await this.getPendingSale(pendingSaleId);
      
      if (!existingSale) {
        
        const allSales = await this.getAllPendingSalesIncludingDeleted();
        const deletedSale = allSales.find(sale => sale.id === pendingSaleId);
        
        if (deletedSale) {
          throw new Error(`Pending sale not found or has been deleted (ID: ${pendingSaleId})`);
        } else {
          throw new Error(`Pending sale not found in database (ID: ${pendingSaleId})`);
        }
      }

      
      if (existingSale.cashierId !== currentUser.id && currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        throw new Error('You can only edit your own pending sales');
      }

      
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const taxAmount = subtotal * (existingSale.taxRate / 100);
      const total = subtotal + taxAmount - existingSale.discount;
      const remainingBalance = total - existingSale.amountPaid;

      const updatedSale: PendingSale = {
        ...existingSale,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        subtotal,
        taxAmount,
        total,
        remainingBalance,
        status: remainingBalance === 0 ? 'open' : (existingSale.amountPaid > 0 ? 'partially_paid' : 'open'),
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, updatedSale);
      await this.logPendingSaleEvent(
        pendingSaleId,
        'items_bulk_update',
        currentUser.id,
        currentUser.name,
        { before: existingSale.items, after: updatedSale.items }
      );
      toast.success('Pending sale items updated');
      return updatedSale;
    } catch (error) {
      toast.error('Failed to update pending sale items');
      return null;
    }
  }

  
  static async checkAndCompleteIfFullyPaid(pendingSaleId: string): Promise<boolean> {
    try {
      const pendingSale = await this.getPendingSale(pendingSaleId);
      if (!pendingSale) {
        return false;
      }

      
      if (pendingSale.amountPaid >= pendingSale.total) {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        
        const partialPayments = await this.getPartialPayments(pendingSaleId);
        const lastPayment = partialPayments[partialPayments.length - 1];
        const paymentMethod = lastPayment ? lastPayment.paymentMethod : 'cash';

        
        return await this.completePendingSale(
          pendingSaleId,
          pendingSale.amountPaid - (pendingSale.total - pendingSale.remainingBalance),
          paymentMethod
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking if pending sale is fully paid:', error);
      return false;
    }
  }

  
  static async savePrintedReceiptToHistory(
    pendingSaleId: string,
    paymentMethod: string = 'pending',
    cleanupPartialPayments: boolean = false
  ): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const pendingSale = await this.getPendingSale(pendingSaleId);
      if (!pendingSale) {
        throw new Error('Pending sale not found');
      }

      
      const completedSale = {
        id: generateId(),
        receiptId: await generateUsernameReceiptId(),
        date: Date.now(),
        total: pendingSale.total,
        subtotal: pendingSale.subtotal,
        taxRate: pendingSale.taxRate,
        taxAmount: pendingSale.taxAmount,
        discount: pendingSale.discount,
        items: pendingSale.items,
        paymentMethod,
        cashierName: currentUser.name,
        cashierId: currentUser.id,
        userId: currentUser.id,
        status: 'completed',
        customerName: pendingSale.customerName,
        customerId: pendingSale.customerId,
        
        amountGiven: pendingSale.amountPaid,
        changeDue: 0,
        totalPaid: pendingSale.amountPaid,
        
        isPrintedReceipt: true,
        originalPendingSaleId: pendingSaleId
      };

      
      await dbOperations.add(STORES.SALES, completedSale);

      
      if (cleanupPartialPayments) {
        await this.cleanupPartialPayments(pendingSaleId);
      }

      return true;
    } catch (error) {
      console.error('Error saving printed receipt to history:', error);
      return false;
    }
  }

  
  static async cleanupPartialPayments(pendingSaleId: string): Promise<boolean> {
    try {
      const partialPayments = await this.getPartialPayments(pendingSaleId);
      for (const payment of partialPayments) {
        await dbOperations.delete(STORES.PARTIAL_PAYMENTS, payment.id);
      }
      return true;
    } catch (error) {
      console.error('Error cleaning up partial payments:', error);
      return false;
    }
  }

  
  static async holdSaleAsPending(
    items: CartItem[],
    identifier: string,
    taxRate: number,
    discount: number = 0,
    customerName?: string,
    customerId?: string,
    notes?: string
  ): Promise<PendingSale> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (items.length === 0) {
        throw new Error('Cannot hold an empty sale');
      }

      return await this.createPendingSale(
        items,
        identifier,
        taxRate,
        discount,
        customerName,
        customerId,
        notes
      );
    } catch (error) {
      console.error('Error holding sale as pending:', error);
      throw error;
    }
  }

  
  static async recallCashierPendingSale(pendingSaleId: string): Promise<PendingSale | null> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const pendingSale = await this.getPendingSale(pendingSaleId);
      if (!pendingSale) {
        throw new Error('Pending sale not found');
      }

      
      if (pendingSale.cashierId !== currentUser.id && currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        throw new Error('You can only recall your own pending sales');
      }

      
      const updatedSale: PendingSale = {
        ...pendingSale,
        lastModified: Date.now()
      };

      await dbOperations.put(STORES.PENDING_SALES, updatedSale);
      await this.logPendingSaleEvent(
        pendingSaleId,
        'recalled',
        currentUser.id,
        currentUser.name,
        {}
      );
      toast.success('Pending sale recalled');
      return updatedSale;
    } catch (error) {
      console.error('Error recalling pending sale:', error);
      toast.error('Failed to recall pending sale');
      return null;
    }
  }

  
  static async getCashierPendingSalesStats(): Promise<{
    totalPending: number;
    totalValue: number;
    partiallyPaid: number;
    fullyPaid: number;
  }> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const cashierSales = await this.getCashierPendingSales();
      
      const stats = {
        totalPending: cashierSales.length,
        totalValue: cashierSales.reduce((sum, sale) => sum + sale.total, 0),
        partiallyPaid: cashierSales.filter(sale => sale.status === 'partially_paid').length,
        fullyPaid: cashierSales.filter(sale => sale.remainingBalance === 0).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting cashier pending sales stats:', error);
      return {
        totalPending: 0,
        totalValue: 0,
        partiallyPaid: 0,
        fullyPaid: 0
      };
    }
  }

  
  static async logPendingSaleEvent(
    pendingSaleId: string,
    type: PendingSaleEventType,
    userId: string,
    userName: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    const event: PendingSaleEvent = {
      id: generateId(),
      pendingSaleId,
      type,
      timestamp: Date.now(),
      userId,
      userName,
      details,
    };
    await dbOperations.add(STORES.PENDING_SALE_EVENTS, event);
  }

  
  static async getPendingSaleHistory(pendingSaleId: string): Promise<PendingSaleEvent[]> {
    const events = await db.pendingSaleEvents.where('pendingSaleId').equals(pendingSaleId).toArray();
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
} 
import { useState } from 'react';
import { toast } from 'sonner';
import { dbOperations, STORES } from '@/lib/db';
import { generateId } from '@/lib/crypto';
import { getCurrentUser } from '@/lib/auth';
import { printSaleReceipt } from '@/utils/printingService';
import { generateSequentialReceiptId } from '@/utils/receiptGenerator';
import { generateUsernameReceiptId } from '@/utils/receiptGenerator';
import { CartItem, Product, Customer } from '../types';
import { Sale } from '@/types/sales';
import { StoreInfo } from '@/types/settings';
import { CreditService } from '@/services/creditService';
import { CustomerWithCredit } from '@/types/credit';
import { CustomerAnalyticsService } from '@/services/customerAnalyticsService';

export function useSale() {
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);

  const processSale = async (
    cartItems: CartItem[], 
    taxRate: number, 
    discount: number,
    paymentMethod: string,
    storeInfo: StoreInfo | null,
    customer: CustomerWithCredit | null,
    amountGiven?: number,
    changeDue?: number,
    isPaymentComplete?: boolean
  ) => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return false;
    }
    
    if (isProcessingSale) {
      return false; 
    }
    
    setIsProcessingSale(true);
    
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        toast.error('User session expired. Please log in again.');
        setIsProcessingSale(false);
        return false;
      }
      
      
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount - discount;
      
      
      if (paymentMethod === 'cash' && amountGiven !== undefined) {
        if (amountGiven < total) {
          toast.error('Amount given must be at least the total due');
          setIsProcessingSale(false);
          return false;
        }
      }
      
      
      if (customer && paymentMethod === 'credit') {
        
        const newBalance = customer.balance - total;
        if (newBalance < -customer.creditLimit) {
          toast.error('Insufficient credit: This sale exceeds the customer\'s credit limit.');
          setIsProcessingSale(false);
          return false;
        }
        
        
        const creditProcessed = await CreditService.processCreditSale(customer.id, total);
        if (!creditProcessed) {
          setIsProcessingSale(false);
          return false;
        }
      }
      
      
      const receiptId = await generateUsernameReceiptId();
      
      
      const saleId = generateId();
      const sale: Sale = {
        id: saleId,
        receiptId,
        items: cartItems.map(item => ({
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
        paymentMethod,
        userId: user.id,
        cashierId: user.id,
        cashierName: user.name,
        date: Date.now(),
        status: 'completed',
        customerName: customer ? customer.name : undefined,
        customerId: customer ? customer.id : undefined,
        amountGiven,
        changeDue,
        totalPaid: amountGiven || total
      };
      
      
      await dbOperations.add(STORES.SALES, sale);
      
      // Update customer analytics after sale completion
      if (customer) {
        try {
          await CustomerAnalyticsService.onSaleCompleted(sale);
        } catch (analyticsError) {
          console.error('Error updating customer analytics:', analyticsError);
          // Don't fail the sale if analytics update fails
        }
      }
      
      // Update product stock levels
      for (const item of cartItems) {
        const product = await dbOperations.get<Product>(STORES.PRODUCTS, item.product.id);
        if (product) {
          product.stock -= item.quantity;
          await dbOperations.put(STORES.PRODUCTS, product);
        }
      }
      
      
      try {
        const printSuccess = await printSaleReceipt(saleId);
        if (printSuccess) {
          toast.success('Receipt printed successfully');
        }
      } catch (printError) {
        console.error('Error printing receipt:', printError);
        toast.error('Failed to print receipt, but sale was completed');
      }
      
      toast.success('Sale completed successfully!');
      return true;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process sale');
      return false;
    } finally {
      setIsProcessingSale(false);
    }
  };

  return {
    isProcessingSale,
    processSale
  };
}

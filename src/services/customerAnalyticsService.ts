import { dbOperations, STORES } from '@/lib/db';
import { Sale } from '@/types/sales';
import { Customer } from '@/components/pos/types';

export interface CustomerAnalytics {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate: number | null;
  lastPurchaseAmount: number | null;
  averageOrderValue: number;
  purchaseHistory: Array<{
    saleId: string;
    date: number;
    amount: number;
    items: number;
  }>;
}

export interface CustomerAnalyticsRecord {
  id: string;
  timestamp: number;
  analytics: CustomerAnalytics[];
}

export class CustomerAnalyticsService {
  /**
   * Calculate analytics for all customers based on their sales history
   */
  static async calculateAllCustomerAnalytics(): Promise<CustomerAnalytics[]> {
    try {
      const customers = await dbOperations.getAll<Customer>(STORES.CUSTOMERS);
      const sales = await dbOperations.getAll<Sale>(STORES.SALES);
      
      const analytics: CustomerAnalytics[] = [];
      
      for (const customer of customers) {
        const customerSales = sales.filter(sale => sale.customerId === customer.id);
        
        if (customerSales.length === 0) {
          // Customer with no purchases
          analytics.push({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            totalPurchases: 0,
            totalSpent: 0,
            lastPurchaseDate: null,
            lastPurchaseAmount: null,
            averageOrderValue: 0,
            purchaseHistory: []
          });
          continue;
        }
        
        // Calculate analytics
        const totalPurchases = customerSales.length;
        const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
        const averageOrderValue = totalSpent / totalPurchases;
        
        // Find last purchase
        const sortedSales = customerSales.sort((a, b) => b.date - a.date);
        const lastPurchase = sortedSales[0];
        
        // Create purchase history
        const purchaseHistory = customerSales.map(sale => ({
          saleId: sale.id,
          date: sale.date,
          amount: sale.total,
          items: sale.items.length
        }));
        
        analytics.push({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalPurchases,
          totalSpent,
          lastPurchaseDate: lastPurchase.date,
          lastPurchaseAmount: lastPurchase.total,
          averageOrderValue,
          purchaseHistory
        });
      }
      
      return analytics;
    } catch (error) {
      console.error('Error calculating customer analytics:', error);
      throw new Error('Failed to calculate customer analytics');
    }
  }
  
  /**
   * Update customer analytics in the database
   */
  static async updateCustomerAnalytics(): Promise<void> {
    try {
      const analytics = await this.calculateAllCustomerAnalytics();
      
      // Store analytics in settings store
      const analyticsRecord: CustomerAnalyticsRecord = {
        id: 'customer-analytics',
        timestamp: Date.now(),
        analytics
      };
      
      await dbOperations.put(STORES.SETTINGS, analyticsRecord);
      
      console.log(`✅ Updated analytics for ${analytics.length} customers`);
    } catch (error) {
      console.error('Error updating customer analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get customer analytics from the database
   */
  static async getCustomerAnalytics(): Promise<CustomerAnalytics[]> {
    try {
      const analyticsRecord = await dbOperations.get<CustomerAnalyticsRecord>(STORES.SETTINGS, 'customer-analytics');
      return analyticsRecord?.analytics || [];
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      return [];
    }
  }
  
  /**
   * Get analytics for a specific customer
   */
  static async getCustomerAnalyticsById(customerId: string): Promise<CustomerAnalytics | null> {
    try {
      const analytics = await this.getCustomerAnalytics();
      return analytics.find(c => c.id === customerId) || null;
    } catch (error) {
      console.error('Error getting customer analytics by ID:', error);
      return null;
    }
  }
  
  /**
   * Trigger analytics update when a new sale is made
   */
  static async onSaleCompleted(sale: Sale): Promise<void> {
    try {
      // Update analytics for the specific customer
      if (sale.customerId) {
        await this.updateCustomerAnalytics();
      }
    } catch (error) {
      console.error('Error updating analytics after sale:', error);
    }
  }
} 
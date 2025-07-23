
import { dbOperations, STORES } from '@/lib/db';
import { generateId } from '@/lib/crypto';
import { getCurrentUser } from '@/lib/auth';
import { CreditPayment, CustomerWithCredit } from '@/types/credit';
import { toast } from 'sonner';
import { db } from '@/lib/dexieDb';

export class CreditService {
    static async checkCreditLimit(customerId: string, saleAmount: number): Promise<boolean> {
    try {
      const customer = await dbOperations.get<CustomerWithCredit>(STORES.CUSTOMERS, customerId);
      if (!customer) return false;
      
      const newBalance = customer.balance - saleAmount;
      return newBalance >= -customer.creditLimit;
    } catch (error) {
      console.error('Error checking credit limit:', error);
      return false;
    }
  }

    static async processCreditSale(customerId: string, saleAmount: number): Promise<boolean> {
    try {
      const customer = await dbOperations.get<CustomerWithCredit>(STORES.CUSTOMERS, customerId);
      if (!customer) {
        toast.error('Customer not found');
        return false;
      }

      const newBalance = customer.balance - saleAmount;
      
      
      if (newBalance < -customer.creditLimit) {
        const availableCredit = customer.creditLimit + customer.balance;
        toast.error(
          `Insufficient credit: Available credit is $${availableCredit.toFixed(2)}, but sale amount is $${saleAmount.toFixed(2)}`
        );
        return false;
      }

      
      customer.balance = newBalance;
      await dbOperations.put(STORES.CUSTOMERS, customer);
      
      console.log(`Credit sale processed: Customer ${customer.name}, New balance: $${newBalance.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('Error processing credit sale:', error);
      toast.error('Failed to process credit sale');
      return false;
    }
  }

    static async addCreditPayment(customerId: string, amount: number, note: string): Promise<boolean> {
    try {
      if (amount <= 0) {
        toast.error('Payment amount must be greater than zero');
        return false;
      }

      const user = await getCurrentUser();
      if (!user) {
        toast.error('User not found');
        return false;
      }

      
      const customer = await dbOperations.get<CustomerWithCredit>(STORES.CUSTOMERS, customerId);
      if (!customer) {
        toast.error('Customer not found');
        return false;
      }

      const oldBalance = customer.balance;
      customer.balance += amount;
      await dbOperations.put(STORES.CUSTOMERS, customer);

      
      const payment: CreditPayment = {
        id: generateId(),
        customerId,
        amount,
        note: note || `Credit payment of $${amount.toFixed(2)}`,
        timestamp: Date.now(),
        userId: user.id,
        userName: user.name
      };

      await dbOperations.add(STORES.CREDIT_PAYMENTS, payment);
      
      console.log(`Credit payment added: Customer ${customer.name}, Amount: $${amount}, Old balance: $${oldBalance.toFixed(2)}, New balance: $${customer.balance.toFixed(2)}`);
      toast.success(`Credit payment of $${amount.toFixed(2)} added successfully`);
      return true;
    } catch (error) {
      console.error('Error adding credit payment:', error);
      toast.error('Failed to add credit payment');
      return false;
    }
  }

    static async getCreditHistory(customerId: string): Promise<CreditPayment[]> {
    try {
      return await db.creditPayments.where('customerId').equals(customerId).toArray();
    } catch (error) {
      console.error('Error getting credit history:', error);
      return [];
    }
  }

    static async updateCreditLimit(customerId: string, newLimit: number): Promise<boolean> {
    try {
      const customer = await dbOperations.get<CustomerWithCredit>(STORES.CUSTOMERS, customerId);
      if (!customer) {
        toast.error('Customer not found');
        return false;
      }

      customer.creditLimit = newLimit;
      await dbOperations.put(STORES.CUSTOMERS, customer);
      toast.success('Credit limit updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating credit limit:', error);
      toast.error('Failed to update credit limit');
      return false;
    }
  }
}


import { SaleRecord } from '@/types/backup';

export class SummaryGenerator {
    static generateSalesSummary(sales: SaleRecord[]): any {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
    
    const paymentBreakdown = sales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
    
    const cashierBreakdown = sales.reduce((acc, sale) => {
      const cashier = sale.cashierName || 'Unknown';
      acc[cashier] = (acc[cashier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      date: new Date().toLocaleDateString(),
      totalSales,
      totalTransactions: sales.length,
      totalItems,
      paymentBreakdown,
      cashierBreakdown
    };
  }
}

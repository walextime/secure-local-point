

import { dbOperations, STORES } from '@/lib/db';

export interface DataPreview {
  customers: CustomerPreview[];
  inventory: ProductPreview[];
  sales: SalePreview[];
  summary: BackupSummary;
}

export interface CustomerPreview {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
  creditLimit: number;
  availableCredit: number;
  totalPurchases: number;
  lastPurchase: Date | null;
}

export interface ProductPreview {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  totalSold: number;
}

export interface SalePreview {
  id: string;
  date: Date;
  total: number;
  items: number;
  paymentMethod: string;
  customerName?: string;
}

export interface BackupSummary {
  totalCustomers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCategories: { category: string; count: number }[];
  recentActivity: { type: string; count: number; date: Date }[];
}


export const generateBackupPreview = async (selectedData: {
  customers: boolean;
  inventory: boolean;
  sales: boolean;
}): Promise<DataPreview> => {
  const preview: DataPreview = {
    customers: [],
    inventory: [],
    sales: [],
    summary: {
      totalCustomers: 0,
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topCategories: [],
      recentActivity: []
    }
  };

  try {
    
    if (selectedData.customers) {
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      const sales = await dbOperations.getAll(STORES.SALES);
      
      preview.customers = customers.slice(0, 10).map(customer => {
        const customerSales = sales.filter(sale => sale.customerId === customer.id);
        const totalPurchases = customerSales.length;
        const lastPurchase = customerSales.length > 0 
          ? new Date(Math.max(...customerSales.map(s => new Date(s.date).getTime())))
          : null;

        const balance = customer.balance || 0;
        const creditLimit = customer.creditLimit || 0;
        const availableCredit = creditLimit + balance;
        
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          balance,
          creditLimit,
          availableCredit,
          totalPurchases,
          lastPurchase
        };
      });
      
      preview.summary.totalCustomers = customers.length;
    }

    // Load inventory if selected
    if (selectedData.inventory) {
      const products = await dbOperations.getAll(STORES.PRODUCTS);
      const sales = await dbOperations.getAll(STORES.SALES);
      
      preview.inventory = products.slice(0, 10).map(product => {
        const productSales = sales.flatMap(sale => 
          sale.items?.filter(item => item.productId === product.id) || []
        );
        const totalSold = productSales.reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
          id: product.id,
          name: product.name,
          category: product.category || 'Uncategorized',
          price: product.price,
          stock: product.stock,
          totalSold
        };
      });
      
      preview.summary.totalProducts = products.length;
      
      
      const categoryCounts = products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      preview.summary.topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    
    if (selectedData.sales) {
      const sales = await dbOperations.getAll(STORES.SALES);
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      
      preview.sales = sales.slice(0, 10).map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const items = sale.items?.length || 0;

        return {
          id: sale.id,
          date: new Date(sale.date),
          total: sale.total,
          items,
          paymentMethod: sale.paymentMethod || 'Unknown',
          customerName: customer?.name
        };
      });
      
      preview.summary.totalSales = sales.length;
      preview.summary.totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      preview.summary.averageOrderValue = sales.length > 0 
        ? preview.summary.totalRevenue / sales.length 
        : 0;
      
      
      const now = new Date();
      const last7Days = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });
      
      const last30Days = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      });
      
      preview.summary.recentActivity = [
        { type: 'Sales (7 days)', count: last7Days.length, date: now },
        { type: 'Sales (30 days)', count: last30Days.length, date: now }
      ];
    }

  } catch (error) {
    console.error('Error generating backup preview:', error);
  }

  return preview;
};


export const estimateBackupSize = async (selectedData: {
  customers: boolean;
  inventory: boolean;
  sales: boolean;
}): Promise<{ humanReadable: number; system: number }> => {
  let humanReadableSize = 0;
  let systemSize = 0;

  try {
    if (selectedData.customers) {
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      humanReadableSize += customers.length * 200; 
      systemSize += customers.length * 300; 
    }

    if (selectedData.inventory) {
      const products = await dbOperations.getAll(STORES.PRODUCTS);
      humanReadableSize += products.length * 150; 
      systemSize += products.length * 250; 
    }

    if (selectedData.sales) {
      const sales = await dbOperations.getAll(STORES.SALES);
      humanReadableSize += sales.length * 300; 
      systemSize += sales.length * 500; 
    }

    
    humanReadableSize = Math.max(humanReadableSize + 1024, 2048); 
    systemSize = Math.max(systemSize + 2048, 4096); 

  } catch (error) {
    console.error('Error estimating backup size:', error);
  }

  return {
    humanReadable: humanReadableSize,
    system: systemSize
  };
};


export const validateBackupData = async (): Promise<{
  isValid: boolean;
  issues: string[];
  warnings: string[];
}> => {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    
    const sales = await dbOperations.getAll(STORES.SALES);
    const customers = await dbOperations.getAll(STORES.CUSTOMERS);
    const products = await dbOperations.getAll(STORES.PRODUCTS);

    const customerIds = new Set(customers.map(c => c.id));
    const productIds = new Set(products.map(p => p.id));

    let orphanedSales = 0;
    let invalidItems = 0;

    for (const sale of sales) {
      if (sale.customerId && !customerIds.has(sale.customerId)) {
        orphanedSales++;
      }

      if (sale.items) {
        for (const item of sale.items) {
          if (!productIds.has(item.productId)) {
            invalidItems++;
          }
        }
      }
    }

    if (orphanedSales > 0) {
      warnings.push(`${orphanedSales} sales reference non-existent customers`);
    }

    if (invalidItems > 0) {
      warnings.push(`${invalidItems} sale items reference non-existent products`);
    }

    
    if (sales.length === 0) {
      warnings.push('No sales data found');
    }

    if (products.length === 0) {
      warnings.push('No product data found');
    }

    
    const now = new Date();
    const recentSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    });

    if (recentSales.length === 0) {
      warnings.push('No sales activity in the last 30 days');
    }

  } catch (error) {
    issues.push(`Database access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}; 
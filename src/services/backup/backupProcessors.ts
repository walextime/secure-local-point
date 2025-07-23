
import { dbOperations, STORES } from '@/lib/db';
import { DataFormatters } from './dataFormatters';
import { PDFGenerators } from './pdfGenerators';
import { BackupResult } from './types';

export class BackupProcessors {
    static async backupCustomers(
    formats: ('xlsx' | 'json' | 'pdf')[],
    password: string
  ): Promise<Partial<BackupResult>> {
    const result: Partial<BackupResult> = { filesCreated: [], errors: [] };
    
    try {
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      
      for (const format of formats) {
        const filename = `customers.${format}`;
        let data: any;
        
        switch (format) {
          case 'json':
            data = { customers, exportDate: new Date().toISOString() };
            break;
          case 'xlsx':
            data = DataFormatters.formatCustomersForExcel(customers);
            break;
          case 'pdf':
            data = await PDFGenerators.generateCustomersPDF(customers);
            break;
        }
        
        
        const blob = new Blob([data instanceof ArrayBuffer ? data : JSON.stringify(data)], { 
          type: format === 'pdf' ? 'application/pdf' : 
                format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        result.filesCreated!.push(filename);
      }
    } catch (error) {
      result.errors!.push(`Customer backup error: ${(error as Error).message}`);
    }
    
    return result;
  }

    static async backupInventory(
    formats: ('xlsx' | 'json' | 'pdf')[],
    password: string
  ): Promise<Partial<BackupResult>> {
    const result: Partial<BackupResult> = { filesCreated: [], errors: [] };
    
    try {
      const inventory = await dbOperations.getAll(STORES.PRODUCTS);
      
      for (const format of formats) {
        const filename = `inventory.${format}`;
        let data: any;
        
        switch (format) {
          case 'json':
            data = { inventory, exportDate: new Date().toISOString() };
            break;
          case 'xlsx':
            data = DataFormatters.formatInventoryForExcel(inventory);
            break;
          case 'pdf':
            data = await PDFGenerators.generateInventoryPDF(inventory);
            break;
        }
        
        
        const blob = new Blob([data instanceof ArrayBuffer ? data : JSON.stringify(data)], { 
          type: format === 'pdf' ? 'application/pdf' : 
                format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        result.filesCreated!.push(filename);
      }
    } catch (error) {
      result.errors!.push(`Inventory backup error: ${(error as Error).message}`);
    }
    
    return result;
  }

    static async backupSales(
    formats: ('xlsx' | 'json' | 'pdf')[],
    password: string
  ): Promise<Partial<BackupResult>> {
    const result: Partial<BackupResult> = { filesCreated: [], errors: [] };
    
    try {
      const sales = await dbOperations.getAll(STORES.SALES);
      
      for (const format of formats) {
        const filename = `sales.${format}`;
        let data: any;
        
        switch (format) {
          case 'json':
            data = { sales, exportDate: new Date().toISOString() };
            break;
          case 'xlsx':
            data = DataFormatters.formatSalesForExcel(sales);
            break;
          case 'pdf':
            data = await PDFGenerators.generateSalesPDF(sales);
            break;
        }
        
        
        const blob = new Blob([data instanceof ArrayBuffer ? data : JSON.stringify(data)], { 
          type: format === 'pdf' ? 'application/pdf' : 
                format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        result.filesCreated!.push(filename);
      }
    } catch (error) {
      result.errors!.push(`Sales backup error: ${(error as Error).message}`);
    }
    
    return result;
  }
}

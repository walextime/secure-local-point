
import { MasterPasswordService } from './security/masterPasswordService';
import { SecureFileGenerators } from './backup/secureFileGenerators';
import { SecureBackupStorage } from './backup/secureBackupStorage';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { SaleRecord } from '@/types/backup';

export interface BackupConfig {
  includeCustomers: boolean;
  includeInventory: boolean;
  includeSales: boolean;
  formats: Array<'xlsx' | 'json' | 'pdf'>;
  storageLocation: 'both' | 'windows' | 'internal';
  encryptFiles: boolean;
  password: string;
}

export interface BackupResult {
  success: boolean;
  timestamp: number;
  filesCreated: string[];
  errors: string[];
  folderPaths: string[];
}

export interface SecureBackupConfig {
  includeCustomers: boolean;
  includeInventory: boolean;
  includeSales: boolean;
  masterPassword: string;
}

export interface SecureBackupResult {
  success: boolean;
  timestamp: number;
  filesCreated: string[];
  errors: string[];
  folderPaths: string[];
}

export class BackupService {
    static async performBackup(config: BackupConfig): Promise<BackupResult> {
    
    const secureConfig: SecureBackupConfig = {
      includeCustomers: config.includeCustomers,
      includeInventory: config.includeInventory,
      includeSales: config.includeSales,
      masterPassword: config.password
    };

    const result = await this.performSecureBackup(secureConfig);
    
    return {
      success: result.success,
      timestamp: result.timestamp,
      filesCreated: result.filesCreated,
      errors: result.errors,
      folderPaths: [] 
    };
  }

    static async performSecureBackup(config: SecureBackupConfig): Promise<SecureBackupResult> {
    const result: SecureBackupResult = {
      success: false,
      timestamp: Date.now(),
      filesCreated: [],
      errors: [],
      folderPaths: []
    };

    try {
      
      const isValidPassword = await MasterPasswordService.verifyPassword(config.masterPassword);
      if (!isValidPassword) {
        result.errors.push('Invalid master password');
        return result;
      }

      const filesToSave: { name: string; data: Buffer | Uint8Array }[] = [];

      
      if (config.includeCustomers) {
        try {
          const customers = await dbOperations.getAll(STORES.CUSTOMERS);
          
          
          const customersPDF = await SecureFileGenerators.generateCustomersPDF(
            customers, 
            config.masterPassword
          );
          filesToSave.push({ name: 'customers.pdf', data: customersPDF });

          
          const customersXLSX = await SecureFileGenerators.generateCustomersXLSX(
            customers, 
            config.masterPassword
          );
          filesToSave.push({ name: 'customers.xlsx', data: customersXLSX });
        } catch (error) {
          result.errors.push(`Customer backup error: ${(error as Error).message}`);
        }
      }

      
      if (config.includeInventory) {
        try {
          const inventory = await dbOperations.getAll(STORES.PRODUCTS);
          
          
          const inventoryPDF = await SecureFileGenerators.generateInventoryPDF(
            inventory, 
            config.masterPassword
          );
          filesToSave.push({ name: 'inventory.pdf', data: inventoryPDF });

          
          const inventoryXLSX = await SecureFileGenerators.generateInventoryXLSX(
            inventory, 
            config.masterPassword
          );
          filesToSave.push({ name: 'inventory.xlsx', data: inventoryXLSX });
        } catch (error) {
          result.errors.push(`Inventory backup error: ${(error as Error).message}`);
        }
      }

      
      if (config.includeSales) {
        try {
          const sales = await dbOperations.getAll(STORES.SALES) as SaleRecord[];
          
          
          const salesPDF = await SecureFileGenerators.generateSalesPDF(
            sales, 
            config.masterPassword
          );
          filesToSave.push({ name: 'sales.pdf', data: salesPDF });

          
          const salesXLSX = await SecureFileGenerators.generateSalesXLSX(
            sales, 
            config.masterPassword
          );
          filesToSave.push({ name: 'sales.xlsx', data: salesXLSX });
        } catch (error) {
          result.errors.push(`Sales backup error: ${(error as Error).message}`);
        }
      }

      
      if (filesToSave.length > 0) {
        const storageResult = await SecureBackupStorage.saveBackupFiles(filesToSave);
        result.filesCreated = storageResult.savedFiles;
        result.errors.push(...storageResult.errors);
        result.folderPaths = []; 

        if (storageResult.success && result.errors.length === 0) {
          result.success = true;
        }
      }

      result.success = result.errors.length === 0 && result.filesCreated.length > 0;
    } catch (error) {
      result.errors.push(`Backup operation failed: ${(error as Error).message}`);
    }

    return result;
  }

    static async generateDailySummaryReport(masterPassword: string): Promise<boolean> {
    try {
      
      const isValidPassword = await MasterPasswordService.verifyPassword(masterPassword);
      if (!isValidPassword) {
        toast.error('Invalid master password');
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sales = await dbOperations.getAll(STORES.SALES) as SaleRecord[];
      const todaySales = sales.filter((sale: SaleRecord) => {
        const saleDate = new Date(sale.date);
        return saleDate >= today && saleDate < tomorrow;
      });

      if (todaySales.length === 0) {
        console.log('No sales today for daily report');
        return false;
      }

      
      const filesToSave: { name: string; data: Buffer | Uint8Array }[] = [];

      
      const dailyPDF = await SecureFileGenerators.generateSalesPDF(
        todaySales, 
        masterPassword
      );
      const dateStr = today.toISOString().slice(0, 10);
      filesToSave.push({ name: `daily-sales-${dateStr}.pdf`, data: dailyPDF });

      
      const dailyXLSX = await SecureFileGenerators.generateSalesXLSX(
        todaySales, 
        masterPassword
      );
      filesToSave.push({ name: `daily-sales-${dateStr}.xlsx`, data: dailyXLSX });

      
      const storageResult = await SecureBackupStorage.saveBackupFiles(filesToSave);
      
      if (storageResult.success) {
        console.log('Daily summary report generated successfully');
        return true;
      } else {
        console.error('Daily summary report generation failed:', storageResult.errors);
        return false;
      }
    } catch (error) {
      console.error('Daily summary generation error:', error);
      return false;
    }
  }
}

export const backupService = BackupService;

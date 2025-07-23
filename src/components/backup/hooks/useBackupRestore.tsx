
import { useState } from 'react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';

interface BackupData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  users?: any[];
  settings?: any[];
  metadata?: {
    createdAt: number;
    version: string;
    description: string;
  };
}

export const useBackupRestore = () => {
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const restoreBackupData = async (backupData: BackupData) => {
    if (!backupData) {
      toast.error('No backup data to restore');
      return;
    }

    try {
      setIsRestoring(true);

      
      if (backupData.products && backupData.products.length > 0) {
        for (const product of backupData.products) {
          await dbOperations.add(STORES.PRODUCTS, product);
        }
        console.log(`Restored ${backupData.products.length} products`);
      }

      
      if (backupData.customers && backupData.customers.length > 0) {
        for (const customer of backupData.customers) {
          await dbOperations.add(STORES.CUSTOMERS, customer);
        }
        console.log(`Restored ${backupData.customers.length} customers`);
      }

      
      if (backupData.sales && backupData.sales.length > 0) {
        for (const sale of backupData.sales) {
          await dbOperations.add(STORES.SALES, sale);
        }
        console.log(`Restored ${backupData.sales.length} sales records`);
      }

      
      if (backupData.users && backupData.users.length > 0) {
        for (const user of backupData.users) {
          await dbOperations.add(STORES.USERS, user);
        }
        console.log(`Restored ${backupData.users.length} users`);
      }

      
      if (backupData.settings && backupData.settings.length > 0) {
        for (const setting of backupData.settings) {
          
          if (setting.id !== 'master-password' && setting.id !== 'encryption-settings') {
            await dbOperations.add(STORES.SETTINGS, setting);
          }
        }
        console.log(`Restored ${backupData.settings.length} settings`);
      }

      toast.success('Backup restored successfully! Please refresh the page to see changes.');
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup data');
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    isRestoring,
    restoreBackupData
  };
};

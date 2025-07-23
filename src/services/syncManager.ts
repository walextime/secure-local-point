import { GoogleSheetsService } from './googleSheetsService';
import { ExcelStorageService } from './excelStorageService';
import { toast } from 'sonner';

interface SyncConfig {
  googleSheets?: {
    spreadsheetId: string;
    clientId: string;
    apiKey: string;
  };
  autoSync: boolean;
  syncInterval: number; 
}

export class SyncManager {
  private static config: SyncConfig | null = null;
  private static syncInterval: NodeJS.Timeout | null = null;

  static async initialize(config: SyncConfig): Promise<void> {
    this.config = config;

    
    if (config.googleSheets) {
      await GoogleSheetsService.initialize(config.googleSheets);
    }

    
    if (config.autoSync) {
      this.startAutoSync();
    }

    
    ExcelStorageService.scheduleAutoSave();
  }

  static async performFullSync(): Promise<boolean> {
    try {
      
      await ExcelStorageService.saveDataToExcel();

      
      if (GoogleSheetsService.isOnline() && this.config?.googleSheets) {
        const data = await ExcelStorageService.getAllDataForSync();
        
        
        const dataHash = this.generateDataHash(data);
        if (this.isDataAlreadySynced(dataHash)) {
          toast.info('Data already synced, skipping duplicate sync');
          return true;
        }

        const syncSuccess = await GoogleSheetsService.syncData({
          sales: data.sales,
          customers: data.customers,
          inventory: data.inventory
        });

        if (syncSuccess) {
          this.markDataAsSynced(dataHash);
          toast.success('Data synchronized with all services');
        }
        return syncSuccess;
      } else {
        toast.info('Data saved locally. Will sync when online.');
        return true;
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Synchronization failed');
      return false;
    }
  }

  
  private static generateDataHash(data: any): string {
    const dataString = JSON.stringify({
      salesCount: data.sales?.length || 0,
      customersCount: data.customers?.length || 0,
      inventoryCount: data.inventory?.length || 0,
      lastSaleDate: data.sales?.[0]?.date || null
    });
    
    
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }
    return hash.toString();
  }

  
  private static isDataAlreadySynced(dataHash: string): boolean {
    const syncedHashes = JSON.parse(localStorage.getItem('synced_data_hashes') || '[]');
    return syncedHashes.includes(dataHash);
  }

  
  private static markDataAsSynced(dataHash: string): void {
    const syncedHashes = JSON.parse(localStorage.getItem('synced_data_hashes') || '[]');
    syncedHashes.push(dataHash);
    
    
    if (syncedHashes.length > 50) {
      syncedHashes.splice(0, syncedHashes.length - 50);
    }
    
    localStorage.setItem('synced_data_hashes', JSON.stringify(syncedHashes));
  }

  static startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = (this.config?.syncInterval || 10) * 60 * 1000;
    this.syncInterval = setInterval(() => {
      if (GoogleSheetsService.isOnline()) {
        this.performFullSync();
      }
    }, intervalMs);
  }

  static stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  static async loadPreviousSession(): Promise<void> {
    await ExcelStorageService.loadDataFromExcel();
  }
}

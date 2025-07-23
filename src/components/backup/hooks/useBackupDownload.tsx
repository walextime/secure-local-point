import { SecureFileGenerators } from '@/services/backup/secureFileGenerators';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';

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

export const useBackupDownload = () => {
  const filterDataByDateRange = (data: BackupData, dateRange?: DateRange): BackupData => {
    if (!dateRange?.from) return data;

    const fromDate = dateRange.from;
    const toDate = dateRange.to || dateRange.from;
    
    const filteredData: BackupData = { ...data };

    
    if (data.sales) {
      filteredData.sales = data.sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= fromDate && saleDate <= toDate;
      });
    }

    
    if (data.customers) {
      filteredData.customers = data.customers.filter(customer => {
        if (!customer.createdAt) return true; 
        const customerDate = new Date(customer.createdAt);
        return customerDate >= fromDate && customerDate <= toDate;
      });
    }

    
    if (data.products) {
      filteredData.products = data.products.filter(product => {
        if (!product.createdAt) return true; 
        const productDate = new Date(product.createdAt);
        return productDate >= fromDate && productDate <= toDate;
      });
    }

    return filteredData;
  };

  const logDownloadHistory = async (fileName: string, success: boolean, errorMsg?: string) => {
    const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
    const newEntry: BackupHistoryEntry = {
      id: `download-${Date.now()}`,
      timestamp: Date.now(),
      filesCreated: [fileName],
      errors: errorMsg ? [errorMsg] : [],
      success,
      config: { type: 'download' }
    };
    let entries = historyRecord?.entries || [];
    entries = [...entries, newEntry].slice(-50);
    await dbOperations.put(STORES.SETTINGS, {
      id: 'backup-history',
      entries
    });
  };

  const downloadReadableFiles = async (
    backupData: BackupData, 
    fileName: string | null, 
    dateRange?: DateRange
  ) => {
    if (!backupData) {
      toast.error('No backup data to download');
      await logDownloadHistory(fileName || 'unknown', false, 'No backup data to download');
      return;
    }

    try {
      const baseFileName = fileName?.replace('.posbak', '') || 'backup';
      const password = 'readable-export';
      
      const filteredData = filterDataByDateRange(backupData, dateRange);
      let filesDownloaded = 0;
      const dataTypes = [
        { data: filteredData.customers, type: 'customers', generator: SecureFileGenerators },
        { data: filteredData.products, type: 'inventory', generator: SecureFileGenerators },
        { data: filteredData.sales, type: 'sales', generator: SecureFileGenerators }
      ];
      for (const { data, type, generator } of dataTypes) {
        if (data && data.length > 0) {
          const methodName = `generate${type.charAt(0).toUpperCase() + type.slice(1)}PDF` as keyof typeof generator;
          if (type === 'inventory') {
            const pdf = await generator.generateInventoryPDF(data, password);
            const pdfBlob = new Blob([pdf], { type: 'application/pdf' });
            downloadFile(pdfBlob, `${baseFileName}-${type}.pdf`);
            await logDownloadHistory(`${baseFileName}-${type}.pdf`, true);
            filesDownloaded++;
          } else {
            const pdf = await (generator as any)[methodName](data, password);
            const pdfBlob = new Blob([pdf], { type: 'application/pdf' });
            downloadFile(pdfBlob, `${baseFileName}-${type}.pdf`);
            await logDownloadHistory(`${baseFileName}-${type}.pdf`, true);
            filesDownloaded++;
          }
          const xlsxMethodName = `generate${type.charAt(0).toUpperCase() + type.slice(1)}XLSX` as keyof typeof generator;
          if (type === 'inventory') {
            const xlsx = await generator.generateInventoryXLSX(data, password);
            const xlsxBlob = new Blob([xlsx], { 
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            downloadFile(xlsxBlob, `${baseFileName}-${type}.xlsx`);
            await logDownloadHistory(`${baseFileName}-${type}.xlsx`, true);
            filesDownloaded++;
          } else {
            const xlsx = await (generator as any)[xlsxMethodName](data, password);
            const xlsxBlob = new Blob([xlsx], { 
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            downloadFile(xlsxBlob, `${baseFileName}-${type}.xlsx`);
            await logDownloadHistory(`${baseFileName}-${type}.xlsx`, true);
            filesDownloaded++;
          }
        }
      }
      if (filesDownloaded > 0) {
        toast.success(`${filesDownloaded} files downloaded successfully (PDF and XLSX formats)`);
      } else {
        toast.info('No data found in selected date range');
        await logDownloadHistory(baseFileName, false, 'No data found in selected date range');
      }
    } catch (error) {
      console.error('Error downloading readable backup:', error);
      toast.error('Failed to download readable backup files');
      await logDownloadHistory(fileName || 'unknown', false, error.message || String(error));
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    downloadReadableFiles
  };
};

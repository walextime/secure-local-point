import { db, dbOperations, STORES } from './dexieDb';
import { toast } from 'sonner';

export interface ExportData {
  version: string;
  timestamp: number;
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  pendingSales: Record<string, unknown>[];
  users: Record<string, unknown>[];
  settings: Record<string, unknown>[];
  creditPayments: Record<string, unknown>[];
  partialPayments: Record<string, unknown>[];
  userReceiptCounters: Record<string, unknown>[];
  pendingSaleEvents: Record<string, unknown>[];
  actionQueue: Record<string, unknown>[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedCounts: Record<string, number>;
  errors: string[];
}

// Export all data
export const exportAllData = async (): Promise<ExportData> => {
  try {
    console.log('Starting data export...');
    
    const [
      products,
      customers,
      sales,
      pendingSales,
      users,
      settings,
      creditPayments,
      partialPayments,
      userReceiptCounters,
      pendingSaleEvents,
      actionQueue
    ] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.sales.toArray(),
      db.pendingSales.toArray(),
      db.users.toArray(),
      db.settings.toArray(),
      db.creditPayments.toArray(),
      db.partialPayments.toArray(),
      db.userReceiptCounters.toArray(),
      db.pendingSaleEvents.toArray(),
      db.actionQueue.toArray()
    ]);

    const exportData: ExportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      products,
      customers,
      sales,
      pendingSales,
      users,
      settings,
      creditPayments,
      partialPayments,
      userReceiptCounters,
      pendingSaleEvents,
      actionQueue
    };

    console.log('Data export completed:', {
      products: products.length,
      customers: customers.length,
      sales: sales.length,
      pendingSales: pendingSales.length,
      users: users.length,
      settings: settings.length,
      creditPayments: creditPayments.length,
      partialPayments: partialPayments.length,
      userReceiptCounters: userReceiptCounters.length,
      pendingSaleEvents: pendingSaleEvents.length,
      actionQueue: actionQueue.length
    });

    return exportData;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Import data
export const importData = async (data: ExportData): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    message: '',
    importedCounts: {},
    errors: []
  };

  try {
    console.log('Starting data import...');
    console.log('Import data version:', data.version);
    console.log('Import timestamp:', new Date(data.timestamp).toLocaleString());

    // Validate data structure
    if (!data.version || !data.timestamp) {
      throw new Error('Invalid export data format');
    }

    // Clear existing data (optional - could be made configurable)
    await db.transaction('rw', [
      db.products, db.customers, db.sales, db.pendingSales,
      db.users, db.settings, db.creditPayments, db.partialPayments,
      db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
    ], async () => {
      // Import data in transaction
      const importPromises = [
        importTableData('products', data.products || []),
        importTableData('customers', data.customers || []),
        importTableData('sales', data.sales || []),
        importTableData('pendingSales', data.pendingSales || []),
        importTableData('users', data.users || []),
        importTableData('settings', data.settings || []),
        importTableData('creditPayments', data.creditPayments || []),
        importTableData('partialPayments', data.partialPayments || []),
        importTableData('userReceiptCounters', data.userReceiptCounters || []),
        importTableData('pendingSaleEvents', data.pendingSaleEvents || []),
        importTableData('actionQueue', data.actionQueue || [])
      ];

      const importResults = await Promise.allSettled(importPromises);
      
      importResults.forEach((promiseResult, index) => {
        const tableNames = [
          'products', 'customers', 'sales', 'pendingSales',
          'users', 'settings', 'creditPayments', 'partialPayments',
          'userReceiptCounters', 'pendingSaleEvents', 'actionQueue'
        ];
        
        if (promiseResult.status === 'fulfilled') {
          result.importedCounts[tableNames[index]] = promiseResult.value;
        } else {
          result.errors.push(`Failed to import ${tableNames[index]}: ${promiseResult.reason}`);
        }
      });
    });

    const totalImported = Object.values(result.importedCounts).reduce((sum, count) => sum + count, 0);
    
    result.success = result.errors.length === 0;
    result.message = result.success 
      ? `Successfully imported ${totalImported} records`
      : `Import completed with ${result.errors.length} errors`;

    console.log('Import completed:', result);
    return result;

  } catch (error) {
    console.error('Import failed:', error);
    result.message = `Import failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(result.message);
    return result;
  }
};

// Helper function to import table data
async function importTableData(tableName: string, data: Record<string, unknown>[]): Promise<number> {
  if (!data || data.length === 0) {
    console.log(`No data to import for ${tableName}`);
    return 0;
  }

  const table = (db as unknown as Record<string, { clear: () => Promise<void>; bulkAdd: (data: Record<string, unknown>[]) => Promise<void> }>)[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found`);
  }

  // Clear existing data
  await table.clear();

  // Add new data
  if (data.length > 0) {
    await table.bulkAdd(data);
  }

  console.log(`Imported ${data.length} records to ${tableName}`);
  return data.length;
}

// Download export data
export const downloadExportData = async (): Promise<void> => {
  try {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  } catch (error) {
    console.error('Export download failed:', error);
    toast.error('Export failed');
  }
};

// Upload and import data
export const uploadAndImportData = async (file: File): Promise<ImportResult> => {
  try {
    const text = await file.text();
    const data: ExportData = JSON.parse(text);
    
    const result = await importData(data);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(`Import failed: ${result.errors.join(', ')}`);
    }
    
    return result;
  } catch (error) {
    console.error('Upload and import failed:', error);
    const importResult: ImportResult = {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : String(error)}`,
      importedCounts: {},
      errors: [`Upload failed: ${error instanceof Error ? error.message : String(error)}`]
    };
    toast.error(importResult.message);
    return importResult;
  }
};

// Get database statistics
export const getDatabaseStats = async (): Promise<Record<string, number>> => {
  try {
    const [
      products,
      customers,
      sales,
      pendingSales,
      users,
      settings,
      creditPayments,
      partialPayments,
      userReceiptCounters,
      pendingSaleEvents,
      actionQueue
    ] = await Promise.all([
      db.products.count(),
      db.customers.count(),
      db.sales.count(),
      db.pendingSales.count(),
      db.users.count(),
      db.settings.count(),
      db.creditPayments.count(),
      db.partialPayments.count(),
      db.userReceiptCounters.count(),
      db.pendingSaleEvents.count(),
      db.actionQueue.count()
    ]);

    return {
      products,
      customers,
      sales,
      pendingSales,
      users,
      settings,
      creditPayments,
      partialPayments,
      userReceiptCounters,
      pendingSaleEvents,
      actionQueue
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {};
  }
};

// Clear all data (for testing/reset)
export const clearAllData = async (): Promise<void> => {
  try {
    await db.transaction('rw', [
      db.products, db.customers, db.sales, db.pendingSales,
      db.users, db.settings, db.creditPayments, db.partialPayments,
      db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
    ], async () => {
      await Promise.all([
        db.products.clear(),
        db.customers.clear(),
        db.sales.clear(),
        db.pendingSales.clear(),
        db.users.clear(),
        db.settings.clear(),
        db.creditPayments.clear(),
        db.partialPayments.clear(),
        db.userReceiptCounters.clear(),
        db.pendingSaleEvents.clear(),
        db.actionQueue.clear()
      ]);
    });

    console.log('All data cleared');
    toast.success('All data cleared successfully');
  } catch (error) {
    console.error('Failed to clear data:', error);
    toast.error('Failed to clear data');
  }
}; 
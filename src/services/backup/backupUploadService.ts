import JSZip from 'jszip';
import { dbOperations, STORES } from '@/lib/db';
import { PDFGenerators } from './pdfGenerators';
import { SimpleEnhancedDailyReportGenerator } from './simpleEnhancedDailyReport';

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface BackupUploadConfig {
  scriptUrl: string;
  driveFolderId: string;
  emailDestination: string;
  smsProvider: string;
  smsApiKey: string;
  smsPhoneNumber: string;
  smsEnabled: boolean;
  smsFormat: 'summary' | 'detailed';
}

export interface BackupData {
  customers: Record<string, unknown>[];
  products: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  pendingSales: Record<string, unknown>[];
  settings: Record<string, unknown>;
  users: Record<string, unknown>[];
}

export interface UploadResult {
  success: boolean;
  message: string;
  timestamp: Date;
  readableZipSize?: number;
  systemZipSize?: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}


export const generateReadableBackup = async (): Promise<{ content: Uint8Array; filename: string }[]> => {
  const files: { content: Uint8Array; filename: string }[] = [];
  
  try {
    
    const customers = await dbOperations.getAll<Record<string, unknown>>(STORES.CUSTOMERS);
    const products = await dbOperations.getAll<Record<string, unknown>>(STORES.PRODUCTS);
    const sales = await dbOperations.getAll<Record<string, unknown>>(STORES.SALES);
    const pendingSales = await dbOperations.getAll<Record<string, unknown>>(STORES.PENDING_SALES);
    const settings = await dbOperations.getAll<Record<string, unknown>>(STORES.SETTINGS);
    const users = await dbOperations.getAll<Record<string, unknown>>(STORES.USERS);

    const date = new Date().toISOString().split('T')[0];

    
    if (customers.length > 0) {
      const customersPDF = await PDFGenerators.generateCustomersPDF(customers);
      files.push({
        content: new Uint8Array(customersPDF.pdfContent),
        filename: `customers_${date}.pdf`
      });
    }

    if (products.length > 0) {
      const productsPDF = await PDFGenerators.generateInventoryPDF(products);
      files.push({
        content: new Uint8Array(productsPDF.pdfContent),
        filename: `inventory_${date}.pdf`
      });
    }

    if (sales.length > 0) {
      const salesPDF = await PDFGenerators.generateSalesPDF(sales);
      files.push({
        content: new Uint8Array(salesPDF.pdfContent),
        filename: `sales_${date}.pdf`
      });
    }

    
    const dailyReport = await generateDailyReport({
      customers,
      products,
      sales,
      pendingSales,
      settings: settings[0] || {},
      users
    });

    
    files.push({
      content: new TextEncoder().encode(dailyReport),
      filename: `daily_report_${date}.txt`
    });

    
    if (users.length > 0) {
      const usersPDF = await PDFGenerators.generateUsersPDF(users);
      files.push({
        content: new Uint8Array(usersPDF.pdfContent),
        filename: `users_${date}.pdf`
      });
    }

    
    const settingsPDF = await PDFGenerators.generateSettingsPDF(settings[0] || {});
    files.push({
      content: new Uint8Array(settingsPDF.pdfContent),
      filename: `settings_${date}.pdf`
    });

    
    if (pendingSales.length > 0) {
      const pendingSalesPDF = await PDFGenerators.generateSalesPDF(pendingSales);
      files.push({
        content: new Uint8Array(pendingSalesPDF.pdfContent),
        filename: `pending_sales_${date}.pdf`
      });
    }

  } catch (error) {
    console.error('Error generating readable backup:', error);
    throw new Error('Failed to generate readable backup data');
  }

  return files;
};


export const generateSystemBackup = async (): Promise<BackupData> => {
  try {
    const customers = await dbOperations.getAll<Record<string, unknown>>(STORES.CUSTOMERS);
    const products = await dbOperations.getAll<Record<string, unknown>>(STORES.PRODUCTS);
    const sales = await dbOperations.getAll<Record<string, unknown>>(STORES.SALES);
    const pendingSales = await dbOperations.getAll<Record<string, unknown>>(STORES.PENDING_SALES);
    const settings = await dbOperations.getAll<Record<string, unknown>>(STORES.SETTINGS);
    const users = await dbOperations.getAll<Record<string, unknown>>(STORES.USERS);

    return {
      customers,
      products,
      sales,
      pendingSales,
      settings: settings[0] || {},
      users
    };
  } catch (error) {
    console.error('Error generating system backup:', error);
    throw new Error('Failed to generate system backup data');
  }
};


export const createZipFile = async (
  files: { content: string | Uint8Array; filename: string }[],
  zipName: string
): Promise<Blob> => {
  const zip = new JSZip();

  files.forEach(file => {
    zip.file(file.filename, file.content);
  });

  return await zip.generateAsync({ type: 'blob' });
};


export const testConnection = async (config: BackupUploadConfig): Promise<TestConnectionResult> => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] TESTING CONNECTION TO GOOGLE APPS SCRIPT`);
  console.log(`[${requestId}] Script URL: ${config.scriptUrl}`);
  console.log(`[${requestId}] Folder ID: ${config.driveFolderId}`);
  console.log(`[${requestId}] Email: ${config.emailDestination}`);
  
  try {
    
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      const missingFields = [];
      if (!config.scriptUrl) missingFields.push('Script URL');
      if (!config.driveFolderId) missingFields.push('Folder ID');
      if (!config.emailDestination) missingFields.push('Email');
      
      console.error(`[${requestId}] VALIDATION ERROR: Missing required fields: ${missingFields.join(', ')}`);
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    if (!config.scriptUrl.startsWith('https://script.google.com/')) {
      console.error(`[${requestId}] VALIDATION ERROR: Invalid Google Apps Script URL format`);
      return {
        success: false,
        message: 'Invalid Google Apps Script URL format. URL must start with https://script.google.com/'
      };
    }

    
    // Prepare test data for Apps Script
    const testData = {
      action: 'test',
      driveFolderId: config.driveFolderId,
      emailDestination: config.emailDestination,
      test: 'true' // Send as string instead of boolean
    };

    console.log(`[${requestId}] Sending test request to proxy`);
    console.log(`[${requestId}] Test data:`, testData);

    
    const response = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: config.scriptUrl,
        ...testData
      })
    });

    console.log(`[${requestId}] Proxy response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Proxy response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] HTTP ERROR: ${response.status} ${response.statusText}`);
      console.error(`[${requestId}] Error response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
    }

    const result = await response.text();
    console.log(`[${requestId}] Response body:`, result);
    
    if (result.includes('successful') || result.includes('Success')) {
      console.log(`[${requestId}] CONNECTION TEST SUCCESSFUL`);
      return {
        success: true,
        message: 'Connection test successful! ✅'
      };
    } else {
      console.error(`[${requestId}] CONNECTION TEST FAILED: Response does not contain success indicators`);
      return {
        success: false,
        message: `Connection failed: ${result}`
      };
    }

  } catch (error) {
    console.error(`[${requestId}] CONNECTION TEST ERROR:`);
    console.error(`[${requestId}] Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
    console.error(`[${requestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[${requestId}] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};


export const uploadBackup = async (config: BackupUploadConfig): Promise<UploadResult> => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] STARTING BACKUP UPLOAD`);
  console.log(`[${requestId}] Script URL: ${config.scriptUrl}`);
  console.log(`[${requestId}] Folder ID: ${config.driveFolderId}`);
  console.log(`[${requestId}] Email: ${config.emailDestination}`);
  
  try {
    
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      const missingFields = [];
      if (!config.scriptUrl) missingFields.push('Script URL');
      if (!config.driveFolderId) missingFields.push('Folder ID');
      if (!config.emailDestination) missingFields.push('Email');
      
      console.error(`[${requestId}] VALIDATION ERROR: Missing required fields: ${missingFields.join(', ')}`);
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        timestamp: new Date()
      };
    }

    if (!config.scriptUrl.startsWith('https://script.google.com/')) {
      console.error(`[${requestId}] VALIDATION ERROR: Invalid Google Apps Script URL format`);
      return {
        success: false,
        message: 'Invalid Google Apps Script URL format. URL must start with https://script.google.com/',
        timestamp: new Date()
      };
    }

    console.log(`[${requestId}] Generating readable backup files...`);
    
    const readableFiles = await generateReadableBackup();
    console.log(`[${requestId}] Generated ${readableFiles.length} readable backup files`);
    readableFiles.forEach(file => {
      console.log(`[${requestId}] - ${file.filename} (${file.content.length} bytes)`);
    });

    console.log(`[${requestId}] Generating system backup data...`);
    const systemData = await generateSystemBackup();
    console.log(`[${requestId}] System backup data generated`);

    
    console.log(`[${requestId}] Creating ZIP files...`);
    const readableZip = await createZipFile(readableFiles, 'readable_backup');
    const systemZip = await createZipFile([
      {
        content: JSON.stringify(systemData, null, 2),
        filename: 'system_backup.json'
      }
    ], 'system_backup');

    console.log(`[${requestId}] ZIP files created:`);
    console.log(`[${requestId}] - Readable ZIP: ${readableZip.size} bytes`);
    console.log(`[${requestId}] - System ZIP: ${systemZip.size} bytes`);

    
    if (readableZip.size === 0 || systemZip.size === 0) {
      console.error(`[${requestId}] ERROR: Generated backup files are empty`);
      console.error(`[${requestId}] Readable ZIP size: ${readableZip.size} bytes`);
      console.error(`[${requestId}] System ZIP size: ${systemZip.size} bytes`);
      return {
        success: false,
        message: 'Generated backup files are empty. Check if there is data to backup.',
        timestamp: new Date()
      };
    }

    
    console.log(`[${requestId}] Converting ZIP files to base64...`);
    // Convert blobs to base64 for proxy transmission
    const readableZipBase64 = await blobToBase64(readableZip);
    const systemZipBase64 = await blobToBase64(systemZip);
    console.log(`[${requestId}] Base64 conversion completed`);

    // Prepare JSON payload for Apps Script
    const uploadData = {
      action: 'upload',
      driveFolderId: config.driveFolderId, // Apps Script expects this field name
      email: config.emailDestination, // Always send both
      emailDestination: config.emailDestination, // Always send both
      zipFile: readableZipBase64,
      sysZipFile: systemZipBase64,
      timestamp: new Date().toISOString()
    };

    console.log(`[${requestId}] Sending backup to proxy...`);
    console.log(`[${requestId}] Upload data keys: ${Object.keys(uploadData).join(', ')}`);
    console.log(`[${requestId}] File sizes: Readable=${readableZip.size} bytes, System=${systemZip.size} bytes`);
    console.log(`[${requestId}] Base64 lengths: Readable=${readableZipBase64.length} chars, System=${systemZipBase64.length} chars`);
    console.log(`[${requestId}] Email destination: ${config.emailDestination}`);
    console.log(`[${requestId}] Folder ID: ${config.driveFolderId}`);

    // Send JSON payload to proxy
    const response = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: config.scriptUrl,
        ...uploadData
      })
    });

    console.log(`[${requestId}] Proxy response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Proxy response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] HTTP ERROR: ${response.status} ${response.statusText}`);
      console.error(`[${requestId}] Error response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
    }

    const result = await response.text();
    console.log(`[${requestId}] Response body:`, result);
    
    // Parse the JSON response
    let responseData;
    try {
      responseData = JSON.parse(result);
      console.log(`[${requestId}] Parsed response data:`, responseData);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse response as JSON:`, parseError);
      return {
        success: false,
        message: `Upload failed: Invalid response format - ${result}`,
        timestamp: new Date()
      };
    }
    
    // Check if the upload was successful based on the Apps Script response
    if (responseData.success === true) {
      console.log(`[${requestId}] BACKUP UPLOAD SUCCESSFUL`);
      return {
        success: true,
        message: responseData.message || 'Backup uploaded successfully! ✅ Files sent to Google Drive and email.',
        timestamp: new Date(),
        readableZipSize: readableZip.size,
        systemZipSize: systemZip.size
      };
    } else {
      console.error(`[${requestId}] BACKUP UPLOAD FAILED: Apps Script returned success: false`);
      console.error(`[${requestId}] Apps Script error message: ${responseData.message}`);
      console.error(`[${requestId}] Full Apps Script response:`, responseData);
      return {
        success: false,
        message: responseData.message || `Upload failed: ${result}`,
        timestamp: new Date()
      };
    }

  } catch (error) {
    console.error(`[${requestId}] BACKUP UPLOAD ERROR:`);
    console.error(`[${requestId}] Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
    console.error(`[${requestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[${requestId}] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date()
    };
  }
};


const generateOldFormatDailyReport = (data: BackupData): string => {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  const totalSales = data.sales.reduce((sum, sale) => sum + ((sale.total as number) || 0), 0);
  const totalTransactions = data.sales.length;
  const totalProducts = data.products.length;
  const totalCustomers = data.customers.length;
  const pendingTransactions = data.pendingSales.length;

  return `
# store
## Daily Report for ${new Date().toISOString().split('T')[0]}

## Sales Summary
- Total Gross Sales: ${totalSales.toFixed(2)} XAF
- Total Discounts: 0 XAF
- Total Net Sales: ${totalSales.toFixed(2)} XAF
- Total Tax: 0 XAF
- Total Revenue: ${totalSales.toFixed(2)} XAF
- Total Transactions: ${totalTransactions}
- Average Transaction Value: ${totalTransactions > 0 ? (totalSales / totalTransactions).toFixed(2) : '0'} XAF

## Top Products by Quantity

## Top Products by Revenue

## Payment Breakdown

## New Customers: ${totalCustomers}
## Returns: 0 (0 XAF)

---
Generated by Tech Plus POS
  `.trim();
};

const generateDailyReport = async (data: BackupData): Promise<string> => {
  try {
    const dailyReportData = {
      date: new Date().toISOString().split('T')[0],
      sales: data.sales,
      products: data.products,
      customers: data.customers,
      users: data.users,
      settings: data.settings
    };
    
    const { textContent } = await SimpleEnhancedDailyReportGenerator.generateComprehensiveDailyReport(dailyReportData);
    
    // Also generate the old format report
    const oldFormatReport = generateOldFormatDailyReport(data);
    
    // Return both reports combined
    return `ENHANCED DAILY REPORT\n${'='.repeat(50)}\n${textContent}\n\n${'='.repeat(50)}\nSTANDARD DAILY REPORT\n${'='.repeat(50)}\n${oldFormatReport}`;
  } catch (error) {
    console.error('Error generating enhanced daily report:', error);
    
    // Fallback to simple report
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    const totalSales = data.sales.reduce((sum, sale) => sum + ((sale.total as number) || 0), 0);
    const totalTransactions = data.sales.length;
    const totalProducts = data.products.length;
    const totalCustomers = data.customers.length;
    const pendingTransactions = data.pendingSales.length;

    return `
DAILY REPORT - ${date} ${time}
===============================================

SUMMARY
-------
Total Sales: $${totalSales.toFixed(2)}
Total Transactions: ${totalTransactions}
Total Products: ${totalProducts}
Total Customers: ${totalCustomers}
Pending Transactions: ${pendingTransactions}

Report generated on: ${new Date().toLocaleString()}
===============================================
    `.trim();
  }
};

/**
 * Convert data to CSV format
 */
const convertToCSV = (data: Record<string, unknown>[], type: string): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return `No ${type} data available`;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      
      if (value === null || value === undefined) {
        return '""';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Generate settings summary
 */
const generateSettingsSummary = (settings: Record<string, unknown>): string => {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  return `
SETTINGS SUMMARY - ${date} ${time}
===============================================

STORE INFORMATION
-----------------
${Object.entries(settings)
  .filter(([key]) => key.includes('store') || key.includes('company'))
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

BACKUP SETTINGS
--------------
${Object.entries(settings)
  .filter(([key]) => key.includes('backup') || key.includes('sync'))
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

SECURITY SETTINGS
----------------
${Object.entries(settings)
  .filter(([key]) => key.includes('password') || key.includes('security'))
  .map(([key, value]) => `${key}: ${typeof value === 'string' ? '***' : value}`)
  .join('\n')}

OTHER SETTINGS
-------------
${Object.entries(settings)
  .filter(([key]) => !key.includes('store') && !key.includes('backup') && !key.includes('password') && !key.includes('security'))
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Settings exported on: ${new Date().toLocaleString()}
===============================================
  `.trim();
};

/**
 * Upload a readable backup ZIP as base64 to Google Apps Script endpoint
 */
export const uploadReadableZipBase64 = async (
  zipBlob: Blob,
  config: BackupUploadConfig,
  filename?: string
): Promise<{ success: boolean; message: string; fileUrl?: string }> => {
  try {
    if (!config.scriptUrl || !config.driveFolderId) {
      return { success: false, message: 'Script URL and Drive Folder ID are required.' };
    }
    // Convert ZIP to base64
    const arrayBuffer = await zipBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    // Prepare payload
    const payload: Record<string, unknown> = {
      zipBase64: base64,
      folderId: config.driveFolderId,
      filename: filename || `readable_backup_${new Date().toISOString().slice(0,10)}.zip`,
    };
    if (config.emailDestination) payload.email = config.emailDestination;
    
    const response = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: config.scriptUrl,
        ...payload
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const result = await response.json().catch(() => ({}));
    if (result.success || result.fileUrl) {
      return {
        success: true,
        message: 'Backup uploaded successfully!',
        fileUrl: result.fileUrl || result.url || undefined
      };
    } else {
      return {
        success: false,
        message: result.message || 'Upload failed: Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};


export const testUpload = async (config: BackupUploadConfig): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Testing upload connection...');
    console.log('Config:', config);
    
    // Test the connection first
    const testPayload = {
      action: 'test',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      },
      driveFolderId: config.driveFolderId,
      emailDestination: config.emailDestination
    };

    const resp = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: config.scriptUrl,
        ...testPayload
      })
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const data = await resp.json().catch(() => ({}));
    console.log('Test response:', data);
    
    if (data.success) {
      return {
        success: true,
        message: 'Connection test successful: ' + (data.message || 'OK')
      };
    } else {
      return {
        success: false,
        message: 'Connection test failed: ' + (data.message || 'Unknown error')
      };
    }
  } catch (error) {
    console.error('Test upload error:', error);
    return {
      success: false,
      message: `Test upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Upload a backup file to Google Apps Script endpoint using a simple POST (no CORS preflight)
 * @param file - The File or Blob to upload
 * @param email - Destination email address
 * @param filename - Name for the file
 * @param scriptUrl - Apps Script endpoint URL
 * @param mimeType - MIME type (default: application/zip)
 */
export async function uploadBackupToAppsScript({ file, email, filename, scriptUrl, mimeType = 'application/zip' }: {
  file: File | Blob,
  email: string,
  filename: string,
  scriptUrl: string,
  mimeType?: string
}): Promise<{ success: boolean; message: string; fileUrl?: string }> {
  try {
    // Convert file to base64 for proxy transmission
    const fileBase64 = await blobToBase64(file);
    
    // Determine if this is a readable or system backup based on filename
    const isReadableBackup = filename.includes('readable');
    const isSystemBackup = filename.includes('system');
    
    // Get the drive folder ID from localStorage
    const savedConfig = localStorage.getItem('backupUploadConfig');
    let driveFolderId = '';
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        driveFolderId = config.driveFolderId || '';
      } catch (e) {
        console.error('Failed to parse backupUploadConfig:', e);
      }
    }
    
    // Prepare payload in the format expected by the Google Apps Script
    const payload: any = {
      action: 'upload',
      emailDestination: email,
      driveFolderId: driveFolderId
    };
    
    // Add the file data in the correct field based on type
    if (isReadableBackup) {
      payload.zipFile = fileBase64;
    } else if (isSystemBackup) {
      payload.sysZipFile = fileBase64;
    } else {
      // Fallback: treat as readable backup
      payload.zipFile = fileBase64;
    }

    console.log(`Uploading ${filename} (${isReadableBackup ? 'readable' : 'system'} backup)`);
    console.log(`File size: ${file.size} bytes`);
    console.log(`Base64 length: ${fileBase64.length} characters`);

    const resp = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: scriptUrl,
        ...payload
      })
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const data = await resp.json().catch(() => ({}));
    console.log('Upload response:', data);
    
    if (data.success || data.fileUrl || data.status === 'success') {
      return {
        success: true,
        message: data.message || 'Backup uploaded successfully!',
        fileUrl: data.fileUrl || data.url || undefined
      };
    } else {
      return {
        success: false,
        message: data.message || 'Upload failed: Unknown error',
      };
    }
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Upload failed: Unknown error'
    };
  }
} 
import * as XLSX from 'xlsx';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';

interface ExcelData {
  sales: any[];
  customers: any[];
  inventory: any[];
  users: any[];
  settings: any[];
}

export class ExcelStorageService {
  private static readonly STORAGE_KEY = 'pos_excel_data';
  private static readonly UPLOADED_FILES_KEY = 'pos_uploaded_files';

  static async saveDataToExcel(): Promise<boolean> {
    try {
      
      const data: ExcelData = {
        sales: await dbOperations.getAll(STORES.SALES),
        customers: await dbOperations.getAll(STORES.CUSTOMERS),
        inventory: await dbOperations.getAll(STORES.PRODUCTS),
        users: await dbOperations.getAll(STORES.USERS),
        settings: await dbOperations.getAll(STORES.SETTINGS)
      };

      
      const workbook = XLSX.utils.book_new();

      
      const salesWS = XLSX.utils.json_to_sheet(data.sales.map(sale => ({
        'Date': new Date(sale.date).toISOString(),
        'Customer': sale.customerName || 'Walk-in',
        'Total': sale.total,
        'Subtotal': sale.subtotal,
        'Tax': sale.taxAmount,
        'Discount': sale.discount,
        'Payment Method': sale.paymentMethod,
        'Cashier': sale.cashierName,
        'Items Count': sale.items?.length || 0,
        'Status': sale.status
      })));
      XLSX.utils.book_append_sheet(workbook, salesWS, 'Sales');

      
      const customersWS = XLSX.utils.json_to_sheet(data.customers);
      XLSX.utils.book_append_sheet(workbook, customersWS, 'Customers');

      
      const inventoryWS = XLSX.utils.json_to_sheet(data.inventory);
      XLSX.utils.book_append_sheet(workbook, inventoryWS, 'Inventory');

      
      // Filter out root account from export
      const filteredUsers = data.users.filter(user => user.username?.toLowerCase() !== 'rootaccount');
      const usersWS = XLSX.utils.json_to_sheet(filteredUsers.map(user => ({
        'ID': user.id,
        'Name': user.name,
        'Role': user.role,
        'Email': user.email,
        'Created': user.createdAt
      })));
      XLSX.utils.book_append_sheet(workbook, usersWS, 'Users');

      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      
      const base64String = this.arrayBufferToBase64(excelBuffer);
      localStorage.setItem(this.STORAGE_KEY, base64String);

      console.log('Data saved to Excel format locally');
      return true;
    } catch (error) {
      console.error('Failed to save data to Excel:', error);
      toast.error('Failed to save data to Excel format');
      return false;
    }
  }

  static async loadDataFromExcel(): Promise<boolean> {
    try {
      const base64Data = localStorage.getItem(this.STORAGE_KEY);
      if (!base64Data) {
        console.log('No Excel data found in storage');
        return false;
      }

      const buffer = this.base64ToArrayBuffer(base64Data);
      const workbook = XLSX.read(buffer, { type: 'array' });

      
      if (workbook.SheetNames.includes('Sales')) {
        const salesWS = workbook.Sheets['Sales'];
        const salesData = XLSX.utils.sheet_to_json(salesWS);
        console.log('Loaded sales data from Excel:', salesData.length, 'records');
      }

      
      if (workbook.SheetNames.includes('Customers')) {
        const customersWS = workbook.Sheets['Customers'];
        const customersData = XLSX.utils.sheet_to_json(customersWS);
        console.log('Loaded customers data from Excel:', customersData.length, 'records');
      }

      
      if (workbook.SheetNames.includes('Inventory')) {
        const inventoryWS = workbook.Sheets['Inventory'];
        const inventoryData = XLSX.utils.sheet_to_json(inventoryWS);
        console.log('Loaded inventory data from Excel:', inventoryData.length, 'records');
      }

      toast.success('Previous session data loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load data from Excel:', error);
      toast.error('Failed to load previous session data');
      return false;
    }
  }

  static async getAllDataForSync(): Promise<ExcelData> {
    return {
      sales: await dbOperations.getAll(STORES.SALES),
      customers: await dbOperations.getAll(STORES.CUSTOMERS),
      inventory: await dbOperations.getAll(STORES.PRODUCTS),
      users: await dbOperations.getAll(STORES.USERS),
      settings: await dbOperations.getAll(STORES.SETTINGS)
    };
  }

  
  static isFileAlreadyUploaded(fileName: string, fileSize: number): boolean {
    const uploadedFiles = JSON.parse(localStorage.getItem(this.UPLOADED_FILES_KEY) || '[]');
    return uploadedFiles.some((file: any) => 
      file.name === fileName && file.size === fileSize
    );
  }

  
  static markFileAsUploaded(fileName: string, fileSize: number): void {
    const uploadedFiles = JSON.parse(localStorage.getItem(this.UPLOADED_FILES_KEY) || '[]');
    const fileRecord = {
      name: fileName,
      size: fileSize,
      uploadedAt: new Date().toISOString()
    };
    
    uploadedFiles.push(fileRecord);
    
    
    if (uploadedFiles.length > 100) {
      uploadedFiles.splice(0, uploadedFiles.length - 100);
    }
    
    localStorage.setItem(this.UPLOADED_FILES_KEY, JSON.stringify(uploadedFiles));
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static scheduleAutoSave(): void {
    
    setInterval(() => {
      this.saveDataToExcel();
    }, 5 * 60 * 1000);
  }
}

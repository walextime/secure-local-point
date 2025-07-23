
import { toast } from 'sonner';

interface GoogleSheetsConfig {
  spreadsheetId: string;
  clientId: string;
  apiKey: string;
}

interface SyncData {
  sales: any[];
  customers: any[];
  inventory: any[];
}

export class GoogleSheetsService {
  private static config: GoogleSheetsConfig | null = null;
  private static isInitialized = false;
  private static gapi: any = null;

  static async initialize(config: GoogleSheetsConfig): Promise<boolean> {
    try {
      this.config = config;
      
      
      await this.loadGoogleAPI();
      
      
      await new Promise((resolve) => {
        this.gapi.load('client:auth2', resolve);
      });

      await this.gapi.client.init({
        apiKey: config.apiKey,
        clientId: config.clientId,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error);
      return false;
    }
  }

  private static loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = window.gapi;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  static async authenticate(): Promise<boolean> {
    if (!this.isInitialized || !this.gapi) {
      toast.error('Google Sheets API not initialized');
      return false;
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      toast.error('Failed to authenticate with Google');
      return false;
    }
  }

  static async syncData(data: SyncData): Promise<boolean> {
    if (!this.config || !this.isInitialized) {
      toast.error('Google Sheets not configured');
      return false;
    }

    try {
      const authenticated = await this.authenticate();
      if (!authenticated) return false;

      
      await this.appendToSheet('Sales', [
        ['Date', 'Customer', 'Total', 'Payment Method', 'Items'],
        ...data.sales.map(sale => [
          new Date(sale.date).toISOString(),
          sale.customerName || 'Walk-in',
          sale.total,
          sale.paymentMethod,
          sale.items?.length || 0
        ])
      ]);

      
      await this.appendToSheet('Customers', [
        ['Name', 'Email', 'Phone', 'Address'],
        ...data.customers.map(customer => [
          customer.name,
          customer.email || '',
          customer.phone || '',
          customer.address || ''
        ])
      ]);

      // Sync inventory data
      await this.appendToSheet('Inventory', [
        ['Name', 'SKU', 'Price', 'Stock', 'Category'],
        ...data.inventory.map(product => [
          product.name,
          product.sku,
          product.price,
          product.stock,
          product.category || ''
        ])
      ]);

      toast.success('Data synchronized with Google Sheets');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync data with Google Sheets');
      return false;
    }
  }

  private static async appendToSheet(sheetName: string, values: any[][]): Promise<void> {
    if (!this.config) return;

    const request = {
      spreadsheetId: this.config.spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    };

    await this.gapi.client.sheets.spreadsheets.values.append(request);
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }
}


declare global {
  interface Window {
    gapi: any;
  }
}


export interface BackupSettings {
  id: string;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  defaultConfig?: {
    includeCustomers: boolean;
    includeInventory: boolean;
    includeSales: boolean;
    formats: ('xlsx' | 'json' | 'pdf')[];
    storageLocation: 'both' | 'windows' | 'internal';
    encryptFiles: boolean;
    password: string;
  };
}

export interface BackupHistoryEntry {
  id: string;
  timestamp: number;
  filesCreated: string[];
  errors: string[];
  success: boolean;
  config: any;
}

export interface BackupHistoryRecord {
  id: string;
  entries: BackupHistoryEntry[];
}

export interface EncryptionSettings {
  id: string;
  encryptionPassword?: string;
  exportPassword?: string;
  autoExportEnabled: boolean;
  autoExportTime: string;
  exportMethod: string;
}

export interface SaleRecord {
  id: string;
  date: number;
  customerName?: string;
  items?: any[];
  subtotal: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  status: string;
  cashierName?: string;
}

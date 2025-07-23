
export interface BackupConfig {
  includeCustomers: boolean;
  includeInventory: boolean;
  includeSales: boolean;
  formats: ('xlsx' | 'json' | 'pdf')[];
  encryptFiles: boolean;
  password: string;
}

export interface BackupResult {
  success: boolean;
  filesCreated: string[];
  errors: string[];
  timestamp: number;
}

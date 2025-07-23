
export interface AppSettings {
  id: string;
  initialized: boolean;
  lastBackup: number | null;
  language: string;
  taxRate: number;
  secureFolderPath?: string;
  setupComplete?: boolean;
}

export interface StoreInfo {
  id: string;
  storeName?: string;
  name?: string; 
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  currency: string;
  logo?: string; 
  logoFileName?: string; 
  slogan?: string; 
}


export function normalizeStoreInfo(info: StoreInfo): StoreInfo {
  
  if (!info.storeName && info.name) {
    info.storeName = info.name;
  }
  
  return info;
}

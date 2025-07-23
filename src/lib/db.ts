import { toast } from 'sonner';
import { AppSettings, StoreInfo } from '@/types/settings';


const DB_NAME = 'pos_system';
const DB_VERSION = 8; 


export const STORES = {
  AUTH: 'auth',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  PENDING_SALES: 'pendingSales',
  USERS: 'users',
  SETTINGS: 'settings',
  CREDIT_PAYMENTS: 'creditPayments',
  PARTIAL_PAYMENTS: 'partialPayments',
  USER_RECEIPT_COUNTERS: 'userReceiptCounters',
  PENDING_SALE_EVENTS: 'pendingSaleEvents',
};


const SCHEMA = [
  {
    store: STORES.AUTH,
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', options: { unique: true } }
    ]
  },
  {
    store: STORES.PRODUCTS,
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', options: { unique: false } },
      { name: 'category', keyPath: 'category', options: { unique: false } },
      { name: 'barcode', keyPath: 'barcode', options: { unique: false } }
    ]
  },
  {
    store: STORES.CUSTOMERS,
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', options: { unique: false } },
      { name: 'email', keyPath: 'email', options: { unique: true } },
      { name: 'phone', keyPath: 'phone', options: { unique: false } }
    ]
  },
  {
    store: STORES.SALES,
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date', options: { unique: false } },
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'userId', keyPath: 'userId', options: { unique: false } }
    ]
  },
  {
    store: STORES.PENDING_SALES,
    keyPath: 'id',
    indexes: [
      { name: 'identifier', keyPath: 'identifier', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'userId', keyPath: 'userId', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
      { name: 'lastModified', keyPath: 'lastModified', options: { unique: false } }
    ]
  },
  {
    store: STORES.USERS,
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', options: { unique: true } },
      { name: 'role', keyPath: 'role', options: { unique: false } }
    ]
  },
  {
    store: STORES.SETTINGS,
    keyPath: 'id',
    indexes: []
  },
  {
    store: STORES.CREDIT_PAYMENTS,
    keyPath: 'id',
    indexes: [
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
    ]
  },
  {
    store: STORES.PARTIAL_PAYMENTS,
    keyPath: 'id',
    indexes: [
      { name: 'pendingSaleId', keyPath: 'pendingSaleId', options: { unique: false } },
      { name: 'processedAt', keyPath: 'processedAt', options: { unique: false } },
      { name: 'processedBy', keyPath: 'processedBy', options: { unique: false } }
    ]
  },
  {
    store: STORES.USER_RECEIPT_COUNTERS,
    keyPath: 'username',
    indexes: [
      { name: 'counter', keyPath: 'counter', options: { unique: false } },
      { name: 'lastUpdated', keyPath: 'lastUpdated', options: { unique: false } }
    ]
  },
  {
    store: STORES.PENDING_SALE_EVENTS,
    keyPath: 'id',
    indexes: [
      { name: 'pendingSaleId', keyPath: 'pendingSaleId', options: { unique: false } },
      { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
    ]
  }
];


export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      
      SCHEMA.forEach(({ store, keyPath, indexes }) => {
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath });
          
          
          indexes.forEach(({ name, keyPath, options }) => {
            objectStore.createIndex(name, keyPath, options);
          });
        }
      });
    };
  });
};


export const dbOperations = {
  
  add: async <T>(storeName: string, item: T): Promise<IDBValidKey> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBValidKey>).result;
          resolve(result);
        };
        
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error adding to store ${storeName}:`, error);
          reject(error);
        };
        
        transaction.oncomplete = () => db.close();
        transaction.onerror = (event) => {
          console.error(`Transaction error for store ${storeName}:`, event);
        };
      } catch (error) {
        console.error(`Error creating transaction for store ${storeName}:`, error);
        reject(error);
      }
    });
  },

  
  get: async <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<T>).result;
        resolve(result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  },

  
  getAll: async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<T[]>).result;
        resolve(result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  },

  
  put: async <T>(storeName: string, item: T): Promise<IDBValidKey> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<IDBValidKey>).result;
        resolve(result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  },

  
  delete: async (storeName: string, key: IDBValidKey): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  },

  
  clear: async (storeName: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  },

  
  getByIndex: async <T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<T[]>).result;
        resolve(result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  }
};


export const isDbInitialized = async (): Promise<boolean> => {
  try {
    const settings = await dbOperations.get<{ id: string; initialized: boolean }>(
      STORES.SETTINGS,
      'app-settings'
    );
    return settings?.initialized || false;
  } catch (error) {
    console.error('Error checking DB initialization:', error);
    return false;
  }
};


export const initializeDb = async (): Promise<void> => {
  try {
    
    await dbOperations.put<AppSettings>(STORES.SETTINGS, {
      id: 'app-settings',
      initialized: true,
      setupComplete: true,
      lastBackup: null,
      language: 'en',
      taxRate: 0
    });
    
    
    await dbOperations.put<StoreInfo>(STORES.SETTINGS, {
      id: 'store-info',
      currency: 'XAF'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    toast.error('Failed to initialize database');
  }
};

import Dexie, { Table } from 'dexie';
import { toast } from 'sonner';

// Action types for the queue
export type ActionType = 
  | 'addItem'
  | 'removeItem' 
  | 'updateQuantity'
  | 'completeSale'
  | 'createPendingSale'
  | 'updatePendingSale'
  | 'deletePendingSale'
  | 'addCustomer'
  | 'updateCustomer'
  | 'deleteCustomer'
  | 'addProduct'
  | 'updateProduct'
  | 'deleteProduct'
  | 'addUser'
  | 'updateUser'
  | 'deleteUser'
  | 'updateSettings'
  | 'addCreditPayment'
  | 'addPartialPayment';

// Action queue entry interface
export interface ActionQueueEntry {
  id: string;
  type: ActionType;
  payload: any;
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
  userId?: string;
  sessionId?: string;
}

// Database class extending Dexie
export class POSDatabase extends Dexie {
  // Tables
  products!: Table<any>;
  customers!: Table<any>;
  sales!: Table<any>;
  pendingSales!: Table<any>;
  users!: Table<any>;
  settings!: Table<any>;
  creditPayments!: Table<any>;
  partialPayments!: Table<any>;
  userReceiptCounters!: Table<any>;
  pendingSaleEvents!: Table<any>;
  actionQueue!: Table<ActionQueueEntry>;

  constructor() {
    super('POSDatabase');
    
    this.version(1).stores({
      // Existing tables
      products: 'id, name, category, barcode',
      customers: 'id, name, email, phone',
      sales: 'id, date, customerId, userId',
      pendingSales: 'id, identifier, status, userId, createdAt, lastModified',
      users: 'id, username, role',
      settings: 'id',
      creditPayments: 'id, customerId, timestamp',
      partialPayments: 'id, pendingSaleId, processedAt, processedBy',
      userReceiptCounters: 'username, counter, lastUpdated',
      pendingSaleEvents: 'id, pendingSaleId, timestamp',
      
      // New action queue table
      actionQueue: 'id, type, timestamp, status, userId, sessionId'
    });
  }
}

// Global database instance
export const db = new POSDatabase();

// Action queue manager
export class ActionQueueManager {
  private static instance: ActionQueueManager;
  private isProcessing = false;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): ActionQueueManager {
    if (!ActionQueueManager.instance) {
      ActionQueueManager.instance = new ActionQueueManager();
    }
    return ActionQueueManager.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add action to queue
  async addAction(type: ActionType, payload: any, userId?: string): Promise<string> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const action: ActionQueueEntry = {
      id: actionId,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      userId,
      sessionId: this.sessionId
    };

    await db.actionQueue.add(action);
    console.log(`Action queued: ${type}`, action);
    
    // Trigger processing if not already running, with a small delay to ensure DB is ready
    if (!this.isProcessing) {
      setTimeout(() => {
        this.processQueue();
      }, 100);
    }

    return actionId;
  }

  // Process the action queue
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return;
    }

    // Check if database is open
    if (!db.isOpen()) {
      console.log('Database not open, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    console.log('Starting action queue processing...');

    try {
      // Get pending actions
      const pendingActions = await db.actionQueue
        .where('status')
        .equals('pending')
        .toArray();

      console.log(`Found ${pendingActions.length} pending actions`);

      for (const action of pendingActions) {
        try {
          // Mark as in-progress
          await db.actionQueue.update(action.id, { status: 'in-progress' });

          // Execute action within transaction
          await db.transaction('rw', [
            db.products, db.customers, db.sales, db.pendingSales, 
            db.users, db.settings, db.creditPayments, db.partialPayments,
            db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
          ], async () => {
            await this.executeAction(action);
          });

          // Mark as completed
          await db.actionQueue.update(action.id, { 
            status: 'completed',
            timestamp: Date.now()
          });

          console.log(`Action completed: ${action.type}`);
        } catch (error) {
          console.error(`Action failed: ${action.type}`, error);
          
          // Mark as failed
          await db.actionQueue.update(action.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            retryCount: action.retryCount + 1
          });

          // Retry logic (max 3 retries)
          if (action.retryCount < 3) {
            await db.actionQueue.update(action.id, { 
              status: 'pending',
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Execute individual action
  private async executeAction(action: ActionQueueEntry): Promise<void> {
    try {
      console.log(`🔧 Executing action: ${action.type}`, action.payload);
      
      switch (action.type) {
        case 'addItem':
          await this.executeAddItem(action.payload);
          break;
        case 'removeItem':
          await this.executeRemoveItem(action.payload);
          break;
        case 'updateQuantity':
          await this.executeUpdateQuantity(action.payload);
          break;
        case 'completeSale':
          await this.executeCompleteSale(action.payload);
          break;
        case 'createPendingSale':
          await this.executeCreatePendingSale(action.payload);
          break;
        case 'updatePendingSale':
          await this.executeUpdatePendingSale(action.payload);
          break;
        case 'deletePendingSale':
          await this.executeDeletePendingSale(action.payload);
          break;
        case 'addCustomer':
          await this.executeAddCustomer(action.payload);
          break;
        case 'updateCustomer':
          await this.executeUpdateCustomer(action.payload);
          break;
        case 'deleteCustomer':
          await this.executeDeleteCustomer(action.payload);
          break;
        case 'addProduct':
          await this.executeAddProduct(action.payload);
          break;
        case 'updateProduct':
          await this.executeUpdateProduct(action.payload);
          break;
        case 'deleteProduct':
          await this.executeDeleteProduct(action.payload);
          break;
        case 'addUser':
          await this.executeAddUser(action.payload);
          break;
        case 'updateUser':
          await this.executeUpdateUser(action.payload);
          break;
        case 'deleteUser':
          await this.executeDeleteUser(action.payload);
          break;
        case 'updateSettings':
          await this.executeUpdateSettings(action.payload);
          break;
        case 'addCreditPayment':
          await this.executeAddCreditPayment(action.payload);
          break;
        case 'addPartialPayment':
          await this.executeAddPartialPayment(action.payload);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      // Mark as completed
      await db.actionQueue.update(action.id, {
        status: 'completed',
        error: undefined
      });
      
      console.log(`✅ Action completed: ${action.type}`);
      
    } catch (error) {
      console.error(`❌ Action failed: ${action.type}`, error);
      
      // Mark as failed
      await db.actionQueue.update(action.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        retryCount: action.retryCount + 1
      });
      
      throw error;
    }
  }

  // Action execution methods
  private async executeAddItem(payload: any): Promise<void> {
    // This would typically update a cart or session
    console.log('Executing addItem:', payload);
  }

  private async executeRemoveItem(payload: any): Promise<void> {
    console.log('Executing removeItem:', payload);
  }

  private async executeUpdateQuantity(payload: any): Promise<void> {
    console.log('Executing updateQuantity:', payload);
  }

  private async executeCompleteSale(payload: any): Promise<void> {
    const { sale, customerId } = payload;
    
    // Generate unique sale ID
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sale.id = saleId;
    
    // Add sale to database
    await db.sales.add(sale);
    
    // Update customer if provided
    if (customerId) {
      const customer = await db.customers.get(customerId);
      if (customer) {
        customer.balance = (customer.balance || 0) - sale.total;
        await db.customers.put(customer);
      }
    }
    
    console.log('Sale completed:', saleId);
  }

  private async executeCreatePendingSale(payload: any): Promise<void> {
    const pendingSale = payload;
    pendingSale.id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pendingSale.createdAt = Date.now();
    pendingSale.lastModified = Date.now();
    
    await db.pendingSales.add(pendingSale);
    console.log('Pending sale created:', pendingSale.id);
  }

  private async executeUpdatePendingSale(payload: any): Promise<void> {
    const { id, updates } = payload;
    updates.lastModified = Date.now();
    
    await db.pendingSales.update(id, updates);
    console.log('Pending sale updated:', id);
  }

  private async executeDeletePendingSale(payload: any): Promise<void> {
    const { id } = payload;
    await db.pendingSales.delete(id);
    console.log('Pending sale deleted:', id);
  }

  private async executeAddCustomer(payload: any): Promise<void> {
    const customer = payload;
    customer.id = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    customer.createdAt = Date.now();
    
    await db.customers.add(customer);
    console.log('Customer added:', customer.id);
  }

  private async executeUpdateCustomer(payload: any): Promise<void> {
    const { id, updates } = payload;
    await db.customers.update(id, updates);
    console.log('Customer updated:', id);
  }

  private async executeDeleteCustomer(payload: any): Promise<void> {
    const { id } = payload;
    await db.customers.delete(id);
    console.log('Customer deleted:', id);
  }

  private async executeAddProduct(payload: any): Promise<void> {
    const product = payload;
    product.id = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    product.createdAt = Date.now();
    
    await db.products.add(product);
    console.log('Product added:', product.id);
  }

  private async executeUpdateProduct(payload: any): Promise<void> {
    const { id, updates } = payload;
    await db.products.update(id, updates);
    console.log('Product updated:', id);
  }

  private async executeDeleteProduct(payload: any): Promise<void> {
    const { id } = payload;
    await db.products.delete(id);
    console.log('Product deleted:', id);
  }

  private async executeAddUser(payload: any): Promise<void> {
    const user = payload;
    user.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    user.createdAt = Date.now();
    
    await db.users.add(user);
    console.log('User added:', user.id);
  }

  private async executeUpdateUser(payload: any): Promise<void> {
    // Handle both formats: { id, updates } and direct user object
    let id: string;
    let updates: any;
    
    if (payload.id && payload.updates) {
      // Format: { id, updates }
      id = payload.id;
      updates = payload.updates;
    } else {
      // Format: direct user object with id
      id = payload.id;
      updates = payload;
    }
    
    if (!id) {
      throw new Error('User update requires an id');
    }
    
    await db.users.put(updates);
    console.log('User updated:', id);
  }

  private async executeDeleteUser(payload: any): Promise<void> {
    const { id } = payload;
    await db.users.delete(id);
    console.log('User deleted:', id);
  }

  private async executeUpdateSettings(payload: any): Promise<void> {
    // Handle both formats: { id, updates } and direct settings object
    let id: string;
    let updates: any;
    
    if (payload.id && payload.updates) {
      // Format: { id, updates }
      id = payload.id;
      updates = payload.updates;
    } else {
      // Format: direct settings object with id
      id = payload.id;
      updates = payload;
    }
    
    if (!id) {
      throw new Error('Settings update requires an id');
    }
    
    await db.settings.put(updates);
    console.log('Settings updated:', id);
  }

  private async executeAddCreditPayment(payload: any): Promise<void> {
    const payment = payload;
    payment.id = `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    payment.timestamp = Date.now();
    
    await db.creditPayments.add(payment);
    console.log('Credit payment added:', payment.id);
  }

  private async executeAddPartialPayment(payload: any): Promise<void> {
    const payment = payload;
    payment.id = `partial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    payment.processedAt = Date.now();
    
    await db.partialPayments.add(payment);
    console.log('Partial payment added:', payment.id);
  }

  // Get queue status
  async getQueueStatus(): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  }> {
    const [pending, inProgress, completed, failed] = await Promise.all([
      db.actionQueue.where('status').equals('pending').count(),
      db.actionQueue.where('status').equals('in-progress').count(),
      db.actionQueue.where('status').equals('completed').count(),
      db.actionQueue.where('status').equals('failed').count()
    ]);

    return { pending, inProgress, completed, failed };
  }

  // Clear completed actions (older than 24 hours)
  async clearCompletedActions(): Promise<void> {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    await db.actionQueue
      .where('status')
      .equals('completed')
      .and(action => action.timestamp < twentyFourHoursAgo)
      .delete();
    
    console.log('Cleared old completed actions');
  }

  // Replay failed actions
  async replayFailedActions(): Promise<void> {
    const failedActions = await db.actionQueue
      .where('status')
      .equals('failed')
      .toArray();

    for (const action of failedActions) {
      await db.actionQueue.update(action.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined
      });
    }

    console.log(`Replayed ${failedActions.length} failed actions`);
    this.processQueue();
  }
}

// Database operations wrapper with action queue
export const dbOperations = {
  // Add with action queue
  add: async <T>(storeName: string, item: T, userId?: string): Promise<string> => {
    const queue = ActionQueueManager.getInstance();
    
    // Map store name to action type
    const actionTypeMap: Record<string, ActionType> = {
      'products': 'addProduct',
      'customers': 'addCustomer',
      'sales': 'completeSale',
      'pendingSales': 'createPendingSale',
      'users': 'addUser',
      'settings': 'updateSettings',
      'creditPayments': 'addCreditPayment',
      'partialPayments': 'addPartialPayment'
    };

    const actionType = actionTypeMap[storeName] as ActionType;
    if (!actionType) {
      throw new Error(`Unknown store: ${storeName}`);
    }

    return await queue.addAction(actionType, item, userId);
  },

  // Get (read-only, no queue needed)
  get: async <T>(storeName: string, key: any): Promise<T | undefined> => {
    const table = (db as any)[storeName] as Table<T>;
    return await table.get(key);
  },

  // Get all (read-only, no queue needed)
  getAll: async <T>(storeName: string): Promise<T[]> => {
    const table = (db as any)[storeName] as Table<T>;
    return await table.toArray();
  },

  // Update with action queue
  put: async <T>(storeName: string, item: T, userId?: string): Promise<string> => {
    const queue = ActionQueueManager.getInstance();
    
    const actionTypeMap: Record<string, ActionType> = {
      'products': 'updateProduct',
      'customers': 'updateCustomer',
      'sales': 'completeSale',
      'pendingSales': 'updatePendingSale',
      'users': 'updateUser',
      'settings': 'updateSettings',
      'creditPayments': 'addCreditPayment',
      'partialPayments': 'addPartialPayment'
    };

    const actionType = actionTypeMap[storeName] as ActionType;
    if (!actionType) {
      throw new Error(`Unknown store: ${storeName}`);
    }

    return await queue.addAction(actionType, item, userId);
  },

  // Delete with action queue
  delete: async (storeName: string, key: any, userId?: string): Promise<string> => {
    const queue = ActionQueueManager.getInstance();
    
    const actionTypeMap: Record<string, ActionType> = {
      'products': 'deleteProduct',
      'customers': 'deleteCustomer',
      'pendingSales': 'deletePendingSale',
      'users': 'deleteUser'
    };

    const actionType = actionTypeMap[storeName] as ActionType;
    if (!actionType) {
      throw new Error(`Delete not supported for store: ${storeName}`);
    }

    return await queue.addAction(actionType, { id: key }, userId);
  },

  // Direct operations (bypass queue for immediate reads)
  directGet: async <T>(storeName: string, key: any): Promise<T | undefined> => {
    const table = (db as any)[storeName] as Table<T>;
    return await table.get(key);
  },

  directGetAll: async <T>(storeName: string): Promise<T[]> => {
    const table = (db as any)[storeName] as Table<T>;
    return await table.toArray();
  },

  // Queue management
  getQueueStatus: async () => {
    const queue = ActionQueueManager.getInstance();
    return await queue.getQueueStatus();
  },

  replayFailedActions: async () => {
    const queue = ActionQueueManager.getInstance();
    await queue.replayFailedActions();
  },

  clearCompletedActions: async () => {
    const queue = ActionQueueManager.getInstance();
    await queue.clearCompletedActions();
  }
};

// Initialize database and request persistence
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Open database first
    await db.open();
    console.log('Database opened successfully');

    // Request storage persistence
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const persisted = await navigator.storage.persist();
      console.log(`Storage persistence ${persisted ? 'granted' : 'denied'}`);
    }

    // Clear old completed actions before processing queue
    const queue = ActionQueueManager.getInstance();
    await queue.clearCompletedActions();

    // Start queue processing after database is fully initialized
    await queue.processQueue();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    toast.error('Database initialization failed');
  }
};

// Export the STORES constant for compatibility
export const STORES = {
  AUTH: 'users',
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

// Check if database is initialized
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

// Initialize database with default settings
export const initializeDb = async (): Promise<void> => {
  try {
    // Initialize app settings
    await dbOperations.put(STORES.SETTINGS, {
      id: 'app-settings',
      initialized: true,
      setupComplete: true,
      lastBackup: null,
      language: 'en',
      taxRate: 0
    });
    
    // Initialize store info
    await dbOperations.put(STORES.SETTINGS, {
      id: 'store-info',
      currency: 'XAF'
    });
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    toast.error('Failed to initialize database');
  }
}; 
export interface Sale {
  id: string;
  receiptId?: string;
  date: number;
  total: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
  paymentMethod: string;
  cashierName: string;
  cashierId: string;
  userId: string;
  status: string;
  customerName?: string;
  customerId?: string;
  amountGiven?: number;
  changeDue?: number;
  totalPaid?: number;
  remainingBalance?: number; 
  
  isPrintedReceipt?: boolean;
  originalPendingSaleId?: string;
}

export interface PendingSale {
  id: string;
  identifier: string; 
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number; 
  remainingBalance: number; 
  status: 'open' | 'partially_paid' | 'on_hold' | 'deleted' | 'archived';
  customerName?: string;
  customerId?: string;
  userId: string; 
  cashierName: string;
  cashierId: string;
  createdAt: number;
  lastModified: number;
  notes?: string;
  
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
  deletionReason?: string;
}

export interface PartialPayment {
  id: string;
  pendingSaleId: string;
  amount: number;
  paymentMethod: string;
  processedBy: string;
  processedAt: number;
  notes?: string;
}

export type PendingSaleEventType =
  | 'created'
  | 'item_added'
  | 'item_removed'
  | 'item_modified'
  | 'items_bulk_update'
  | 'payment'
  | 'status_change'
  | 'recalled'
  | 'deleted'
  | 'restored'
  | 'note_added'
  | 'other';

export interface PendingSaleEvent {
  id: string;
  pendingSaleId: string;
  type: PendingSaleEventType;
  timestamp: number;
  userId: string;
  userName: string;
  details: Record<string, unknown>;
}



export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  barcode?: string;
  image?: string;
  stock: number;
  minStock: number;
  unit?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  discount?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Sale {
  id: string;
  receiptId: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  userId: string;
  cashierId: string;
  cashierName: string;
  date: number;
  status: string;
  customerName?: string;
  customerId?: string;
}

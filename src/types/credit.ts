
export interface CreditPayment {
  id: string;
  customerId: string;
  amount: number;
  note: string;
  timestamp: number;
  userId: string;
  userName: string;
}

export interface CustomerWithCredit {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  creditLimit: number;
  createdAt: number;
}

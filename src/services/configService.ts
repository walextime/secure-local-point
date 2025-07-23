import { dbOperations, STORES } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export interface UserReceiptCounter {
  username: string;
  counter: number;
  lastUpdated: number;
}

export class ConfigService {
  private static readonly PDF_PASSWORD_KEY = 'pdf_master_password';
  private static readonly DEFAULT_PDF_PASSWORD = 'MyStrongPass2025!';

    static getPDFPassword(): string {
    
    
    return localStorage.getItem(this.PDF_PASSWORD_KEY) || this.DEFAULT_PDF_PASSWORD;
  }

    static setPDFPassword(password: string): void {
    localStorage.setItem(this.PDF_PASSWORD_KEY, password);
  }

    static isPDFPasswordSet(): boolean {
    return localStorage.getItem(this.PDF_PASSWORD_KEY) !== null;
  }

    static async getNextReceiptId(): Promise<string> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const username = currentUser.username;
      
      
      let counterData = await dbOperations.get<UserReceiptCounter>(STORES.USER_RECEIPT_COUNTERS, username);
      
      if (!counterData) {
        
        counterData = {
          username,
          counter: 0,
          lastUpdated: Date.now()
        };
      }

      
      counterData.counter++;
      counterData.lastUpdated = Date.now();

      
      await dbOperations.put(STORES.USER_RECEIPT_COUNTERS, counterData);

      
      const paddedNumber = counterData.counter.toString().padStart(5, '0');
      
      return `${username}${paddedNumber}`;
    } catch (error) {
      console.error('Error generating receipt ID:', error);
      
      return `POS${Date.now().toString().slice(-5)}`;
    }
  }

    static async getReceiptCounter(username: string): Promise<number> {
    try {
      const counterData = await dbOperations.get<UserReceiptCounter>(STORES.USER_RECEIPT_COUNTERS, username);
      return counterData?.counter || 0;
    } catch (error) {
      console.error('Error getting receipt counter:', error);
      return 0;
    }
  }

    static async resetReceiptCounter(username: string): Promise<boolean> {
    try {
      const counterData: UserReceiptCounter = {
        username,
        counter: 0,
        lastUpdated: Date.now()
      };
      
      await dbOperations.put(STORES.USER_RECEIPT_COUNTERS, counterData);
      return true;
    } catch (error) {
      console.error('Error resetting receipt counter:', error);
      return false;
    }
  }
}

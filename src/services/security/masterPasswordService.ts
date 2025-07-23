
import { dbOperations, STORES } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { toast } from 'sonner';

interface MasterPasswordRecord {
  id: string;
  passwordHash: string;
  createdAt: number;
  lastChanged: number;
}

export class MasterPasswordService {
  private static readonly MASTER_PASSWORD_ID = 'master-password';

    static async isSet(): Promise<boolean> {
    try {
      const record = await dbOperations.get<MasterPasswordRecord>(
        STORES.SETTINGS, 
        this.MASTER_PASSWORD_ID
      );
      return !!record?.passwordHash;
    } catch (error) {
      console.error('Error checking master password:', error);
      return false;
    }
  }

    static async setPassword(password: string): Promise<boolean> {
    try {
      if (await this.isSet()) {
        throw new Error('Master password already exists. Use changePassword instead.');
      }

      const passwordHash = await hashPassword(password);
      const record: MasterPasswordRecord = {
        id: this.MASTER_PASSWORD_ID,
        passwordHash,
        createdAt: Date.now(),
        lastChanged: Date.now()
      };

      await dbOperations.put(STORES.SETTINGS, record);
      return true;
    } catch (error) {
      console.error('Error setting master password:', error);
      toast.error('Failed to set master password');
      return false;
    }
  }

    static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const isValid = await this.verifyPassword(currentPassword);
      if (!isValid) {
        toast.error('Current password is incorrect');
        return false;
      }

      const passwordHash = await hashPassword(newPassword);
      const record: MasterPasswordRecord = {
        id: this.MASTER_PASSWORD_ID,
        passwordHash,
        createdAt: Date.now(),
        lastChanged: Date.now()
      };

      await dbOperations.put(STORES.SETTINGS, record);
      toast.success('Master password changed successfully');
      return true;
    } catch (error) {
      console.error('Error changing master password:', error);
      toast.error('Failed to change master password');
      return false;
    }
  }

    static async verifyPassword(password: string): Promise<boolean> {
    try {
      const record = await dbOperations.get<MasterPasswordRecord>(
        STORES.SETTINGS, 
        this.MASTER_PASSWORD_ID
      );

      if (!record?.passwordHash) {
        return false;
      }

      return await verifyPassword(password, record.passwordHash);
    } catch (error) {
      console.error('Error verifying master password:', error);
      return false;
    }
  }

    static async getInfo(): Promise<{ isSet: boolean; lastChanged?: number }> {
    try {
      const record = await dbOperations.get<MasterPasswordRecord>(
        STORES.SETTINGS, 
        this.MASTER_PASSWORD_ID
      );

      return {
        isSet: !!record?.passwordHash,
        lastChanged: record?.lastChanged
      };
    } catch (error) {
      console.error('Error getting master password info:', error);
      return { isSet: false };
    }
  }

    static validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      };
    }

    return { isValid: true };
  }
}

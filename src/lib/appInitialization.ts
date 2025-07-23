import { isDbInitialized, initializeDb } from './dexieDb';
import { ensureRootAccountExists } from './auth';
import { toast } from 'sonner';

export const initializeApp = async (): Promise<boolean> => {
  try {
    
    const dbInitialized = await isDbInitialized();
    if (!dbInitialized) {
      await initializeDb();
    }
    
    // Ensure root account exists
    await ensureRootAccountExists();
    
    return true;
  } catch (error) {
    toast.error('Failed to initialize application');
    return false;
  }
};

export const setSecureFolderPath = async (path: string): Promise<boolean> => {
  try {
    localStorage.setItem('secureFolderPath', path);
    return true;
  } catch (error) {
    console.error('Error setting secure folder path:', error);
    return false;
  }
};

export const isElectronEnvironment = (): boolean => {
  return false;
};

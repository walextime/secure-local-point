import { useState, useEffect } from 'react';
import { dbOperations, STORES } from '@/lib/db';
import { AppSettings, StoreInfo } from '@/types/settings';
import { toast } from 'sonner';

export function useSettings() {
  const [taxRate, setTaxRate] = useState<number>(0);
  const [currency] = useState<string>('XAF');
  const [language, setLanguage] = useState<string>('en');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        
        const settings = await dbOperations.get<AppSettings>(STORES.SETTINGS, 'app-settings');
        if (settings) {
          if (typeof settings.taxRate === 'number') {
            setTaxRate(settings.taxRate);
          }
          if (settings.language) {
            setLanguage(settings.language);
            
            document.documentElement.setAttribute('lang', settings.language);
          } else {
            
            document.documentElement.setAttribute('lang', 'en');
          }
        }
        
        
        const info = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info');
        if (info) {
          setStoreInfo({ ...info, currency: 'XAF' });
        } else {
          const defaultInfo: StoreInfo = {
            id: 'store-info',
            currency: 'XAF'
          };
          await dbOperations.put(STORES.SETTINGS, defaultInfo);
          setStoreInfo(defaultInfo);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load system settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const saveSettings = async (
    newSettings: Partial<AppSettings>,
    newStoreInfo?: Partial<StoreInfo>
  ): Promise<boolean> => {
    try {
      
      if (Object.keys(newSettings).length > 0) {
        const currentSettings = await dbOperations.get<AppSettings>(STORES.SETTINGS, 'app-settings') || {
          id: 'app-settings',
          initialized: true,
          lastBackup: null,
          language: 'en',
          taxRate: 0
        };
        
        const updatedSettings = {
          ...currentSettings,
          ...newSettings
        };
        
        await dbOperations.put(STORES.SETTINGS, updatedSettings);
        
        
        if (typeof newSettings.taxRate === 'number') {
          setTaxRate(newSettings.taxRate);
        }
        if (newSettings.language) {
          setLanguage(newSettings.language);
          
          document.documentElement.setAttribute('lang', newSettings.language);
        }
      }
      
      
      if (newStoreInfo && Object.keys(newStoreInfo).length > 0) {
        const currentStoreInfo = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info') || {
          id: 'store-info',
          currency: 'XAF'
        };
        const updatedStoreInfo = {
          ...currentStoreInfo,
          ...newStoreInfo,
          currency: 'XAF'
        };
        await dbOperations.put(STORES.SETTINGS, updatedStoreInfo);
        setStoreInfo((prev) => {
          if (!prev) {
            return {
              id: 'store-info',
              currency: 'XAF',
              ...newStoreInfo
            };
          }
          return {
            ...prev,
            ...newStoreInfo,
            currency: 'XAF'
          };
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };

  return { 
    taxRate, 
    currency, 
    language,
    storeInfo, 
    isLoading,
    saveSettings 
  };
}

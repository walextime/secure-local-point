
import { dbOperations, STORES } from '@/lib/db';
import { ReceiptOptions } from '@/utils/receiptGenerator';
import { getLogoUrl, isDefaultLogo } from '@/lib/logoUtils';

export const isPrintingAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'print' in window;
};

export const getCurrentLanguage = (): string => {
  try {
    
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang === 'fr' || htmlLang === 'en') {
      return htmlLang;
    }
    
    
    return 'en';
  } catch (e) {
    return 'en';
  }
};

export const getReceiptOptions = async (): Promise<ReceiptOptions> => {
  try {
    const receiptSettings = await dbOperations.get(STORES.SETTINGS, 'receipt-settings');
    
    
    if (receiptSettings && typeof receiptSettings === 'object') {
      const settings = receiptSettings as any;
      return {
        showLogo: settings.showLogo !== false,
        showWatermark: settings.showWatermark !== false,
        format: settings.format || 'A5'
      };
    }
    
    
    return { showLogo: true, showWatermark: true, format: 'A5' };
  } catch (error) {
    console.error('Error loading receipt options:', error);
    return { showLogo: true, showWatermark: true, format: 'A5' };
  }
};

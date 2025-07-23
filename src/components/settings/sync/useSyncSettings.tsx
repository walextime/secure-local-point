
import { useState, useEffect } from 'react';
import { SyncManager } from '@/services/syncManager';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { toast } from 'sonner';

interface SyncConfig {
  googleSheetsEnabled: boolean;
  spreadsheetId: string;
  clientId: string;
  apiKey: string;
  autoSync: boolean;
  syncInterval: number;
}

export const useSyncSettings = () => {
  const [config, setConfig] = useState<SyncConfig>({
    googleSheetsEnabled: false,
    spreadsheetId: '',
    clientId: '',
    apiKey: '',
    autoSync: true,
    syncInterval: 10
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('sync_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }

    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveConfig = () => {
    localStorage.setItem('sync_config', JSON.stringify(config));
    toast.success('Sync settings saved');
  };

  const testGoogleSheetsConnection = async () => {
    if (!config.spreadsheetId || !config.clientId || !config.apiKey) {
      toast.error('Please fill in all Google Sheets credentials');
      return;
    }

    try {
      const success = await GoogleSheetsService.initialize({
        spreadsheetId: config.spreadsheetId,
        clientId: config.clientId,
        apiKey: config.apiKey
      });

      if (success) {
        const authenticated = await GoogleSheetsService.authenticate();
        if (authenticated) {
          toast.success('Google Sheets connection successful!');
        } else {
          toast.error('Failed to authenticate with Google Sheets');
        }
      } else {
        toast.error('Failed to initialize Google Sheets API');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Connection test failed');
    }
  };

  const performManualSync = async () => {
    setIsSyncing(true);
    try {
      const success = await SyncManager.performFullSync();
      if (success) {
        toast.success('Manual sync completed successfully');
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Manual sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const initializeSyncManager = async () => {
    if (config.googleSheetsEnabled) {
      await SyncManager.initialize({
        googleSheets: {
          spreadsheetId: config.spreadsheetId,
          clientId: config.clientId,
          apiKey: config.apiKey
        },
        autoSync: config.autoSync,
        syncInterval: config.syncInterval
      });
      toast.success('Sync manager initialized');
    }
  };

  const updateConfig = (field: keyof SyncConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return {
    config,
    isSyncing,
    isOnline,
    updateConfig,
    saveConfig,
    testGoogleSheetsConnection,
    performManualSync,
    initializeSyncManager
  };
};


import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { SyncManager } from '@/services/syncManager';
import SyncConnectionStatus from './sync/SyncConnectionStatus';
import GoogleSheetsConfig from './sync/GoogleSheetsConfig';
import SyncSettingsCard from './sync/SyncSettingsCard';
import ManualSyncActions from './sync/ManualSyncActions';

const SyncTab: React.FC = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected');
  const [autoSyncInterval, setAutoSyncInterval] = useState(30); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTestConnection = async () => {
    if (!spreadsheetId || !clientId || !apiKey) {
      toast.error('Please fill in all Google Sheets credentials');
      return;
    }

    setSyncStatus('syncing');
    try {
      const initialized = await GoogleSheetsService.initialize({
        spreadsheetId,
        clientId,
        apiKey
      });

      if (initialized) {
        const authenticated = await GoogleSheetsService.authenticate();
        if (authenticated) {
          setSyncStatus('connected');
          toast.success('Successfully connected to Google Sheets');
        } else {
          setSyncStatus('disconnected');
          toast.error('Failed to authenticate with Google Sheets');
        }
      } else {
        setSyncStatus('disconnected');
        toast.error('Failed to initialize Google Sheets API');
      }
    } catch (error) {
      setSyncStatus('disconnected');
      toast.error('Connection test failed');
    }
  };

  const handleManualSync = async () => {
    if (syncStatus !== 'connected') {
      toast.error('Please connect to Google Sheets first');
      return;
    }

    setSyncStatus('syncing');
    try {
      const success = await SyncManager.performFullSync();
      if (success) {
        setLastSyncTime(new Date());
        toast.success('Data synchronized successfully');
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncStatus('connected');
    }
  };

  const handleEnableSync = async () => {
    if (!syncEnabled) {
      await handleTestConnection();
      if (syncStatus === 'connected') {
        setSyncEnabled(true);
        
        await SyncManager.initialize({
          googleSheets: {
            spreadsheetId,
            clientId,
            apiKey
          },
          autoSync: true,
          syncInterval: autoSyncInterval
        });
        toast.success('Google Sheets sync enabled');
      }
    } else {
      setSyncEnabled(false);
      SyncManager.stopAutoSync();
      toast.info('Google Sheets sync disabled');
    }
  };

  return (
    <div className="space-y-6">
      <SyncConnectionStatus
        isOnline={isOnline}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        syncEnabled={syncEnabled}
        autoSyncInterval={autoSyncInterval}
      />

      <GoogleSheetsConfig
        spreadsheetId={spreadsheetId}
        clientId={clientId}
        apiKey={apiKey}
        isOnline={isOnline}
        syncStatus={syncStatus}
        syncEnabled={syncEnabled}
        onSpreadsheetIdChange={setSpreadsheetId}
        onClientIdChange={setClientId}
        onApiKeyChange={setApiKey}
        onTestConnection={handleTestConnection}
        onEnableSync={handleEnableSync}
      />

      {syncEnabled && (
        <SyncSettingsCard
          autoSyncInterval={autoSyncInterval}
          onAutoSyncIntervalChange={setAutoSyncInterval}
        />
      )}

      <ManualSyncActions
        isOnline={isOnline}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />
    </div>
  );
};

export default SyncTab;

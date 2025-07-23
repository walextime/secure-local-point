import React, { useState, useEffect } from 'react';
import { Tabs } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { dbOperations, STORES } from '@/lib/db';
import { AppSettings, StoreInfo } from '@/types/settings';
import { BackupSettings } from '@/types/backup';
import { useSettings } from '@/components/pos/hooks/useSettings';
import { translations } from '@/components/settings/translations';
import { restartBackupScheduler } from '@/services/backup/backupScheduler';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsTabsList from '@/components/settings/SettingsTabsList';
import StoreTab from '@/components/settings/tabs/StoreTab';
import LogoTab from '@/components/settings/tabs/LogoTab';
import LocalizationTab from '@/components/settings/tabs/LocalizationTab';
import SalesTab from '@/components/settings/tabs/SalesTab';
import SecurityTab from '@/components/settings/tabs/SecurityTab';
import MasterPasswordTab from '@/components/settings/tabs/MasterPasswordTab';
import ReceiptTab from '@/components/settings/tabs/ReceiptTab';
import BackupTab from '@/components/settings/tabs/BackupTab';
import AdminTab from '@/components/settings/tabs/AdminTab';

interface EncryptionSettings {
  id: string;
  autoExportEnabled: boolean;
  autoExportTime: string;
  exportMethod: string;
}

const Settings: React.FC = () => {
  const { language, saveSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    id: 'store-info',
    currency: 'XAF'
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    id: 'app-settings',
    initialized: true,
    lastBackup: null,
    language: 'en',
    taxRate: 0
  });
  const [encryptionSettings, setEncryptionSettings] = useState<EncryptionSettings>({
    id: 'encryption-settings',
    autoExportEnabled: false,
    autoExportTime: '23:00',
    exportMethod: 'local'
  });
  
  
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('20:00');
  
  
  const t = translations[language as keyof typeof translations] || translations.en;

  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        
        const storedInfo = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info');
        if (storedInfo) {
          setStoreInfo(storedInfo);
        }
        
        
        const storedSettings = await dbOperations.get<AppSettings>(STORES.SETTINGS, 'app-settings');
        if (storedSettings) {
          setAppSettings(storedSettings);
        }
        
        
        const storedEncryption = await dbOperations.get<EncryptionSettings>(STORES.SETTINGS, 'encryption-settings');
        if (storedEncryption) {
          setEncryptionSettings(storedEncryption);
        }
        
        // Load backup settings
        const storedBackup = await dbOperations.get<BackupSettings>(STORES.SETTINGS, 'backup-settings');
        if (storedBackup) {
          setAutoBackupEnabled(storedBackup.autoBackupEnabled || false);
          setAutoBackupTime(storedBackup.autoBackupTime || '20:00');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  
  const saveStoreInfo = async () => {
    try {
      await dbOperations.put(STORES.SETTINGS, storeInfo);
      
      
      await saveSettings({}, {
        currency: storeInfo.currency
      });
      
      toast.success('Store information saved');
    } catch (error) {
      console.error('Error saving store info:', error);
      toast.error('Failed to save store information');
    }
  };

  
  const saveAppSettings = async () => {
    try {
      await dbOperations.put(STORES.SETTINGS, appSettings);
      
      
      await saveSettings({
        language: appSettings.language,
        taxRate: appSettings.taxRate
      });
      
      toast.success('App settings saved');
    } catch (error) {
      console.error('Error saving app settings:', error);
      toast.error('Failed to save app settings');
    }
  };

  
  const saveEncryptionSettings = async () => {
    try {
      await dbOperations.put(STORES.SETTINGS, encryptionSettings);
      toast.success('Security settings saved');
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    }
  };

  
  const saveBackupSettings = async () => {
    try {
      const backupSettingsObj: BackupSettings = {
        id: 'backup-settings',
        autoBackupEnabled,
        autoBackupTime
      };
      await dbOperations.put(STORES.SETTINGS, backupSettingsObj);
      
      // Restart the backup scheduler with new settings
      restartBackupScheduler();
      
      toast.success('Backup settings saved and scheduler restarted');
    } catch (error) {
      console.error('Error saving backup settings:', error);
      toast.error('Failed to save backup settings');
    }
  };

  
  const updateStoreInfo = (field: keyof StoreInfo, value: string) => {
    setStoreInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  
  const handleBackupNow = () => {
    window.location.href = '/backup';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader onBackupNow={handleBackupNow} t={t} />
      
      <Tabs defaultValue="store">
        <SettingsTabsList t={t} />
        
        <StoreTab 
          storeInfo={storeInfo} 
          updateStoreInfo={updateStoreInfo} 
          saveStoreInfo={saveStoreInfo} 
          t={t} 
        />
        
        <LogoTab 
          storeInfo={storeInfo} 
          updateStoreInfo={updateStoreInfo} 
          saveStoreInfo={saveStoreInfo} 
          t={t} 
        />
        
        <LocalizationTab 
          storeInfo={storeInfo} 
          appSettings={appSettings} 
          updateStoreInfo={updateStoreInfo} 
          setAppSettings={setAppSettings} 
          saveAppSettings={saveAppSettings} 
          t={t} 
        />
        
        <SalesTab 
          appSettings={appSettings} 
          setAppSettings={setAppSettings} 
          saveAppSettings={saveAppSettings} 
          t={t} 
        />
        
        <SecurityTab 
          encryptionSettings={encryptionSettings} 
          setEncryptionSettings={setEncryptionSettings} 
          saveEncryptionSettings={saveEncryptionSettings} 
          t={t} 
        />
        
        <MasterPasswordTab />
        
        <ReceiptTab t={t} />
        
        <BackupTab 
          autoBackupEnabled={autoBackupEnabled}
          autoBackupTime={autoBackupTime}
          setAutoBackupEnabled={setAutoBackupEnabled}
          setAutoBackupTime={setAutoBackupTime}
          saveBackupSettings={saveBackupSettings}
          handleBackupNow={handleBackupNow} 
          t={t} 
        />
        
        <AdminTab />
      </Tabs>
    </div>
  );
};

export default Settings;


import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import LocalizationSettings from '@/components/settings/LocalizationSettings';
import { AppSettings, StoreInfo } from '@/types/settings';

interface LocalizationTabProps {
  storeInfo: StoreInfo;
  appSettings: AppSettings;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveAppSettings: () => Promise<void>;
  t: any;
}

const LocalizationTab: React.FC<LocalizationTabProps> = ({ 
  storeInfo, 
  appSettings, 
  updateStoreInfo, 
  setAppSettings, 
  saveAppSettings, 
  t 
}) => {
  return (
    <TabsContent value="localization" className="space-y-6">
      <LocalizationSettings 
        storeInfo={storeInfo} 
        appSettings={appSettings} 
        updateStoreInfo={updateStoreInfo} 
        setAppSettings={setAppSettings} 
        saveAppSettings={saveAppSettings} 
        t={t} 
      />
    </TabsContent>
  );
};

export default LocalizationTab;

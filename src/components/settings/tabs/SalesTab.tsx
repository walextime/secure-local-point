
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import SalesSettings from '@/components/settings/SalesSettings';
import { AppSettings } from '@/types/settings';

interface SalesTabProps {
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveAppSettings: () => Promise<void>;
  t: any;
}

const SalesTab: React.FC<SalesTabProps> = ({ 
  appSettings, 
  setAppSettings, 
  saveAppSettings, 
  t 
}) => {
  return (
    <TabsContent value="sales" className="space-y-6">
      <SalesSettings 
        appSettings={appSettings} 
        setAppSettings={setAppSettings} 
        saveAppSettings={saveAppSettings} 
        t={t} 
      />
    </TabsContent>
  );
};

export default SalesTab;

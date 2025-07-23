
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import LogoSettings from '@/components/settings/LogoSettings';
import { StoreInfo } from '@/types/settings';

interface LogoTabProps {
  storeInfo: StoreInfo;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  saveStoreInfo: () => void;
  t: any;
}

const LogoTab: React.FC<LogoTabProps> = ({ 
  storeInfo, 
  updateStoreInfo, 
  saveStoreInfo, 
  t 
}) => {
  return (
    <TabsContent value="logo" className="space-y-6">
      <LogoSettings 
        storeInfo={storeInfo} 
        updateStoreInfo={updateStoreInfo} 
        saveStoreInfo={saveStoreInfo} 
        t={t} 
      />
    </TabsContent>
  );
};

export default LogoTab;

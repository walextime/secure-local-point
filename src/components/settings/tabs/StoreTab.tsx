
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import StoreInfoSettings from '@/components/settings/StoreInfoSettings';
import { StoreInfo } from '@/types/settings';

interface StoreTabProps {
  storeInfo: StoreInfo;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  saveStoreInfo: () => Promise<void>;
  t: any;
}

const StoreTab: React.FC<StoreTabProps> = ({ 
  storeInfo, 
  updateStoreInfo, 
  saveStoreInfo, 
  t 
}) => {
  return (
    <TabsContent value="store" className="space-y-6">
      <StoreInfoSettings 
        storeInfo={storeInfo} 
        updateStoreInfo={updateStoreInfo} 
        saveStoreInfo={saveStoreInfo} 
        t={t} 
      />
    </TabsContent>
  );
};

export default StoreTab;

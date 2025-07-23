
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import MasterPasswordSettings from '@/components/settings/MasterPasswordSettings';

const MasterPasswordTab: React.FC = () => {
  return (
    <TabsContent value="master-password" className="space-y-6">
      <MasterPasswordSettings />
    </TabsContent>
  );
};

export default MasterPasswordTab;

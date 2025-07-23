
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import SyncSettings from '@/components/settings/SyncSettings';

interface SyncTabProps {
  t: any;
}

const SyncTab: React.FC<SyncTabProps> = ({ t }) => {
  return (
    <TabsContent value="sync" className="space-y-6">
      <SyncSettings />
    </TabsContent>
  );
};

export default SyncTab;

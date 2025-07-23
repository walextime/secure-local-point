
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import ReceiptSettings from '@/components/settings/ReceiptSettings';

interface ReceiptTabProps {
  t: any;
}

const ReceiptTab: React.FC<ReceiptTabProps> = ({ t }) => {
  return (
    <TabsContent value="receipt" className="space-y-6">
      <ReceiptSettings t={t} />
    </TabsContent>
  );
};

export default ReceiptTab;


import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import AdminPasswordReset from '@/components/settings/AdminPasswordReset';

const AdminTab: React.FC = () => {
  return (
    <TabsContent value="admin" className="space-y-6">
      <AdminPasswordReset />
    </TabsContent>
  );
};

export default AdminTab;

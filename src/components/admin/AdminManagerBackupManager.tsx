import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ManualBackupTab from './backup/ManualBackupTab';
import AutoBackupTab from './backup/AutoBackupTab';
import DailyReportsTab from './backup/DailyReportsTab';
import BackupHistoryTab from './backup/BackupHistoryTab';
import SystemBackupManager from '@/components/backup/SystemBackupManager';
import { Archive } from 'lucide-react';


const AdminManagerBackupManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Backup Manager
          </CardTitle>
          <CardDescription>
            Backup and export tools for administrators and managers
          </CardDescription>
        </CardHeader>
      </Card>
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="manual">Manual Backup</TabsTrigger>
          <TabsTrigger value="auto">Auto Backup</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="history">Backup History</TabsTrigger>
          <TabsTrigger value="system">System Backup</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="space-y-4">
          <ManualBackupTab restricted={true} />
        </TabsContent>
        <TabsContent value="auto" className="space-y-4">
          <AutoBackupTab restricted={true} />
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <DailyReportsTab />
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <BackupHistoryTab />
        </TabsContent>
        <TabsContent value="system" className="space-y-4">
          <SystemBackupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagerBackupManager; 
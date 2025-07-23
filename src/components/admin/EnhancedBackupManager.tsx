
import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Cloud } from 'lucide-react';
import { useBackupManager } from './backup/hooks/useBackupManager';
import ManualBackupTab from './backup/ManualBackupTab';
import AutoBackupTab from './backup/AutoBackupTab';
import DailyReportsTab from './backup/DailyReportsTab';
import BackupHistoryTab from './backup/BackupHistoryTab';
import SyncTab from './backup/SyncTab';

const EnhancedBackupManager: React.FC = () => {
  const {
    backupConfig,
    isBackingUp,
    autoBackupEnabled,
    autoBackupTime,
    backupHistory,
    lastBackupStatus,
    setAutoBackupEnabled,
    setAutoBackupTime,
    updateBackupConfig,
    toggleFormat,
    handleManualBackup,
    generateDailyReport,
    saveBackupSettings
  } = useBackupManager();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Enhanced Backup Manager
          </CardTitle>
          <CardDescription>
            Comprehensive backup system with local storage, cloud sync, and automated reporting
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="backup">Manual Backup</TabsTrigger>
          <TabsTrigger value="auto">Auto Backup</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="history">Backup History</TabsTrigger>
          <TabsTrigger value="sync">
            <Cloud className="w-4 h-4 mr-2" />
            Cloud Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-4">
          <ManualBackupTab
            backupConfig={backupConfig}
            isBackingUp={isBackingUp}
            onConfigUpdate={updateBackupConfig}
            onToggleFormat={toggleFormat}
            onManualBackup={handleManualBackup}
          />
        </TabsContent>

        <TabsContent value="auto" className="space-y-4">
          <AutoBackupTab
            autoBackupEnabled={autoBackupEnabled}
            autoBackupTime={autoBackupTime}
            lastBackupStatus={lastBackupStatus}
            onAutoBackupEnabledChange={setAutoBackupEnabled}
            onAutoBackupTimeChange={setAutoBackupTime}
            onSaveSettings={saveBackupSettings}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <DailyReportsTab
            onGenerateReport={generateDailyReport}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BackupHistoryTab
            backupHistory={backupHistory}
          />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <SyncTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedBackupManager;

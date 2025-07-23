
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import BackupSettings from '@/components/settings/BackupSettings';

interface BackupTabProps {
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  setAutoBackupEnabled: (enabled: boolean) => void;
  setAutoBackupTime: (time: string) => void;
  saveBackupSettings: () => Promise<void>;
  handleBackupNow: () => void;
  t: any;
}

const BackupTab: React.FC<BackupTabProps> = ({ 
  autoBackupEnabled,
  autoBackupTime,
  setAutoBackupEnabled,
  setAutoBackupTime,
  saveBackupSettings,
  handleBackupNow,
  t 
}) => {
  return (
    <TabsContent value="backup" className="space-y-6">
      <BackupSettings 
        autoBackupEnabled={autoBackupEnabled}
        autoBackupTime={autoBackupTime}
        setAutoBackupEnabled={setAutoBackupEnabled}
        setAutoBackupTime={setAutoBackupTime}
        saveBackupSettings={saveBackupSettings}
        handleBackupNow={handleBackupNow} 
        t={t} 
      />
    </TabsContent>
  );
};

export default BackupTab;

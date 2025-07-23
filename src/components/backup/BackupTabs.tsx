
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileArchive, Upload, Settings } from 'lucide-react';
import CreateBackupCard from '@/components/backup/CreateBackupCard';
import RestoreBackupCard from '@/components/backup/RestoreBackupCard';
import EnhancedBackupManager from '@/components/admin/EnhancedBackupManager';

interface BackupTabsProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  t: any;
  onDecryptSuccess: (data: any, fileName: string) => void;
}

const BackupTabs: React.FC<BackupTabsProps> = ({
  currentTab,
  onTabChange,
  t,
  onDecryptSuccess
}) => {
  return (
    <Tabs value={currentTab} onValueChange={onTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="enhanced">
          <Settings className="w-4 h-4 mr-2" />
          Enhanced Backup
        </TabsTrigger>
        <TabsTrigger value="create">
          <FileArchive className="w-4 h-4 mr-2" />
          {t.createBackup.title}
        </TabsTrigger>
        <TabsTrigger value="restore">
          <Upload className="w-4 h-4 mr-2" />
          {t.restoreBackup.title}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="enhanced">
        <EnhancedBackupManager />
      </TabsContent>
      
      <TabsContent value="create">
        <CreateBackupCard t={t} />
      </TabsContent>
      
      <TabsContent value="restore">
        <RestoreBackupCard 
          t={t} 
          onDecryptSuccess={onDecryptSuccess}
        />
      </TabsContent>
    </Tabs>
  );
};

export default BackupTabs;

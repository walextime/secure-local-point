
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2 } from 'lucide-react';
import BackupDataPreview from '@/components/backup/BackupDataPreview';
import DateRangeSelector from '@/components/backup/DateRangeSelector';
import { DateRange } from 'react-day-picker';

interface BackupData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  users?: any[];
  settings?: any[];
  metadata?: {
    createdAt: number;
    version: string;
    description: string;
  };
}

interface BackupRestoreActionsProps {
  backupData: BackupData | null;
  fileName: string | null;
  t: any;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRestoreToApp: () => void;
  onDownloadReadable: () => void;
  isRestoring: boolean;
  language: string;
}

const BackupRestoreActions: React.FC<BackupRestoreActionsProps> = ({
  backupData,
  fileName,
  t,
  dateRange,
  onDateRangeChange,
  onRestoreToApp,
  onDownloadReadable,
  isRestoring,
  language
}) => {
  if (!backupData) return null;

  return (
    <>
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        language={language}
      />
      
      <BackupDataPreview 
        backupData={backupData} 
        fileName={fileName} 
        t={{ decryptedContent: t.decryptedContent }}
        onRestoreToApp={onRestoreToApp}
        onDownloadReadable={onDownloadReadable}
        isRestoring={isRestoring}
      />
    </>
  );
};

export default BackupRestoreActions;

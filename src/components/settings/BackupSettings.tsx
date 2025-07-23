import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { MasterPasswordService } from '@/services/security/masterPasswordService';
import BackupUploader from '@/components/BackupUploader';
import { useAuth } from '@/hooks/useAuth';

interface BackupSettingsProps {
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  setAutoBackupEnabled: (enabled: boolean) => void;
  setAutoBackupTime: (time: string) => void;
  saveBackupSettings: () => Promise<void>;
  handleBackupNow: () => void;
  t: any;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({ 
  autoBackupEnabled,
  autoBackupTime,
  setAutoBackupEnabled,
  setAutoBackupTime,
  saveBackupSettings,
  handleBackupNow,
  t 
}) => {
  const { user } = useAuth();
  const [isMasterPasswordSet, setIsMasterPasswordSet] = useState(false);

  useEffect(() => {
    checkMasterPassword();
  }, []);

  const checkMasterPassword = async () => {
    try {
      const isSet = await MasterPasswordService.isSet();
      setIsMasterPasswordSet(isSet);
    } catch (error) {
      console.error('Error checking master password:', error);
    }
  };

  const handleAutoBackupToggle = (enabled: boolean) => {
    if (enabled && !isMasterPasswordSet) {
      toast.error('Please set a master password first in Security Settings');
      return;
    }
    setAutoBackupEnabled(enabled);
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">Secure Backup Settings</h2>
      
      {!isMasterPasswordSet && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Master Password Required</span>
          </div>
          <p className="text-sm text-yellow-600 mt-1">
            Please set a master password in Security Settings to enable secure backups.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="autoBackup" 
            checked={autoBackupEnabled && isMasterPasswordSet}
            onCheckedChange={handleAutoBackupToggle}
            disabled={!isMasterPasswordSet}
          />
          <Label htmlFor="autoBackup">Enable Automatic Daily Backups</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backupTime">Daily Backup Time</Label>
          <Input 
            id="backupTime" 
            type="time" 
            value={autoBackupTime}
            onChange={e => setAutoBackupTime(e.target.value)}
            disabled={!isMasterPasswordSet}
          />
          <p className="text-xs text-gray-500">
            Backups will be generated automatically at this time each day (PDF + XLSX files)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Secure Backup Features:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• All backup files are password-protected using your master password</li>
            <li>• Files are saved to both Windows folder (C:/Tech_Plus_POS_Secure_Data) and app data</li>
            <li>• Daily reports include PDF and XLSX formats for sales data</li>
            <li>• Manual backups generate customers, inventory, and sales files</li>
          </ul>
        </div>

        <div>
          <Button 
            onClick={saveBackupSettings}
            disabled={!isMasterPasswordSet}
          >
            <Save size={16} className="mr-2" />
            Save Backup Settings
          </Button>
        </div>

        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleBackupNow}
            disabled={!isMasterPasswordSet}
          >
            <Download size={16} className="mr-2" />
            Go to Backup Manager
          </Button>
        </div>
      </div>
      <hr className="my-8" />
      {user?.role === 'root' && (
        <div>
          <h3 className="text-md font-semibold mb-2">Cloud Backup Uploader</h3>
          <BackupUploader />
        </div>
      )}
    </div>
  );
};

export default BackupSettings;

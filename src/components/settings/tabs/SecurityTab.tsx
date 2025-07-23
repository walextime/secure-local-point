
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import SecuritySettings from '@/components/settings/SecuritySettings';

interface EncryptionSettings {
  id: string;
  autoExportEnabled: boolean;
  autoExportTime: string;
  exportMethod: string;
}

interface SecurityTabProps {
  encryptionSettings: EncryptionSettings;
  setEncryptionSettings: React.Dispatch<React.SetStateAction<EncryptionSettings>>;
  saveEncryptionSettings: () => Promise<void>;
  t: any;
}

const SecurityTab: React.FC<SecurityTabProps> = ({ 
  encryptionSettings, 
  setEncryptionSettings, 
  saveEncryptionSettings, 
  t 
}) => {
  return (
    <TabsContent value="security" className="space-y-6">
      <SecuritySettings 
        encryptionSettings={encryptionSettings} 
        setEncryptionSettings={setEncryptionSettings} 
        saveEncryptionSettings={saveEncryptionSettings} 
        t={t} 
      />
    </TabsContent>
  );
};

export default SecurityTab;

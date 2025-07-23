
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface EncryptionSettings {
  id: string;
  autoExportEnabled: boolean;
  autoExportTime: string;
  exportMethod: string;
}

interface SecuritySettingsProps {
  encryptionSettings: EncryptionSettings;
  setEncryptionSettings: React.Dispatch<React.SetStateAction<EncryptionSettings>>;
  saveEncryptionSettings: () => Promise<void>;
  t: any;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ 
  encryptionSettings, 
  setEncryptionSettings, 
  saveEncryptionSettings, 
  t 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">{t.security.title}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t.security.masterPasswordNote}</Label>
          <p className="text-sm text-gray-600">
            All exports and sensitive operations are protected by the master password only. 
            No additional encryption is used.
          </p>
        </div>
        
        <div>
          <Button onClick={saveEncryptionSettings}>
            <Save size={16} className="mr-2" />
            {t.security.saveButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;

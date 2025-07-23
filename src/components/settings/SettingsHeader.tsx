
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface SettingsHeaderProps {
  onBackupNow: () => void;
  t: any;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({ onBackupNow, t }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{t.settings}</h1>
      <Button variant="outline" onClick={onBackupNow}>
        <Download size={16} className="mr-2" />
        {t.backupNow}
      </Button>
    </div>
  );
};

export default SettingsHeader;

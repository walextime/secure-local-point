
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { AppSettings } from '@/types/settings';

interface SalesSettingsProps {
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveAppSettings: () => Promise<void>;
  t: any;
}

const SalesSettings: React.FC<SalesSettingsProps> = ({ 
  appSettings, 
  setAppSettings, 
  saveAppSettings, 
  t 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">{t.sales.title}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="taxRate">{t.sales.taxRate}</Label>
          <Input 
            id="taxRate" 
            type="number" 
            min="0" 
            step="0.01" 
            placeholder="0" 
            value={appSettings.taxRate} 
            onChange={e => setAppSettings({...appSettings, taxRate: parseFloat(e.target.value) || 0})}
          />
        </div>
        <div>
          <Button onClick={saveAppSettings}>
            <Save size={16} className="mr-2" />
            {t.sales.saveButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SalesSettings;

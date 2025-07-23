import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { AppSettings } from '@/types/settings';
import { StoreInfo } from '@/types/settings';

interface LocalizationSettingsProps {
  storeInfo: StoreInfo;
  appSettings: AppSettings;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveAppSettings: () => Promise<void>;
  t: any;
}

const LocalizationSettings: React.FC<LocalizationSettingsProps> = ({ 
  storeInfo, 
  appSettings, 
  updateStoreInfo, 
  setAppSettings, 
  saveAppSettings, 
  t 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">{t.localization.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="currency">{t.localization.currency}</Label>
          <Select value="XAF" disabled>
            <SelectTrigger>
              <SelectValue placeholder="XAF (FCFA)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">XAF (FCFA)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">{t.localization.language}</Label>
          <Select 
            value={appSettings.language} 
            onValueChange={value => setAppSettings({...appSettings, language: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Button onClick={saveAppSettings}>
            <Save size={16} className="mr-2" />
            {t.localization.saveButton}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            {t.localization.notice}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocalizationSettings;

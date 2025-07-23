import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { StoreInfo } from '@/types/settings';

interface StoreInfoSettingsProps {
  storeInfo: StoreInfo;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  saveStoreInfo: () => Promise<void>;
  t: any;
}

const StoreInfoSettings: React.FC<StoreInfoSettingsProps> = ({ 
  storeInfo, 
  updateStoreInfo, 
  saveStoreInfo, 
  t 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">{t.storeInfo.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="storeName">{t.storeInfo.storeName}</Label>
          <Input 
            id="storeName" 
            placeholder={t.storeInfo.storeNamePlaceholder} 
            value={storeInfo.name || ''} 
            onChange={e => updateStoreInfo('name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">{t.storeInfo.phoneNumber}</Label>
          <Input 
            id="phoneNumber" 
            placeholder={t.storeInfo.phoneNumberPlaceholder} 
            value={storeInfo.phone || ''} 
            onChange={e => updateStoreInfo('phone', e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">{t.storeInfo.address}</Label>
          <Textarea 
            id="address" 
            placeholder={t.storeInfo.addressPlaceholder} 
            value={storeInfo.address || ''} 
            onChange={e => updateStoreInfo('address', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.storeInfo.email}</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={t.storeInfo.emailPlaceholder} 
            value={storeInfo.email || ''} 
            onChange={e => updateStoreInfo('email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slogan">Business Slogan/Tagline</Label>
          <Input 
            id="slogan" 
            placeholder="e.g., Quality Products, Best Prices" 
            value={storeInfo.slogan || ''} 
            onChange={e => updateStoreInfo('slogan', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Button onClick={saveStoreInfo}>
            <Save size={16} className="mr-2" />
            {t.storeInfo.saveButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreInfoSettings;

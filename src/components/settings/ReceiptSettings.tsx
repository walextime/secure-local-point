
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';

interface ReceiptSettings {
  id: string;
  footerEnglish?: string;
  footerFrench?: string;
  logoUrl?: string;
  companyInfo?: string;
}

interface ReceiptSettingsProps {
  t: any;
}

const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({ t }) => {
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    id: 'receipt-settings',
    footerEnglish: 'Thank you for your business!',
    footerFrench: 'Merci de votre confiance!'
  });
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const loadReceiptSettings = async () => {
      try {
        setLoading(true);
        const stored = await dbOperations.get<ReceiptSettings>(STORES.SETTINGS, 'receipt-settings');
        if (stored) {
          setReceiptSettings(stored);
        }
      } catch (error) {
        console.error('Error loading receipt settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReceiptSettings();
  }, []);

  
  const saveReceiptSettings = async () => {
    try {
      await dbOperations.put(STORES.SETTINGS, receiptSettings);
      toast.success('Receipt settings saved');
    } catch (error) {
      console.error('Error saving receipt settings:', error);
      toast.error('Failed to save receipt settings');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-medium mb-4">{t.receipt.title}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="footerEnglish">{t.receipt.footerEnglish}</Label>
          <Textarea 
            id="footerEnglish" 
            placeholder={t.receipt.footerEnglishPlaceholder} 
            value={receiptSettings.footerEnglish || ''} 
            onChange={e => setReceiptSettings({...receiptSettings, footerEnglish: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="footerFrench">{t.receipt.footerFrench}</Label>
          <Textarea 
            id="footerFrench" 
            placeholder={t.receipt.footerFrenchPlaceholder} 
            value={receiptSettings.footerFrench || ''} 
            onChange={e => setReceiptSettings({...receiptSettings, footerFrench: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
          <Input 
            id="logoUrl" 
            placeholder="https://example.com/logo.png" 
            value={receiptSettings.logoUrl || ''} 
            onChange={e => setReceiptSettings({...receiptSettings, logoUrl: e.target.value})}
          />
        </div>
        
        <div>
          <Button onClick={saveReceiptSettings}>
            <Save size={16} className="mr-2" />
            {t.receipt.saveButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;

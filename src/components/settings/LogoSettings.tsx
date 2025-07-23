
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { StoreInfo } from '@/types/settings';
import { toast } from 'sonner';
import { getLogoUrl, isDefaultLogo, getLogoDisplayText } from '@/lib/logoUtils';

interface LogoSettingsProps {
  storeInfo: StoreInfo;
  updateStoreInfo: (field: keyof StoreInfo, value: string) => void;
  saveStoreInfo: () => void;
  t: any;
}

const LogoSettings: React.FC<LogoSettingsProps> = ({ 
  storeInfo, 
  updateStoreInfo, 
  saveStoreInfo, 
  t 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        updateStoreInfo('logo', base64Data);
        updateStoreInfo('logoFileName', file.name);
        toast.success('Logo uploaded successfully');
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    updateStoreInfo('logo', '');
    updateStoreInfo('logoFileName', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Logo removed');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Store Logo
        </CardTitle>
        <CardDescription>
          Upload your store logo to appear on receipts and invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="relative border rounded-lg p-4 bg-gray-50">
            <img 
              src={getLogoUrl(storeInfo.logo)} 
              alt="Store Logo" 
              className="max-h-32 max-w-full object-contain mx-auto"
            />
            {!isDefaultLogo(storeInfo.logo) && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {getLogoDisplayText(storeInfo.logo)}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button 
              onClick={triggerFileInput} 
              disabled={isUploading}
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : storeInfo.logo ? 'Change Logo' : 'Upload Logo'}
            </Button>
            
            <Button 
              onClick={saveStoreInfo}
              disabled={isUploading}
            >
              Save Changes
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Supported formats: PNG, JPG, JPEG, GIF</p>
            <p>• Maximum file size: 2MB</p>
            <p>• Recommended size: 200x100 pixels</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoSettings;


import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';

interface StoreInfoStepProps {
  onSubmit: (data: {
    storeName: string;
    address: string;
    phone: string;
    email?: string;
    currency: string;
    language: string;
    logo?: string;
    logoFileName?: string;
  }) => void;
  onBack: () => void;
  initialData?: {
    storeName: string;
    address: string;
    phone: string;
    email?: string;
    currency: string;
    language: string;
    logo?: string;
    logoFileName?: string;
  };
}

const StoreInfoStep: React.FC<StoreInfoStepProps> = ({ 
  onSubmit, 
  onBack,
  initialData = {
    storeName: '',
    address: '',
    phone: '',
    email: '',
            currency: 'XAF',
    language: 'en'
  }
}) => {
  const [formData, setFormData] = useState(initialData);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
        setFormData(prev => ({
          ...prev,
          logo: base64Data,
          logoFileName: file.name
        }));
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
    setFormData(prev => ({
      ...prev,
      logo: '',
      logoFileName: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name</Label>
          <Input
            id="storeName"
            name="storeName"
            placeholder="My Hardware Store"
            value={formData.storeName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Store Logo (Optional)</Label>
          {formData.logo ? (
            <div className="relative border rounded-lg p-4 bg-gray-50">
              <img 
                src={formData.logo} 
                alt="Store Logo" 
                className="max-h-24 max-w-full object-contain mx-auto"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Upload your store logo</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button 
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : formData.logo ? 'Change Logo' : 'Upload Logo'}
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Store Address</Label>
          <Input
            id="address"
            name="address"
            placeholder="123 Main Street, City"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Store Phone</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+1 234 567 8900"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="store@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency (XAF Only)</Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => handleSelectChange('currency', value)}
              disabled
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XAF">XAF (FCFA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={formData.language} 
              onValueChange={(value) => handleSelectChange('language', value)}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="w-1/2">
            Back
          </Button>
          <Button type="submit" className="w-1/2 bg-pos-navy hover:bg-blue-800">
            Next
          </Button>
        </div>
      </div>
    </form>
  );
};

export default StoreInfoStep;


import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText } from 'lucide-react';
import { toast } from "sonner";
import { decryptData } from '@/lib/crypto';

interface TranslationProps {
  title: string;
  description: string;
  fileLabel: string;
  filePlaceholder: string;
  browseButton: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  decryptButton: string;
  decrypting: string;
}

interface RestoreBackupCardProps {
  t: {
    restoreBackup: TranslationProps;
    errors: {
      noFile: string;
      noPassword: string;
      decryptFailed: string;
    };
  };
  onDecryptSuccess: (backupData: any, fileName: string) => void;
}

const RestoreBackupCard: React.FC<RestoreBackupCardProps> = ({ t, onDecryptSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [decryptPassword, setDecryptPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [backupContent, setBackupContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Handle backup file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBackupContent(content);
    };
    
    reader.readAsText(file);
  };

  // Decrypt backup file
  const decryptBackup = async () => {
    if (!backupContent) {
      toast.error(t.errors.noFile);
      return;
    }
    
    if (!decryptPassword) {
      toast.error(t.errors.noPassword);
      return;
    }
    
    try {
      setLoading(true);
      
      // Attempt to decrypt the file
      const decryptedData = await decryptData(backupContent, decryptPassword);
      
      // Send the decrypted data to the parent component
      onDecryptSuccess(decryptedData, fileName || '');
      toast.success('Backup decrypted successfully');
    } catch (error) {
      console.error('Failed to decrypt backup:', error);
      toast.error(t.errors.decryptFailed);
    } finally {
      setLoading(false);
    }
  };
  
  
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t.restoreBackup.title}
        </CardTitle>
        <CardDescription>
          {t.restoreBackup.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backupFile">{t.restoreBackup.fileLabel}</Label>
            <div className="flex gap-2">
              <Input
                value={fileName || ''}
                placeholder={t.restoreBackup.filePlaceholder}
                readOnly
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={openFileDialog}
                variant="outline"
              >
                {t.restoreBackup.browseButton}
              </Button>
              <input
                ref={fileInputRef}
                id="backupFile"
                type="file"
                accept=".posbak,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="decryptPassword">{t.restoreBackup.passwordLabel}</Label>
            <Input
              id="decryptPassword"
              type="password"
              placeholder={t.restoreBackup.passwordPlaceholder}
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={decryptBackup} 
            disabled={loading || !backupContent}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            {loading ? t.restoreBackup.decrypting : t.restoreBackup.decryptButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestoreBackupCard;

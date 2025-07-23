
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileArchive } from 'lucide-react';
import { toast } from "sonner";
import { dbOperations, STORES } from '@/lib/db';
import { encryptData } from '@/lib/crypto';


interface EncryptionSettings {
  id: string;
  encryptionPassword?: string;
  exportPassword?: string;
  exportMethod?: string;
  autoExportEnabled?: boolean;
  autoExportTime?: string;
}

interface UserWithPassword {
  passwordHash?: string;
  [key: string]: any;
}

interface TranslationProps {
  title: string;
  description: string;
  button: string;
  creating: string;
  note: string;
}

interface CreateBackupCardProps {
  t: {
    createBackup: TranslationProps;
    errors: {
      noPassword: string;
      backupFailed: string;
    };
  };
}

const CreateBackupCard: React.FC<CreateBackupCardProps> = ({ t }) => {
  const [loading, setLoading] = useState<boolean>(false);

  
  const createBackup = async () => {
    try {
      setLoading(true);
      
      
      const encryptionSettings = await dbOperations.get<EncryptionSettings>(STORES.SETTINGS, 'encryption-settings');
      if (!encryptionSettings?.encryptionPassword) {
        toast.error(t.errors.noPassword);
        return;
      }

      
      const backup: any = {};
      
      
      backup.products = await dbOperations.getAll(STORES.PRODUCTS);
      
      
      backup.customers = await dbOperations.getAll(STORES.CUSTOMERS);
      
      
      backup.sales = await dbOperations.getAll(STORES.SALES);
      
      
      const users = await dbOperations.getAll(STORES.USERS);
      backup.users = users.map((user: UserWithPassword) => {
        if (user && typeof user === 'object' && user.passwordHash) {
          
          const { passwordHash, ...safeUser } = user;
          return safeUser;
        }
        return user;
      });
      
      
      const settings = await dbOperations.getAll(STORES.SETTINGS);
      backup.settings = settings.map((setting: any) => {
        if (setting && typeof setting === 'object' && setting.id === 'encryption-settings') {
          
          const { encryptionPassword, exportPassword, ...safeSettings } = setting;
          return safeSettings;
        }
        return setting;
      });
      
      
      backup.metadata = {
        createdAt: Date.now(),
        version: '1.0',
        description: 'Full system backup'
      };
      
      
      const encryptedBackup = await encryptData(backup, encryptionSettings.encryptionPassword);
      
      
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10); 
      const filename = `backup_${dateStr}_${Date.now()}.posbak`;
      
      
      const blob = new Blob([encryptedBackup], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      console.error('Backup creation failed:', error);
      toast.error(t.errors.backupFailed + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileArchive className="h-5 w-5" />
          {t.createBackup.title}
        </CardTitle>
        <CardDescription>
          {t.createBackup.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createBackup} 
          disabled={loading}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {loading ? t.createBackup.creating : t.createBackup.button}
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          {t.createBackup.note}
        </p>
      </CardContent>
    </Card>
  );
};

export default CreateBackupCard;

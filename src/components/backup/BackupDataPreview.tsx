
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Upload, Loader2 } from 'lucide-react';

interface BackupData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  users?: any[];
  settings?: any[];
  metadata?: {
    createdAt: number;
    version: string;
    description: string;
  };
}

interface TranslationType {
  decryptedContent: {
    title: string;
    description: string;
    note: string;
  };
}

interface BackupDataPreviewProps {
  backupData: BackupData;
  fileName: string | null;
  t: TranslationType;
  onRestoreToApp?: () => void;
  onDownloadReadable?: () => void;
  isRestoring?: boolean;
}

const BackupDataPreview: React.FC<BackupDataPreviewProps> = ({ 
  backupData, 
  fileName, 
  t, 
  onRestoreToApp,
  onDownloadReadable,
  isRestoring = false
}) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t.decryptedContent.title}
        </CardTitle>
        <CardDescription>
          {t.decryptedContent.description}
          {fileName && <span className="font-medium"> - {fileName}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t.decryptedContent.note}
          </div>
          
          {}
          {backupData.metadata && (
            <div className="border rounded-md p-3 bg-slate-50">
              <h3 className="font-semibold mb-2">Metadata</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(backupData.metadata.createdAt).toLocaleString()}</span>
                <span className="text-muted-foreground">Version:</span>
                <span>{backupData.metadata.version}</span>
                {backupData.metadata.description && (
                  <>
                    <span className="text-muted-foreground">Description:</span>
                    <span>{backupData.metadata.description}</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {backupData.products && (
              <div className="border rounded-md p-3">
                <h3 className="font-semibold">Products</h3>
                <p className="text-3xl font-bold mt-2">{backupData.products.length}</p>
              </div>
            )}
            
            {backupData.customers && (
              <div className="border rounded-md p-3">
                <h3 className="font-semibold">Customers</h3>
                <p className="text-3xl font-bold mt-2">{backupData.customers.length}</p>
              </div>
            )}
            
            {backupData.sales && (
              <div className="border rounded-md p-3">
                <h3 className="font-semibold">Sales Records</h3>
                <p className="text-3xl font-bold mt-2">{backupData.sales.length}</p>
              </div>
            )}
          </div>

          {}
          <div className="flex gap-4 pt-4 border-t">
            {onRestoreToApp && (
              <Button 
                onClick={onRestoreToApp}
                disabled={isRestoring}
                className="flex-1"
              >
                {isRestoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isRestoring ? 'Restoring...' : 'Restore to App'}
              </Button>
            )}
            
            {onDownloadReadable && (
              <Button 
                onClick={onDownloadReadable}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Readable
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupDataPreview;

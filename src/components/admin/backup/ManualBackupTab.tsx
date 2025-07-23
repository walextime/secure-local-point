import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FolderOpen, 
  Eye, 
  Shield, 
  Archive, 
  HelpCircle,
  Save,
  FileText,
  Database,
  Users,
  Package,
  ShoppingCart,
  Cloud,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dbOperations, STORES } from '@/lib/db';
import { createHumanReadableBackup, createSystemBackup } from '@/services/backup/backupManager';
import { uploadBackupToAppsScript } from '@/services/backup/backupUploadService';
import { createHumanReadableZip, createSystemZip } from '@/services/backup/backupUtils';
import { BackupHistoryService } from '@/services/backup/backupHistoryService';
import { CustomerAnalyticsService } from '@/services/customerAnalyticsService';

interface BackupConfig {
  customFileName: string;
  timestampFormat: string;
  selectedData: {
    customers: boolean;
    inventory: boolean;
    sales: boolean;
  };
  exportFormats: {
    xlsx: { enabled: boolean; encrypted: boolean };
    json: { enabled: boolean; encrypted: boolean };
    pdf: { enabled: boolean; encrypted: boolean };
  };
  storageLocation: string;
}

interface ManualBackupTabProps {
  restricted?: boolean;
}

const ManualBackupTab: React.FC<ManualBackupTabProps> = ({ restricted }) => {
  const { toast } = useToast();
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    customFileName: '',
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
    selectedData: {
      customers: true,
      inventory: true,
      sales: true
    },
    exportFormats: {
      xlsx: { enabled: true, encrypted: false },
      json: { enabled: false, encrypted: false },
      pdf: { enabled: true, encrypted: false }
    },
    storageLocation: ''
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [dataCounts, setDataCounts] = useState({
    customers: 0,
    inventory: 0,
    sales: 0
  });
  const [previewFilename, setPreviewFilename] = useState('');
  const [isOnlineBackingUp, setIsOnlineBackingUp] = useState(false);
  const [onlineBackupConfig, setOnlineBackupConfig] = useState({
    scriptUrl: '',
    email: ''
  });

  // Load online backup config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('backupUploadConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setOnlineBackupConfig({
          scriptUrl: parsed.scriptUrl || '',
          email: parsed.emailDestination || ''
        });
      } catch (error) {
        console.error('Error loading online backup config:', error);
      }
    }
  }, []);

  // Load data counts
  useEffect(() => {
    const loadDataCounts = async () => {
      try {
        const customers = await dbOperations.getAll(STORES.CUSTOMERS);
        const products = await dbOperations.getAll(STORES.PRODUCTS);
        const sales = await dbOperations.getAll(STORES.SALES);
        
        setDataCounts({
          customers: customers.length,
          inventory: products.length,
          sales: sales.length
        });
      } catch (error) {
        console.error('Error loading data counts:', error);
      }
    };
    
    loadDataCounts();
  }, []);

  // Generate preview filename
  useEffect(() => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = backupConfig.customFileName || 'backup';
    setPreviewFilename(`${prefix}_${timestamp}.zip`);
  }, [backupConfig.customFileName, backupConfig.timestampFormat]);

  const handleConfigUpdate = (updates: Partial<BackupConfig>) => {
    setBackupConfig(prev => ({ ...prev, ...updates }));
  };

  const handleDataToggle = (dataType: keyof BackupConfig['selectedData']) => {
    setBackupConfig(prev => ({
      ...prev,
      selectedData: {
        ...prev.selectedData,
        [dataType]: !prev.selectedData[dataType]
      }
    }));
  };

  const handleFormatToggle = (format: keyof BackupConfig['exportFormats'], field: 'enabled' | 'encrypted') => {
    setBackupConfig(prev => ({
      ...prev,
      exportFormats: {
        ...prev.exportFormats,
        [format]: {
          ...prev.exportFormats[format],
          [field]: !prev.exportFormats[format][field]
        }
      }
    }));
  };

  const handleChooseFolder = async () => {
    try {
      const { selectBackupFolder, isFileSystemAccessSupported } = await import('@/services/backup/folderSelection');
      
      if (!isFileSystemAccessSupported()) {
        toast({
          title: "Browser not supported",
          description: "File System Access API is not supported in this browser. Files will download to your default Downloads folder.",
          variant: "destructive"
        });
        return;
      }

      const folderInfo = await selectBackupFolder();
      
      if (folderInfo) {
        handleConfigUpdate({ storageLocation: folderInfo.name });
        toast({
          title: "Folder selected",
          description: `Selected folder: ${folderInfo.name} (${folderInfo.files.length} files)`
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('AbortError')) {
        
        return;
      }
      
      toast({
        title: "Folder selection failed",
        description: error instanceof Error ? error.message : "Failed to select folder",
        variant: "destructive"
      });
    }
  };

  const handlePreviewData = async () => {
    try {
      const { generateBackupPreview, estimateBackupSize, validateBackupData } = await import('@/services/backup/backupPreview');
      
      
      toast({
        title: "Generating preview",
        description: "Analyzing your data..."
      });

      const [preview, sizeEstimate, validation] = await Promise.all([
        generateBackupPreview(backupConfig.selectedData),
        estimateBackupSize(backupConfig.selectedData),
        validateBackupData()
      ]);

      
      showDataPreview(preview, sizeEstimate, validation);
      
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Failed to generate data preview",
        variant: "destructive"
      });
    }
  };

  const showDataPreview = (
    preview: { summary: { totalCustomers: number; totalProducts: number; totalSales: number } },
    sizeEstimate: { humanReadable: number; system: number },
    validation: { warnings: string[] }
  ) => {
    
    const totalRecords = preview.summary.totalCustomers + preview.summary.totalProducts + preview.summary.totalSales;
    const totalSize = (sizeEstimate.humanReadable + sizeEstimate.system) / 1024; 
    
    toast({
      title: "Data Preview",
      description: `${totalRecords} records selected (~${totalSize.toFixed(1)} KB). ${validation.warnings.length} warnings found.`
    });
  };

  const handleCreateBackup = async () => {
    if (!backupConfig.selectedData.customers && 
        !backupConfig.selectedData.inventory && 
        !backupConfig.selectedData.sales) {
      toast({
        title: "No data selected",
        description: "Please select at least one data type to backup",
        variant: "destructive"
      });
      return;
    }

    if (!backupConfig.exportFormats.xlsx.enabled && 
        !backupConfig.exportFormats.json.enabled && 
        !backupConfig.exportFormats.pdf.enabled) {
      toast({
        title: "No export format selected",
        description: "Please select at least one export format",
        variant: "destructive"
      });
      return;
    }

    setIsBackingUp(true);
    try {
      
      if (backupConfig.selectedData.customers || 
          backupConfig.selectedData.inventory || 
          backupConfig.selectedData.sales) {
        await createHumanReadableBackup();
      }
      
      await createSystemBackup();
      
      toast({
        title: "Backup created successfully",
        description: "Your backup has been created and saved locally"
      });
    } catch (error) {
      toast({
        title: "Backup failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleOnlineBackup = async () => {
    if (!onlineBackupConfig.scriptUrl || !onlineBackupConfig.email) {
      toast({
        title: "Online backup configuration incomplete",
        description: "Please configure the Apps Script URL and email in the backup settings",
        variant: "destructive"
      });
      return;
    }

    setIsOnlineBackingUp(true);
    try {
      // Update customer analytics before backup
      await CustomerAnalyticsService.updateCustomerAnalytics();
      
      // Create both human-readable and system backups
      const now = new Date();
      const dir = now.toISOString().split('T')[0].replace(/-/g, '');
      const humanFilename = `readable_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;
      const systemFilename = `system_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;

      // Get backup metadata
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      const products = await dbOperations.getAll(STORES.PRODUCTS);
      const sales = await dbOperations.getAll(STORES.SALES);
      const analytics = await CustomerAnalyticsService.getCustomerAnalytics();
      
      const metadata = {
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalSales: sales.length,
        customerAnalyticsIncluded: analytics.length > 0
      };

      // Create human-readable backup
      const humanZipBlob = await createHumanReadableZip();
      const humanResult = await uploadBackupToAppsScript({
        file: humanZipBlob,
        email: onlineBackupConfig.email,
        filename: humanFilename,
        scriptUrl: onlineBackupConfig.scriptUrl,
        mimeType: 'application/zip'
      });

      // Create system backup
      const systemZipBlob = await createSystemZip();
      const systemResult = await uploadBackupToAppsScript({
        file: systemZipBlob,
        email: onlineBackupConfig.email,
        filename: systemFilename,
        scriptUrl: onlineBackupConfig.scriptUrl,
        mimeType: 'application/zip'
      });

      // Log successful online backup
      await BackupHistoryService.logSuccessfulBackup(
        'online',
        [humanFilename, systemFilename],
        {
          includeCustomers: true,
          includeInventory: true,
          includeSales: true,
          formats: ['xlsx', 'pdf', 'json'],
          storageLocation: 'cloud',
          encryptFiles: false,
          backupType: 'online'
        },
        {
          ...metadata,
          backupSize: humanZipBlob.size + systemZipBlob.size,
          duration: Date.now() - now.getTime()
        },
        {
          uploadedToCloud: true,
          cloudProvider: 'Google Apps Script',
          emailSent: true,
          emailRecipient: onlineBackupConfig.email
        }
      );

      if (humanResult.success && systemResult.success) {
        toast({
          title: "Online backup completed successfully",
          description: "Your backup has been uploaded to the cloud and sent via email"
        });
      } else {
        const errors = [];
        if (!humanResult.success) errors.push(`Human-readable backup: ${humanResult.message}`);
        if (!systemResult.success) errors.push(`System backup: ${systemResult.message}`);
        
        toast({
          title: "Online backup partially failed",
          description: errors.join('; '),
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Online backup failed",
        description: "Failed to upload backup. Please check your configuration and try again.",
        variant: "destructive"
      });
      
      // Log failed online backup
      await BackupHistoryService.logFailedBackup(
        'online',
        [errorMessage],
        {
          includeCustomers: true,
          includeInventory: true,
          includeSales: true,
          formats: ['xlsx', 'pdf', 'json'],
          storageLocation: 'cloud',
          encryptFiles: false,
          backupType: 'online'
        },
        {
          totalCustomers: 0,
          totalProducts: 0,
          totalSales: 0,
          customerAnalyticsIncluded: false
        }
      );
    } finally {
      setIsOnlineBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {}
      {!restricted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Backup Configuration
            </CardTitle>
            <CardDescription>
              Configure how your backup will be created and named
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-filename">Custom File Name (optional)</Label>
                <Input
                  id="custom-filename"
                  value={backupConfig.customFileName}
                  onChange={(e) => handleConfigUpdate({ customFileName: e.target.value })}
                  placeholder="e.g., my-backup"
                />
              </div>
              <div>
                <Label htmlFor="timestamp-format">Timestamp Format</Label>
                <Select 
                  value={backupConfig.timestampFormat} 
                  onValueChange={(value) => handleConfigUpdate({ timestampFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YYYY-MM-DD_HH-mm-ss">YYYY-MM-DD_HH-mm-ss</SelectItem>
                    <SelectItem value="YYYY-MM-DD_HHmmss">YYYY-MM-DD_HHmmss</SelectItem>
                    <SelectItem value="DD-MM-YYYY_HH-mm">DD-MM-YYYY_HH-mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Preview Filename</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {previewFilename}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data to Backup
          </CardTitle>
          <CardDescription>
            Select which data categories to include in your backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="customers"
                checked={backupConfig.selectedData.customers}
                onCheckedChange={() => handleDataToggle('customers')}
              />
              <Label htmlFor="customers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customers
                <Badge variant="secondary">{dataCounts.customers} records</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="inventory"
                checked={backupConfig.selectedData.inventory}
                onCheckedChange={() => handleDataToggle('inventory')}
              />
              <Label htmlFor="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory
                <Badge variant="secondary">{dataCounts.inventory} products</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="sales"
                checked={backupConfig.selectedData.sales}
                onCheckedChange={() => handleDataToggle('sales')}
              />
              <Label htmlFor="sales" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Sales
                <Badge variant="secondary">{dataCounts.sales} transactions</Badge>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Formats & Encryption
          </CardTitle>
          <CardDescription>
            Choose export formats and enable encryption for human-readable files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {Object.entries(backupConfig.exportFormats).map(([format, config]) => (
              <div key={format} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={config.enabled}
                    onCheckedChange={() => handleFormatToggle(format as keyof BackupConfig['exportFormats'], 'enabled')}
                  />
                  <Label className="font-medium">
                    {format.toUpperCase()} (.{format})
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <Switch
                      checked={config.encrypted}
                      onCheckedChange={() => handleFormatToggle(format as keyof BackupConfig['exportFormats'], 'encrypted')}
                      disabled={!config.enabled}
                    />
                    <span className="text-sm text-gray-600">Encrypt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Master Password Usage</p>
                <p>The encryption toggles above are the only place where the Master Password is used. 
                It encrypts/decrypts human-readable backup files (Excel, JSON, PDF) only.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      {!restricted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Storage Location
            </CardTitle>
            <CardDescription>
              Choose where to save your backup files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleChooseFolder}
                className="flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Choose Folder
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewData}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Data
              </Button>
            </div>
            
            {backupConfig.storageLocation && (
              <div className="p-2 bg-gray-50 rounded border text-sm">
                <span className="font-medium">Selected:</span> {backupConfig.storageLocation}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Online Backup Upload
          </CardTitle>
          <CardDescription>
            Upload your backup directly to the cloud and send via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Online Backup Configuration</p>
                <p>Make sure you have configured the Apps Script URL and email destination in the backup settings before using this feature.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Script URL:</Label>
              <span className="text-sm text-gray-600">
                {onlineBackupConfig.scriptUrl ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Email:</Label>
              <span className="text-sm text-gray-600">
                {onlineBackupConfig.email ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
          </div>

          <Button
            onClick={handleOnlineBackup}
            disabled={isOnlineBackingUp || !onlineBackupConfig.scriptUrl || !onlineBackupConfig.email}
            className="w-full flex items-center gap-2"
            size="lg"
            variant="outline"
          >
            {isOnlineBackingUp ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Uploading to Cloud...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload Backup Online
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            {isBackingUp ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Backup...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Create Backup Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualBackupTab;

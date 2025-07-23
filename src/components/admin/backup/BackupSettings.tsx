import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Cloud, 
  Upload, 
  TestTube, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Database,
  Mail,
  FolderOpen,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  BackupUploadConfig, 
  testConnection, 
  uploadBackup, 
  UploadResult 
} from '@/services/backup/backupUploadService';

interface BackupSettingsProps {
  onUploadComplete?: (result: UploadResult) => void;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({ onUploadComplete }) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<BackupUploadConfig>({
    scriptUrl: '',
    driveFolderId: '',
    emailDestination: '',
    smsProvider: 'twilio',
    smsApiKey: '',
    smsPhoneNumber: '',
    smsEnabled: false,
    smsFormat: 'summary'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  }>({
    tested: false,
    success: false,
    message: ''
  });

  // Load saved configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('backupUploadConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading backup config:', error);
      }
    }
  }, []);

  
  const saveConfig = (newConfig: BackupUploadConfig) => {
    localStorage.setItem('backupUploadConfig', JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  const handleConfigChange = (field: keyof BackupUploadConfig, value: string | boolean) => {
    const newConfig = { ...config, [field]: value };
    saveConfig(newConfig);
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      toast({
        title: "Configuration incomplete",
        description: "Please fill in all required fields before testing",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await testConnection(config);
      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.message
      });

      toast({
        title: result.success ? "Connection Test Successful" : "Connection Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'Connection test failed'
      });
      toast({
        title: "Connection Test Failed",
        description: "An error occurred during the connection test",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUploadBackup = async () => {
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      toast({
        title: "Configuration incomplete",
        description: "Please configure all settings before uploading",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadBackup(config);
      setLastUpload(result);

      toast({
        title: result.success ? "Upload Successful" : "Upload Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      const errorResult: UploadResult = {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setLastUpload(errorResult);
      toast({
        title: "Upload Failed",
        description: errorResult.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigValid = config.scriptUrl && config.driveFolderId && config.emailDestination;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Backup Configuration
          </CardTitle>
          <CardDescription>
            Configure Google Apps Script for automatic backup uploads to Google Drive and email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scriptUrl">Google Apps Script URL</Label>
              <Input
                id="scriptUrl"
                placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
                value={config.scriptUrl}
                onChange={(e) => handleConfigChange('scriptUrl', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driveFolderId">Google Drive Folder ID</Label>
              <Input
                id="driveFolderId"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={config.driveFolderId}
                onChange={(e) => handleConfigChange('driveFolderId', e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailDestination">Email Backup Destination</Label>
              <Input
                id="emailDestination"
                type="email"
                placeholder="backup@yourcompany.com"
                value={config.emailDestination}
                onChange={(e) => handleConfigChange('emailDestination', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={!isConfigValid || isTesting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            
            {connectionStatus.tested && (
              <Badge variant={connectionStatus.success ? "default" : "destructive"}>
                {connectionStatus.success ? '✅ Connected' : '❌ Failed'}
              </Badge>
            )}
          </div>

          {connectionStatus.tested && (
            <Alert variant={connectionStatus.success ? "default" : "destructive"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {connectionStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Configure SMS notifications for daily reports and backup status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="smsEnabled"
              checked={config.smsEnabled}
              onChange={(e) => handleConfigChange('smsEnabled', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="smsEnabled">Enable SMS Notifications</Label>
          </div>

          {config.smsEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smsProvider">SMS Provider</Label>
                  <select
                    id="smsProvider"
                    value={config.smsProvider}
                    onChange={(e) => handleConfigChange('smsProvider', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="nexmo">Vonage (Nexmo)</option>
                    <option value="aws-sns">AWS SNS</option>
                    <option value="custom">Custom API</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smsApiKey">API Key</Label>
                  <Input
                    id="smsApiKey"
                    type="password"
                    placeholder="Enter your SMS API key"
                    value={config.smsApiKey}
                    onChange={(e) => handleConfigChange('smsApiKey', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smsPhoneNumber">Phone Number</Label>
                  <Input
                    id="smsPhoneNumber"
                    placeholder="+1234567890"
                    value={config.smsPhoneNumber}
                    onChange={(e) => handleConfigChange('smsPhoneNumber', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smsFormat">SMS Format</Label>
                  <select
                    id="smsFormat"
                    value={config.smsFormat}
                    onChange={(e) => handleConfigChange('smsFormat', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="summary">Summary (Short)</option>
                    <option value="detailed">Detailed (Long)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Smartphone className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">SMS Notification Features</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Daily backup status notifications</li>
                      <li>• Backup completion alerts</li>
                      <li>• Error notifications</li>
                      <li>• Summary or detailed format options</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manual Backup Upload
          </CardTitle>
          <CardDescription>
            Generate and upload backup files immediately (doesn't wait for scheduled time)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleUploadBackup}
            disabled={!isConfigValid || isLoading}
            size="lg"
            className="w-full flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isLoading ? 'Uploading Backup...' : '📤 Upload Backup Now'}
          </Button>

          {lastUpload && (
            <Alert variant={lastUpload.success ? "default" : "destructive"}>
              {lastUpload.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">{lastUpload.message}</p>
                  <p className="text-xs opacity-75">
                    {lastUpload.timestamp.toLocaleString()}
                  </p>
                  {lastUpload.success && lastUpload.readableZipSize && lastUpload.systemZipSize && (
                    <div className="text-xs opacity-75 space-y-1">
                      <p>Readable ZIP: {(lastUpload.readableZipSize / 1024).toFixed(1)} KB</p>
                      <p>System ZIP: {(lastUpload.systemZipSize / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupSettings; 
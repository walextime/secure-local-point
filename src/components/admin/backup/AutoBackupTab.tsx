import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Cloud, 
  Upload, 
  Settings, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UploadResult } from '@/services/backup/backupUploadService';
import BackupSettings from './BackupSettings';

interface AutoBackupTabProps {
  restricted?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupTime?: string;
  lastBackupStatus?: 'success' | 'error' | 'none';
  onAutoBackupEnabledChange?: (enabled: boolean) => void;
  onAutoBackupTimeChange?: (time: string) => void;
  onSaveSettings?: () => Promise<void>;
}

const AutoBackupTab: React.FC<AutoBackupTabProps> = ({ 
  restricted,
  autoBackupEnabled = false,
  autoBackupTime = '20:00',
  lastBackupStatus = 'none',
  onAutoBackupEnabledChange,
  onAutoBackupTimeChange,
  onSaveSettings
}) => {
  const { toast } = useToast();
  const [lastUploadResult, setLastUploadResult] = useState<UploadResult | null>(null);

  const handleUploadComplete = (result: UploadResult) => {
    setLastUploadResult(result);
    
    
    if (result.success) {
      toast({
        title: "Backup Uploaded Successfully",
        description: "Backup files have been sent to Google Drive and email",
      });
    }
  };

  return (
    <div className="space-y-6">
      {}
      {!restricted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Cloud Backup & Email Upload
            </CardTitle>
            <CardDescription>
              Configure automatic backup uploads to Google Drive and email notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Cloud className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-medium text-blue-600">Google Drive</p>
                <p className="text-xs text-blue-500">Secure cloud storage</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Upload className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm font-medium text-green-600">Email Backup</p>
                <p className="text-xs text-green-500">Instant notifications</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Settings className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="text-sm font-medium text-purple-600">Auto Sync</p>
                <p className="text-xs text-purple-500">Scheduled backups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <Tabs defaultValue={restricted ? "status" : "settings"} className="w-full">
        {!restricted && (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Auto Backup
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status & History
            </TabsTrigger>
          </TabsList>
        )}
        {!restricted && (
          <TabsContent value="settings" className="mt-6">
            <BackupSettings onUploadComplete={handleUploadComplete} />
          </TabsContent>
        )}
        {!restricted && (
          <TabsContent value="auto" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Automatic Backup Settings
                  </CardTitle>
                  <CardDescription>
                    Configure automatic daily backups that run at a specified time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Enable Automatic Backups</Label>
                      <p className="text-sm text-gray-600">
                        Automatically create backups every day at the specified time
                      </p>
                    </div>
                    <Switch
                      checked={autoBackupEnabled}
                      onCheckedChange={onAutoBackupEnabledChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backupTime">Daily Backup Time</Label>
                    <Input
                      id="backupTime"
                      type="time"
                      value={autoBackupTime}
                      onChange={(e) => onAutoBackupTimeChange?.(e.target.value)}
                      disabled={!autoBackupEnabled}
                    />
                    <p className="text-xs text-gray-500">
                      Backups will be generated automatically at this time each day
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Last Backup Status</Label>
                      <div className="flex items-center gap-2">
                        {lastBackupStatus === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {lastBackupStatus === 'error' && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {lastBackupStatus === 'none' && (
                          <span className="text-gray-400">No backup yet</span>
                        )}
                        <span className="text-sm text-gray-600">
                          {lastBackupStatus === 'success' && 'Last backup successful'}
                          {lastBackupStatus === 'error' && 'Last backup failed'}
                          {lastBackupStatus === 'none' && 'No backup history'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={onSaveSettings}
                      className="w-full"
                      disabled={!autoBackupEnabled}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Automatic Backup Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
        <TabsContent value="status" className="mt-6">
          <div className="space-y-6">
            {}
            {lastUploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {lastUploadResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Last Upload Status
                  </CardTitle>
                  <CardDescription>
                    Details of the most recent backup upload attempt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={lastUploadResult.success ? "default" : "destructive"}>
                        {lastUploadResult.success ? '✅ Successful' : '❌ Failed'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Timestamp:</span>
                      <span className="text-sm text-gray-600">
                        {lastUploadResult.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Message:</span>
                      <span className="text-sm text-gray-600 max-w-md text-right">
                        {lastUploadResult.message}
                      </span>
                    </div>
                    
                    {lastUploadResult.success && lastUploadResult.readableZipSize && lastUploadResult.systemZipSize && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <span className="text-sm font-medium">Readable ZIP:</span>
                          <p className="text-sm text-gray-600">
                            {(lastUploadResult.readableZipSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">System ZIP:</span>
                          <p className="text-sm text-gray-600">
                            {(lastUploadResult.systemZipSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Backup Schedule
                </CardTitle>
                <CardDescription>
                  Information about automatic backup scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Automatic Backups:</span>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Next Scheduled:</span>
                    <span className="text-sm text-gray-600">Not configured</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Scheduled:</span>
                    <span className="text-sm text-gray-600">Never</span>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Automatic scheduling will be available in a future update. 
                      For now, use the manual upload button in the Configuration tab.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {}
            {!restricted && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Destinations
                  </CardTitle>
                  <CardDescription>
                    Where your backup files are sent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Google Drive</span>
                      </div>
                      <Badge variant="outline">Configured</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Email Attachment</span>
                      </div>
                      <Badge variant="outline">Configured</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoBackupTab;

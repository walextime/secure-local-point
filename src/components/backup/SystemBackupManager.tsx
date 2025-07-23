import React, { useState, useRef } from 'react';
import { systemBackupService, BackupStatus } from '@/services/backup/systemBackupService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Download, 
  Upload, 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Activity,
  FileText,
  Settings,
  Users,
  Package,
  ShoppingCart
} from 'lucide-react';

const SystemBackupManager: React.FC = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [activeBackups, setActiveBackups] = useState<BackupStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh backup status
  const refreshBackupStatus = () => {
    setActiveBackups(systemBackupService.getActiveBackups());
  };

  // Create backup
  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      
      // Create backup
      const { backupId, archive } = await systemBackupService.createBackup();
      
      // Create ZIP file
      const zipBlob = await systemBackupService.createBackupZip(archive);
      
      // Download backup
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos_system_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('System backup created and downloaded successfully');
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      toast.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingBackup(false);
      refreshBackupStatus();
    }
  };

  // Handle file selection for restore
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  // Restore backup
  const handleRestoreBackup = async () => {
    if (!restoreFile) return;

    try {
      setIsRestoring(true);
      
      // Parse backup ZIP
      const archive = await systemBackupService.parseBackupZip(restoreFile);
      
      // Validate and restore
      await systemBackupService.restoreBackup(archive);
      
      setShowRestoreDialog(false);
      setRestoreFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('System restore completed successfully');
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: BackupStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in-progress':
      case 'validating':
      case 'restoring':
        return <Activity className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: BackupStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in-progress':
      case 'validating':
      case 'restoring':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Auto-refresh status
  React.useEffect(() => {
    refreshBackupStatus();
    const interval = setInterval(refreshBackupStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Backup & Restore</h1>
        <Button onClick={refreshBackupStatus} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Create System Backup</span>
            </CardTitle>
            <CardDescription>
              Create a complete backup of all system data including database, files, and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>• Complete database backup</p>
              <p>• File assets and configuration</p>
              <p>• Action queue state</p>
              <p>• Integrity validation</p>
            </div>
            
            <Button 
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Restore System</span>
            </CardTitle>
            <CardDescription>
              Restore system from a previously created backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>• Validate backup integrity</p>
              <p>• Schema migration support</p>
              <p>• Complete system restore</p>
              <p>• Error recovery</p>
            </div>
            
            <Button 
              onClick={() => setShowRestoreDialog(true)}
              disabled={isRestoring}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isRestoring ? 'Restoring...' : 'Restore from Backup'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Backups */}
      {activeBackups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Operations</CardTitle>
            <CardDescription>
              Monitor ongoing backup and restore operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBackups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(backup.status)}
                      <span className="font-medium">Operation {backup.id.slice(-8)}</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(backup.status)}>
                      {backup.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {backup.message}
                  </div>
                  
                  {backup.progress > 0 && backup.progress < 100 && (
                    <Progress value={backup.progress} className="mb-2" />
                  )}
                  
                  <div className="text-xs text-gray-500">
                    {new Date(backup.timestamp).toLocaleString()}
                  </div>
                  
                  {backup.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{backup.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Information */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Information</CardTitle>
          <CardDescription>
            What gets included in system backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Database Tables</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm">File Assets</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Configuration</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Action Queue</span>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Database Tables:</strong> Products, Customers, Sales, Pending Sales, Users, Settings, Credit Payments, Partial Payments, User Receipt Counters, Pending Sale Events</p>
            <p><strong>File Assets:</strong> Local Storage, Session Storage, and other browser storage data</p>
            <p><strong>Configuration:</strong> App settings, user preferences, and system configuration</p>
            <p><strong>Action Queue:</strong> Pending operations and their current state</p>
          </div>
        </CardContent>
      </Card>

      {/* Safety Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Important Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Restore Warning:</strong> Restoring a backup will completely replace all current data. Make sure to backup your current data first.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Integrity Checks:</strong> All backups include checksums and validation to ensure data integrity.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Version Compatibility:</strong> Backups include version information and will automatically migrate data if needed.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore System from Backup</DialogTitle>
            <DialogDescription>
              Select a backup file to restore the system. This will replace all current data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Backup File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {restoreFile && (
              <div className="text-sm text-gray-600">
                <p>Selected file: {restoreFile.name}</p>
                <p>Size: {(restoreFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRestoreBackup}
              disabled={!restoreFile || isRestoring}
              variant="destructive"
            >
              {isRestoring ? 'Restoring...' : 'Restore System'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemBackupManager; 
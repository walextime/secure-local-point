import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  History,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedBackupUploadService, EnhancedBackupUploadConfig } from '@/services/backup/enhancedBackupUploadService';
import { BackupHistoryEntry } from '@/lib/backupHistoryDB';

interface QueueStatus {
  pendingCount: number;
  failedCount: number;
  isReplaying: boolean;
  lastReplayAttempt: string | null;
}

interface BackupStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  expired: number;
  averageRetryAttempts: number;
}

export const EnhancedBackupManager: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pendingCount: 0,
    failedCount: 0,
    isReplaying: false,
    lastReplayAttempt: null
  });
  
  const [backupStats, setBackupStats] = useState<BackupStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    expired: 0,
    averageRetryAttempts: 0
  });
  
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Load queue status and stats
  const loadQueueStatus = useCallback(async () => {
    try {
      const [queue, stats] = await Promise.all([
        EnhancedBackupUploadService.getQueueStatus(),
        EnhancedBackupUploadService.getBackupStats()
      ]);
      
      setQueueStatus(queue);
      setBackupStats(stats);
    } catch (error) {
      console.error('Failed to load queue status:', error);
    }
  }, []);
  
  // Load backup history
  const loadBackupHistory = useCallback(async () => {
    try {
      const history = await EnhancedBackupUploadService.getBackupHistory({
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      setBackupHistory(history);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    }
  }, []);
  
  // Handle backup upload
  const handleBackupUpload = async (config: EnhancedBackupUploadConfig) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Register status callback for this upload
      const backupId = `temp_${Date.now()}`;
      EnhancedBackupUploadService.registerStatusCallback(backupId, (status) => {
        setUploadProgress(status.status === 'completed' ? 100 : 
                        status.status === 'in_progress' ? 50 : 
                        status.status === 'pending' ? 25 : 0);
        
        if (status.status === 'completed') {
          toast.success('Backup uploaded successfully!');
        } else if (status.status === 'failed') {
          toast.error(`Upload failed: ${status.message}`);
        }
      });
      
      const result = await EnhancedBackupUploadService.uploadBackup(config);
      
      if (result.success) {
        toast.success(result.message);
      } else if (result.queued) {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
      
      // Reload data
      await Promise.all([loadQueueStatus(), loadBackupHistory()]);
      
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      EnhancedBackupUploadService.unregisterStatusCallback(`temp_${Date.now()}`);
    }
  };
  
  // Handle retry failed backups
  const handleRetryFailed = async () => {
    try {
      const failedBackups = backupHistory.filter(b => b.status === 'failed');
      let successCount = 0;
      
      for (const backup of failedBackups) {
        const success = await EnhancedBackupUploadService.retryBackup(backup.id);
        if (success) successCount++;
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} failed backups queued for retry`);
        await loadQueueStatus();
      } else {
        toast.info('No failed backups to retry');
      }
    } catch (error) {
      toast.error('Failed to retry backups');
    }
  };
  
  // Handle clear failed backups
  const handleClearFailed = async () => {
    try {
      const clearedCount = await EnhancedBackupUploadService.clearFailedBackups();
      if (clearedCount > 0) {
        toast.success(`Cleared ${clearedCount} failed backups`);
        await Promise.all([loadQueueStatus(), loadBackupHistory()]);
      } else {
        toast.info('No failed backups to clear');
      }
    } catch (error) {
      toast.error('Failed to clear failed backups');
    }
  };
  
  // Handle delete backup
  const handleDeleteBackup = async (backupId: string) => {
    try {
      const success = await EnhancedBackupUploadService.deleteBackup(backupId);
      if (success) {
        toast.success('Backup deleted');
        await loadBackupHistory();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (error) {
      toast.error('Failed to delete backup');
    }
  };
  
  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Load data on mount and periodically
  useEffect(() => {
    loadQueueStatus();
    loadBackupHistory();
    
    const interval = setInterval(() => {
      loadQueueStatus();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [loadQueueStatus, loadBackupHistory]);
  
  // Listen for backup notifications
  useEffect(() => {
    const handleBackupNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      if (type === 'success') {
        toast.success(message);
      } else if (type === 'error') {
        toast.error(message);
      } else if (type === 'warning') {
        toast.warning(message);
      } else {
        toast.info(message);
      }
    };
    
    window.addEventListener('backupNotification', handleBackupNotification as EventListener);
    
    return () => {
      window.removeEventListener('backupNotification', handleBackupNotification as EventListener);
    };
  }, []);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with status indicators */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Backup Manager</h2>
          <p className="text-muted-foreground">
            Manage backups with offline support and automatic retry
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Online/Offline indicator */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Queue status */}
          {(queueStatus.pendingCount > 0 || queueStatus.failedCount > 0) && (
            <Badge variant="secondary">
              {queueStatus.pendingCount} pending, {queueStatus.failedCount} failed
            </Badge>
          )}
        </div>
      </div>
      
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{backupStats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{backupStats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{backupStats.failed}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Offline warning */}
      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You are currently offline. Backups will be queued and uploaded when connection is restored.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Uploading Backup...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {uploadProgress}% complete
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Action buttons */}
      <div className="flex gap-4">
        <Button 
          onClick={() => handleBackupUpload({
            scriptUrl: 'https://script.google.com/macros/s/AKfycbzgLvYRn_H-0Z5uhSSF37sXhgVxNgYOutSJbXTETSnteG7ddSpL2KZX1ZMbalmISApI/exec',
            driveFolderId: '1JcPf0LzShNZz1763I65KtFCP6HjJlGGR',
            emailDestination: 'xavierfosso14@gmail.com'
          })}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Backup
        </Button>
        
        {queueStatus.failedCount > 0 && (
          <Button 
            variant="outline" 
            onClick={handleRetryFailed}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Failed ({queueStatus.failedCount})
          </Button>
        )}
        
        {queueStatus.failedCount > 0 && (
          <Button 
            variant="destructive" 
            onClick={handleClearFailed}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Failed
          </Button>
        )}
      </div>
      
      {/* Backup history */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">Backup History</TabsTrigger>
          <TabsTrigger value="queue">Queue Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {backupHistory.map((backup) => (
              <Card key={backup.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <p className="font-medium">
                          Backup {backup.id.slice(-8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(backup.status)}>
                        {backup.status.replace('_', ' ')}
                      </Badge>
                      
                      {backup.retryAttempts > 0 && (
                        <Badge variant="outline">
                          {backup.retryAttempts} retries
                        </Badge>
                      )}
                      
                      {backup.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => EnhancedBackupUploadService.retryBackup(backup.id)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBackup(backup.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {backup.error && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {backup.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {backupHistory.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No backup history found
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {queueStatus.pendingCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {queueStatus.failedCount}
                  </p>
                </div>
              </div>
              
              {queueStatus.isReplaying && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Processing queued backups...
                  </AlertDescription>
                </Alert>
              )}
              
              {queueStatus.lastReplayAttempt && (
                <p className="text-sm text-muted-foreground">
                  Last replay attempt: {new Date(queueStatus.lastReplayAttempt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 
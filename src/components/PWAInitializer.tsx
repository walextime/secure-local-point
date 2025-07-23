import React, { useEffect, useState } from 'react';
import { initializeDatabase, dbOperations } from '@/lib/dexieDb';
import { getDatabaseStats, downloadExportData, uploadAndImportData } from '@/lib/dataExportImport';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Database, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PWAStatus {
  isInitialized: boolean;
  isProcessing: boolean;
  queueStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  databaseStats: Record<string, number>;
  persistenceStatus: 'granted' | 'denied' | 'unknown';
  errors: string[];
}

const PWAInitializer: React.FC = () => {
  const [status, setStatus] = useState<PWAStatus>({
    isInitialized: false,
    isProcessing: false,
    queueStatus: { pending: 0, inProgress: 0, completed: 0, failed: 0 },
    databaseStats: {},
    persistenceStatus: 'unknown',
    errors: []
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Initialize PWA on mount
  useEffect(() => {
    initializePWA();
  }, []);

  const initializePWA = async () => {
    try {
      setStatus(prev => ({ ...prev, isProcessing: true }));

      // Initialize database
      await initializeDatabase();

      // Request storage persistence
      let persistenceStatus: 'granted' | 'denied' | 'unknown' = 'unknown';
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          const persisted = await navigator.storage.persist();
          persistenceStatus = persisted ? 'granted' : 'denied';
        } catch (error) {
          console.error('Storage persistence request failed:', error);
          persistenceStatus = 'denied';
        }
      }

      // Get initial queue status
      const queueStatus = await dbOperations.getQueueStatus();

      // Get database statistics
      const databaseStats = await getDatabaseStats();

      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        isProcessing: false,
        queueStatus,
        databaseStats,
        persistenceStatus
      }));

      console.log('PWA initialized successfully');
      toast.success('PWA initialized successfully');

    } catch (error) {
      console.error('PWA initialization failed:', error);
      setStatus(prev => ({
        ...prev,
        isProcessing: false,
        errors: [...prev.errors, `Initialization failed: ${error instanceof Error ? error.message : String(error)}`]
      }));
      toast.error('PWA initialization failed');
    }
  };

  // Refresh status
  const refreshStatus = async () => {
    try {
      const [queueStatus, databaseStats] = await Promise.all([
        dbOperations.getQueueStatus(),
        getDatabaseStats()
      ]);

      setStatus(prev => ({
        ...prev,
        queueStatus,
        databaseStats
      }));
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  };

  // Replay failed actions
  const replayFailedActions = async () => {
    try {
      await dbOperations.replayFailedActions();
      await refreshStatus();
      toast.success('Failed actions replayed successfully');
    } catch (error) {
      console.error('Failed to replay actions:', error);
      toast.error('Failed to replay actions');
    }
  };

  // Clear completed actions
  const clearCompletedActions = async () => {
    try {
      await dbOperations.clearCompletedActions();
      await refreshStatus();
      toast.success('Completed actions cleared');
    } catch (error) {
      console.error('Failed to clear completed actions:', error);
      toast.error('Failed to clear completed actions');
    }
  };

  // Export data
  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadExportData();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Import data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await uploadAndImportData(file);
      
      if (result.success) {
        await refreshStatus();
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    if (status.isInitialized) {
      const interval = setInterval(refreshStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status.isInitialized]);

  if (status.isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Activity className="h-8 w-8 animate-spin text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold">Initializing PWA</h3>
                <p className="text-sm text-gray-600">Setting up database and action queue...</p>
              </div>
            </div>
            <Progress value={50} className="mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PWA Status</h1>
        <Button onClick={refreshStatus} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status.isInitialized ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">
                {status.isInitialized ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Persistence</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={
              status.persistenceStatus === 'granted' ? 'default' :
              status.persistenceStatus === 'denied' ? 'destructive' : 'secondary'
            }>
              {status.persistenceStatus}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Action Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div>Pending: {status.queueStatus.pending}</div>
              <div>In Progress: {status.queueStatus.inProgress}</div>
              <div>Completed: {status.queueStatus.completed}</div>
              <div>Failed: {status.queueStatus.failed}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {Object.entries(status.databaseStats).map(([table, count]) => (
                <div key={table} className="flex justify-between">
                  <span className="capitalize">{table}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Queue Management */}
      <Card>
        <CardHeader>
          <CardTitle>Action Queue Management</CardTitle>
          <CardDescription>
            Monitor and manage the action queue for data consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={replayFailedActions}
              disabled={status.queueStatus.failed === 0}
              variant="outline"
              size="sm"
            >
              Replay Failed Actions ({status.queueStatus.failed})
            </Button>
            <Button 
              onClick={clearCompletedActions}
              disabled={status.queueStatus.completed === 0}
              variant="outline"
              size="sm"
            >
              Clear Completed Actions ({status.queueStatus.completed})
            </Button>
          </div>

          {status.queueStatus.failed > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {status.queueStatus.failed} actions have failed. Click "Replay Failed Actions" to retry them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export and import data for backup and recovery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <Button 
                variant="outline"
                disabled={isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>• Export creates a complete backup of all data</p>
            <p>• Import will replace all existing data</p>
            <p>• Use for backup, migration, or recovery</p>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {status.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PWAInitializer; 
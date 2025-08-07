import React, { useState, useEffect } from 'react';
import { backupRestoreLogic } from '@/services/backup/backupRestoreLogic';
import { incrementalBackupDB, Workflow as BackupWorkflow, WorkflowStep } from '@/lib/incrementalBackupSchema';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Activity,
  FileText,
  Settings,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  History,
  Workflow as WorkflowIcon,
  Layers,
  GitBranch,
  GitCommit,
  GitPullRequest
} from 'lucide-react';

interface SnapshotMetadata {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  timestamp: number;
  schemaVersion: number;
  appVersion: string;
  snapshotType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  parentSnapshotUUID?: string;
  checksum: string;
  size: number;
  tableCounts: Record<string, number>;
  actionLogCount: number;
  entityUUIDCount: number;
  isComplete: boolean;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

const IncrementalBackupManager: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [workflows, setWorkflows] = useState<BackupWorkflow[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [parentSnapshot, setParentSnapshot] = useState<string>('');

  // Load data
  const loadData = async () => {
    try {
      const snapshotsData = await incrementalBackupDB.snapshots.toArray();
      setSnapshots(snapshotsData);

      const workflowsData = await incrementalBackupDB.workflows.toArray();
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load backup data');
    }
  };

  useEffect(() => {
    loadData();
    // Resume unfinished workflows on component mount
    backupRestoreLogic.resumeUnfinishedWorkflows();
  }, []);

  // Create incremental backup
  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      toast.error('Please enter a backup name');
      return;
    }

    try {
      setIsCreatingBackup(true);
      setShowCreateDialog(false);
      
      const snapshotUUID = await backupRestoreLogic.createIncrementalBackup(
        backupName,
        backupDescription || undefined,
        parentSnapshot || undefined
      );
      
      setBackupName('');
      setBackupDescription('');
      setParentSnapshot('');
      
      await loadData();
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      toast.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore snapshot
  const handleRestoreSnapshot = async () => {
    if (!selectedSnapshot) {
      toast.error('Please select a snapshot to restore');
      return;
    }

    try {
      setIsRestoring(true);
      setShowRestoreDialog(false);
      
      await backupRestoreLogic.restoreSnapshot(selectedSnapshot);
      
      setSelectedSnapshot('');
      await loadData();
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'IN_PROGRESS':
        return <Activity className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Get snapshot type icon
  const getSnapshotTypeIcon = (type: string) => {
    switch (type) {
      case 'FULL':
        return <Database className="h-4 w-4" />;
      case 'INCREMENTAL':
        return <GitCommit className="h-4 w-4" />;
      case 'DIFFERENTIAL':
        return <GitBranch className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incremental Backup & Restore</h1>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitCommit className="h-5 w-5" />
              <span>Create Incremental Backup</span>
            </CardTitle>
            <CardDescription>
              Create an incremental backup with action log tracking and UUID-based deduplication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>• Snapshot-based backup with action log</p>
              <p>• UUID tracking for deduplication</p>
              <p>• Workflow resumption support</p>
              <p>• Schema migration compatibility</p>
            </div>
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              disabled={isCreatingBackup}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isCreatingBackup ? 'Creating Backup...' : 'Create Incremental Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Restore Snapshot</span>
            </CardTitle>
            <CardDescription>
              Restore from a snapshot with action replay and workflow resumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>• Action log replay with idempotent operations</p>
              <p>• Schema migration during restore</p>
              <p>• Workflow resumption support</p>
              <p>• Integrity validation</p>
            </div>
            
            <Button 
              onClick={() => setShowRestoreDialog(true)}
              disabled={isRestoring}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isRestoring ? 'Restoring...' : 'Restore Snapshot'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Workflows */}
      {workflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <WorkflowIcon className="h-5 w-5" />
              <span>Active Workflows</span>
            </CardTitle>
            <CardDescription>
              Monitor ongoing backup and restore workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(workflow.status)}
                      <span className="font-medium">{workflow.name}</span>
                      <Badge variant="outline">{workflow.type}</Badge>
                    </div>
                    <Badge variant={getStatusBadgeVariant(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <p>UUID: {workflow.uuid}</p>
                    <p>Created: {new Date(workflow.createdAt).toLocaleString()}</p>
                    {workflow.error && (
                      <p className="text-red-600">Error: {workflow.error}</p>
                    )}
                  </div>
                  
                  {workflow.status === 'IN_PROGRESS' && (
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      <span className="text-sm">In progress...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5" />
            <span>Available Snapshots</span>
          </CardTitle>
          <CardDescription>
            List of all available snapshots with metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No snapshots available</p>
              <p className="text-sm">Create your first incremental backup to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshots.map((snapshot) => (
                <div key={snapshot.uuid} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getSnapshotTypeIcon(snapshot.snapshotType)}
                      <span className="font-medium">{snapshot.name}</span>
                      <Badge variant="outline">{snapshot.snapshotType}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {snapshot.isComplete && snapshot.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <Badge variant={snapshot.isComplete && snapshot.isVerified ? 'default' : 'secondary'}>
                        {snapshot.isComplete && snapshot.isVerified ? 'Verified' : 'Incomplete'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <p>UUID: {snapshot.uuid}</p>
                    <p>Created: {new Date(snapshot.timestamp).toLocaleString()}</p>
                    <p>Size: {formatFileSize(snapshot.size)}</p>
                    <p>Schema Version: {snapshot.schemaVersion}</p>
                    <p>App Version: {snapshot.appVersion}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Tables:</span> {Object.keys(snapshot.tableCounts).length}
                    </div>
                    <div>
                      <span className="font-medium">Actions:</span> {snapshot.actionLogCount}
                    </div>
                    <div>
                      <span className="font-medium">Entities:</span> {snapshot.entityUUIDCount}
                    </div>
                    <div>
                      <span className="font-medium">Checksum:</span> {snapshot.checksum.slice(0, 8)}...
                    </div>
                  </div>
                  
                  {snapshot.description && (
                    <p className="text-sm text-gray-500 mt-2">{snapshot.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Snapshots:</span> {snapshots.length}
            </div>
            <div>
              <span className="font-medium">Active Workflows:</span> {workflows.filter(w => w.status === 'IN_PROGRESS').length}
            </div>
            <div>
              <span className="font-medium">Schema Version:</span> 1
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Incremental Backup</DialogTitle>
            <DialogDescription>
              Create a new incremental backup with optional parent snapshot
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="backupName">Backup Name</Label>
              <Input
                id="backupName"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Enter backup name"
              />
            </div>
            
            <div>
              <Label htmlFor="backupDescription">Description (Optional)</Label>
              <Textarea
                id="backupDescription"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                placeholder="Enter backup description"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="parentSnapshot">Parent Snapshot (Optional)</Label>
              <select
                id="parentSnapshot"
                value={parentSnapshot}
                onChange={(e) => setParentSnapshot(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">No parent (Full backup)</option>
                {snapshots
                  .filter(s => s.isComplete && s.isVerified)
                  .map(s => (
                    <option key={s.uuid} value={s.uuid}>
                      {s.name} ({new Date(s.timestamp).toLocaleDateString()})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBackup} disabled={!backupName.trim()}>
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Snapshot</DialogTitle>
            <DialogDescription>
              Select a snapshot to restore. This will replace all current data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshotSelect">Select Snapshot</Label>
              <select
                id="snapshotSelect"
                value={selectedSnapshot}
                onChange={(e) => setSelectedSnapshot(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Choose a snapshot...</option>
                {snapshots
                  .filter(s => s.isComplete && s.isVerified)
                  .map(s => (
                    <option key={s.uuid} value={s.uuid}>
                      {s.name} ({s.snapshotType}) - {new Date(s.timestamp).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
            
            {selectedSnapshot && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Restoring a snapshot will completely replace all current data. 
                  Make sure to backup your current data first.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRestoreSnapshot}
              disabled={!selectedSnapshot}
              variant="destructive"
            >
              Restore Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncrementalBackupManager; 
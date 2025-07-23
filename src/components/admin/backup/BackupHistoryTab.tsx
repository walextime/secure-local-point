import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  History, 
  Download, 
  Upload, 
  Search, 
  Filter,
  Calendar,
  FileText,
  Database,
  Cloud,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRetryQueue, getRetryQueueStatus, removeFromRetryQueue } from '@/services/backup/retryQueue';
import { 
  previewFile, 
  downloadFile, 
  printFile, 
  formatFileSize,
  PreviewData 
} from '@/services/backup/fileHandlers';
import FilePreviewDialog from './FilePreviewDialog';
import type { QueuedBackup } from '@/services/backup/retryQueue';
import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryRecord, BackupHistoryEntry as RealBackupHistoryEntry } from '@/types/backup';

interface BackupHistoryEntry {
  id: string;
  date: string;
  time: string;
  type: 'Human-Readable' | 'System' | 'Cloud Upload' | 'Pending Sale Deleted';
  status: 'Local Saved' | 'Cloud Uploaded' | 'Failed' | 'Deleted' | 'Pending';
  filename: string;
  size: string;
  description?: string;
  canDownload: boolean;
  canReupload: boolean;
  canDelete: boolean;
  fileType?: 'pdf' | 'json' | 'csv' | 'zip' | 'xlsx';
  actualSize?: number;
}

const BackupHistoryTab: React.FC = () => {
  const { toast } = useToast();
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<BackupHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [retryQueue, setRetryQueue] = useState<QueuedBackup[]>([]);
  const [retryQueueStatus, setRetryQueueStatus] = useState({
    isOnline: navigator.onLine,
    queueLength: 0,
    processing: false,
    lastCheck: new Date()
  });
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  
  useEffect(() => {
    loadBackupHistory();
  }, []);

  
  useEffect(() => {
    const loadRetryQueueData = () => {
      const queue = getRetryQueue();
      const status = getRetryQueueStatus();
      setRetryQueue(queue);
      setRetryQueueStatus(status);
    };
    
    loadRetryQueueData();
    
    
    const interval = setInterval(loadRetryQueueData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  
  useEffect(() => {
    let filtered = history;
    
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.includes(searchTerm) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(entry => entry.type === selectedType);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(entry => entry.status === selectedStatus);
    }
    
    setFilteredHistory(filtered);
  }, [history, searchTerm, selectedType, selectedStatus]);

  
  useEffect(() => {
    const retryQueueEntries = retryQueue.map(item => ({
      id: item.id,
      date: item.createdAt.toISOString().split('T')[0],
      time: item.createdAt.toTimeString().split(' ')[0],
      type: 'Cloud Upload' as const,
      status: item.attempts >= 3 ? 'Failed' as const : 'Pending' as const,
      filename: item.file?.name || 'Unknown file',
      size: item.file?.size ? `${(item.file.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
      description: `Queued for retry (${item.attempts}/3 attempts) - ${item.error || 'Network error'}`,
      canDownload: false,
      canReupload: true,
      canDelete: true,
      fileType: getFileTypeFromName(item.file?.name || ''),
      actualSize: item.file?.size
    }));

    setFilteredHistory([...history, ...retryQueueEntries]);
  }, [history, retryQueue, searchTerm, selectedType, selectedStatus]);

  const getFileTypeFromName = (filename: string): 'pdf' | 'json' | 'csv' | 'zip' | 'xlsx' | undefined => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'zip': return 'zip';
      case 'xlsx': return 'xlsx';
      default: return undefined;
    }
  };

  const loadBackupHistory = async () => {
    setIsLoading(true);
    try {
      // Load real backup history from the database
      const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
      const entries: RealBackupHistoryEntry[] = historyRecord?.entries || [];
      // Map to UI format
      const mapped: BackupHistoryEntry[] = entries.map(e => {
        let type: BackupHistoryEntry['type'] = 'Human-Readable';
        if (e.config?.type === 'download') type = 'System';
        // You can add more mappings if needed
        return {
          id: e.id,
          date: new Date(e.timestamp).toLocaleDateString(),
          time: new Date(e.timestamp).toLocaleTimeString(),
          type: type as BackupHistoryEntry['type'],
          status: (e.success ? (type === 'System' ? 'Local Saved' : 'Local Saved') : 'Failed') as BackupHistoryEntry['status'],
          filename: e.filesCreated?.[0] || 'Unknown',
          size: 'N/A',
          description: e.errors && e.errors.length > 0 ? e.errors.join('; ') : '',
          canDownload: e.success && e.filesCreated && e.filesCreated.length > 0,
          canReupload: !e.success,
          canDelete: true,
          fileType: undefined,
          actualSize: undefined
        };
      }).reverse();
      setHistory(mapped);
    } catch (error) {
      toast({
        title: "Error loading history",
        description: "Failed to load backup history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (entry: BackupHistoryEntry) => {
    if (!entry.fileType) {
      toast({
        title: "Preview not available",
        description: "This file type cannot be previewed",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (entry.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            backupId: entry.id,
            date: entry.date,
            time: entry.time,
            type: entry.type,
            status: entry.status,
            description: entry.description,
            data: {
              customers: 45,
              products: 123,
              sales: 67,
              pendingSales: 3
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Backup ID,Date,Time,Type,Status,Description\n${entry.id},${entry.date},${entry.time},${entry.type},${entry.status},${entry.description}`;
          contentType = 'text/csv';
          break;
        case 'zip':
          mockContent = new Blob(['Mock ZIP content'], { type: 'application/zip' });
          contentType = 'application/zip';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      const blob = new Blob([mockContent], { type: contentType });
      const mockFile = new File([blob], entry.filename, { type: contentType });
      const preview = await previewFile(mockFile);
      setPreviewData(preview);
      setIsPreviewOpen(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Failed to preview backup file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (entry: BackupHistoryEntry) => {
    if (!entry.fileType) {
      toast({
        title: "Download not available",
        description: "This file type cannot be downloaded",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (entry.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            backupId: entry.id,
            date: entry.date,
            time: entry.time,
            type: entry.type,
            status: entry.status,
            description: entry.description,
            data: {
              customers: 45,
              products: 123,
              sales: 67,
              pendingSales: 3
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Backup ID,Date,Time,Type,Status,Description\n${entry.id},${entry.date},${entry.time},${entry.type},${entry.status},${entry.description}`;
          contentType = 'text/csv';
          break;
        case 'zip':
          mockContent = new Blob(['Mock ZIP content'], { type: 'application/zip' });
          contentType = 'application/zip';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      await downloadFile({
        filename: entry.filename,
        contentType,
        data: mockContent
      });

      toast({
        title: "Download started",
        description: `${entry.filename} is being downloaded`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download backup file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async (entry: BackupHistoryEntry) => {
    if (!entry.fileType) {
      toast({
        title: "Print not available",
        description: "This file type cannot be printed",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (entry.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            backupId: entry.id,
            date: entry.date,
            time: entry.time,
            type: entry.type,
            status: entry.status,
            description: entry.description,
            data: {
              customers: 45,
              products: 123,
              sales: 67,
              pendingSales: 3
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Backup ID,Date,Time,Type,Status,Description\n${entry.id},${entry.date},${entry.time},${entry.type},${entry.status},${entry.description}`;
          contentType = 'text/csv';
          break;
        case 'zip':
          mockContent = new Blob(['Mock ZIP content'], { type: 'application/zip' });
          contentType = 'application/zip';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      await printFile({
        filename: entry.filename,
        contentType,
        data: mockContent
      });

      toast({
        title: "Print dialog opened",
        description: "Print dialog has been opened in a new window"
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to print backup file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReupload = async (entry: BackupHistoryEntry) => {
    try {
      
      toast({
        title: "Re-upload started",
        description: `Re-uploading ${entry.filename} to cloud`
      });
    } catch (error) {
      toast({
        title: "Re-upload failed",
        description: "Failed to re-upload backup",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (entry: BackupHistoryEntry) => {
    try {
      
      if (entry.type === 'Cloud Upload' && entry.status === 'Pending') {
        const removed = removeFromRetryQueue(entry.id);
        if (removed) {
          toast({
            title: "Backup removed from queue",
            description: `${entry.filename} has been removed from the retry queue`
          });
          return;
        }
      }
      
      
      toast({
        title: "Backup deleted",
        description: `${entry.filename} has been deleted`
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete backup",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: BackupHistoryEntry['status']) => {
    switch (status) {
      case 'Local Saved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Local Saved</Badge>;
      case 'Cloud Uploaded':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Cloud Uploaded</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Deleted':
        return <Badge variant="outline">Deleted</Badge>;
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: BackupHistoryEntry['type']) => {
    switch (type) {
      case 'Human-Readable':
        return <FileText className="h-4 w-4" />;
      case 'System':
        return <Database className="h-4 w-4" />;
      case 'Cloud Upload':
        return <Cloud className="h-4 w-4" />;
      case 'Pending Sale Deleted':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backup History
            </CardTitle>
            <CardDescription>
              View all past backup events, cloud uploads, and system changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search History</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by filename, date, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="type-filter">Filter by Type</Label>
                <select
                  id="type-filter"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="Human-Readable">Human-Readable</option>
                  <option value="System">System</option>
                  <option value="Cloud Upload">Cloud Upload</option>
                  <option value="Pending Sale Deleted">Pending Sale Deleted</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Local Saved">Local Saved</option>
                  <option value="Cloud Uploaded">Cloud Uploaded</option>
                  <option value="Failed">Failed</option>
                  <option value="Deleted">Deleted</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading history...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-6 text-center">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No backup history found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your search or filters' 
                    : 'Backup history will appear here once backups are created'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredHistory.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(entry.type)}
                          <div>
                            <p className="font-medium">{entry.filename}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {entry.date} at {entry.time}
                              </span>
                              {entry.size !== 'N/A' && <span>{entry.size}</span>}
                              {entry.description && (
                                <span className="max-w-xs truncate">{entry.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(entry.status)}
                        
                        {entry.fileType && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(entry)}
                            className="flex items-center gap-1"
                            disabled={isLoading}
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                        )}
                        
                        {entry.canDownload && entry.fileType && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(entry)}
                            className="flex items-center gap-1"
                            disabled={isLoading}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        )}
                        
                        {entry.fileType && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(entry)}
                            className="flex items-center gap-1"
                            disabled={isLoading || entry.fileType === 'zip' || entry.fileType === 'xlsx'}
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Button>
                        )}
                        
                        {entry.canReupload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReupload(entry)}
                            className="flex items-center gap-1"
                          >
                            <Upload className="h-3 w-3" />
                            Re-upload
                          </Button>
                        )}
                        
                        {entry.canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(entry)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">History Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{history.length}</p>
                <p className="text-sm text-blue-600">Total Entries</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {history.filter(h => h.status === 'Cloud Uploaded').length}
                </p>
                <p className="text-sm text-green-600">Cloud Uploads</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {history.filter(h => h.status === 'Failed').length}
                </p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {history.filter(h => h.type === 'Pending Sale Deleted').length}
                </p>
                <p className="text-sm text-purple-600">Deleted Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <FilePreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
      />
    </>
  );
};

export default BackupHistoryTab;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  Search,
  Calendar,
  File,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  previewFile, 
  downloadFile, 
  printFile, 
  formatFileSize,
  PreviewData 
} from '@/services/backup/fileHandlers';
import FilePreviewDialog from '../FilePreviewDialog';
import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';

interface DailyReport {
  id: string;
  filename: string;
  date: string;
  size: number;
  type: 'pdf' | 'json' | 'csv';
  content?: Blob;
  createdAt: Date;
}

export const RecentReports: React.FC = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Mock data - replace with actual data fetching
  useEffect(() => {
    const mockReports: DailyReport[] = [
      {
        id: '1',
        filename: 'daily-report-2024-01-15.pdf',
        date: '2024-01-15',
        size: 245760,
        type: 'pdf',
        createdAt: new Date('2024-01-15T10:30:00')
      },
      {
        id: '2',
        filename: 'daily-report-2024-01-14.json',
        date: '2024-01-14',
        size: 15360,
        type: 'json',
        createdAt: new Date('2024-01-14T10:30:00')
      },
      {
        id: '3',
        filename: 'daily-report-2024-01-13.csv',
        date: '2024-01-13',
        size: 8192,
        type: 'csv',
        createdAt: new Date('2024-01-13T10:30:00')
      }
    ];
    setReports(mockReports);
  }, []);

  const filteredReports = reports.filter(report =>
    report.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.date.includes(searchTerm)
  );

  const handlePreview = async (report: DailyReport) => {
    try {
      setIsLoading(true);
      
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (report.type) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            date: report.date,
            sales: 1250.50,
            transactions: 45,
            products: 23,
            customers: 12
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Sales,Transactions,Products,Customers\n${report.date},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      const blob = new Blob([mockContent], { type: contentType });
      const mockFile = Object.assign(blob, { name: report.filename }) as File;
      const preview = await previewFile(mockFile);
      setPreviewData(preview);
      setIsPreviewOpen(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Failed to preview report",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logDownloadHistory = async (fileName: string, success: boolean, errorMsg?: string) => {
    const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
    const newEntry: BackupHistoryEntry = {
      id: `download-${Date.now()}`,
      timestamp: Date.now(),
      filesCreated: [fileName],
      errors: errorMsg ? [errorMsg] : [],
      success,
      config: { type: 'recent-report-download' }
    };
    let entries = historyRecord?.entries || [];
    entries = [...entries, newEntry].slice(-50);
    await dbOperations.put(STORES.SETTINGS, {
      id: 'backup-history',
      entries
    });
  };

  const handleDownload = async (report: DailyReport) => {
    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (report.type) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            date: report.date,
            sales: 1250.50,
            transactions: 45,
            products: 23,
            customers: 12
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Sales,Transactions,Products,Customers\n${report.date},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      await downloadFile({
        filename: report.filename,
        contentType,
        data: mockContent
      });
      await logDownloadHistory(report.filename, true);
      toast({
        title: "Download started",
        description: `${report.filename} is being downloaded`
      });
    } catch (error) {
      await logDownloadHistory(report.filename, false, error.message || String(error));
      toast({
        title: "Download failed",
        description: "Failed to download report",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async (report: DailyReport) => {
    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (report.type) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            date: report.date,
            sales: 1250.50,
            transactions: 45,
            products: 23,
            customers: 12
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Sales,Transactions,Products,Customers\n${report.date},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        default:
          throw new Error('Unsupported file type');
      }

      await printFile({
        filename: report.filename,
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
        description: error instanceof Error ? error.message : "Failed to print report",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type: DailyReport['type']) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      json: 'bg-blue-100 text-blue-800',
      csv: 'bg-green-100 text-green-800'
    };

    return (
      <Badge className={colors[type]}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const getFileIcon = (type: DailyReport['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'json': return <File className="h-4 w-4" />;
      case 'csv': return <File className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Reports</CardTitle>
          <CardDescription>Recently generated daily reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reports by name or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{searchTerm ? 'No reports found' : 'No recent reports available'}</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 'Try adjusting your search terms' : 'Generated reports will appear here'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(report.type)}
                        <div>
                          <h4 className="font-medium text-sm">{report.filename}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {report.date}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {report.createdAt.toLocaleTimeString()}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(report.size)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getTypeBadge(report.type)}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(report)}
                            disabled={isLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            disabled={isLoading}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(report)}
                            disabled={isLoading}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      <FilePreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
      />
    </>
  );
};

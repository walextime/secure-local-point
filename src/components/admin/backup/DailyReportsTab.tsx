import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Search,
  Filter,
  Eye,
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  previewFile, 
  downloadFile, 
  printFile, 
  formatFileSize,
  PreviewData 
} from '@/services/backup/fileHandlers';
import FilePreviewDialog from './FilePreviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DailyReportService } from '@/services/dailyReportService';
import type { DailySummary } from '@/services/dailyReportService';
import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';
import { SimpleEnhancedDailyReportGenerator } from '@/services/backup/simpleEnhancedDailyReport';

interface DailyReport {
  id: string;
  date: string;
  filename: string;
  type: 'sales' | 'inventory' | 'summary';
  size: string;
  actualSize: number;
  fileType: 'pdf' | 'json' | 'csv' | 'xlsx';
  status: 'available' | 'generating' | 'failed';
  downloadUrl?: string;
  createdAt: string;
}

const DailyReportsTab: React.FC = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<DailyReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'download' | 'preview' | null>(null);
  const [passwordReport, setPasswordReport] = useState<DailyReport | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [manualGenDialogOpen, setManualGenDialogOpen] = useState(false);
  const [manualGenPassword, setManualGenPassword] = useState('');
  const manualGenInputRef = useRef<HTMLInputElement>(null);

  // Load daily reports
  useEffect(() => {
    loadDailyReports();
  }, []);

  // Filter reports based on search and type
  useEffect(() => {
    let filtered = reports;
    
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.date.includes(searchTerm)
      );
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(report => report.type === selectedType);
    }
    
    setFilteredReports(filtered);
  }, [reports, searchTerm, selectedType]);

  const loadDailyReports = async () => {
    setIsLoading(true);
    try {
      
      
      const mockReports: DailyReport[] = [
        {
          id: '1',
          date: '2024-01-15',
          filename: 'daily_report_2024-01-15.pdf',
          type: 'summary',
          size: '2.3 MB',
          actualSize: 2416640,
          fileType: 'pdf',
          status: 'available',
          createdAt: '2024-01-15 18:00:00'
        },
        {
          id: '2',
          date: '2024-01-14',
          filename: 'sales_report_2024-01-14.xlsx',
          type: 'sales',
          size: '1.8 MB',
          actualSize: 1887436,
          fileType: 'xlsx',
          status: 'available',
          createdAt: '2024-01-14 18:00:00'
        },
        {
          id: '3',
          date: '2024-01-13',
          filename: 'inventory_report_2024-01-13.json',
          type: 'inventory',
          size: '3.1 MB',
          actualSize: 3252224,
          fileType: 'json',
          status: 'available',
          createdAt: '2024-01-13 18:00:00'
        },
        {
          id: '4',
          date: '2024-01-12',
          filename: 'daily_summary_2024-01-12.csv',
          type: 'summary',
          size: '0.8 MB',
          actualSize: 838860,
          fileType: 'csv',
          status: 'available',
          createdAt: '2024-01-12 18:00:00'
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      toast({
        title: "Error loading reports",
        description: "Failed to load daily reports",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordAction = (action: 'download' | 'preview', report: DailyReport) => {
    setPasswordAction(action);
    setPasswordReport(report);
    setPdfPassword('');
    setPasswordDialogOpen(true);
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const logDownloadHistory = async (fileName: string, success: boolean, errorMsg?: string) => {
    const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
    const newEntry: BackupHistoryEntry = {
      id: `download-${Date.now()}`,
      timestamp: Date.now(),
      filesCreated: [fileName],
      errors: errorMsg ? [errorMsg] : [],
      success,
      config: { type: 'daily-report-download' }
    };
    let entries = historyRecord?.entries || [];
    entries = [...entries, newEntry].slice(-50);
    await dbOperations.put(STORES.SETTINGS, {
      id: 'backup-history',
      entries
    });
  };

  const handlePasswordSubmit = async () => {
    if (!passwordReport || !pdfPassword) return;
    setIsLoading(true);
    setPasswordDialogOpen(false);
    try {
      // Fetch the DailySummary for the report's date
      const summary: DailySummary = await DailyReportService.generateDailySummary(new Date(passwordReport.date));
      const pdfData = await DailyReportService.generateDailyPDF(summary, pdfPassword);
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      if (passwordAction === 'download') {
        await downloadFile({ filename: passwordReport.filename, contentType: 'application/pdf', data: blob });
        await logDownloadHistory(passwordReport.filename, true);
        toast({ title: 'Download started', description: `${passwordReport.filename} is being downloaded` });
      } else if (passwordAction === 'preview') {
        const file = new File([blob], passwordReport.filename, { type: 'application/pdf' });
        const preview = await previewFile(file);
        setPreviewData(preview);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      if (passwordAction === 'download' && passwordReport) {
        await logDownloadHistory(passwordReport.filename, false, error.message || String(error));
      }
      toast({ title: 'PDF failed', description: 'Failed to generate password-protected PDF', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (report: DailyReport) => {
    if ((report.fileType as string) === 'pdf') {
      handlePasswordAction('preview', report);
      return;
    }
    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (report.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content for daily report'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            reportId: report.id,
            date: report.date,
            type: report.type,
            summary: {
              totalSales: 1250.50,
              totalTransactions: 45,
              totalProducts: 23,
              totalCustomers: 12,
              averageTransactionValue: 27.79
            },
            details: {
              topSellingProducts: ['Product A', 'Product B', 'Product C'],
              customerSegments: { new: 5, returning: 7 },
              salesByHour: { '9-12': 300, '12-15': 450, '15-18': 500 }
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Type,Total Sales,Transactions,Products,Customers\n${report.date},${report.type},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content for sales report'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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

  const handleDownload = async (report: DailyReport) => {
    if ((report.fileType as string) === 'pdf') {
      handlePasswordAction('download', report);
      return;
    }
    try {
      setIsLoading(true);
      
      
      let mockContent: Blob | string;
      let contentType: string;
      
      switch (report.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content for daily report'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            reportId: report.id,
            date: report.date,
            type: report.type,
            summary: {
              totalSales: 1250.50,
              totalTransactions: 45,
              totalProducts: 23,
              totalCustomers: 12,
              averageTransactionValue: 27.79
            },
            details: {
              topSellingProducts: ['Product A', 'Product B', 'Product C'],
              customerSegments: { new: 5, returning: 7 },
              salesByHour: { '9-12': 300, '12-15': 450, '15-18': 500 }
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Type,Total Sales,Transactions,Products,Customers\n${report.date},${report.type},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content for sales report'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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
      
      switch (report.fileType) {
        case 'pdf':
          mockContent = new Blob(['Mock PDF content for daily report'], { type: 'application/pdf' });
          contentType = 'application/pdf';
          break;
        case 'json':
          mockContent = JSON.stringify({
            reportId: report.id,
            date: report.date,
            type: report.type,
            summary: {
              totalSales: 1250.50,
              totalTransactions: 45,
              totalProducts: 23,
              totalCustomers: 12,
              averageTransactionValue: 27.79
            },
            details: {
              topSellingProducts: ['Product A', 'Product B', 'Product C'],
              customerSegments: { new: 5, returning: 7 },
              salesByHour: { '9-12': 300, '12-15': 450, '15-18': 500 }
            }
          }, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          mockContent = `Date,Type,Total Sales,Transactions,Products,Customers\n${report.date},${report.type},1250.50,45,23,12`;
          contentType = 'text/csv';
          break;
        case 'xlsx':
          mockContent = new Blob(['Mock Excel content for sales report'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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

  const getStatusBadge = (status: DailyReport['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'generating':
        return <Badge variant="secondary">Generating...</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: DailyReport['type']) => {
    switch (type) {
      case 'sales':
        return <TrendingUp className="h-4 w-4" />;
      case 'inventory':
        return <FileText className="h-4 w-4" />;
      case 'summary':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFileTypeBadge = (fileType: DailyReport['fileType']) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      json: 'bg-blue-100 text-blue-800',
      csv: 'bg-green-100 text-green-800',
      xlsx: 'bg-emerald-100 text-emerald-800'
    };

    return (
      <Badge className={colors[fileType]}>
        {fileType.toUpperCase()}
      </Badge>
    );
  };

  const handleManualGenClick = () => {
    setManualGenPassword('');
    setManualGenDialogOpen(true);
    setTimeout(() => manualGenInputRef.current?.focus(), 100);
  };

  const handleManualGenSubmit = async () => {
    if (!manualGenPassword) return;
    setIsLoading(true);
    setManualGenDialogOpen(false);
    try {
      const today = new Date();
      
      // Get all data for enhanced daily report
      const customers = await dbOperations.getAll(STORES.CUSTOMERS);
      const products = await dbOperations.getAll(STORES.PRODUCTS);
      const sales = await dbOperations.getAll(STORES.SALES);
      const pendingSales = await dbOperations.getAll(STORES.PENDING_SALES);
      const settings = await dbOperations.getAll(STORES.SETTINGS);
      const users = await dbOperations.getAll(STORES.USERS);
      
      const dailyReportData = {
        date: today.toISOString().split('T')[0],
        sales: sales,
        products: products,
        customers: customers,
        users: users,
        settings: settings[0] || {}
      };
      
      // Generate enhanced daily report
      console.log('Starting enhanced daily report generation...');
      console.log('Daily report data:', dailyReportData);
      
      const { pdfContent } = await SimpleEnhancedDailyReportGenerator.generateComprehensiveDailyReport(dailyReportData);
      console.log('Enhanced daily report generated successfully, PDF size:', pdfContent.length);
      
      // Create enhanced PDF blob
      const enhancedBlob = new Blob([pdfContent], { type: 'application/pdf' });
      const enhancedFilename = `enhanced_daily_report_${today.toISOString().slice(0,10)}.pdf`;
      
      // Download the enhanced report
      await downloadFile({ filename: enhancedFilename, contentType: 'application/pdf', data: enhancedBlob });
      
      // Also generate and download the old format report
      const summary = await DailyReportService.generateDailySummary(today);
      const oldPdfData = await DailyReportService.generateDailyPDF(summary, manualGenPassword);
      const oldBlob = new Blob([oldPdfData], { type: 'application/pdf' });
      const oldFilename = `daily_report_${today.toISOString().slice(0,10)}.pdf`;
      
      await downloadFile({ filename: oldFilename, contentType: 'application/pdf', data: oldBlob });
      
      // Log both downloads
      await logDownloadHistory(enhancedFilename, true);
      await logDownloadHistory(oldFilename, true);
      
      toast({ 
        title: 'Both Daily Reports Generated', 
        description: `Enhanced and standard daily reports are being downloaded` 
      });
    } catch (error) {
      console.error('Error generating enhanced daily report:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Fallback to original method
      try {
        const today = new Date();
        const summary = await DailyReportService.generateDailySummary(today);
        const pdfData = await DailyReportService.generateDailyPDF(summary, manualGenPassword);
        const filename = `daily_report_${today.toISOString().slice(0,10)}.pdf`;
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        await downloadFile({ filename, contentType: 'application/pdf', data: blob });
        await logDownloadHistory(filename, true);
        toast({ title: 'Daily Report Generated', description: `${filename} is being downloaded` });
      } catch (fallbackError) {
        await logDownloadHistory('daily_report_failed', false, fallbackError.message || String(fallbackError));
        toast({ 
          title: 'Generation failed', 
          description: 'Failed to generate daily report', 
          variant: 'destructive' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {}
        <div className="flex justify-end">
          <Button onClick={handleManualGenClick} className="mb-2" disabled={isLoading}>
            Generate Today's Daily Reports (Enhanced + Standard)
          </Button>
        </div>
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Daily Reports
            </CardTitle>
            <CardDescription>
              View, download, and print generated daily reports from your backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Reports</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by filename, date, or type..."
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
                  <option value="sales">Sales Reports</option>
                  <option value="inventory">Inventory Reports</option>
                  <option value="summary">Summary Reports</option>
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
                <p className="mt-2 text-gray-600">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No daily reports found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || selectedType !== 'all'
                    ? 'Try adjusting your search or filters' 
                    : 'Daily reports will appear here once they are generated'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="divide-y">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(report.type)}
                            <div>
                              <p className="font-medium">{report.filename}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {report.date}
                                </span>
                                <span>{report.size}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {report.createdAt}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(report.status)}
                          {getFileTypeBadge(report.fileType)}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(report)}
                            className="flex items-center gap-1"
                            disabled={isLoading || report.status !== 'available'}
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            className="flex items-center gap-1"
                            disabled={isLoading || report.status !== 'available'}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(report)}
                            className="flex items-center gap-1"
                            disabled={isLoading || report.status !== 'available' || report.fileType === 'xlsx'}
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
                <p className="text-sm text-blue-600">Total Reports</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.type === 'sales').length}
                </p>
                <p className="text-sm text-green-600">Sales Reports</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {reports.filter(r => r.type === 'inventory').length}
                </p>
                <p className="text-sm text-purple-600">Inventory Reports</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {reports.filter(r => r.type === 'summary').length}
                </p>
                <p className="text-sm text-orange-600">Summary Reports</p>
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

      {}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Protect PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pdf-password">Enter password to protect the PDF:</Label>
            <Input
              id="pdf-password"
              ref={passwordInputRef}
              type="password"
              value={pdfPassword}
              onChange={e => setPdfPassword(e.target.value)}
              placeholder="PDF password"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordSubmit} disabled={!pdfPassword}>
              {passwordAction === 'download' ? 'Download PDF' : 'Preview PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={manualGenDialogOpen} onOpenChange={setManualGenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Daily Report (PDF)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="manual-gen-password">Enter password to protect the PDF:</Label>
            <Input
              id="manual-gen-password"
              ref={manualGenInputRef}
              type="password"
              value={manualGenPassword}
              onChange={e => setManualGenPassword(e.target.value)}
              placeholder="PDF password"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleManualGenSubmit} disabled={!manualGenPassword}>
              Generate & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyReportsTab;

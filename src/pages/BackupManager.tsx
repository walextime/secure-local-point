import React, { useState, useRef } from 'react';
import { useSettings } from '@/components/pos/hooks/useSettings';
import { translations } from '@/components/backup/translations';
import BackupTabs from '@/components/backup/BackupTabs';
import BackupRestoreActions from '@/components/backup/BackupRestoreActions';
import { useBackupRestore } from '@/components/backup/hooks/useBackupRestore';
import { useBackupDownload } from '@/components/backup/hooks/useBackupDownload';
import { DateRange } from 'react-day-picker';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DailyReportService } from '@/services/dailyReportService';
import { dbOperations, STORES } from '@/lib/db';
import { DataFormatters } from '@/services/backup/dataFormatters';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { PendingSalesService } from '@/services/pendingSalesService';
import { createHumanReadableZip, createSystemZip } from '@/services/backup/backupUtils';
import { getSelectedBackupFolder, isFileSystemAccessSupported } from '@/services/backup/folderSelection';
import { useAuth } from '@/hooks/useAuth';
import { isRoot, isAdminOrManager } from '@/lib/auth';
import RootBackupManager from '@/components/admin/RootBackupManager';
import AdminManagerBackupManager from '@/components/admin/AdminManagerBackupManager';


interface BackupData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  users?: any[];
  settings?: any[];
  metadata?: {
    createdAt: number;
    version: string;
    description: string;
  };
}

const BackupManager: React.FC = () => {
  const { language } = useSettings();
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("enhanced");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const { isRestoring, restoreBackupData } = useBackupRestore();
  const { downloadReadableFiles } = useBackupDownload();
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pdfType, setPdfType] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [zipDialogOpen, setZipDialogOpen] = useState(false);
  const [zipPassword, setZipPassword] = useState('');
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [backupType, setBackupType] = useState<'human' | 'system'>('human');
  
  const { user } = useAuth();
  if (!user) return <div className="p-8 text-center">Access Denied</div>;
  if (isRoot(user)) {
    
    return <RootBackupManager />;
  }
  if (isAdminOrManager(user)) {
    
    return <AdminManagerBackupManager />;
  }
  return <div className="p-8 text-center">Access Denied</div>;
};

export default BackupManager;



async function generateSalesPDF(sales: any[], password: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  page.drawText('Sales Records', { x: 40, y, size: 16, font: boldFont });
  y -= 24;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 40, y, size: 10, font });
  y -= 18;
  page.drawText(`Total Sales: ${sales.length}`, { x: 40, y, size: 10, font });
  y -= 18;
  page.drawText('ID | Date | Customer | Total | Payment | Status', { x: 40, y, size: 10, font: boldFont });
  y -= 14;
  sales.slice(0, 40).forEach(sale => {
    page.drawText(`${sale.id} | ${new Date(sale.date).toLocaleDateString()} | ${sale.customerName || 'Guest'} | $${sale.total} | ${sale.paymentMethod} | ${sale.status}`, { x: 40, y, size: 9, font });
    y -= 12;
    if (y < 40) { y = 800; page = pdfDoc.addPage([595, 842]); }
  });
  
  const rawPdf = await pdfDoc.save();
  return password ? await DailyReportService.protectPDFWithPassword(rawPdf, password) : rawPdf;
}

async function generatePendingSalesPDF(pendingSales: any[], password: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  let page = pdfDoc.getPages()[0];
  page.drawText('Pending Sales', { x: 40, y, size: 16, font: boldFont });
  y -= 24;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 40, y, size: 10, font });
  y -= 18;
  page.drawText(`Total Pending Sales: ${pendingSales.length}`, { x: 40, y, size: 10, font });
  y -= 18;
  page.drawText('ID | Customer | Total | Paid | Due | Status', { x: 40, y, size: 10, font: boldFont });
  y -= 14;
  pendingSales.slice(0, 40).forEach(sale => {
    page.drawText(`${sale.id} | ${sale.customerName || 'Guest'} | $${sale.total} | $${sale.amountPaid} | $${sale.remainingBalance} | ${sale.status}`, { x: 40, y, size: 9, font });
    y -= 12;
    if (y < 40) { y = 800; page = pdfDoc.addPage([595, 842]); page = pdfDoc.getPages().slice(-1)[0]; }
  });
  const rawPdf = await pdfDoc.save();
  return password ? await DailyReportService.protectPDFWithPassword(rawPdf, password) : rawPdf;
}

async function generateSettingsPDF(settings: any, password: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  page.drawText('Settings Summary', { x: 40, y, size: 16, font: boldFont });
  y -= 24;
  Object.entries(settings).forEach(([key, value]) => {
    page.drawText(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`, { x: 40, y, size: 10, font });
    y -= 14;
    if (y < 40) { y = 800; page = pdfDoc.addPage([595, 842]); }
  });
  const rawPdf = await pdfDoc.save();
  return password ? await DailyReportService.protectPDFWithPassword(rawPdf, password) : rawPdf;
}

import { jsPDF } from 'jspdf';
import { generateId } from '@/lib/crypto';
import { verifyMasterPassword } from '@/lib/auth';
import { toast } from 'sonner';
import { ConfigService } from '@/services/configService';
import * as XLSX from 'xlsx';


interface SaleForExport {
  id: string;
  date: number;
  cashierName: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  customerName?: string;
}


interface DateRange {
  from?: Date;
  to?: Date;
}


const translations = {
  en: {
    dialogs: {
      passwordPrompt: 'Enter master password to access the export:',
      invalidPassword: 'Invalid password',
      passwordRequired: 'Password required for export'
    },
    exports: {
      success: {
        excel: 'Excel data exported successfully',
        json: 'JSON data exported successfully',
        pdf: 'PDF report exported successfully'
      },
      errors: {
        invalidFormat: 'Invalid export format',
        noData: 'No sales data found for the selected period'
      }
    },
    pdf: {
      title: 'Sales Report',
      period: 'Period:',
      allTime: 'All Time',
      generated: 'Generated:',
      summary: 'Summary:',
      totalSales: 'Total Sales:',
      transactions: 'Number of Transactions:',
      itemsSold: 'Total Items Sold:',
      transactionsTitle: 'Transactions:',
      headers: ['ID', 'Date', 'Customer', 'Cashier', 'Credit Used', 'Total'],
      productHeaders: ['Product', 'Qty', 'Unit Price', 'Line Total'],
      footer: 'This report is password protected.',
      creditYes: 'Yes',
      creditNo: 'No'
    }
  },
  fr: {
    dialogs: {
      passwordPrompt: 'Entrez le mot de passe principal pour accéder à l\'exportation:',
      invalidPassword: 'Mot de passe invalide',
      passwordRequired: 'Mot de passe requis pour l\'exportation'
    },
    exports: {
      success: {
        excel: 'Données Excel exportées avec succès',
        json: 'Données JSON exportées avec succès',
        pdf: 'Rapport PDF exporté avec succès'
      },
      errors: {
        invalidFormat: 'Format d\'exportation invalide',
        noData: 'Aucune donnée de vente trouvée pour la période sélectionnée'
      }
    },
    pdf: {
      title: 'Rapport des Ventes',
      period: 'Période:',
      allTime: 'Toutes les Périodes',
      generated: 'Généré le:',
      summary: 'Résumé:',
      totalSales: 'Ventes Totales:',
      transactions: 'Nombre de Transactions:',
      itemsSold: 'Articles Vendus:',
      transactionsTitle: 'Transactions:',
      headers: ['ID', 'Date', 'Client', 'Caissier', 'Crédit Utilisé', 'Total'],
      productHeaders: ['Produit', 'Qté', 'Prix Unitaire', 'Total Ligne'],
      footer: 'Ce rapport est protégé par mot de passe.',
      creditYes: 'Oui',
      creditNo: 'Non'
    }
  }
};

export const exportSalesData = async (
  sales: SaleForExport[], 
  currency: string,
  format: 'xlsx' | 'json' | 'pdf',
  language: string = 'en',
  dateRange?: DateRange
): Promise<boolean> => {
  try {
    
    const t = translations[language as keyof typeof translations] || translations.en;
    
    
    const filteredSales = filterSalesByDateRange(sales, dateRange);
    
    if (filteredSales.length === 0) {
      toast.error(t.exports.errors.noData);
      return false;
    }
    
    
    const password = await promptForPassword(t.dialogs.passwordPrompt);
    
    if (!password) {
      toast.error(t.dialogs.passwordRequired);
      return false;
    }
    
    
    const isValid = await verifyMasterPassword(password);
    
    if (!isValid) {
      toast.error(t.dialogs.invalidPassword);
      return false;
    }
    
    
    switch (format) {
      case 'xlsx':
        return await exportToExcel(filteredSales, currency, language, dateRange);
      case 'json':
        return await exportToJSON(filteredSales, language, dateRange);
      case 'pdf':
        return await exportToPDF(filteredSales, currency, language, dateRange);
      default:
        throw new Error(t.exports.errors.invalidFormat);
    }
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

const filterSalesByDateRange = (sales: SaleForExport[], dateRange?: DateRange): SaleForExport[] => {
  if (!dateRange?.from || !dateRange?.to) {
    return sales; 
  }
  
  const fromTime = new Date(dateRange.from).getTime();
  const toTime = new Date(dateRange.to);
  toTime.setHours(23, 59, 59, 999); 
  const toTimeMs = toTime.getTime();
  
  return sales.filter(sale => sale.date >= fromTime && sale.date <= toTimeMs);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-US').format(amount);
};

const promptForPassword = async (promptMessage: string): Promise<string | null> => {
  return window.prompt(promptMessage);
};

const exportToExcel = async (
  sales: SaleForExport[], 
  currency: string,
  language: string = 'en',
  dateRange?: DateRange
): Promise<boolean> => {
  try {
    const t = translations[language as keyof typeof translations] || translations.en;
    
    
    const wb = XLSX.utils.book_new();
    
    
    const salesData = sales.map(sale => ({
      'Sale ID': sale.id,
      'Date': new Date(sale.date).toLocaleString(),
      'Customer': sale.customerName || 'Guest',
      'Cashier': sale.cashierName,
      'Credit Used': sale.paymentMethod === 'credit' ? 'Yes' : 'No',
      'Subtotal': formatNumber(sale.subtotal),
      'Tax': formatNumber(sale.taxAmount),
      'Discount': formatNumber(sale.discount),
      'Total': formatNumber(sale.total),
      'Payment Method': sale.paymentMethod,
      'Status': sale.status,
      'Items Count': sale.items.length
    }));
    
    const salesWS = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, salesWS, 'Sales Summary');
    
    
    const productData = sales.flatMap(sale => 
      sale.items.map(item => ({
        'Sale ID': sale.id,
        'Sale Date': new Date(sale.date).toLocaleString(),
        'Customer': sale.customerName || 'Guest',
        'Product Name': item.productName,
        'Quantity': item.quantity,
        'Unit Price': formatNumber(item.price),
        'Line Total': formatNumber(item.price * item.quantity),
        'Payment Method': sale.paymentMethod,
        'Cashier': sale.cashierName
      }))
    );
    
    const productsWS = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, productsWS, 'Product Details');
    
    
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const excelData = new Uint8Array(excelBuffer);
    
    
    const storePrefix = generateStorePrefix();
    const periodSuffix = getPeriodSuffix(dateRange);
    const filename = `${storePrefix}_sales_export_${periodSuffix}_${getTimestamp()}.xlsx`;
    
    
    const blob = new Blob([excelData], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    downloadBlob(blob, filename);
    
    toast.success(t.exports.success.excel);
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
};

const exportToJSON = async (
  sales: SaleForExport[],
  language: string = 'en',
  dateRange?: DateRange
): Promise<boolean> => {
  try {
    const t = translations[language as keyof typeof translations] || translations.en;
    
    
    const jsonData = {
      exportId: generateId(),
      timestamp: Date.now(),
      period: dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      } : null,
      summary: {
        totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
        totalTransactions: sales.length,
        totalItems: sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
      },
      sales: sales.map(sale => ({
        ...sale,
        formattedTotal: formatNumber(sale.total),
        formattedSubtotal: formatNumber(sale.subtotal),
        creditUsed: sale.paymentMethod === 'credit',
        items: sale.items.map(item => ({
          ...item,
          formattedPrice: formatNumber(item.price),
          formattedLineTotal: formatNumber(item.price * item.quantity)
        }))
      }))
    };
    
    
    const storePrefix = generateStorePrefix();
    const periodSuffix = getPeriodSuffix(dateRange);
    const filename = `${storePrefix}_sales_export_${periodSuffix}_${getTimestamp()}.json`;
    
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
    
    toast.success(t.exports.success.json);
    return true;
  } catch (error) {
    console.error('JSON export error:', error);
    return false;
  }
};

const exportToPDF = async (
  sales: SaleForExport[],
  currency: string,
  language: string = 'en',
  dateRange?: DateRange
): Promise<boolean> => {
  try {
    const t = translations[language as keyof typeof translations] || translations.en;
    
    
    const doc = new jsPDF();
    
    
    doc.setFontSize(18);
    doc.text(t.pdf.title, 105, 15, { align: 'center' });
    
    
    doc.setFontSize(10);
    const periodText = dateRange?.from && dateRange?.to 
      ? `${t.pdf.period} ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
      : `${t.pdf.period} ${t.pdf.allTime}`;
    doc.text(periodText, 105, 22, { align: 'center' });
    
    
    doc.text(`${t.pdf.generated} ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
    
    
    doc.setFontSize(12);
    doc.text(t.pdf.summary, 14, 38);
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 
      0
    );
    
    doc.setFontSize(10);
    doc.text(`${t.pdf.totalSales} ${formatCurrency(totalSales)}`, 14, 46);
    doc.text(`${t.pdf.transactions} ${formatNumber(sales.length)}`, 14, 52);
    doc.text(`${t.pdf.itemsSold} ${formatNumber(totalItems)}`, 14, 58);
    
    
    doc.setFontSize(12);
    doc.text(t.pdf.transactionsTitle, 14, 68);
    
    let y = 78;
    
    
    sales.forEach((sale, index) => {
      
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const saleHeader = `${sale.id.substring(0, 10)} - ${new Date(sale.date).toLocaleDateString()} - ${sale.customerName || 'Guest'}`;
      doc.text(saleHeader, 14, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const saleInfo = `Cashier: ${sale.cashierName} | Credit: ${sale.paymentMethod === 'credit' ? t.pdf.creditYes : t.pdf.creditNo} | Total: ${formatCurrency(sale.total)}`;
      doc.text(saleInfo, 14, y);
      y += 8;
      
      
      doc.setFontSize(8);
      doc.text('Products:', 20, y);
      y += 4;
      
      sale.items.forEach(item => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        
        const productLine = `• ${item.productName} | Qty: ${item.quantity} | ${formatCurrency(item.price)} each | Line: ${formatCurrency(item.price * item.quantity)}`;
        doc.text(productLine, 25, y);
        y += 4;
      });
      
      y += 5; 
    });
    
    
    doc.setFontSize(8);
    doc.text(t.pdf.footer, 105, 285, { align: 'center' });
    
    
    const pdfData = doc.output('arraybuffer');
    
    
    const storePrefix = generateStorePrefix();
    const periodSuffix = getPeriodSuffix(dateRange);
    const filename = `${storePrefix}_sales_report_${periodSuffix}_${getTimestamp()}.pdf`;
    
    
    console.log('Note: PDF password protection requires a different library like HummusJS or pdf2pic');
    
    
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    downloadBlob(blob, filename);
    
    toast.success(t.exports.success.pdf);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    return false;
  }
};

const generateStorePrefix = (): string => {
  try {
    
    
    return 'STO';
  } catch (error) {
    return 'POS';
  }
};

const getPeriodSuffix = (dateRange?: DateRange): string => {
  if (!dateRange?.from || !dateRange?.to) {
    return 'all_time';
  }
  
  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  
  if (fromStr === toStr) {
    return fromStr;
  }
  
  return `${fromStr}_to_${toStr}`;
};

const getTimestamp = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

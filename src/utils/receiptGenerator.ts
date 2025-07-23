import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { getCurrentUser } from '@/lib/auth';
import { ConfigService } from '@/services/configService';
import { getLogoUrl, isDefaultLogo } from '@/lib/logoUtils';

interface ReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface PartialPayment {
  amount: number;
  method: string;
  date: string;
  processedBy: string;
}

export interface ReceiptData {
  id: string;
  receiptNumber?: string;
  date: string;
  cashierName: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountGiven?: number;
  changeDue?: number;
  totalPaid?: number;
  remainingBalance?: number;
  isPendingSale?: boolean;
  saleIdentifier?: string;
  partialPayments?: PartialPayment[];
}

export interface StoreInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  logo?: string;
  slogan?: string;
}

export interface ReceiptOptions {
  showLogo?: boolean;
  showWatermark?: boolean;
  format?: 'A5' | 'thermal';
}

export interface SaleDetails {
  id: string;
  date: string;
  cashierName: string;
  customerName?: string;
  items: Array<{
    product: {
      id: string;
      name: string;
      price: number;
      category: string;
      stock: number;
      unit: string;
    };
    quantity: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountGiven?: number;
  changeDue?: number;
  totalPaid?: number;
  remainingBalance?: number;
  isPendingSale?: boolean;
  saleIdentifier?: string;
  partialPayments?: Array<{
    amount: number;
    method: string;
    date: string;
    processedBy: string;
  }>;
}

export interface StoreDetails {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  logo?: string;
  slogan?: string;
}

export const generateUsernameReceiptId = async (): Promise<string> => {
  try {
    return await ConfigService.getNextReceiptId();
  } catch (error) {
    console.error('Error generating username receipt ID:', error);
    
    return `POS${Date.now().toString().slice(-5)}`;
  }
};

export const generateSequentialReceiptId = (companyName: string): string => {
  
  const initials = companyName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3) || 'POS';

  
  const lastNumberKey = `receipt_last_number_${initials}`;
  const lastNumber = parseInt(localStorage.getItem(lastNumberKey) || '0', 10);
  
  
  const nextNumber = lastNumber + 1;
  
  
  localStorage.setItem(lastNumberKey, nextNumber.toString());
  
  
  const paddedNumber = nextNumber.toString().padStart(5, '0');
  
  return `${initials}${paddedNumber}`;
};

const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

/**
 * Add logo watermark to PDF
 */
const addLogoWatermark = (doc: jsPDF, logoUrl: string, pageWidth: number, pageHeight: number) => {
  try {
    const img = new Image();
    img.src = logoUrl;
    const logoSize = 30;
    const logoX = (pageWidth - logoSize) / 2;
    const logoY = (pageHeight - logoSize) / 2;
    doc.addImage(img, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error('Error adding logo watermark:', error);
  }
};

const addHeaderLogo = (doc: jsPDF, logoUrl: string, pageWidth: number, startY: number): number => {
  try {
    const img = new Image();
    img.src = logoUrl;
    const logoSize = 20;
    const logoX = (pageWidth - logoSize) / 2;
    doc.addImage(img, 'PNG', logoX, startY, logoSize, logoSize);
    return startY + logoSize + 5;
  } catch (error) {
    console.error('Error adding header logo:', error);
    return startY;
  }
};

const formatDateTime = (timestamp: number | string): { date: string; time: string } => {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString('en-GB'); 
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }); 
  return { date: dateStr, time: timeStr };
};

// Helper for formatting with currency
const formatCurrency = (amount: number, currency: string = 'XAF') => `${amount.toLocaleString()} ${currency}`;

export const generateReceiptPDF = (
  saleDetails: SaleDetails,
  storeDetails: StoreDetails,
  language: string = 'en',
  options: ReceiptOptions = { showLogo: true, showWatermark: true, format: 'A5' }
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.format === 'A5' ? 'a5' : [80, 200]
  });

  const pageWidth = options.format === 'A5' ? 148 : 80;
  const pageHeight = options.format === 'A5' ? 210 : 200;
  
  let y = 15;
  const lineHeight = options.format === 'A5' ? 5 : 4;
  const margin = options.format === 'A5' ? 15 : 5;

  
  if (options.showWatermark && storeDetails.logo) {
    addLogoWatermark(doc, getLogoUrl(storeDetails.logo), pageWidth, pageHeight);
  }

  
  if (options.showLogo && storeDetails.logo) {
    y = addHeaderLogo(doc, getLogoUrl(storeDetails.logo), pageWidth, y);
  }

  
  doc.setFont('courier');

  
  if (storeDetails.name) {
    doc.setFontSize(options.format === 'A5' ? 16 : 12);
    doc.setFont('courier', 'bold');
    doc.text(storeDetails.name, pageWidth / 2, y, { align: 'center' });
    y += lineHeight + 2;
  }

  if (storeDetails.address) {
    doc.setFontSize(options.format === 'A5' ? 10 : 8);
    doc.setFont('courier', 'normal');
    doc.text(storeDetails.address, pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
  }

  if (storeDetails.phone || storeDetails.email) {
    const contactInfo = [storeDetails.phone, storeDetails.email].filter(Boolean).join(' | ');
    doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
  }

  
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  
  doc.setFontSize(options.format === 'A5' ? 11 : 9);
  doc.setFont('courier', 'bold');
  
  
  const hasPartialPayments = saleDetails.partialPayments && saleDetails.partialPayments.length > 0;
  const totalPaid = hasPartialPayments 
    ? saleDetails.partialPayments!.reduce((sum, p) => sum + p.amount, 0)
    : (saleDetails.totalPaid || 0);
  const isFullyPaid = totalPaid >= saleDetails.total;
  const isPendingSale = saleDetails.isPendingSale || !isFullyPaid;

  
  if (isPendingSale) {
    doc.text('*** INTERIM BILL - NOT FINAL ***', pageWidth / 2, y, { align: 'center' });
  } else {
    doc.text('*** FINAL RECEIPT ***', pageWidth / 2, y, { align: 'center' });
  }
  y += lineHeight;

  
  doc.text(`RECEIPT ID: ${saleDetails.id}`, margin, y);
  y += lineHeight - 1;

  
  const { date, time } = formatDateTime(saleDetails.date);
  doc.setFont('courier', 'normal');
  doc.text(`Date: ${date}    Time: ${time}`, margin, y);
  y += lineHeight - 1;

  doc.text(`Cashier: ${saleDetails.cashierName}`, margin, y);
  y += lineHeight - 1;

  const customerName = saleDetails.customerName || 'Walk-in Customer';
  doc.text(`Customer: ${customerName}`, margin, y);
  y += lineHeight - 1;

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFont('courier', 'bold');
  doc.setFontSize(options.format === 'A5' ? 9 : 7); 
  
  
  const itemColWidth = options.format === 'A5' ? 60 : 35;
  const qtyColWidth = options.format === 'A5' ? 20 : 12;
  const priceColWidth = options.format === 'A5' ? 25 : 15;
  const totalColWidth = options.format === 'A5' ? 25 : 15;

  doc.text('ITEM', margin, y);
  doc.text('QTY', margin + itemColWidth, y);
  doc.text('UNIT PRICE', margin + itemColWidth + qtyColWidth, y);
  doc.text('TOTAL', margin + itemColWidth + qtyColWidth + priceColWidth, y);
  y += lineHeight - 1;

  doc.setFont('courier', 'normal');
  doc.setFontSize(options.format === 'A5' ? 8 : 6);

  
  saleDetails.items.forEach(item => {
    
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 15;
    }

    const itemName = item.product.name.length > (options.format === 'A5' ? 25 : 15) 
      ? item.product.name.substring(0, options.format === 'A5' ? 25 : 15) + '...'
      : item.product.name;

    doc.text(itemName, margin, y);
    doc.text(item.quantity.toString(), margin + itemColWidth, y);
    doc.text(formatCurrency(item.product.price), margin + itemColWidth + qtyColWidth, y);
    doc.text(formatCurrency(item.product.price * item.quantity), margin + itemColWidth + qtyColWidth + priceColWidth, y);
    y += lineHeight - 1;
  });

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFontSize(options.format === 'A5' ? 10 : 8); 
  doc.text('Subtotal:', margin, y);
  doc.text(formatCurrency(saleDetails.subtotal), pageWidth - margin, y, { align: 'right' });
  y += lineHeight - 1; 

  if (saleDetails.taxAmount > 0) {
    doc.text(`Tax (${saleDetails.taxRate || 0}%):`, margin, y);
    doc.text(formatCurrency(saleDetails.taxAmount), pageWidth - margin, y, { align: 'right' });
    y += lineHeight - 1; 
  } else {
    doc.text('Tax (0%):', margin, y);
    doc.text('0 XAF', pageWidth - margin, y, { align: 'right' });
    y += lineHeight - 1; 
  }

  if (saleDetails.discount > 0) {
    doc.text('Discount:', margin, y);
    doc.text(formatCurrency(saleDetails.discount), pageWidth - margin, y, { align: 'right' });
    y += lineHeight - 1; 
  } else {
    doc.text('Discount:', margin, y);
    doc.text('0 XAF', pageWidth - margin, y, { align: 'right' });
    y += lineHeight - 1; 
  }

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFont('courier', 'bold');
  doc.setFontSize(options.format === 'A5' ? 12 : 9); 
  doc.text('TOTAL DUE:', margin, y);
  doc.text(`**${formatCurrency(saleDetails.total)}**`, pageWidth - margin, y, { align: 'right' });
  y += lineHeight - 1; 

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFont('courier', 'bold');
  doc.setFontSize(options.format === 'A5' ? 11 : 9);
  doc.text('PAYMENT HISTORY', margin, y);
  y += lineHeight - 1; 
  
  doc.setFont('courier', 'normal');
  doc.setFontSize(options.format === 'A5' ? 9 : 7); 

  const remainingBalance = saleDetails.total - totalPaid;

  if (hasPartialPayments) {
    
    saleDetails.partialPayments!.forEach((payment, index) => {
      const isLastPayment = index === saleDetails.partialPayments!.length - 1;
      const paymentType = isLastPayment && isFullyPaid ? 'FINAL' : 'PARTIAL';
      
      
      const paymentDate = new Date(payment.date);
      const dateStr = paymentDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
      const timeStr = paymentDate.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const paymentText = `${dateStr} ${timeStr} - ${formatCurrency(payment.amount)} - ${payment.method.toUpperCase()} - ${paymentType}`;
      doc.text(paymentText, margin, y);
      y += lineHeight - 1; 
    });
  } else {
    
    const paymentDate = new Date(saleDetails.date);
    const dateStr = paymentDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
    const timeStr = paymentDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const paymentText = `${dateStr} ${timeStr} - ${formatCurrency(saleDetails.total)} - ${saleDetails.paymentMethod.toUpperCase()} - FINAL`;
    doc.text(paymentText, margin, y);
    y += lineHeight - 1; 
  }

  y += 1; 
  doc.setFont('courier', 'bold');
  doc.setFontSize(options.format === 'A5' ? 10 : 8);
  doc.text(`Total Paid: ${formatCurrency(totalPaid)}`, margin, y);
  y += lineHeight - 1;

  if (remainingBalance > 0) {
    doc.text(`Remaining Balance: ${formatCurrency(remainingBalance)}`, margin, y);
    y += lineHeight - 1;
  } else {
    doc.text('Remaining Balance: 0 XAF', margin, y);
    y += lineHeight - 1;
  }

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  if (saleDetails.amountGiven !== undefined) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(options.format === 'A5' ? 10 : 8);
    doc.text(`Amount Given by Client: ${formatCurrency(saleDetails.amountGiven)}`, margin, y);
    y += lineHeight - 1;
  }

  if (saleDetails.changeDue !== undefined && saleDetails.changeDue > 0) {
    doc.text(`Change Due: ${formatCurrency(saleDetails.changeDue)}`, margin, y);
    y += lineHeight - 1;
  }

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  if (remainingBalance > 0) {
    doc.setFont('courier', 'bold');
    doc.setFontSize(options.format === 'A5' ? 11 : 9);
    doc.text(`**REMAINING BALANCE DUE:** **${formatCurrency(remainingBalance)}**`, margin, y);
    y += lineHeight - 1;
  }

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFont('courier', 'bold');
    doc.setFontSize(options.format === 'A5' ? 11 : 9);
  
  if (isFullyPaid) {
    doc.text('✔ BILL FULLY PAID', pageWidth / 2, y, { align: 'center' });
  } else {
    doc.text(`⚠ REMAINING BALANCE: ${formatCurrency(remainingBalance)} CFA`, pageWidth / 2, y, { align: 'center' });
  }
  y += lineHeight - 1;

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  doc.setFont('courier', 'bold');
  doc.setFontSize(options.format === 'A5' ? 11 : 9);
  doc.text('THANK YOU FOR YOUR PATRONAGE!', pageWidth / 2, y, { align: 'center' });
  y += lineHeight - 1;
  
  if (isFullyPaid) {
    doc.text('PLEASE COME AGAIN SOON.', pageWidth / 2, y, { align: 'center' });
  } else {
    doc.text('PLEASE RETURN TO COMPLETE PAYMENT.', pageWidth / 2, y, { align: 'center' });
  }
  y += lineHeight - 1;

  
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  
  const qrData = JSON.stringify({
    id: saleDetails.id,
    total: saleDetails.total,
    date: saleDetails.date,
    store: storeDetails.name,
    status: isFullyPaid ? 'paid' : 'partial'
  });
  
  generateQRCode(qrData).then(qrCodeDataURL => {
    if (qrCodeDataURL) {
      const qrSize = options.format === 'A5' ? 20 : 15;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrCodeDataURL, 'PNG', qrX, y, qrSize, qrSize);
    }
  });

  return doc;
};

export const generateReceipt = async (
  receiptData: ReceiptData,
  storeInfo: StoreInfo = {},
  language: string = 'en',
  options: ReceiptOptions = { showLogo: true, showWatermark: true, format: 'A5' }
): Promise<boolean> => {
  try {
    
    const sequentialReceiptId = generateSequentialReceiptId(storeInfo.name || 'POS Store');
    receiptData.receiptNumber = sequentialReceiptId;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.format === 'A5' ? 'a5' : [80, 200]
    });

    const pageWidth = options.format === 'A5' ? 148 : 80;
    const pageHeight = options.format === 'A5' ? 210 : 200;
    
    let y = 15;
    const lineHeight = options.format === 'A5' ? 5 : 4;
    const margin = options.format === 'A5' ? 15 : 5;

    
    if (options.showWatermark && storeInfo.logo) {
      addLogoWatermark(doc, getLogoUrl(storeInfo.logo), pageWidth, pageHeight);
    }

    
    if (options.showLogo && storeInfo.logo) {
      y = addHeaderLogo(doc, getLogoUrl(storeInfo.logo), pageWidth, y);
    }

    
    doc.setFont('courier');

    
    if (storeInfo.name) {
      doc.setFontSize(options.format === 'A5' ? 16 : 12);
      doc.setFont('courier', 'bold');
      doc.text(storeInfo.name, pageWidth / 2, y, { align: 'center' });
      y += lineHeight + 2;
    }

    if (storeInfo.address) {
      doc.setFontSize(options.format === 'A5' ? 10 : 8);
      doc.setFont('courier', 'normal');
      doc.text(storeInfo.address, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }

    if (storeInfo.phone) {
      doc.text(storeInfo.phone, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }

    
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    
    doc.setFontSize(options.format === 'A5' ? 12 : 10);
    doc.setFont('courier', 'bold');
    
    
    if (receiptData.isPendingSale) {
      doc.setFontSize(options.format === 'A5' ? 14 : 12);
      doc.text('PENDING SALE RECEIPT', pageWidth / 2, y, { align: 'center' });
      y += lineHeight + 2;
      doc.setFontSize(options.format === 'A5' ? 12 : 10);
    }
    
    doc.text(`Receipt: ${receiptData.receiptNumber}`, margin, y);
    y += lineHeight;

    doc.setFont('courier', 'normal');
    doc.text(`Date: ${receiptData.date}`, margin, y);
    y += lineHeight;

    doc.text(`Cashier: ${receiptData.cashierName}`, margin, y);
    y += lineHeight;

    if (receiptData.customerName) {
      doc.text(`Customer: ${receiptData.customerName}`, margin, y);
      y += lineHeight;
    }

    
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    
    doc.setFontSize(options.format === 'A5' ? 10 : 8);
    receiptData.items.forEach(item => {
      
      doc.setFont('courier', 'bold');
      doc.text(item.productName, margin, y);
      y += lineHeight;

      
      doc.setFont('courier', 'normal');
      const qtyPriceText = `${item.quantity} x ${formatCurrency(item.price)}`;
      const totalText = formatCurrency(item.lineTotal);
      
      doc.text(qtyPriceText, margin, y);
      doc.text(totalText, pageWidth - margin, y, { align: 'right' });
      y += lineHeight + 1;
    });

    
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    
    doc.setFontSize(options.format === 'A5' ? 11 : 9);
    doc.text('Subtotal:', margin, y);
    doc.text(formatCurrency(receiptData.subtotal), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;

    if (receiptData.discount > 0) {
      doc.text('Discount:', margin, y);
      doc.text(`-${formatCurrency(receiptData.discount)}`, pageWidth - margin, y, { align: 'right' });
      y += lineHeight;
    }

    if (receiptData.taxAmount > 0) {
      doc.text('Tax:', margin, y);
      doc.text(formatCurrency(receiptData.taxAmount), pageWidth - margin, y, { align: 'right' });
      y += lineHeight;
    }

    
    doc.setFont('courier', 'bold');
    doc.setFontSize(options.format === 'A5' ? 14 : 10);
    doc.text('TOTAL:', margin, y);
    doc.text(formatCurrency(receiptData.total), pageWidth - margin, y, { align: 'right' });
    y += lineHeight + 3;

    
    doc.setFont('courier', 'normal');
    doc.setFontSize(options.format === 'A5' ? 10 : 8);
    doc.text(`Payment: ${receiptData.paymentMethod}`, margin, y);
    y += lineHeight + 5;

    
    const qrData = JSON.stringify({
      id: receiptData.receiptNumber,
      total: receiptData.total,
      date: receiptData.date,
      store: storeInfo.name
    });
    
    const qrCodeDataURL = await generateQRCode(qrData);
    if (qrCodeDataURL) {
      const qrSize = options.format === 'A5' ? 20 : 15;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrCodeDataURL, 'PNG', qrX, y, qrSize, qrSize);
      y += qrSize + 3;
    }

    
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    
    const filename = `receipt_${receiptData.receiptNumber}_${Date.now()}.pdf`;

    
    const pdfData = doc.output('arraybuffer');
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Receipt downloaded successfully');
    return true;
  } catch (error) {
    console.error('Receipt generation error:', error);
    toast.error('Failed to generate receipt');
    return false;
  }
};

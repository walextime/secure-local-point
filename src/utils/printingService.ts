
import { jsPDF } from 'jspdf';
import { dbOperations, STORES } from '@/lib/db';
import { isPrintingAvailable, getCurrentLanguage } from './printing/helpers';
import { translations } from './printing/translations';
import { generateSalePDF, openPrintWindow, openViewWindow } from './printing/core';


export { isPrintingAvailable };

export const printSaleReceipt = async (saleId: string): Promise<boolean> => {
  try {
    const language = getCurrentLanguage();
    const t = translations[language as keyof typeof translations] || translations.en;
    
    const doc = await generateSalePDF(saleId);
    
    if (!doc) {
      throw new Error('Could not generate receipt');
    }
    
    
    doc.autoPrint();
    const pdfData = doc.output('datauristring');
    
    
    const sale = await dbOperations.get<any>(STORES.SALES, saleId);
    const title = `${t.printTitle}${sale?.receiptId || saleId}`;
    
    
    const success = openPrintWindow(pdfData, title);
    
    if (!success) {
      throw new Error(t.errors.printWindowBlocked);
    }
    
    return true;
  } catch (error) {
    console.error('Error printing receipt:', error);
    return false;
  }
};

export const saveReceiptPDF = async (saleId: string): Promise<jsPDF | null> => {
  return await generateSalePDF(saleId);
};

export const viewSaleReceipt = async (saleId: string): Promise<boolean> => {
  try {
    const language = getCurrentLanguage();
    const t = translations[language as keyof typeof translations] || translations.en;
    
    const doc = await generateSalePDF(saleId);
    
    if (!doc) {
      throw new Error('Could not generate receipt');
    }
    
    const pdfData = doc.output('datauristring');
    const title = `${t.viewTitle}${saleId}`;
    
    
    const success = openViewWindow(pdfData, title);
    
    if (!success) {
      throw new Error(t.errors.printWindowBlocked);
    }
    
    return true;
  } catch (error) {
    console.error('Error viewing receipt:', error);
    return false;
  }
};

export const downloadSaleReceipt = async (saleId: string): Promise<boolean> => {
  try {
    const doc = await generateSalePDF(saleId);
    
    if (!doc) {
      throw new Error('Could not generate receipt');
    }
    
    
    const sale = await dbOperations.get<any>(STORES.SALES, saleId);
    
    
    const date = new Date(sale.date);
    const dateStr = date.toISOString().split('T')[0]; 
    
    
    const filename = `receipt_${saleId}_${dateStr}.pdf`;
    
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Error downloading receipt:', error);
    return false;
  }
};

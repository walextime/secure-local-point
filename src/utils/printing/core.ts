import { jsPDF } from 'jspdf';
import { dbOperations, STORES } from '@/lib/db';
import { generateReceiptPDF, SaleDetails, StoreDetails, generateUsernameReceiptId } from '@/utils/receiptGenerator';
import { StoreInfo } from '@/types/settings';
import { Sale } from '@/types/sales';
import { PartialPayment } from '@/types/sales';
import { translations } from './translations';
import { getCurrentLanguage, getReceiptOptions } from './helpers';
import { getLogoUrl, isDefaultLogo } from '@/lib/logoUtils';

const createSaleAndStoreDetails = async (sale: Sale, storeInfo: StoreInfo) => {
  
  let partialPayments: Array<{
    amount: number;
    method: string;
    date: string;
    processedBy: string;
  }> = [];
  let isPendingSale = false;
  
  if (sale.originalPendingSaleId) {
    try {
      
      const partialPaymentsData = await dbOperations.getAll<PartialPayment>(STORES.PARTIAL_PAYMENTS);
      partialPayments = partialPaymentsData
        .filter(payment => payment.pendingSaleId === sale.originalPendingSaleId)
        .map(payment => ({
          amount: payment.amount,
          method: payment.paymentMethod,
          date: new Date(payment.processedAt).toLocaleString(),
          processedBy: payment.processedBy
        }));
      isPendingSale = true;
    } catch (error) {
      console.error('Error fetching partial payments:', error);
    }
  }

  
  const saleDate = new Date(sale.date).toLocaleString();

  
  const saleDetails: SaleDetails = {
    id: sale.receiptId || sale.id,
    date: saleDate,
    cashierName: sale.cashierName,
    items: sale.items.map(item => ({
      product: {
        id: item.productId,
        name: item.productName,
        price: item.price,
        category: '',
        stock: 0,
        unit: ''
      },
      quantity: item.quantity
    })),
    subtotal: sale.subtotal,
    taxRate: sale.taxRate || 0,
    taxAmount: sale.taxAmount,
    discount: sale.discount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    customerName: sale.customerName,
    amountGiven: sale.amountGiven,
    changeDue: sale.changeDue,
    totalPaid: sale.totalPaid,
    partialPayments: partialPayments.length > 0 ? partialPayments : undefined,
    remainingBalance: sale.remainingBalance,
    isPendingSale,
    saleIdentifier: sale.originalPendingSaleId
  };

  // Create store details
  const storeDetails: StoreDetails = {
    name: storeInfo.storeName || storeInfo.name,
    address: storeInfo.address,
    phone: storeInfo.phone,
    email: storeInfo.email,
    currency: 'XAF',
    logo: getLogoUrl(storeInfo.logo),
    slogan: storeInfo.slogan
  };

  return { saleDetails, storeDetails };
};

export const openPrintWindow = (pdfData: string, title: string): boolean => {
  const printWindow = window.open();
  
  if (!printWindow) {
    return false;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body>
        <embed width="100%" height="100%" src="${pdfData}" type="application/pdf" />
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 1000);
          });
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  return true;
};

export const openViewWindow = (pdfData: string, title: string): boolean => {
  const viewWindow = window.open();
  
  if (!viewWindow) {
    return false;
  }
  
  viewWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; }
          embed { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <embed src="${pdfData}" type="application/pdf" />
      </body>
    </html>
  `);
  
  viewWindow.document.close();
  return true;
};


const getNextReceiptId = async (username: string): Promise<string> => {
  const key = `receipt_counter_${username}`;
  let counter = Number(localStorage.getItem(key) || '0');
  counter++;
  localStorage.setItem(key, counter.toString());
  return `${username}${counter.toString().padStart(5, '0')}`;
};

export const generateSalePDF = async (saleId: string): Promise<jsPDF | null> => {
  try {
    const language = getCurrentLanguage();
    const t = translations[language as keyof typeof translations] || translations.en;
    
    
    const sale = await dbOperations.get<Sale>(STORES.SALES, saleId);
    if (!sale) {
      throw new Error(t.errors.saleNotFound);
    }
    
    const storeInfo = await dbOperations.get<StoreInfo>(STORES.SETTINGS, 'store-info');
    if (!storeInfo) {
      throw new Error(t.errors.storeInfoNotFound);
    }
    
    const options = await getReceiptOptions();
    
    const currentUser = await dbOperations.get<{ username: string }>(STORES.AUTH, 'currentUser');
    let receiptId = sale.receiptId;
    if (!receiptId && currentUser?.username) {
      receiptId = await generateUsernameReceiptId();
    }
    
    const { saleDetails, storeDetails } = await createSaleAndStoreDetails(sale, storeInfo);
    saleDetails.id = receiptId || saleDetails.id;
    
    return generateReceiptPDF(saleDetails, storeDetails, language, options);
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    return null;
  }
};

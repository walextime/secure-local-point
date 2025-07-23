
import { jsPDF } from 'jspdf';
import { SaleRecord } from '@/types/backup';

export class PDFGenerators {
    static async generateCustomersPDF(customers: any[]): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Customer Database Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    doc.text(`Total Customers: ${customers.length}`, 105, 28, { align: 'center' });
    
    let y = 40;
    doc.setFontSize(9);
    
    customers.forEach((customer, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. ${customer.name}`, 14, y);
      doc.text(`Email: ${customer.email || 'N/A'}`, 20, y + 6);
      doc.text(`Phone: ${customer.phone || 'N/A'}`, 20, y + 12);
      y += 20;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }

    static async generateInventoryPDF(inventory: any[]): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Inventory Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    doc.text(`Total Products: ${inventory.length}`, 105, 28, { align: 'center' });
    
    let y = 40;
    doc.setFontSize(9);
    
    inventory.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. ${item.name}`, 14, y);
      doc.text(`Category: ${item.category || 'N/A'}`, 20, y + 6);
      doc.text(`Price: $${item.price} | Stock: ${item.stock || 0}`, 20, y + 12);
      y += 20;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }

    static async generateSalesPDF(sales: any[]): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sales Report', 105, 15, { align: 'center' });
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    doc.text(`Total Sales: $${totalSales.toFixed(2)}`, 105, 28, { align: 'center' });
    doc.text(`Number of Transactions: ${sales.length}`, 105, 34, { align: 'center' });
    
    let y = 45;
    doc.setFontSize(9);
    
    sales.slice(0, 50).forEach((sale, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. ${new Date(sale.date).toLocaleDateString()}`, 14, y);
      doc.text(`Total: $${sale.total} | Customer: ${sale.customerName || 'Guest'}`, 20, y + 6);
      y += 14;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }

    static async generateDailySummaryPDF(summary: any, sales: SaleRecord[]): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Daily Sales Summary', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date: ${summary.date}`, 105, 25, { align: 'center' });
    
    let y = 40;
    doc.setFontSize(10);
    
    
    doc.text(`Total Sales: $${summary.totalSales.toFixed(2)}`, 14, y);
    doc.text(`Total Transactions: ${summary.totalTransactions}`, 14, y + 8);
    doc.text(`Total Items Sold: ${summary.totalItems}`, 14, y + 16);
    
    y += 30;
    
    
    doc.text('Payment Methods:', 14, y);
    y += 8;
    Object.entries(summary.paymentBreakdown).forEach(([method, amount]) => {
      doc.text(`  ${method}: $${(amount as number).toFixed(2)}`, 20, y);
      y += 6;
    });
    
    y += 10;
    
    
    doc.text('Transactions by Cashier:', 14, y);
    y += 8;
    Object.entries(summary.cashierBreakdown).forEach(([cashier, count]) => {
      doc.text(`  ${cashier}: ${count} transactions`, 20, y);
      y += 6;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }

  static async generateSettingsPDF(settings: any): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('System Settings Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    
    let y = 40;
    doc.setFontSize(9);
    
    Object.entries(settings).forEach(([key, value]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const displayValue = typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : String(value);
      
      doc.text(`${key}: ${displayValue}`, 14, y);
      y += 8;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }

  static async generateUsersPDF(users: any[]): Promise<any> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Users Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    doc.text(`Total Users: ${users.length}`, 105, 28, { align: 'center' });
    
    let y = 40;
    doc.setFontSize(9);
    
    // Filter out root account from export
    const filteredUsers = users.filter(user => user.username?.toLowerCase() !== 'rootaccount');
    filteredUsers.forEach((user, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}. ${user.username || user.name || 'Unknown'}`, 14, y);
      doc.text(`Role: ${user.role || 'N/A'}`, 20, y + 6);
      doc.text(`Email: ${user.email || 'N/A'}`, 20, y + 12);
      y += 20;
    });
    
    return { pdfContent: Array.from(new Uint8Array(doc.output('arraybuffer'))) };
  }
}

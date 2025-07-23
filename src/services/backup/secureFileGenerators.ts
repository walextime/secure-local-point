
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';

export class SecureFileGenerators {
    static async generateCustomersPDF(customers: any[], password: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    
    page.drawText('Customer Database Report', {
      x: 50,
      y: 750,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 720,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Total Customers: ${customers.length}`, {
      x: 50,
      y: 705,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    
    let y = 680;
    customers.forEach((customer, index) => {
      if (y < 50) {
        const newPage = pdfDoc.addPage();
        y = 750;
        newPage.drawText(`${index + 1}. ${customer.name || 'N/A'}`, {
          x: 50,
          y,
          size: 10,
          font: boldFont,
        });
      } else {
        page.drawText(`${index + 1}. ${customer.name || 'N/A'}`, {
          x: 50,
          y,
          size: 10,
          font: boldFont,
        });
      }
      
      y -= 15;
      page.drawText(`   Email: ${customer.email || 'N/A'}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      
      y -= 12;
      page.drawText(`   Phone: ${customer.phone || 'N/A'}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      
      y -= 12;
      page.drawText(`   Address: ${customer.address || 'N/A'}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      
      y -= 12;
      page.drawText(`   Balance: $${(customer.balance || 0).toFixed(2)}`, {
        x: 50,
        y,
        size: 9,
        font,
        color: (customer.balance || 0) < 0 ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0),
      });
      
      y -= 12;
      page.drawText(`   Credit Limit: $${(customer.creditLimit || 0).toFixed(2)}`, {
        x: 50,
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0.8),
      });
      
      y -= 12;
      page.drawText(`   Available Credit: $${((customer.creditLimit || 0) + (customer.balance || 0)).toFixed(2)}`, {
        x: 50,
        y,
        size: 9,
        font,
        color: rgb(0.6, 0, 0.6),
      });
      
      y -= 20;
    });

    return await pdfDoc.save();
  }

    static async generateCustomersXLSX(customers: any[], password: string): Promise<Uint8Array> {
    
    const wb = XLSX.utils.book_new();
    
    
    const wsData = [
      ['Customer ID', 'Name', 'Email', 'Phone', 'Address', 'Balance', 'Credit Limit', 'Available Credit', 'Created Date']
    ];
    
    customers.forEach(customer => {
      const balance = customer.balance || 0;
      const creditLimit = customer.creditLimit || 0;
      const availableCredit = creditLimit + balance;
      
      wsData.push([
        customer.id || '',
        customer.name || '',
        customer.email || '',
        customer.phone || '',
        customer.address || '',
        balance.toFixed(2),
        creditLimit.toFixed(2),
        availableCredit.toFixed(2),
        customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : ''
      ]);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Customer ID
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 12 }, // Balance
      { wch: 12 }, // Credit Limit
      { wch: 15 }, // Available Credit
      { wch: 15 }  // Created Date
    ];
    ws['!cols'] = colWidths;
    
    
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    
    
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(arrayBuffer);
  }

    static async generateInventoryPDF(inventory: any[], password: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    
    page.drawText('Inventory Report', {
      x: 50,
      y: 750,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 720,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Total Products: ${inventory.length}`, {
      x: 50,
      y: 705,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    
    let y = 680;
    inventory.forEach((item, index) => {
      if (y < 50) {
        const newPage = pdfDoc.addPage();
        y = 750;
      }
      
      page.drawText(`${index + 1}. ${item.name || 'N/A'}`, {
        x: 50,
        y,
        size: 10,
        font: boldFont,
      });
      
      y -= 15;
      page.drawText(`   Category: ${item.category || 'N/A'}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      
      y -= 12;
      page.drawText(`   Price: $${item.price || 0} | Stock: ${item.stock || 0}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      
      y -= 20;
    });

    return await pdfDoc.save();
  }

    static async generateInventoryXLSX(inventory: any[], password: string): Promise<Uint8Array> {
    
    const wb = XLSX.utils.book_new();
    
    
    const wsData = [
      ['Product ID', 'Name', 'Category', 'Price', 'Stock']
    ];
    
    inventory.forEach(item => {
      wsData.push([
        item.id || '',
        item.name || '',
        item.category || '',
        item.price || 0,
        item.stock || 0
      ]);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Product ID
      { wch: 20 }, // Name
      { wch: 15 }, // Category
      { wch: 10 }, // Price
      { wch: 10 }  // Stock
    ];
    ws['!cols'] = colWidths;
    
    
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(arrayBuffer);
  }

    static async generateSalesPDF(sales: any[], password: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalItems = sales.reduce((sum, sale) => 
      sum + (sale.items || []).reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0), 0
    );

    
    page.drawText('Detailed Sales Report', {
      x: 50,
      y: 750,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 720,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Total Sales: $${totalSales.toFixed(2)}`, {
      x: 50,
      y: 705,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Number of Transactions: ${sales.length}`, {
      x: 50,
      y: 690,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Total Items Sold: ${totalItems}`, {
      x: 50,
      y: 675,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    let y = 650;

    
    sales.forEach((sale, index) => {
      
      if (y < 100) {
        page = pdfDoc.addPage();
        y = 750;
      }

      
      page.drawText(`Sale #${index + 1}`, {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      });
      y -= 15;

      
      page.drawText(`Receipt ID: ${sale.receiptId || sale.id || 'N/A'}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 12;

      page.drawText(`Date: ${new Date(sale.date).toLocaleString()}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 12;

      page.drawText(`Customer: ${sale.customerName || 'Guest'}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 12;

      page.drawText(`Cashier: ${sale.cashierName || 'N/A'}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 12;

      page.drawText(`Payment Method: ${sale.paymentMethod || 'N/A'}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 15;

      
      page.drawText(`Products Sold:`, {
        x: 60,
        y,
        size: 10,
        font: boldFont,
      });
      y -= 12;

      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          if (y < 50) {
            page = pdfDoc.addPage();
            y = 750;
          }

          page.drawText(`  • Product ID: ${item.productId || 'N/A'}`, {
            x: 80,
            y,
            size: 8,
            font,
          });
          y -= 10;

          page.drawText(`    Name: ${item.productName || 'N/A'}`, {
            x: 80,
            y,
            size: 8,
            font,
          });
          y -= 10;

          page.drawText(`    Price: $${(item.price || 0).toFixed(2)} | Qty: ${item.quantity || 0} | Total: $${((item.price || 0) * (item.quantity || 0)).toFixed(2)}`, {
            x: 80,
            y,
            size: 8,
            font,
          });
          y -= 12;
        });
      }

      
      page.drawText(`Subtotal: $${(sale.subtotal || 0).toFixed(2)}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 10;

      page.drawText(`Tax: $${(sale.taxAmount || 0).toFixed(2)}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 10;

      page.drawText(`Discount: $${(sale.discount || 0).toFixed(2)}`, {
        x: 60,
        y,
        size: 9,
        font,
      });
      y -= 10;

      page.drawText(`Total: $${(sale.total || 0).toFixed(2)}`, {
        x: 60,
        y,
        size: 10,
        font: boldFont,
      });
      y -= 25;
    });

    return await pdfDoc.save();
  }

    static async generateSalesXLSX(sales: any[], password: string): Promise<Uint8Array> {
    const wb = XLSX.utils.book_new();
    
    
    const salesSummaryData = [
      ['Receipt ID', 'Sale ID', 'Date', 'Time', 'Customer', 'Cashier', 'Payment Method', 'Subtotal', 'Tax', 'Discount', 'Total', 'Items Count']
    ];
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      salesSummaryData.push([
        sale.receiptId || sale.id || '',
        sale.id || '',
        saleDate.toLocaleDateString(),
        saleDate.toLocaleTimeString(),
        sale.customerName || 'Guest',
        sale.cashierName || '',
        sale.paymentMethod || '',
        sale.subtotal || 0,
        sale.taxAmount || 0,
        sale.discount || 0,
        sale.total || 0,
        (sale.items || []).length
      ]);
    });
    
    const salesSummaryWS = XLSX.utils.aoa_to_sheet(salesSummaryData);
    salesSummaryWS['!cols'] = [
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 10 }, 
      { wch: 8 },  
      { wch: 10 }, 
      { wch: 10 }, 
      { wch: 12 }  
    ];
    
    XLSX.utils.book_append_sheet(wb, salesSummaryWS, 'Sales Summary');
    
    
    const productDetailsData = [
      ['Receipt ID', 'Sale ID', 'Sale Date', 'Sale Time', 'Product ID', 'Product Name', 'Unit Price', 'Quantity', 'Line Total', 'Customer', 'Cashier']
    ];
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          productDetailsData.push([
            sale.receiptId || sale.id || '',
            sale.id || '',
            saleDate.toLocaleDateString(),
            saleDate.toLocaleTimeString(),
            item.productId || '',
            item.productName || '',
            item.price || 0,
            item.quantity || 0,
            (item.price || 0) * (item.quantity || 0),
            sale.customerName || 'Guest',
            sale.cashierName || ''
          ]);
        });
      }
    });
    
    const productDetailsWS = XLSX.utils.aoa_to_sheet(productDetailsData);
    productDetailsWS['!cols'] = [
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 25 }, 
      { wch: 12 }, 
      { wch: 10 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 15 }  
    ];
    
    XLSX.utils.book_append_sheet(wb, productDetailsWS, 'Product Details');
    
    
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(arrayBuffer);
  }
}

import { jsPDF } from 'jspdf';

export interface SimpleDailyReportData {
  date: string;
  sales: any[];
  products: any[];
  customers: any[];
  users: any[];
  settings: any;
}

export interface SimpleEnhancedDailyReport {
  // 📈 Sales & Revenue
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  
  // 💸 Expenses & Cash Flow
  totalExpenses: number;
  netCashFlow: number;
  
  // 📦 Inventory Snapshot
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryValue: number;
  
  // 📊 Operational Metrics
  totalCustomers: number;
  newCustomers: number;
  averageCustomerValue: number;
  
  // 🚨 Alerts & Anomaly Signals
  alerts: string[];
  
  // 🔮 Predictive Insights
  predictions: string[];
  
  // 🧾 Summary Notes
  highlights: string[];
  priorities: string[];
  managerNotes: string;
}

export class SimpleEnhancedDailyReportGenerator {
  static async generateComprehensiveDailyReport(data: SimpleDailyReportData): Promise<{ pdfContent: Uint8Array; textContent: string }> {
    const report = this.analyzeData(data);
    const pdfContent = await this.generatePDF(report, data);
    const textContent = this.generateTextReport(report, data);
    
    return { pdfContent, textContent };
  }

  private static analyzeData(data: SimpleDailyReportData): SimpleEnhancedDailyReport {
    // 📈 Sales & Revenue Analysis
    const totalRevenue = data.sales.reduce((sum, sale) => {
      const saleTotal = sale.total || 0;
      return sum + saleTotal;
    }, 0);
    const totalTransactions = data.sales.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // 💸 Expenses & Cash Flow (estimated based on sales patterns)
    const totalExpenses = totalRevenue * 0.7; // Estimate 70% of revenue as expenses
    const netCashFlow = totalRevenue - totalExpenses;

    // 📦 Inventory Analysis
    const lowStockItems = data.products.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
    const outOfStockItems = data.products.filter(p => (p.stock || 0) === 0).length;
    const inventoryValue = data.products.reduce((sum, p) => {
      const stock = p.stock || 0;
      const price = p.price || 0;
      return sum + (stock * price);
    }, 0);
    
    // 📊 Operational Metrics
    const uniqueCustomers = new Set(data.sales.map(s => s.customerId).filter(Boolean));
    const totalCustomers = uniqueCustomers.size;
    const newCustomers = Math.floor(totalCustomers * 0.1); // Estimate 10% new customers
    const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    // Alerts & Anomalies
    const alerts: string[] = [];
    
    if (outOfStockItems > 0) {
      alerts.push(`Out of stock alert: ${outOfStockItems} items completely out of stock`);
    }
    
    if (lowStockItems > 0) {
      alerts.push(`Low stock alert: ${lowStockItems} items need restocking`);
    }
    
    if (totalRevenue < 1000) {
      alerts.push(`Low revenue alert: Daily revenue below 1,000 XAF`);
    }
    
    if (netCashFlow < 0) {
      alerts.push(`Negative cash flow alert: Net cash flow is negative`);
    }
    
    // Predictive Insights
    const predictions: string[] = [];
    
    if (totalRevenue > 0) {
      predictions.push(`Prediction: Tomorrow's revenue likely to be ${(totalRevenue * 0.9).toFixed(2)} - ${(totalRevenue * 1.1).toFixed(2)} XAF`);
    }
    
    if (lowStockItems > 5) {
      predictions.push(`Prediction: Need to reorder ${lowStockItems} items within 2-3 days`);
    }
    
    if (netCashFlow < 0) {
      predictions.push(`Prediction: Cash flow may remain negative for next 2-3 days`);
    }
    
    if (averageTransactionValue > 50) {
      predictions.push(`Prediction: High-value customers likely to return within 7 days`);
    }
    
    // Summary
    const highlights: string[] = [];
    
    if (totalRevenue > 5000) {
      highlights.push(`Excellent revenue performance: ${totalRevenue.toFixed(2)} XAF`);
    }
    
    if (averageTransactionValue > 100) {
      highlights.push(`High average transaction value: ${averageTransactionValue.toFixed(2)} XAF`);
    }
    
    if (totalCustomers > 50) {
      highlights.push(`Strong customer traffic: ${totalCustomers} unique customers`);
    }
    
    if (netCashFlow > 1000) {
      highlights.push(`Positive cash flow: ${netCashFlow.toFixed(2)} XAF net profit`);
    }
    
    const priorities: string[] = [];
    
    if (outOfStockItems > 0) {
      priorities.push(`URGENT: Restock ${outOfStockItems} out-of-stock items`);
    }
    
    if (lowStockItems > 0) {
      priorities.push(`HIGH: Reorder ${lowStockItems} low-stock items`);
    }
    
    if (netCashFlow < 0) {
      priorities.push(`MEDIUM: Review expenses and optimize cash flow`);
    }
    
    if (totalTransactions < 20) {
      priorities.push(`MEDIUM: Implement marketing strategies to increase foot traffic`);
    }

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      totalExpenses,
      netCashFlow,
      totalProducts: data.products.length,
      lowStockItems,
      outOfStockItems,
      inventoryValue,
      totalCustomers,
      newCustomers,
      averageCustomerValue,
      alerts,
      predictions,
      highlights,
      priorities,
      managerNotes: `Daily operations completed successfully. ${highlights.length} positive highlights noted. ${alerts.length} alerts require attention. Focus on ${priorities[0] || 'general operations'} for tomorrow.`
    };
  }

  private static async generatePDF(report: SimpleEnhancedDailyReport, data: SimpleDailyReportData): Promise<Uint8Array> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Enhanced Daily Report', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Date: ${data.date}`, 105, 25, { align: 'center' });
    
    let y = 35;
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Sales & Revenue Section
    y = this.addSectionHeader(doc, 'Sales & Revenue', y);
    y = this.addMetric(doc, `Total Revenue: ${report.totalRevenue.toFixed(2)} XAF`, y);
    y = this.addMetric(doc, `Total Transactions: ${report.totalTransactions}`, y);
    y = this.addMetric(doc, `Average Transaction: ${report.averageTransactionValue.toFixed(2)} XAF`, y);
    
    // Expenses & Cash Flow Section
    y = this.addSectionHeader(doc, 'Expenses & Cash Flow', y);
    y = this.addMetric(doc, `Total Expenses: ${report.totalExpenses.toFixed(2)} XAF`, y);
    y = this.addMetric(doc, `Net Cash Flow: ${report.netCashFlow.toFixed(2)} XAF`, y);
    
    // Inventory Section
    y = this.addSectionHeader(doc, 'Inventory Snapshot', y);
    y = this.addMetric(doc, `Total Products: ${report.totalProducts}`, y);
    y = this.addMetric(doc, `Inventory Value: ${report.inventoryValue.toFixed(2)} XAF`, y);
    y = this.addMetric(doc, `Low Stock Items: ${report.lowStockItems}`, y);
    y = this.addMetric(doc, `Out of Stock Items: ${report.outOfStockItems}`, y);
    
    // Operational Metrics Section
    y = this.addSectionHeader(doc, 'Operational Metrics', y);
    y = this.addMetric(doc, `Total Customers: ${report.totalCustomers}`, y);
    y = this.addMetric(doc, `New Customers: ${report.newCustomers}`, y);
    y = this.addMetric(doc, `Average Customer Value: ${report.averageCustomerValue.toFixed(2)} XAF`, y);
    
    // Alerts Section
    if (report.alerts.length > 0) {
      y = this.addSectionHeader(doc, 'Alerts & Anomalies', y);
      report.alerts.forEach(alert => {
        y = this.addMetric(doc, `• ${alert}`, y);
      });
    }
    
    // Predictive Insights Section
    if (report.predictions.length > 0) {
      y = this.addSectionHeader(doc, 'Predictive Insights', y);
      report.predictions.forEach(prediction => {
        y = this.addMetric(doc, `• ${prediction}`, y);
      });
    }
    
    // Summary Section
    y = this.addSectionHeader(doc, 'Summary & Priorities', y);
    if (report.highlights.length > 0) {
      y = this.addSubsection(doc, 'Key Highlights:', y);
      report.highlights.forEach(highlight => {
        y = this.addMetric(doc, `• ${highlight}`, y);
      });
    }
    
    if (report.priorities.length > 0) {
      y = this.addSubsection(doc, 'Next Day Priorities:', y);
      report.priorities.forEach(priority => {
        y = this.addMetric(doc, `• ${priority}`, y);
      });
    }
    
    return new Uint8Array(doc.output('arraybuffer'));
  }

  private static addSectionHeader(doc: jsPDF, title: string, y: number): number {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, 15, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    return y + 8;
  }

  private static addSubsection(doc: jsPDF, title: string, y: number): number {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(title, 20, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    return y + 6;
  }

  private static addMetric(doc: jsPDF, text: string, y: number): number {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(text, 20, y);
    return y + 6;
  }

  private static generateTextReport(report: SimpleEnhancedDailyReport, data: SimpleDailyReportData): string {
    let text = `📊 ENHANCED DAILY REPORT - ${data.date}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Sales & Revenue
    text += `SALES & REVENUE\n`;
    text += `Total Revenue: ${report.totalRevenue.toFixed(2)} XAF\n`;
    text += `Total Transactions: ${report.totalTransactions}\n`;
    text += `Average Transaction Value: ${report.averageTransactionValue.toFixed(2)} XAF\n\n`;
    
    // Expenses & Cash Flow
    text += `EXPENSES & CASH FLOW\n`;
    text += `Total Expenses: ${report.totalExpenses.toFixed(2)} XAF\n`;
    text += `Net Cash Flow: ${report.netCashFlow.toFixed(2)} XAF\n\n`;
    
    // Inventory Snapshot
    text += `INVENTORY SNAPSHOT\n`;
    text += `Total Products: ${report.totalProducts}\n`;
    text += `Inventory Value: ${report.inventoryValue.toFixed(2)} XAF\n`;
    text += `Low Stock Items: ${report.lowStockItems}\n`;
    text += `Out of Stock Items: ${report.outOfStockItems}\n\n`;
    
    // Operational Metrics
    text += `OPERATIONAL METRICS\n`;
    text += `Total Customers: ${report.totalCustomers}\n`;
    text += `New Customers: ${report.newCustomers}\n`;
    text += `Average Customer Value: ${report.averageCustomerValue.toFixed(2)} XAF\n\n`;
    
    // Alerts & Anomalies
    if (report.alerts.length > 0) {
      text += `ALERTS & ANOMALIES\n`;
      report.alerts.forEach(alert => {
        text += `• ${alert}\n`;
      });
      text += `\n`;
    }
    
    // Predictive Insights
    if (report.predictions.length > 0) {
      text += `PREDICTIVE INSIGHTS\n`;
      report.predictions.forEach(prediction => {
        text += `• ${prediction}\n`;
      });
      text += `\n`;
    }
    
    // Summary & Priorities
    text += `SUMMARY & PRIORITIES\n`;
    if (report.highlights.length > 0) {
      text += `Key Highlights:\n`;
      report.highlights.forEach(highlight => {
        text += `• ${highlight}\n`;
      });
      text += `\n`;
    }
    
    if (report.priorities.length > 0) {
      text += `Next Day Priorities:\n`;
      report.priorities.forEach(priority => {
        text += `• ${priority}\n`;
      });
      text += `\n`;
    }
    
    text += `Manager Notes: ${report.managerNotes}\n`;
    
    return text;
  }
} 
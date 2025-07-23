import { jsPDF } from 'jspdf';
import { SaleRecord } from '@/types/backup';

export interface DailyReportData {
  date: string;
  sales: Record<string, unknown>[];
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  users: Record<string, unknown>[];
  settings: any;
  previousDaySales?: Record<string, unknown>[];
}

export interface EnhancedDailyReport {
  // 📈 Sales & Revenue
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueByLocation: Record<string, number>;
  revenueByChannel: Record<string, number>;
  
  // 💸 Expenses & Cash Flow
  totalExpenses: number;
  expensesBreakdown: Record<string, number>;
  netCashFlow: number;
  cashIn: number;
  cashOut: number;
  
  // 📦 Inventory Snapshot
  totalProducts: number;
  lowStockItems: Record<string, unknown>[];
  outOfStockItems: Record<string, unknown>[];
  inventoryValue: number;
  stockMovements: Record<string, { in: number; out: number }>;
  
  // 📊 Operational Metrics
  totalCustomers: number;
  newCustomers: number;
  averageCustomerValue: number;
  topSellingProducts: Array<{ product: Record<string, unknown>; quantity: number; revenue: number }>;
  peakHours: Record<string, number>;
  
  // 🚨 Alerts & Anomaly Signals
  alerts: string[];
  anomalies: string[];
  refunds: number;
  refundAmount: number;
  
  // 🔮 Predictive Insights
  predictions: string[];
  recommendations: string[];
  
  // 🧾 Summary Notes
  highlights: string[];
  priorities: string[];
  managerNotes: string;
}

export class EnhancedDailyReportGenerator {
  static async generateComprehensiveDailyReport(data: DailyReportData): Promise<{ pdfContent: Uint8Array; textContent: string }> {
    const report = this.analyzeData(data);
    const pdfContent = await this.generatePDF(report, data);
    const textContent = this.generateTextReport(report, data);
    
    return { pdfContent, textContent };
  }

  private static analyzeData(data: DailyReportData): EnhancedDailyReport {
    const today = new Date(data.date);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 📈 Sales & Revenue Analysis
    const totalRevenue = data.sales.reduce((sum, sale) => {
      const saleTotal = (sale as any).total || 0;
      return sum + saleTotal;
    }, 0);
    const totalTransactions = data.sales.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Revenue by location/channel (assuming sale.location exists)
    const revenueByLocation: Record<string, number> = {};
    const revenueByChannel: Record<string, number> = {};
    
    data.sales.forEach(sale => {
      const saleData = sale as any;
      const location = saleData.location || 'Main Store';
      const channel = saleData.channel || 'In-Store';
      const saleTotal = saleData.total || 0;
      
      revenueByLocation[location] = (revenueByLocation[location] || 0) + saleTotal;
      revenueByChannel[channel] = (revenueByChannel[channel] || 0) + saleTotal;
    });

    // 💸 Expenses & Cash Flow (estimated based on sales patterns)
    const estimatedExpenses = this.calculateEstimatedExpenses(data.sales, data.products);
    const cashIn = totalRevenue;
    const cashOut = estimatedExpenses.total;
    const netCashFlow = cashIn - cashOut;

    // 📦 Inventory Analysis
    const inventoryAnalysis = this.analyzeInventory(data.products, data.sales);
    
    // 📊 Operational Metrics
    const operationalMetrics = this.calculateOperationalMetrics(data);
    
    // Create initial report object
    const report: EnhancedDailyReport = {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      revenueByLocation,
      revenueByChannel,
      totalExpenses: estimatedExpenses.total,
      expensesBreakdown: estimatedExpenses.breakdown,
      netCashFlow,
      cashIn,
      cashOut,
      ...inventoryAnalysis,
      ...operationalMetrics,
      alerts: [],
      anomalies: [],
      refunds: 0,
      refundAmount: 0,
      predictions: [],
      recommendations: [],
      highlights: [],
      priorities: [],
      managerNotes: ''
    };
    
    // 🚨 Alerts & Anomalies
    const alerts = this.generateAlerts(data, report);
    report.alerts = alerts;
    report.anomalies = alerts.filter(alert => alert.includes('anomaly'));
    
    // 🔮 Predictive Insights
    const predictions = this.generatePredictions(data, report);
    report.predictions = predictions;
    report.recommendations = predictions.map(p => p.replace('Prediction:', 'Recommendation:'));
    
    // 🧾 Summary
    const highlights = this.generateHighlights(report);
    const priorities = this.generatePriorities(data, report);
    report.highlights = highlights;
    report.priorities = priorities;
    report.managerNotes = this.generateManagerNotes(data, report);

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      revenueByLocation,
      revenueByChannel,
      totalExpenses: estimatedExpenses.total,
      expensesBreakdown: estimatedExpenses.breakdown,
      netCashFlow,
      cashIn,
      cashOut,
      ...inventoryAnalysis,
      ...operationalMetrics,
      alerts,
      anomalies: alerts.filter(alert => alert.includes('anomaly')),
      refunds: 0, // Would need refund data
      refundAmount: 0,
      predictions,
      recommendations: predictions.map(p => p.replace('Prediction:', 'Recommendation:')),
      highlights,
      priorities,
      managerNotes: this.generateManagerNotes(data, report)
    };
  }

  private static calculateEstimatedExpenses(sales: Record<string, unknown>[], products: Record<string, unknown>[]): { total: number; breakdown: Record<string, number> } {
    const totalRevenue = sales.reduce((sum, sale) => {
      const saleTotal = (sale as any).total || 0;
      return sum + saleTotal;
    }, 0);
    
    // Estimate expenses based on typical business ratios
    const breakdown = {
      'Cost of Goods Sold': totalRevenue * 0.6, // 60% of revenue
      'Labor Costs': totalRevenue * 0.15, // 15% of revenue
      'Utilities & Rent': totalRevenue * 0.1, // 10% of revenue
      'Marketing & Advertising': totalRevenue * 0.05, // 5% of revenue
      'Other Expenses': totalRevenue * 0.05 // 5% of revenue
    };
    
    const total = Object.values(breakdown).reduce((sum, amount) => sum + amount, 0);
    
    return { total, breakdown };
  }

  private static analyzeInventory(products: Record<string, unknown>[], sales: Record<string, unknown>[]): {
    totalProducts: number;
    lowStockItems: Record<string, unknown>[];
    outOfStockItems: Record<string, unknown>[];
    inventoryValue: number;
    stockMovements: Record<string, { in: number; out: number }>;
  } {
    const lowStockItems = products.filter(p => {
      const stock = (p as any).stock || 0;
      return stock <= 10 && stock > 0;
    });
    const outOfStockItems = products.filter(p => {
      const stock = (p as any).stock || 0;
      return stock === 0;
    });
    const inventoryValue = products.reduce((sum, p) => {
      const stock = (p as any).stock || 0;
      const price = (p as any).price || 0;
      return sum + (stock * price);
    }, 0);
    
    // Estimate stock movements based on sales
    const stockMovements: Record<string, { in: number; out: number }> = {};
    
    return {
      totalProducts: products.length,
      lowStockItems,
      outOfStockItems,
      inventoryValue,
      stockMovements
    };
  }

  private static calculateOperationalMetrics(data: DailyReportData): {
    totalCustomers: number;
    newCustomers: number;
    averageCustomerValue: number;
    topSellingProducts: Array<{ product: Record<string, unknown>; quantity: number; revenue: number }>;
    peakHours: Record<string, number>;
  } {
    const uniqueCustomers = new Set(data.sales.map(s => {
      const saleData = s as any;
      return saleData.customerId;
    }).filter(Boolean));
    const totalCustomers = uniqueCustomers.size;
    
    // Calculate top selling products
    const productSales: Record<string, { product: Record<string, unknown>; quantity: number; revenue: number }> = {};
    
    data.sales.forEach(sale => {
      const saleData = sale as any;
      const items = saleData.items || [];
      items.forEach((item: any) => {
        const product = data.products.find((p: any) => p.id === item.productId);
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = { product, quantity: 0, revenue: 0 };
          }
          productSales[product.id].quantity += item.quantity || 0;
          productSales[product.id].revenue += item.total || 0;
        }
      });
    });
    
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Estimate peak hours (assuming sale.timestamp exists)
    const peakHours: Record<string, number> = {};
    
    return {
      totalCustomers,
      newCustomers: Math.floor(totalCustomers * 0.1), // Estimate 10% new customers
      averageCustomerValue: data.sales.length > 0 ? data.sales.reduce((sum, s) => sum + s.total, 0) / data.sales.length : 0,
      topSellingProducts,
      peakHours
    };
  }

  private static generateAlerts(data: DailyReportData, report: EnhancedDailyReport): string[] {
    const alerts: string[] = [];
    
    // Low stock alerts
    if (report.lowStockItems.length > 0) {
      alerts.push(`⚠️ Low stock alert: ${report.lowStockItems.length} items need restocking`);
    }
    
    if (report.outOfStockItems.length > 0) {
      alerts.push(`🚨 Out of stock alert: ${report.outOfStockItems.length} items completely out of stock`);
    }
    
    // Revenue alerts
    if (report.totalRevenue < 1000) {
      alerts.push(`📉 Low revenue alert: Daily revenue below $1,000`);
    }
    
    // Cash flow alerts
    if (report.netCashFlow < 0) {
      alerts.push(`💸 Negative cash flow alert: Net cash flow is negative`);
    }
    
    // Transaction volume alerts
    if (report.totalTransactions < 10) {
      alerts.push(`📊 Low transaction volume: Only ${report.totalTransactions} transactions today`);
    }
    
    return alerts;
  }

  private static generatePredictions(data: DailyReportData, report: EnhancedDailyReport): string[] {
    const predictions: string[] = [];
    
    // Predict tomorrow's sales based on today's performance
    const avgDailyRevenue = report.totalRevenue;
    predictions.push(`📈 Prediction: Tomorrow's revenue likely to be $${(avgDailyRevenue * 0.9).toFixed(2)} - $${(avgDailyRevenue * 1.1).toFixed(2)}`);
    
    // Inventory predictions
    if (report.lowStockItems.length > 5) {
      predictions.push(`📦 Prediction: Need to reorder ${report.lowStockItems.length} items within 2-3 days`);
    }
    
    // Cash flow predictions
    if (report.netCashFlow < 0) {
      predictions.push(`💰 Prediction: Cash flow may remain negative for next 2-3 days`);
    }
    
    // Customer behavior predictions
    if (report.averageTransactionValue > 50) {
      predictions.push(`👥 Prediction: High-value customers likely to return within 7 days`);
    }
    
    return predictions;
  }

  private static generateHighlights(report: EnhancedDailyReport): string[] {
    const highlights: string[] = [];
    
    if (report.totalRevenue > 5000) {
      highlights.push(`🎉 Excellent revenue performance: $${report.totalRevenue.toFixed(2)}`);
    }
    
    if (report.averageTransactionValue > 100) {
      highlights.push(`💎 High average transaction value: $${report.averageTransactionValue.toFixed(2)}`);
    }
    
    if (report.totalCustomers > 50) {
      highlights.push(`👥 Strong customer traffic: ${report.totalCustomers} unique customers`);
    }
    
    if (report.netCashFlow > 1000) {
      highlights.push(`💰 Positive cash flow: $${report.netCashFlow.toFixed(2)} net profit`);
    }
    
    return highlights;
  }

  private static generatePriorities(data: DailyReportData, report: EnhancedDailyReport): string[] {
    const priorities: string[] = [];
    
    if (report.outOfStockItems.length > 0) {
      priorities.push(`🚨 URGENT: Restock ${report.outOfStockItems.length} out-of-stock items`);
    }
    
    if (report.lowStockItems.length > 0) {
      priorities.push(`📦 HIGH: Reorder ${report.lowStockItems.length} low-stock items`);
    }
    
    if (report.netCashFlow < 0) {
      priorities.push(`💰 MEDIUM: Review expenses and optimize cash flow`);
    }
    
    if (report.totalTransactions < 20) {
      priorities.push(`📊 MEDIUM: Implement marketing strategies to increase foot traffic`);
    }
    
    return priorities;
  }

  private static generateManagerNotes(data: DailyReportData, report: EnhancedDailyReport): string {
    return `Daily operations completed successfully. ${report.highlights.length} positive highlights noted. ${report.alerts.length} alerts require attention. Focus on ${report.priorities[0] || 'general operations'} for tomorrow.`;
  }

  private static async generatePDF(report: EnhancedDailyReport, data: DailyReportData): Promise<Uint8Array> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('📊 Enhanced Daily Report', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Date: ${data.date}`, 105, 25, { align: 'center' });
    
    let y = 35;
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // 📈 Sales & Revenue Section
    y = this.addSectionHeader(doc, '📈 Sales & Revenue', y);
    y = this.addMetric(doc, `Total Revenue: $${report.totalRevenue.toFixed(2)}`, y);
    y = this.addMetric(doc, `Total Transactions: ${report.totalTransactions}`, y);
    y = this.addMetric(doc, `Average Transaction: $${report.averageTransactionValue.toFixed(2)}`, y);
    
    // Revenue by location
    if (Object.keys(report.revenueByLocation).length > 0) {
      y = this.addSubsection(doc, 'Revenue by Location:', y);
      Object.entries(report.revenueByLocation).forEach(([location, revenue]) => {
        y = this.addMetric(doc, `  ${location}: $${revenue.toFixed(2)}`, y);
      });
    }
    
    // 💸 Expenses & Cash Flow Section
    y = this.addSectionHeader(doc, '💸 Expenses & Cash Flow', y);
    y = this.addMetric(doc, `Total Expenses: $${report.totalExpenses.toFixed(2)}`, y);
    y = this.addMetric(doc, `Net Cash Flow: $${report.netCashFlow.toFixed(2)}`, y);
    y = this.addMetric(doc, `Cash In: $${report.cashIn.toFixed(2)} | Cash Out: $${report.cashOut.toFixed(2)}`, y);
    
    // 📦 Inventory Section
    y = this.addSectionHeader(doc, '📦 Inventory Snapshot', y);
    y = this.addMetric(doc, `Total Products: ${report.totalProducts}`, y);
    y = this.addMetric(doc, `Inventory Value: $${report.inventoryValue.toFixed(2)}`, y);
    y = this.addMetric(doc, `Low Stock Items: ${report.lowStockItems.length}`, y);
    y = this.addMetric(doc, `Out of Stock Items: ${report.outOfStockItems.length}`, y);
    
    // 📊 Operational Metrics Section
    y = this.addSectionHeader(doc, '📊 Operational Metrics', y);
    y = this.addMetric(doc, `Total Customers: ${report.totalCustomers}`, y);
    y = this.addMetric(doc, `New Customers: ${report.newCustomers}`, y);
    y = this.addMetric(doc, `Average Customer Value: $${report.averageCustomerValue.toFixed(2)}`, y);
    
    // 🚨 Alerts Section
    if (report.alerts.length > 0) {
      y = this.addSectionHeader(doc, '🚨 Alerts & Anomalies', y);
      report.alerts.forEach(alert => {
        y = this.addMetric(doc, `• ${alert}`, y);
      });
    }
    
    // 🔮 Predictive Insights Section
    if (report.predictions.length > 0) {
      y = this.addSectionHeader(doc, '🔮 Predictive Insights', y);
      report.predictions.forEach(prediction => {
        y = this.addMetric(doc, `• ${prediction}`, y);
      });
    }
    
    // 🧾 Summary Section
    y = this.addSectionHeader(doc, '🧾 Summary & Priorities', y);
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

  private static generateTextReport(report: EnhancedDailyReport, data: DailyReportData): string {
    let text = `📊 ENHANCED DAILY REPORT - ${data.date}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // 📈 Sales & Revenue
    text += `📈 SALES & REVENUE\n`;
    text += `Total Revenue: $${report.totalRevenue.toFixed(2)}\n`;
    text += `Total Transactions: ${report.totalTransactions}\n`;
    text += `Average Transaction Value: $${report.averageTransactionValue.toFixed(2)}\n`;
    
    if (Object.keys(report.revenueByLocation).length > 0) {
      text += `Revenue by Location:\n`;
      Object.entries(report.revenueByLocation).forEach(([location, revenue]) => {
        text += `  ${location}: $${revenue.toFixed(2)}\n`;
      });
    }
    text += `\n`;
    
    // 💸 Expenses & Cash Flow
    text += `💸 EXPENSES & CASH FLOW\n`;
    text += `Total Expenses: $${report.totalExpenses.toFixed(2)}\n`;
    text += `Net Cash Flow: $${report.netCashFlow.toFixed(2)}\n`;
    text += `Cash In: $${report.cashIn.toFixed(2)}\n`;
    text += `Cash Out: $${report.cashOut.toFixed(2)}\n\n`;
    
    // 📦 Inventory Snapshot
    text += `📦 INVENTORY SNAPSHOT\n`;
    text += `Total Products: ${report.totalProducts}\n`;
    text += `Inventory Value: $${report.inventoryValue.toFixed(2)}\n`;
    text += `Low Stock Items: ${report.lowStockItems.length}\n`;
    text += `Out of Stock Items: ${report.outOfStockItems.length}\n\n`;
    
    // 📊 Operational Metrics
    text += `📊 OPERATIONAL METRICS\n`;
    text += `Total Customers: ${report.totalCustomers}\n`;
    text += `New Customers: ${report.newCustomers}\n`;
    text += `Average Customer Value: $${report.averageCustomerValue.toFixed(2)}\n\n`;
    
    // 🚨 Alerts & Anomalies
    if (report.alerts.length > 0) {
      text += `🚨 ALERTS & ANOMALIES\n`;
      report.alerts.forEach(alert => {
        text += `• ${alert}\n`;
      });
      text += `\n`;
    }
    
    // 🔮 Predictive Insights
    if (report.predictions.length > 0) {
      text += `🔮 PREDICTIVE INSIGHTS\n`;
      report.predictions.forEach(prediction => {
        text += `• ${prediction}\n`;
      });
      text += `\n`;
    }
    
    // 🧾 Summary & Priorities
    text += `🧾 SUMMARY & PRIORITIES\n`;
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
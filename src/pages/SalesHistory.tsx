import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, Printer, Eye, FileText, FileJson } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { printSaleReceipt, viewSaleReceipt, downloadSaleReceipt } from '@/utils/printingService';
import { StoreInfo } from '@/types/settings';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasRole } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { exportSalesData } from '@/utils/exportsService';
import { useSettings } from '@/components/pos/hooks/useSettings';

interface Sale {
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


const translations = {
  en: {
    title: "Sales History",
    exports: {
      xlsx: "Export XLSX",
      json: "Export JSON",
      pdf: "Export PDF"
    },
    search: {
      placeholder: "Search by invoice, customer, cashier, product...",
      dateRange: "Select date range",
      paymentMethod: {
        label: "Payment Method",
        all: "All Payment Methods",
        cash: "Cash",
        card: "Card",
        mobile: "Mobile",
        credit: "Credit"
      },
      sortBy: "Sort by Date: ",
      oldest: "Oldest First",
      newest: "Newest First"
    },
    stats: {
      totalSales: "Total Sales",
      itemsSold: "Total Items Sold",
      transactions: "Number of Transactions"
    },
    table: {
      invoice: "Invoice",
      date: "Date",
      customer: "Customer",
      cashier: "Cashier",
      total: "Total",
      payment: "Payment",
      status: "Status",
      actions: "Actions",
      loading: "Loading...",
      noRecords: "No sales records found",
      guest: "Guest"
    },
    actions: {
      view: "View Receipt",
      print: "Print Receipt",
      download: "Download Receipt"
    }
  },
  fr: {
    title: "Historique des Ventes",
    exports: {
      xlsx: "Exporter XLSX",
      json: "Exporter JSON",
      pdf: "Exporter PDF"
    },
    search: {
      placeholder: "Rechercher par facture, client, caissier, produit...",
      dateRange: "Sélectionner une période",
      paymentMethod: {
        label: "Mode de Paiement",
        all: "Tous les Modes de Paiement",
        cash: "Espèces",
        card: "Carte",
        mobile: "Mobile",
        credit: "Crédit"
      },
      sortBy: "Trier par Date: ",
      oldest: "Plus Ancien d'abord",
      newest: "Plus Récent d'abord"
    },
    stats: {
      totalSales: "Ventes Totales",
      itemsSold: "Articles Vendus",
      transactions: "Nombre de Transactions"
    },
    table: {
      invoice: "Facture",
      date: "Date",
      customer: "Client",
      cashier: "Caissier",
      total: "Total",
      payment: "Paiement",
      status: "Statut",
      actions: "Actions",
      loading: "Chargement...",
      noRecords: "Aucune vente trouvée",
      guest: "Invité"
    },
    actions: {
      view: "Voir le Reçu",
      print: "Imprimer le Reçu",
      download: "Télécharger le Reçu"
    }
  }
};

const SalesHistory: React.FC = () => {
  const navigate = useNavigate();
  const { language, currency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalItems: 0,
    transactionCount: 0
  });
  
  // Get translations based on language
  const t = translations[language as keyof typeof translations] || translations.en;
  
  // Enhanced filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);

  
  useEffect(() => {
    const checkAccess = async () => {
      
      const isAdmin = await hasRole(['admin']);
      if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/pos');
        return;
      }
      
      loadSales();
    };
    
    checkAccess();
  }, [navigate]);

  const loadSales = async () => {
    try {
      setLoading(true);
      
      
      const salesData = await dbOperations.getAll<Sale>(STORES.SALES);
      setSales(salesData);
      
      
      const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
      const totalItems = salesData.reduce(
        (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 
        0
      );
      
      setStats({
        totalSales,
        totalItems,
        transactionCount: salesData.length
      });
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  
  const handlePrintReceipt = async (saleId: string) => {
    try {
      const success = await printSaleReceipt(saleId);
      if (success) {
        toast.success('Receipt sent to printer');
      } else {
        toast.error('Failed to print receipt');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Error printing receipt');
    }
  };

  
  const handleViewReceipt = async (saleId: string) => {
    try {
      const success = await viewSaleReceipt(saleId);
      if (!success) {
        toast.error('Failed to view receipt');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      toast.error('Error viewing receipt');
    }
  };

  
  const handleDownloadReceipt = async (saleId: string) => {
    try {
      const success = await downloadSaleReceipt(saleId);
      if (success) {
        toast.success('Receipt downloaded');
      } else {
        toast.error('Failed to download receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Error downloading receipt');
    }
  };

  
  const handleExportData = async (format: 'xlsx' | 'json' | 'pdf') => {
    try {
      setExporting(true);
      
      
      const salesForExport = sales.map(sale => ({
        id: sale.id,
        date: sale.date,
        cashierName: sale.cashierName,
        items: sale.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: sale.subtotal,
        taxAmount: sale.taxAmount,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        customerName: sale.customerName
      }));
      
      
      const result = await exportSalesData(salesForExport, currency, format, language, dateRange);
      if (!result) {
        toast.error(`Failed to export sales data as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error(`Error exporting sales data as ${format}:`, error);
      toast.error(`Error exporting as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  
  const filteredSales = sales
    .filter(sale => {
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = 
        sale.id.toLowerCase().includes(searchLower) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(searchLower)) ||
        sale.cashierName.toLowerCase().includes(searchLower) ||
        sale.items.some(item => item.productName.toLowerCase().includes(searchLower));

      
      const matchesPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;
      
      
      let matchesDateRange = true;
      if (dateRange?.from && dateRange?.to) {
        const saleDate = new Date(sale.date);
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        to.setHours(23, 59, 59, 999); 
        matchesDateRange = saleDate >= from && saleDate <= to;
      }
      
      return matchesSearch && matchesPayment && matchesDateRange;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.date - b.date;
      } else {
        return b.date - a.date;
      }
    });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExportData('xlsx')}
            disabled={exporting || filteredSales.length === 0}
          >
            <FileText size={16} className="mr-2" />
            {exporting ? 'Exporting...' : t.exports.xlsx}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportData('json')}
            disabled={exporting || filteredSales.length === 0}
          >
            <FileJson size={16} className="mr-2" />
            {exporting ? 'Exporting...' : t.exports.json}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportData('pdf')}
            disabled={exporting || filteredSales.length === 0}
          >
            <Download size={16} className="mr-2" />
            {exporting ? 'Exporting...' : t.exports.pdf}
          </Button>
        </div>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder={t.search.placeholder}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <DateRangePicker 
          value={dateRange} 
          onValueChange={setDateRange} 
          placeholder={t.search.dateRange}
          locale={language === 'fr' ? 'fr' : 'en'}
        />
        
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t.search.paymentMethod.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.search.paymentMethod.all}</SelectItem>
            <SelectItem value="cash">{t.search.paymentMethod.cash}</SelectItem>
            <SelectItem value="card">{t.search.paymentMethod.card}</SelectItem>
            <SelectItem value="mobile">{t.search.paymentMethod.mobile}</SelectItem>
            <SelectItem value="credit">{t.search.paymentMethod.credit}</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={toggleSortOrder}>
          {t.search.sortBy} {sortOrder === 'asc' ? t.search.oldest : t.search.newest}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm mb-2">{t.stats.totalSales}</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm mb-2">{t.stats.itemsSold}</div>
          <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm mb-2">{t.stats.transactions}</div>
          <div className="text-2xl font-bold">{stats.transactionCount.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.invoice}</TableHead>
              <TableHead>{t.table.date}</TableHead>
              <TableHead>{t.table.customer}</TableHead>
              <TableHead>{t.table.cashier}</TableHead>
              <TableHead>{t.table.total}</TableHead>
              <TableHead>{t.table.payment}</TableHead>
              <TableHead>{t.table.status}</TableHead>
              <TableHead>{t.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  {t.table.noRecords}
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id.substring(0, 8)}</TableCell>
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell>{sale.customerName || t.table.guest}</TableCell>
                  <TableCell>{sale.cashierName}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {sale.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReceipt(sale.id)}
                        title={t.actions.view}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintReceipt(sale.id)}
                        title={t.actions.print}
                      >
                        <Printer size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(sale.id)}
                        title={t.actions.download}
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SalesHistory;

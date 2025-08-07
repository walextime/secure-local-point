import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, Printer, Eye, FileText } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import { printSaleReceipt, viewSaleReceipt, downloadSaleReceipt } from '@/utils/printingService';
import { StoreInfo } from '@/types/settings';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useSettings } from '@/components/pos/hooks/useSettings';
import { getCurrentUser } from '@/lib/auth';

interface Sale {
  id: string;
  receiptId?: string;
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
  isPrintedReceipt?: boolean;
}

const translations = {
  en: {
    title: 'Printed Receipts',
    search: 'Search receipts...',
    date: 'Date',
    customer: 'Customer',
    items: 'Items',
    amount: 'Amount',
    paymentMethod: 'Payment Method',
    cashier: 'Cashier',
    receiptId: 'Receipt ID',
    actions: 'Actions',
    view: 'View',
    print: 'Print',
    download: 'Download',
    noReceipts: 'No receipts found',
    loading: 'Loading receipts...',
    filterByDate: 'Filter by Date',
    filterByPayment: 'Filter by Payment Method',
    filterByCashier: 'Filter by Cashier',
    all: 'All',
    cash: 'Cash',
    card: 'Card',
    mobile: 'Mobile',
    credit: 'Credit',
    pending: 'Pending',
    exportReceipts: 'Export Receipts',
    totalReceipts: 'Total Receipts',
    totalAmount: 'Total Amount'
  },
  fr: {
    title: 'Reçus Imprimés',
    search: 'Rechercher des reçus...',
    date: 'Date',
    customer: 'Client',
    items: 'Articles',
    amount: 'Montant',
    paymentMethod: 'Méthode de Paiement',
    cashier: 'Caissier',
    receiptId: 'ID du Reçu',
    actions: 'Actions',
    view: 'Voir',
    print: 'Imprimer',
    download: 'Télécharger',
    noReceipts: 'Aucun reçu trouvé',
    loading: 'Chargement des reçus...',
    filterByDate: 'Filtrer par Date',
    filterByPayment: 'Filtrer par Méthode de Paiement',
    filterByCashier: 'Filtrer par Caissier',
    all: 'Tous',
    cash: 'Espèces',
    card: 'Carte',
    mobile: 'Mobile',
    credit: 'Crédit',
    pending: 'En Attente',
    exportReceipts: 'Exporter les Reçus',
    totalReceipts: 'Total des Reçus',
    totalAmount: 'Montant Total'
  }
};

const PrintedReceipts: React.FC = () => {
  const navigate = useNavigate();
  const { language, currency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalAmount: 0
  });
  
  // Get translations based on language
  const t = translations[language as keyof typeof translations] || translations.en;
  
  // Enhanced filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        loadSales();
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Failed to load user data');
      }
    };
    
    loadData();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      
      
      const salesData = await dbOperations.getAll<Sale>(STORES.SALES);
      setSales(salesData);
      
      
      const totalReceipts = salesData.length;
      const totalAmount = salesData.reduce((sum, sale) => sum + sale.total, 0);
      
      setStats({
        totalReceipts,
        totalAmount
      });
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' || 
      sale.receiptId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPayment = paymentFilter === 'all' || sale.paymentMethod.toLowerCase() === paymentFilter.toLowerCase();
    
    const matchesCashier = cashierFilter === 'all' || sale.cashierName.toLowerCase() === cashierFilter.toLowerCase();

    const matchesDate = !dateRange?.from || !dateRange?.to || 
      (sale.date >= dateRange.from.getTime() && sale.date <= dateRange.to.getTime());

    return matchesSearch && matchesPayment && matchesCashier && matchesDate;
  }).sort((a, b) => {
    return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
  });

  
  const uniqueCashiers = [...new Set(sales.map(sale => sale.cashierName))];

  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

  
  const formatCurrency = (amount: number) => `${amount.toLocaleString()} XAF`;

  
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

  
  const exportReceipts = () => {
    const csvData = filteredSales.map(sale => ({
      'Receipt ID': sale.receiptId || sale.id,
      'Date': formatDate(sale.date),
      'Customer': sale.customerName || 'Walk-in Customer',
      'Cashier': sale.cashierName,
      'Items': sale.items.length,
      'Subtotal': sale.subtotal,
      'Tax': sale.taxAmount,
      'Discount': sale.discount,
      'Total': sale.total,
      'Payment Method': sale.paymentMethod,
      'Status': sale.status
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Receipts exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Button onClick={exportReceipts} variant="outline">
          <FileText size={16} className="mr-2" />
          {t.exportReceipts}
        </Button>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">{t.totalReceipts}</h3>
          <p className="text-2xl font-bold">{stats.totalReceipts}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">{t.totalAmount}</h3>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
        </div>
      </div>

      {}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="cash">{t.cash}</SelectItem>
                <SelectItem value="card">{t.card}</SelectItem>
                <SelectItem value="mobile">{t.mobile}</SelectItem>
                <SelectItem value="credit">{t.credit}</SelectItem>
                <SelectItem value="pending">{t.pending}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {uniqueCashiers.map(cashier => (
                  <SelectItem key={cashier} value={cashier}>{cashier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DateRangePicker
          value={dateRange}
          onValueChange={setDateRange}
          placeholder={t.filterByDate}
        />
      </div>

      {}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t.noReceipts}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.receiptId}</TableHead>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.cashier}</TableHead>
                <TableHead>{t.items}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.paymentMethod}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-sm">
                    {sale.receiptId || sale.id}
                  </TableCell>
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell>{sale.customerName || 'Walk-in Customer'}</TableCell>
                  <TableCell>{sale.cashierName}</TableCell>
                  <TableCell>{sale.items.length}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(sale.total)}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{sale.paymentMethod}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReceipt(sale.id)}
                        title={t.view}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintReceipt(sale.id)}
                        title={t.print}
                      >
                        <Printer size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(sale.id)}
                        title={t.download}
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default PrintedReceipts; 
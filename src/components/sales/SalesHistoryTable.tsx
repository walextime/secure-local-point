import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { dbOperations, STORES } from '@/lib/db';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Sale {
  id: string;
  date: number;
  items: any[];
  total: number;
  paymentMethod: string;
  customerId?: string;
  userId: string;
  customerName?: string;
  userName?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

const SalesHistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  
  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        const salesData = await dbOperations.getAll<Sale>(STORES.SALES);
        
        
        const customers = await dbOperations.getAll<Customer>(STORES.CUSTOMERS);
        const users = await dbOperations.getAll<User>(STORES.USERS);
        
        const enrichedSales = salesData.map(sale => ({
          ...sale,
          customerName: customers.find(c => c.id === sale.customerId)?.name || 'Walk-in Customer',
          userName: users.find(u => u.id === sale.userId)?.name || 'Unknown'
        }));
        
        setSales(enrichedSales);
        setFilteredSales(enrichedSales);
      } catch (error) {
        console.error('Error loading sales:', error);
        toast.error('Failed to load sales history');
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, []);

  
  useEffect(() => {
    let filtered = sales;

    
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    
    if (dateFrom) {
      filtered = filtered.filter(sale => sale.date >= dateFrom.getTime());
    }
    if (dateTo) {
      filtered = filtered.filter(sale => sale.date <= dateTo.getTime());
    }

    
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentFilter);
    }

    setFilteredSales(filtered);
  }, [sales, searchTerm, dateFrom, dateTo, paymentFilter]);

  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Items', 'Total', 'Payment Method', 'Cashier'];
    const csvContent = [
      headers.join(','),
      ...filteredSales.map(sale => [
        format(new Date(sale.date), 'yyyy-MM-dd HH:mm'),
        sale.customerName,
        sale.items.length,
        sale.total.toFixed(2),
        sale.paymentMethod,
        sale.userName
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Sales data exported successfully');
  };

  // Replace formatCurrency to always show XAF
  const formatCurrency = (amount: number) => `${amount.toLocaleString()} XAF`;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-medium">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder={t.salesHistory.filterByCustomer}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP') : 'From Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP') : 'To Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">{t.pos.cash}</SelectItem>
              <SelectItem value="card">{t.pos.card}</SelectItem>
              <SelectItem value="mobile">{t.pos.mobile}</SelectItem>
              <SelectItem value="mixed">{t.pos.mixed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredSales.length} of {sales.length} transactions
          </p>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t.salesHistory.exportSales}
          </Button>
        </div>
      </div>

      {}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.salesHistory.date}</TableHead>
              <TableHead>{t.salesHistory.customer}</TableHead>
              <TableHead>{t.salesHistory.items}</TableHead>
              <TableHead>{t.salesHistory.amount}</TableHead>
              <TableHead>{t.salesHistory.paymentMethod}</TableHead>
              <TableHead>{t.salesHistory.cashier}</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  {format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>{sale.customerName}</TableCell>
                <TableCell>{sale.items.length} items</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(sale.total)}
                </TableCell>
                <TableCell>
                  <span className="capitalize">{sale.paymentMethod}</span>
                </TableCell>
                <TableCell>{sale.userName}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" title={t.salesHistory.viewDetails}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title={t.salesHistory.reprint}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SalesHistoryTable;

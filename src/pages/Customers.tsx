
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, User, Phone, Mail, MapPin, Edit, Trash2, CreditCard } from 'lucide-react';
import { dbOperations, STORES } from '@/lib/db';
import { toast } from 'sonner';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import CustomerCreditModal from '@/components/customers/CustomerCreditModal';
import { useTranslation } from '@/hooks/useTranslation';
import { CustomerWithCredit } from '@/types/credit';

const Customers: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithCredit | null>(null);

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const loadedCustomers = await dbOperations.getAll<CustomerWithCredit>(STORES.CUSTOMERS);
      // Ensure customers have credit fields
      const customersWithCredit = loadedCustomers.map(customer => ({
        ...customer,
        balance: customer.balance ?? 0,
        creditLimit: customer.creditLimit ?? 0
      }));
      setCustomers(customersWithCredit);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(price);
  };

  
  const handleEditCustomer = (customer: CustomerWithCredit) => {
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  
  const handleManageCredit = (customer: CustomerWithCredit) => {
    setSelectedCustomer(customer);
    setCreditModalOpen(true);
  };

  
  const handleDeleteCustomer = async (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await dbOperations.delete(STORES.CUSTOMERS, customerId);
        toast.success('Customer deleted successfully');
        loadCustomers(); 
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.address && customer.address.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.nav.customers}</h1>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          {t.common.add} Customer
        </Button>
      </div>
      
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder={t.common.search + " customers by name, phone, or address..."}
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <User size={32} className="text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No Customers Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'No customers match your search criteria' : 'Get started by adding your first customer'}
          </p>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            {t.common.add} Customer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{customer.name}</h3>
                  <p className="text-xs text-gray-500">Added: {formatDate(customer.createdAt)}</p>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title="Manage Credit"
                    onClick={() => handleManageCredit(customer)}
                  >
                    <CreditCard size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title={t.common.edit + " Customer"}
                    onClick={() => handleEditCustomer(customer)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title={t.common.delete + " Customer"}
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              {}
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Credit Account</div>
                <div className="flex justify-between text-sm">
                  <span>Balance:</span>
                  <span className={customer.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatPrice(customer.balance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Credit Limit:</span>
                  <span className="text-blue-600">{formatPrice(customer.creditLimit)}</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                {customer.phone && (
                  <div className="flex items-center text-sm">
                    <Phone size={14} className="mr-2 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center text-sm">
                    <Mail size={14} className="mr-2 text-gray-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center text-sm">
                    <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <AddCustomerModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onCustomerAdded={loadCustomers}
      />
      
      <EditCustomerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={selectedCustomer}
        onCustomerUpdated={loadCustomers}
      />
      
      <CustomerCreditModal
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
        customer={selectedCustomer}
        onCustomerUpdated={loadCustomers}
      />
    </div>
  );
};

export default Customers;

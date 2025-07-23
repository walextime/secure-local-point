
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditService } from '@/services/creditService';
import { CreditPayment, CustomerWithCredit } from '@/types/credit';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

interface CustomerCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithCredit | null;
  onCustomerUpdated: () => void;
}

const CustomerCreditModal: React.FC<CustomerCreditModalProps> = ({
  open,
  onOpenChange,
  customer,
  onCustomerUpdated
}) => {
  const [creditLimit, setCreditLimit] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [creditHistory, setCreditHistory] = useState<CreditPayment[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (customer) {
        setCreditLimit(customer.creditLimit);
        const history = await CreditService.getCreditHistory(customer.id);
        setCreditHistory(history);
        
        const user = await getCurrentUser();
        if (user) {
          setUserRole(user.role);
        }
      }
    };
    
    if (open && customer) {
      loadData();
    }
  }, [open, customer]);

  const handleUpdateCreditLimit = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const success = await CreditService.updateCreditLimit(customer.id, creditLimit);
      if (success) {
        onCustomerUpdated();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!customer || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    setLoading(true);
    try {
      const success = await CreditService.addCreditPayment(customer.id, paymentAmount, paymentNote);
      if (success) {
        setPaymentAmount(0);
        setPaymentNote('');
        onCustomerUpdated();
        
        // Reload credit history
        const history = await CreditService.getCreditHistory(customer.id);
        setCreditHistory(history);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (!customer) return null;

  const canManageCredit = userRole === 'admin' || userRole === 'manager';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Credit Account - {customer.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Current Balance</Label>
                <div className={`text-lg font-bold ${customer.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatPrice(customer.balance)}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Credit Limit</Label>
                <div className="text-lg font-bold text-blue-600">
                  {formatPrice(customer.creditLimit)}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-sm font-medium">Available Credit</Label>
              <div className="text-lg font-bold text-purple-600">
                {formatPrice(customer.creditLimit + customer.balance)}
              </div>
            </div>
          </div>

          {}
          {canManageCredit && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Manage Credit Limit</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleUpdateCreditLimit}
                    disabled={loading || creditLimit === customer.creditLimit}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </div>
          )}

          {}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Payment/Deposit</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">Note (optional)</Label>
                <Textarea
                  id="paymentNote"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Payment description..."
                />
              </div>
              <Button 
                onClick={handleAddPayment}
                disabled={loading || paymentAmount <= 0}
                className="w-full"
              >
                Add Payment
              </Button>
            </div>
          </div>

          {}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Credit History</h3>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {creditHistory.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No credit history</div>
              ) : (
                <div className="divide-y">
                  {creditHistory.map((payment) => (
                    <div key={payment.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-green-600">
                            +{formatPrice(payment.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(payment.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm">By: {payment.userName}</div>
                        </div>
                        {payment.note && (
                          <div className="text-sm text-gray-600 ml-4 max-w-xs">
                            {payment.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerCreditModal;

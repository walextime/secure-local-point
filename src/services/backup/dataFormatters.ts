
export class DataFormatters {
    static formatCustomersForExcel(customers: any[]): any {
    return {
      type: 'excel',
      sheets: [{
        name: 'Customers',
        data: customers.map(customer => {
          const balance = customer.balance || 0;
          const creditLimit = customer.creditLimit || 0;
          const availableCredit = creditLimit + balance;
          
          return {
            ID: customer.id,
            Name: customer.name,
            Email: customer.email || '',
            Phone: customer.phone || '',
            Address: customer.address || '',
            Balance: balance.toFixed(2),
            'Credit Limit': creditLimit.toFixed(2),
            'Available Credit': availableCredit.toFixed(2),
            'Created Date': new Date(customer.createdAt || Date.now()).toLocaleDateString(),
            'Total Purchases': customer.totalPurchases || 0,
            'Last Purchase': customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : ''
          };
        })
      }]
    };
  }

  /**
   * Format inventory data for Excel export
   */
  static formatInventoryForExcel(inventory: any[]): any {
    return {
      type: 'excel',
      sheets: [{
        name: 'Inventory',
        data: inventory.map(item => ({
          ID: item.id,
          Name: item.name,
          Category: item.category || '',
          Price: item.price,
          Stock: item.stock || 0,
          Barcode: item.barcode || '',
          Description: item.description || '',
          'Low Stock Alert': item.lowStockAlert || 0,
          'Created Date': new Date(item.createdAt || Date.now()).toLocaleDateString()
        }))
      }]
    };
  }

    static formatSalesForExcel(sales: any[]): any {
    return {
      type: 'excel',
      sheets: [
        {
          name: 'Sales Summary',
          data: sales.map(sale => ({
            ID: sale.id,
            Date: new Date(sale.date).toLocaleString(),
            Customer: sale.customerName || 'Guest',
            'Items Count': sale.items?.length || 0,
            Subtotal: sale.subtotal,
            Tax: sale.taxAmount || 0,
            Discount: sale.discount || 0,
            Total: sale.total,
            'Payment Method': sale.paymentMethod,
            Status: sale.status,
            Cashier: sale.cashierName || ''
          }))
        },
        {
          name: 'Sale Items',
          data: sales.flatMap(sale => 
            (sale.items || []).map((item: any) => ({
              'Sale ID': sale.id,
              'Sale Date': new Date(sale.date).toLocaleString(),
              'Product Name': item.productName,
              'Product ID': item.productId,
              Price: item.price,
              Quantity: item.quantity,
              'Line Total': item.price * item.quantity
            }))
          )
        }
      ]
    };
  }
}

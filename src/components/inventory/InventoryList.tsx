
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from '../pos/ProductCard';
import { Edit2, Trash2 } from 'lucide-react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface InventoryListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  currencyCode: string;
}

const InventoryList: React.FC<InventoryListProps> = ({
  products,
  onEdit,
  onDelete,
  currencyCode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter products by search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Replace formatPrice to always show XAF
  const formatPrice = (price: number) => `${price.toLocaleString()} XAF`;
  
  // Virtualized row renderer
  const Row = ({ index, style }: ListChildComponentProps) => {
    const product = filteredProducts[index];
    return (
      <TableRow key={product.id} style={style}>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell>{product.category}</TableCell>
        <TableCell>{product.stock} {product.unit}</TableCell>
        <TableCell>{formatPrice(product.price)}</TableCell>
        <TableCell>
          <span className={`px-2 py-1 rounded-full text-xs ${
            product.stock > 10
              ? 'bg-green-100 text-green-800'
              : product.stock > 0
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {product.stock > 10
              ? 'Active'
              : product.stock > 0
              ? 'Low Stock'
              : 'Out of Stock'}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(product)}
            >
              <Edit2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700"
              onClick={() => onDelete(product.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  
  const ROW_HEIGHT = 56; // px, adjust as needed for your row height
  const MAX_TABLE_HEIGHT = 500; // px, adjust for your UI
  
  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search products by name, category, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {/* Table with virtualization */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        {filteredProducts.length > 0 ? (
          <div style={{ height: Math.min(filteredProducts.length * ROW_HEIGHT, MAX_TABLE_HEIGHT), width: '100%' }}>
            <Table>
              <TableBody>
                <List
                  height={Math.min(filteredProducts.length * ROW_HEIGHT, MAX_TABLE_HEIGHT)}
                  itemCount={filteredProducts.length}
                  itemSize={ROW_HEIGHT}
                  width={"100%"}
                >
                  {Row}
                </List>
              </TableBody>
            </Table>
          </div>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default InventoryList;

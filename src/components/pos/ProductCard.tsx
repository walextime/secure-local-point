import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  barcode?: string;
  image?: string;
  stock: number;
  minStock: number;
  unit?: string;
  createdAt: number;
  updatedAt: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  currencyCode: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, currencyCode }) => {
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode
    }).format(price);
  };

  
  const getStockStatus = () => {
    if (product.stock <= 0) {
      return { status: 'out-of-stock', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (product.stock <= product.minStock) {
      return { status: 'low-stock', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else {
      return { status: 'in-stock', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
  };

  const stockStatus = getStockStatus();
  const isOutOfStock = product.stock <= 0;
  
  return (
    <Card
      className={`overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-md ${isOutOfStock ? 'opacity-60' : 'cursor-pointer'} min-w-[140px] max-w-[180px] w-full`}
      onClick={() => !isOutOfStock && onAddToCart(product)}
      tabIndex={isOutOfStock ? -1 : 0}
      role="button"
      aria-disabled={isOutOfStock}
      style={{ userSelect: 'none' }}
    >
      <CardContent className="p-2 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-medium text-xs leading-tight flex-1">{product.name}</h3>
            {product.stock <= product.minStock && product.stock > 0 && (
              <AlertTriangle size={12} className="text-orange-500 ml-1 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-[10px]">
              {product.category}
            </Badge>
            {product.barcode && (
              <span className="text-[10px] text-gray-400">#{product.barcode}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex-1">
            <p className="font-bold text-base">{formatPrice(product.price)}</p>
            <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${stockStatus.bgColor} ${stockStatus.color} ${stockStatus.borderColor} border`}>
              Stock: {product.stock} {product.unit || 'unit'}{product.stock !== 1 ? 's' : ''}
              {product.stock <= product.minStock && product.stock > 0 && (
                <span className="ml-1">(Low)</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;

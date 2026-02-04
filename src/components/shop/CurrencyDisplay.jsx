import React, { memo } from 'react';
import { Coins } from 'lucide-react';
import { CURRENCIES } from './ShopConstants';

// Currency display component
export const CurrencyDisplay = memo(function CurrencyDisplay({ type, amount, size = 'md' }) {
  const currency = CURRENCIES[type];
  const Icon = currency?.icon || Coins;
  const sizes = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  return (
    <div className={`flex items-center ${sizes[size]} ${currency?.color || 'text-yellow-400'}`}>
      <Icon className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
      <span className="font-bold">{amount.toLocaleString()}</span>
    </div>
  );
});

// Price display with optional discount
export const PriceDisplay = memo(function PriceDisplay({ price, originalPrice, currency = 'coins' }) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      {hasDiscount && (
        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
          -{discountPercent}%
        </span>
      )}
      <div className="flex flex-col items-end">
        {hasDiscount && (
          <span className="text-xs text-gray-500 line-through">
            {originalPrice.toLocaleString()}
          </span>
        )}
        <CurrencyDisplay type={currency} amount={price} />
      </div>
    </div>
  );
});

export default CurrencyDisplay;

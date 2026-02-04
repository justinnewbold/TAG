import React, { memo } from 'react';
import { Clock, Check, Eye } from 'lucide-react';
import { RARITY_STYLES } from './ShopConstants';
import { PriceDisplay } from './CurrencyDisplay';

// Shop item card
export const ShopItemCard = memo(function ShopItemCard({ item, onPurchase, onPreview, owned, canAfford }) {
  const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
  const isBundle = item.type === 'bundle';

  return (
    <div
      className={`relative bg-gray-800/50 rounded-xl overflow-hidden border-2 ${rarity.border} transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
        {item.isNew && (
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
            NEW
          </span>
        )}
        {item.isLimited && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            LIMITED
          </span>
        )}
        {owned && (
          <span className="px-2 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            OWNED
          </span>
        )}
      </div>

      {/* Image/Preview */}
      <div className={`aspect-square ${rarity.bg} flex items-center justify-center p-4`}>
        {item.image ? (
          <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-6xl">{item.icon || '🎁'}</span>
        )}

        {/* Bundle items preview */}
        {isBundle && item.items && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1">
            {item.items.slice(0, 4).map((bundleItem, i) => (
              <div
                key={i}
                className="w-8 h-8 bg-gray-900/80 rounded-lg flex items-center justify-center text-lg"
              >
                {bundleItem.icon}
              </div>
            ))}
            {item.items.length > 4 && (
              <div className="w-8 h-8 bg-gray-900/80 rounded-lg flex items-center justify-center text-xs text-gray-400">
                +{item.items.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-bold text-white text-sm">{item.name}</h3>
            <span className={`text-xs ${rarity.text}`}>{rarity.label}</span>
          </div>
          <button
            onClick={() => onPreview?.(item)}
            className="p-1.5 hover:bg-white/10 rounded-lg"
            aria-label={`Preview ${item.name}`}
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-3">
          <PriceDisplay
            price={item.price}
            originalPrice={item.originalPrice}
            currency={item.currency}
          />

          {owned ? (
            <button
              disabled
              className="px-4 py-1.5 bg-gray-700 text-gray-400 text-sm rounded-lg"
            >
              Owned
            </button>
          ) : (
            <button
              onClick={() => onPurchase?.(item)}
              disabled={!canAfford}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                canAfford
                  ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canAfford ? 'Buy' : 'Not enough'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default ShopItemCard;

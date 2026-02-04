import React, { memo } from 'react';
import { X, Gem } from 'lucide-react';
import { RARITY_STYLES } from './ShopConstants';
import { PriceDisplay } from './CurrencyDisplay';

// Gem packages for purchase
const GEM_PACKAGES = [
  { id: 'gems_100', amount: 100, bonus: 0, price: '$0.99', icon: '💎' },
  { id: 'gems_500', amount: 500, bonus: 50, price: '$4.99', icon: '💎', popular: true },
  { id: 'gems_1200', amount: 1200, bonus: 200, price: '$9.99', icon: '💎' },
  { id: 'gems_2500', amount: 2500, bonus: 500, price: '$19.99', icon: '💎' },
  { id: 'gems_6500', amount: 6500, bonus: 1500, price: '$49.99', icon: '💎', bestValue: true },
  { id: 'gems_14000', amount: 14000, bonus: 4000, price: '$99.99', icon: '💎' },
];

// Currency purchase modal
export const CurrencyPurchaseModal = memo(function CurrencyPurchaseModal({ onClose, onPurchase }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-modal-title"
    >
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 id="currency-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              <Gem className="w-6 h-6 text-cyan-400" />
              Get Gems
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {GEM_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => onPurchase(pkg)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                  pkg.popular
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : pkg.bestValue
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </span>
                )}
                {pkg.bestValue && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
                    BEST VALUE
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{pkg.icon}</span>
                  <div>
                    <div className="text-lg font-bold text-white">{pkg.amount.toLocaleString()}</div>
                    {pkg.bonus > 0 && (
                      <div className="text-xs text-green-400">+{pkg.bonus} Bonus!</div>
                    )}
                  </div>
                </div>
                <div className="text-lg font-bold text-cyan-400">{pkg.price}</div>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Purchases are non-refundable. By purchasing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
});

// Item preview modal
export const ItemPreviewModal = memo(function ItemPreviewModal({ item, onClose, onPurchase, owned, canAfford }) {
  const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-preview-title"
    >
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 overflow-hidden">
        {/* Preview area */}
        <div className={`aspect-square ${rarity.bg} flex items-center justify-center relative`}>
          <span className="text-9xl">{item.icon}</span>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 rounded-full hover:bg-black/50"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 id="item-preview-title" className="text-xl font-bold text-white">{item.name}</h3>
              <span className={`text-sm ${rarity.text}`}>{rarity.label}</span>
            </div>
            <PriceDisplay
              price={item.price}
              originalPrice={item.originalPrice}
              currency={item.currency}
            />
          </div>

          <p className="text-gray-400 text-sm mb-6">
            {item.description || 'A unique cosmetic item to show off your style!'}
          </p>

          {/* Bundle contents */}
          {item.type === 'bundle' && item.items && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Bundle Contents:</h4>
              <div className="space-y-2">
                {item.items.map((bundleItem, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg">
                    <span className="text-xl">{bundleItem.icon}</span>
                    <span className="text-white text-sm">{bundleItem.name}</span>
                    <span className={`text-xs ml-auto ${RARITY_STYLES[bundleItem.rarity]?.text || 'text-gray-400'}`}>
                      {RARITY_STYLES[bundleItem.rarity]?.label || 'Common'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase button */}
          {owned ? (
            <button
              disabled
              className="w-full py-3 bg-gray-700 text-gray-400 font-medium rounded-xl"
            >
              Already Owned
            </button>
          ) : (
            <button
              onClick={() => onPurchase(item)}
              disabled={!canAfford}
              className={`w-full py-3 font-medium rounded-xl transition-colors ${
                canAfford
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canAfford ? 'Purchase' : 'Not Enough Currency'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default { CurrencyPurchaseModal, ItemPreviewModal };

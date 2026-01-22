/**
 * In-Game Shop Component
 * Storefront with premium currency, daily deals, featured items, and bundles
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Gem,
  Coins,
  Star,
  Clock,
  Gift,
  Sparkles,
  Tag,
  Package,
  Crown,
  Zap,
  Shield,
  Palette,
  User,
  MapPin,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Info,
  Percent,
  TrendingUp,
  Heart,
  Eye,
  Lock,
  RefreshCw,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

// Currency types
const CURRENCIES = {
  coins: { icon: Coins, color: 'text-yellow-400', name: 'Coins' },
  gems: { icon: Gem, color: 'text-cyan-400', name: 'Gems' },
  tokens: { icon: Star, color: 'text-purple-400', name: 'Event Tokens' },
};

// Item categories
const CATEGORIES = {
  featured: { label: 'Featured', icon: Star },
  avatars: { label: 'Avatars', icon: User },
  skins: { label: 'Skins', icon: Palette },
  trails: { label: 'Trails', icon: MapPin },
  emotes: { label: 'Emotes', icon: Sparkles },
  sounds: { label: 'Sounds', icon: Volume2 },
  powerups: { label: 'Power-ups', icon: Zap },
  bundles: { label: 'Bundles', icon: Package },
};

// Rarity styles
const RARITY_STYLES = {
  common: { border: 'border-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Common' },
  uncommon: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400', label: 'Uncommon' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Rare' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Epic' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Legendary' },
};

// Format time remaining
function formatTimeRemaining(endTime) {
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

// Currency display component
function CurrencyDisplay({ type, amount, size = 'md' }) {
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
}

// Price display with optional discount
function PriceDisplay({ price, originalPrice, currency = 'coins' }) {
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
}

// Daily deal countdown
function DealCountdown({ endTime, label = 'Refreshes in' }) {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(endTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <Clock className="w-4 h-4" />
      <span>{label}: {timeLeft}</span>
    </div>
  );
}

// Shop item card
function ShopItemCard({ item, onPurchase, onPreview, owned, canAfford }) {
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
}

// Featured banner carousel
function FeaturedBanner({ items, onItemClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 border border-purple-500/30">
      <div className="flex items-center p-6">
        {/* Item preview */}
        <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
          <span className="text-8xl">{currentItem.icon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 ml-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
              FEATURED
            </span>
            {currentItem.isLimited && (
              <DealCountdown endTime={currentItem.endTime} label="Ends in" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{currentItem.name}</h2>
          <p className="text-gray-400 text-sm mb-4">{currentItem.description}</p>
          <div className="flex items-center gap-4">
            <PriceDisplay
              price={currentItem.price}
              originalPrice={currentItem.originalPrice}
              currency={currentItem.currency}
            />
            <button
              onClick={() => onItemClick?.(currentItem)}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}

// Daily deals section
function DailyDeals({ deals, refreshTime, onPurchase, balances, ownedItems }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-red-400" />
          Daily Deals
        </h3>
        <DealCountdown endTime={refreshTime} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deals.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            onPurchase={onPurchase}
            owned={ownedItems.has(item.id)}
            canAfford={(balances[item.currency] || 0) >= item.price}
          />
        ))}
      </div>
    </div>
  );
}

// Currency purchase modal
function CurrencyPurchaseModal({ onClose, onPurchase }) {
  const gemPackages = [
    { id: 'gems_100', amount: 100, bonus: 0, price: '$0.99', icon: '💎' },
    { id: 'gems_500', amount: 500, bonus: 50, price: '$4.99', icon: '💎', popular: true },
    { id: 'gems_1200', amount: 1200, bonus: 200, price: '$9.99', icon: '💎' },
    { id: 'gems_2500', amount: 2500, bonus: 500, price: '$19.99', icon: '💎' },
    { id: 'gems_6500', amount: 6500, bonus: 1500, price: '$49.99', icon: '💎', bestValue: true },
    { id: 'gems_14000', amount: 14000, bonus: 4000, price: '$99.99', icon: '💎' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Gem className="w-6 h-6 text-cyan-400" />
              Get Gems
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {gemPackages.map((pkg) => (
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
}

// Item preview modal
function ItemPreviewModal({ item, onClose, onPurchase, owned, canAfford }) {
  const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 overflow-hidden">
        {/* Preview area */}
        <div className={`aspect-square ${rarity.bg} flex items-center justify-center relative`}>
          <span className="text-9xl">{item.icon}</span>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 rounded-full hover:bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{item.name}</h3>
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
}

// Main Shop component
export default function Shop({
  userId,
  onPurchaseComplete,
  className = '',
}) {
  const [activeCategory, setActiveCategory] = useState('featured');
  const [balances, setBalances] = useState({ coins: 5000, gems: 150 });
  const [ownedItems, setOwnedItems] = useState(new Set(['avatar_1', 'trail_basic']));
  const [shopData, setShopData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load shop data
  useEffect(() => {
    // Mock shop data
    setShopData({
      featured: [
        { id: 'f1', name: 'Shadow Wolf', icon: '🐺', rarity: 'legendary', price: 1500, currency: 'gems', description: 'A mysterious shadow wolf avatar', isLimited: true, endTime: Date.now() + 86400000 * 2 },
        { id: 'f2', name: 'Golden Trail', icon: '✨', rarity: 'epic', price: 800, originalPrice: 1200, currency: 'gems', description: 'Leave a trail of gold wherever you go' },
      ],
      dailyDeals: [
        { id: 'd1', name: 'Fire Avatar', icon: '🔥', rarity: 'rare', price: 200, originalPrice: 400, currency: 'gems' },
        { id: 'd2', name: 'Speed Boost', icon: '⚡', rarity: 'uncommon', price: 500, originalPrice: 750, currency: 'coins' },
        { id: 'd3', name: 'Ninja Skin', icon: '🥷', rarity: 'epic', price: 600, originalPrice: 1000, currency: 'gems' },
        { id: 'd4', name: 'Thunder Sound', icon: '🌩️', rarity: 'rare', price: 300, originalPrice: 500, currency: 'gems' },
      ],
      categories: {
        avatars: [
          { id: 'a1', name: 'Ghost', icon: '👻', rarity: 'rare', price: 500, currency: 'gems' },
          { id: 'a2', name: 'Robot', icon: '🤖', rarity: 'epic', price: 800, currency: 'gems' },
          { id: 'a3', name: 'Dragon', icon: '🐲', rarity: 'legendary', price: 1500, currency: 'gems' },
          { id: 'a4', name: 'Fox', icon: '🦊', rarity: 'uncommon', price: 300, currency: 'gems' },
          { id: 'a5', name: 'Lion', icon: '🦁', rarity: 'rare', price: 600, currency: 'gems' },
          { id: 'a6', name: 'Eagle', icon: '🦅', rarity: 'rare', price: 550, currency: 'gems' },
        ],
        skins: [
          { id: 's1', name: 'Neon Glow', icon: '💜', rarity: 'epic', price: 1000, currency: 'gems' },
          { id: 's2', name: 'Ice Cold', icon: '❄️', rarity: 'rare', price: 600, currency: 'gems' },
          { id: 's3', name: 'Flame', icon: '🔥', rarity: 'rare', price: 600, currency: 'gems' },
        ],
        trails: [
          { id: 't1', name: 'Rainbow', icon: '🌈', rarity: 'epic', price: 750, currency: 'gems' },
          { id: 't2', name: 'Stars', icon: '⭐', rarity: 'rare', price: 450, currency: 'gems' },
          { id: 't3', name: 'Hearts', icon: '💕', rarity: 'uncommon', price: 250, currency: 'gems' },
        ],
        bundles: [
          {
            id: 'b1',
            name: 'Starter Pack',
            icon: '🎁',
            rarity: 'epic',
            price: 999,
            originalPrice: 2000,
            currency: 'gems',
            type: 'bundle',
            items: [
              { name: 'Fox Avatar', icon: '🦊', rarity: 'uncommon' },
              { name: 'Basic Trail', icon: '✨', rarity: 'common' },
              { name: 'Wave Emote', icon: '👋', rarity: 'common' },
              { name: '500 Coins', icon: '💰', rarity: 'common' },
            ],
          },
          {
            id: 'b2',
            name: 'Pro Bundle',
            icon: '👑',
            rarity: 'legendary',
            price: 2499,
            originalPrice: 5000,
            currency: 'gems',
            type: 'bundle',
            items: [
              { name: 'Dragon Avatar', icon: '🐲', rarity: 'legendary' },
              { name: 'Fire Trail', icon: '🔥', rarity: 'epic' },
              { name: 'Taunt Emote', icon: '😎', rarity: 'rare' },
              { name: 'Thunder Sound', icon: '⚡', rarity: 'rare' },
              { name: '2000 Coins', icon: '💰', rarity: 'common' },
            ],
          },
        ],
      },
      refreshTime: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    });
  }, []);

  // Get items for current category
  const currentItems = useMemo(() => {
    if (!shopData) return [];
    if (activeCategory === 'featured') return shopData.featured;
    return shopData.categories[activeCategory] || [];
  }, [shopData, activeCategory]);

  // Handle purchase
  const handlePurchase = useCallback((item) => {
    const cost = item.price;
    const currency = item.currency;

    if ((balances[currency] || 0) < cost) {
      setShowCurrencyModal(true);
      return;
    }

    // Process purchase
    setBalances((prev) => ({
      ...prev,
      [currency]: prev[currency] - cost,
    }));
    setOwnedItems((prev) => new Set([...prev, item.id]));
    setSelectedItem(null);
    onPurchaseComplete?.(item);
  }, [balances, onPurchaseComplete]);

  // Handle gem purchase
  const handleGemPurchase = useCallback((pkg) => {
    // In real app, this would open payment flow
    console.log('Purchase gems:', pkg);
    setBalances((prev) => ({
      ...prev,
      gems: prev.gems + pkg.amount + (pkg.bonus || 0),
    }));
    setShowCurrencyModal(false);
  }, []);

  if (!shopData) {
    return (
      <div className={`bg-gray-900/95 rounded-2xl p-8 text-center ${className}`}>
        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-600 animate-spin" />
        <p className="text-gray-400">Loading shop...</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Shop</h2>
          </div>

          {/* Currency balances */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full">
              <CurrencyDisplay type="coins" amount={balances.coins} />
            </div>
            <button
              onClick={() => setShowCurrencyModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 rounded-full hover:border-cyan-500 transition-colors"
            >
              <CurrencyDisplay type="gems" amount={balances.gems} />
              <span className="text-cyan-400 text-lg">+</span>
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                  : 'bg-gray-800/50 text-gray-400 border border-transparent hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
        {/* Featured banner */}
        {activeCategory === 'featured' && shopData.featured.length > 0 && (
          <FeaturedBanner items={shopData.featured} onItemClick={setSelectedItem} />
        )}

        {/* Daily deals */}
        {activeCategory === 'featured' && (
          <DailyDeals
            deals={shopData.dailyDeals}
            refreshTime={shopData.refreshTime}
            onPurchase={setSelectedItem}
            balances={balances}
            ownedItems={ownedItems}
          />
        )}

        {/* Category items */}
        {activeCategory !== 'featured' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentItems.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onPurchase={setSelectedItem}
                onPreview={setSelectedItem}
                owned={ownedItems.has(item.id)}
                canAfford={(balances[item.currency] || 0) >= item.price}
              />
            ))}
          </div>
        )}

        {currentItems.length === 0 && activeCategory !== 'featured' && (
          <div className="text-center py-12 text-gray-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items available in this category</p>
          </div>
        )}
      </div>

      {/* Item preview modal */}
      {selectedItem && (
        <ItemPreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPurchase={handlePurchase}
          owned={ownedItems.has(selectedItem.id)}
          canAfford={(balances[selectedItem.currency] || 0) >= selectedItem.price}
        />
      )}

      {/* Currency purchase modal */}
      {showCurrencyModal && (
        <CurrencyPurchaseModal
          onClose={() => setShowCurrencyModal(false)}
          onPurchase={handleGemPurchase}
        />
      )}
    </div>
  );
}

// Hook for shop data
export function useShop(userId) {
  const [balances, setBalances] = useState({ coins: 0, gems: 0 });
  const [ownedItems, setOwnedItems] = useState(new Set());

  const loadBalances = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}/balances`);
      const data = await response.json();
      setBalances(data.balances || { coins: 0, gems: 0 });
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  }, [userId]);

  const loadOwnedItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}/inventory`);
      const data = await response.json();
      setOwnedItems(new Set(data.items?.map((i) => i.id) || []));
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadBalances();
      loadOwnedItems();
    }
  }, [userId, loadBalances, loadOwnedItems]);

  return {
    balances,
    ownedItems,
    refresh: () => {
      loadBalances();
      loadOwnedItems();
    },
  };
}

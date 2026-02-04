import {
  Coins,
  Gem,
  Star,
  User,
  Palette,
  MapPin,
  Sparkles,
  Volume2,
  Zap,
  Package,
} from 'lucide-react';

// Currency types
export const CURRENCIES = {
  coins: { icon: Coins, color: 'text-yellow-400', name: 'Coins' },
  gems: { icon: Gem, color: 'text-cyan-400', name: 'Gems' },
  tokens: { icon: Star, color: 'text-purple-400', name: 'Event Tokens' },
};

// Item categories
export const CATEGORIES = {
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
export const RARITY_STYLES = {
  common: { border: 'border-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Common' },
  uncommon: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400', label: 'Uncommon' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Rare' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Epic' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Legendary' },
};

// Format time remaining
export function formatTimeRemaining(endTime) {
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

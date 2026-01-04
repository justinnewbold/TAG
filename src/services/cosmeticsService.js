/**
 * Cosmetics Service
 * Phase 5: Player customization - skins, trails, effects
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Cosmetic types
export const CosmeticType = {
  AVATAR_FRAME: 'avatar_frame',
  TRAIL: 'trail',
  TAG_EFFECT: 'tag_effect',
  VICTORY_ANIMATION: 'victory_animation',
  NAME_COLOR: 'name_color',
  BADGE: 'badge',
  EMOTE: 'emote',
};

// Rarity levels
export const Rarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

// Rarity colors for UI
export const RarityColors = {
  common: { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500' },
  uncommon: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
  rare: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
  epic: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
  legendary: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
};

// Default cosmetics available to all players
export const DEFAULT_COSMETICS = {
  avatar_frame: 'default',
  trail: 'none',
  tag_effect: 'default',
  victory_animation: 'default',
  name_color: '#FFFFFF',
  badge: null,
  emote: ['wave', 'thumbs_up'],
};

// Cosmetic catalog (would come from server in production)
export const COSMETIC_CATALOG = [
  // Avatar Frames
  { id: 'frame_fire', type: 'avatar_frame', name: 'Fire Frame', rarity: 'rare', price: 500, preview: '🔥' },
  { id: 'frame_ice', type: 'avatar_frame', name: 'Ice Frame', rarity: 'rare', price: 500, preview: '❄️' },
  { id: 'frame_gold', type: 'avatar_frame', name: 'Golden Frame', rarity: 'epic', price: 1000, preview: '✨' },
  { id: 'frame_champion', type: 'avatar_frame', name: 'Champion Frame', rarity: 'legendary', price: 2500, unlockCondition: 'Win 100 games' },

  // Trails
  { id: 'trail_sparkle', type: 'trail', name: 'Sparkle Trail', rarity: 'uncommon', price: 200 },
  { id: 'trail_rainbow', type: 'trail', name: 'Rainbow Trail', rarity: 'rare', price: 750 },
  { id: 'trail_lightning', type: 'trail', name: 'Lightning Trail', rarity: 'epic', price: 1500 },
  { id: 'trail_ghost', type: 'trail', name: 'Ghost Trail', rarity: 'legendary', price: 3000 },

  // Tag Effects
  { id: 'tag_explosion', type: 'tag_effect', name: 'Explosion', rarity: 'uncommon', price: 300 },
  { id: 'tag_confetti', type: 'tag_effect', name: 'Confetti', rarity: 'rare', price: 600 },
  { id: 'tag_lightning', type: 'tag_effect', name: 'Lightning Strike', rarity: 'epic', price: 1200 },
  { id: 'tag_shatter', type: 'tag_effect', name: 'Shatter', rarity: 'legendary', price: 2000 },

  // Victory Animations
  { id: 'victory_dance', type: 'victory_animation', name: 'Victory Dance', rarity: 'uncommon', price: 400 },
  { id: 'victory_fireworks', type: 'victory_animation', name: 'Fireworks', rarity: 'rare', price: 800 },
  { id: 'victory_throne', type: 'victory_animation', name: 'Throne Appear', rarity: 'epic', price: 1500 },
  { id: 'victory_legendary', type: 'victory_animation', name: 'Legendary Entrance', rarity: 'legendary', price: 3500 },

  // Name Colors
  { id: 'name_cyan', type: 'name_color', name: 'Neon Cyan', rarity: 'common', price: 100, value: '#00FFFF' },
  { id: 'name_purple', type: 'name_color', name: 'Neon Purple', rarity: 'common', price: 100, value: '#FF00FF' },
  { id: 'name_rainbow', type: 'name_color', name: 'Rainbow', rarity: 'epic', price: 2000, value: 'rainbow' },

  // Badges
  { id: 'badge_og', type: 'badge', name: 'OG Player', rarity: 'legendary', unlockCondition: 'Play during beta' },
  { id: 'badge_streak', type: 'badge', name: 'Streak Master', rarity: 'epic', unlockCondition: '30 day streak' },
  { id: 'badge_social', type: 'badge', name: 'Social Butterfly', rarity: 'rare', unlockCondition: 'Play with 50 unique players' },

  // Emotes
  { id: 'emote_laugh', type: 'emote', name: 'Laugh', rarity: 'common', price: 50 },
  { id: 'emote_cry', type: 'emote', name: 'Cry', rarity: 'common', price: 50 },
  { id: 'emote_taunt', type: 'emote', name: 'Taunt', rarity: 'uncommon', price: 150 },
  { id: 'emote_gg', type: 'emote', name: 'GG', rarity: 'rare', price: 300 },
];

class CosmeticsService {
  constructor() {
    this.cache = cacheService;
    this.ownedCosmetics = new Set();
    this.equippedCosmetics = { ...DEFAULT_COSMETICS };
    this.coins = 0;
  }

  /**
   * Load user's cosmetics from server
   */
  async loadUserCosmetics() {
    const cacheKey = 'user_cosmetics';
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.ownedCosmetics = new Set(cached.owned);
      this.equippedCosmetics = { ...DEFAULT_COSMETICS, ...cached.equipped };
      this.coins = cached.coins;
      return cached;
    }

    try {
      const data = await api.request('/cosmetics/user');
      this.ownedCosmetics = new Set(data.owned || []);
      this.equippedCosmetics = { ...DEFAULT_COSMETICS, ...data.equipped };
      this.coins = data.coins || 0;

      await this.cache.set(cacheKey, {
        owned: Array.from(this.ownedCosmetics),
        equipped: this.equippedCosmetics,
        coins: this.coins,
      }, CacheTTL.MEDIUM);

      return data;
    } catch (error) {
      console.error('Failed to load cosmetics:', error);
      throw error;
    }
  }

  /**
   * Get all available cosmetics (catalog)
   */
  async getCatalog() {
    const cacheKey = 'cosmetics_catalog';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await api.request('/cosmetics/catalog');
      await this.cache.set(cacheKey, data, CacheTTL.LONG);
      return data;
    } catch (error) {
      // Fall back to local catalog
      return COSMETIC_CATALOG;
    }
  }

  /**
   * Purchase a cosmetic item
   */
  async purchaseCosmetic(cosmeticId) {
    try {
      const data = await api.request(`/cosmetics/${cosmeticId}/purchase`, {
        method: 'POST',
      });

      // Update local state
      this.ownedCosmetics.add(cosmeticId);
      this.coins = data.remainingCoins;

      // Clear cache
      await this.cache.remove('user_cosmetics');

      return data;
    } catch (error) {
      console.error('Failed to purchase cosmetic:', error);
      throw error;
    }
  }

  /**
   * Equip a cosmetic item
   */
  async equipCosmetic(cosmeticId, type) {
    if (!this.ownedCosmetics.has(cosmeticId) && cosmeticId !== 'default' && cosmeticId !== 'none') {
      throw new Error('You do not own this cosmetic');
    }

    try {
      const data = await api.request('/cosmetics/equip', {
        method: 'POST',
        body: JSON.stringify({ cosmeticId, type }),
      });

      // Update local state
      this.equippedCosmetics[type] = cosmeticId;

      // Clear cache
      await this.cache.remove('user_cosmetics');

      return data;
    } catch (error) {
      console.error('Failed to equip cosmetic:', error);
      throw error;
    }
  }

  /**
   * Unequip a cosmetic (reset to default)
   */
  async unequipCosmetic(type) {
    return this.equipCosmetic(DEFAULT_COSMETICS[type] || 'default', type);
  }

  /**
   * Check if user owns a cosmetic
   */
  ownsCosmetic(cosmeticId) {
    return this.ownedCosmetics.has(cosmeticId);
  }

  /**
   * Get currently equipped cosmetic for a type
   */
  getEquipped(type) {
    return this.equippedCosmetics[type] || DEFAULT_COSMETICS[type];
  }

  /**
   * Get all equipped cosmetics
   */
  getAllEquipped() {
    return { ...this.equippedCosmetics };
  }

  /**
   * Get cosmetics by type
   */
  getCosmeticsByType(type) {
    return COSMETIC_CATALOG.filter(c => c.type === type);
  }

  /**
   * Get owned cosmetics by type
   */
  getOwnedByType(type) {
    return COSMETIC_CATALOG.filter(
      c => c.type === type && this.ownedCosmetics.has(c.id)
    );
  }

  /**
   * Check if user can afford a cosmetic
   */
  canAfford(price) {
    return this.coins >= price;
  }

  /**
   * Get user's coin balance
   */
  getCoins() {
    return this.coins;
  }

  /**
   * Get rarity display info
   */
  getRarityInfo(rarity) {
    return RarityColors[rarity] || RarityColors.common;
  }

  /**
   * Preview a cosmetic (for UI display)
   */
  getPreviewData(cosmeticId) {
    const cosmetic = COSMETIC_CATALOG.find(c => c.id === cosmeticId);
    if (!cosmetic) return null;

    return {
      ...cosmetic,
      owned: this.ownedCosmetics.has(cosmeticId),
      equipped: this.equippedCosmetics[cosmetic.type] === cosmeticId,
      canAfford: cosmetic.price ? this.canAfford(cosmetic.price) : false,
      rarityInfo: this.getRarityInfo(cosmetic.rarity),
    };
  }

  /**
   * Unlock a cosmetic (via achievement, event, etc.)
   */
  async unlockCosmetic(cosmeticId, source) {
    try {
      const data = await api.request(`/cosmetics/${cosmeticId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ source }),
      });

      this.ownedCosmetics.add(cosmeticId);
      await this.cache.remove('user_cosmetics');

      return data;
    } catch (error) {
      console.error('Failed to unlock cosmetic:', error);
      throw error;
    }
  }

  /**
   * Clear cosmetics cache
   */
  async clearCache() {
    await this.cache.remove('user_cosmetics');
    await this.cache.remove('cosmetics_catalog');
  }
}

// Singleton instance
export const cosmeticsService = new CosmeticsService();
export default cosmeticsService;

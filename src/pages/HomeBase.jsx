import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Shield, Radar, Zap, DollarSign, MapPin, ChevronUp, Users, Lock, Eye } from 'lucide-react';
import { useStore } from '../store';
import { homeBaseService } from '../services/homeBaseService';
import { HOME_BASE_CONFIG } from '../../shared/constants.js';

function HomeBase() {
  const navigate = useNavigate();
  const { user, userLocation } = useStore();
  const [base, setBase] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [baseName, setBaseName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadBase();
  }, []);

  const loadBase = async () => {
    try {
      setLoading(true);
      const data = await homeBaseService.getMyBase();
      setBase(data.base);
      setVisitors(data.visitors || []);
    } catch (err) {
      // No base yet is fine
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!userLocation) {
      setError('Enable location to claim a base');
      return;
    }
    try {
      setClaiming(true);
      setError('');
      const data = await homeBaseService.claimBase(
        userLocation.lat, userLocation.lng, baseName || 'My Base'
      );
      setBase(data.base);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleUpgrade = async (upgradeId) => {
    try {
      setUpgrading(upgradeId);
      setError('');
      const data = await homeBaseService.upgradeBase(upgradeId);
      loadBase();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpgrading(null);
    }
  };

  const getUpgradeIcon = (id) => {
    switch (id) {
      case 'SAFE_ZONE': return Shield;
      case 'RADAR_TOWER': return Radar;
      case 'TRAP_LAYER': return Zap;
      case 'INCOME': return DollarSign;
      default: return Home;
    }
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No base yet - claim screen
  if (!base) {
    return (
      <div className="min-h-screen bg-dark-900 pb-24">
        <header className="px-4 pt-safe pb-3 border-b border-white/10">
          <h1 className="text-2xl font-display font-bold text-white">
            Home <span className="text-neon-purple">Base</span>
          </h1>
          <p className="text-white/50 text-sm mt-0.5">Claim your territory</p>
        </header>

        <div className="px-4 mt-8">
          <div className="bg-gradient-to-br from-neon-purple/10 to-neon-cyan/10 border border-neon-purple/20 rounded-2xl p-6 text-center">
            <Home className="w-16 h-16 text-neon-purple mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Claim Your Home Base</h2>
            <p className="text-white/50 text-sm mb-6">
              Plant your flag at your current location. Your base creates a safe zone,
              earns passive income, and shows your dominance on the map.
            </p>

            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Name your base..."
              maxLength={30}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-neon-purple/50 mb-4"
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={handleClaim}
              disabled={claiming || !userLocation}
              className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-dark-900 rounded-xl font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-neon-purple/25 transition-all"
            >
              {claiming ? 'Claiming...' : 'Claim This Location'}
            </button>

            {!userLocation && (
              <p className="text-white/30 text-xs mt-2">Enable location services to claim</p>
            )}

            {/* Preview of upgrades */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              {Object.entries(HOME_BASE_CONFIG.UPGRADES).map(([key, upgrade]) => {
                const Icon = getUpgradeIcon(key);
                return (
                  <div key={key} className="bg-dark-800/50 border border-white/5 rounded-xl p-3 text-left">
                    <Icon className="w-5 h-5 text-neon-purple mb-1" />
                    <p className="text-white text-xs font-medium">{upgrade.name}</p>
                    <p className="text-white/30 text-[10px]">{upgrade.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has base - management screen
  const upgrades = typeof base.upgrades === 'string' ? JSON.parse(base.upgrades) : (base.upgrades || {});

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Home <span className="text-neon-purple">Base</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">{base.name}</p>
          </div>
          <div className="bg-neon-purple/20 border border-neon-purple/30 rounded-xl px-3 py-1.5">
            <span className="text-neon-purple font-bold text-sm">Level {base.level}</span>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Base Overview */}
        <div className="bg-gradient-to-br from-neon-purple/10 to-dark-800 border border-neon-purple/20 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-neon-purple/20 flex items-center justify-center">
              <Home className="w-8 h-8 text-neon-purple" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{base.name}</h3>
              <p className="text-white/40 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {base.lat?.toFixed(4)}, {base.lng?.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-dark-800/50 rounded-xl p-2.5 text-center">
              <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">
                {HOME_BASE_CONFIG.UPGRADES.SAFE_ZONE.levels[upgrades.safe_zone || 0]}m
              </p>
              <p className="text-white/30 text-[10px]">Safe Zone</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-2.5 text-center">
              <Radar className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">
                {HOME_BASE_CONFIG.UPGRADES.RADAR_TOWER.levels[upgrades.radar_tower || 0]}m
              </p>
              <p className="text-white/30 text-[10px]">Radar</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-2.5 text-center">
              <DollarSign className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">
                {HOME_BASE_CONFIG.UPGRADES.INCOME.levels[upgrades.income || 0]}/hr
              </p>
              <p className="text-white/30 text-[10px]">Income</p>
            </div>
          </div>
        </div>

        {/* Upgrades */}
        <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider">Upgrades</h3>
        {Object.entries(HOME_BASE_CONFIG.UPGRADES).map(([key, upgrade]) => {
          const Icon = getUpgradeIcon(key);
          const currentLevel = upgrades[upgrade.id] || 0;
          const isMaxed = currentLevel >= upgrade.levels.length - 1;
          const nextCost = isMaxed ? 0 : upgrade.costs[currentLevel + 1];
          const currentValue = upgrade.levels[currentLevel];
          const nextValue = isMaxed ? currentValue : upgrade.levels[currentLevel + 1];

          return (
            <div key={key} className="bg-dark-800 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{upgrade.name}</h4>
                    <p className="text-white/40 text-xs">{upgrade.description}</p>
                  </div>
                </div>
                <span className="text-neon-purple text-xs font-bold">
                  Lv.{currentLevel}/{upgrade.levels.length - 1}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-neon-purple rounded-full transition-all"
                  style={{ width: `${(currentLevel / (upgrade.levels.length - 1)) * 100}%` }}
                />
              </div>

              {!isMaxed ? (
                <button
                  onClick={() => handleUpgrade(upgrade.id)}
                  disabled={upgrading === upgrade.id}
                  className="w-full py-2 bg-neon-purple/10 border border-neon-purple/20 text-neon-purple rounded-xl text-sm font-medium hover:bg-neon-purple/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ChevronUp className="w-4 h-4" />
                  {upgrading === upgrade.id ? 'Upgrading...' : `Upgrade (${nextCost.toLocaleString()} coins) - ${currentValue} -> ${nextValue}`}
                </button>
              ) : (
                <div className="text-center py-2 text-green-400 text-xs font-medium">MAX LEVEL</div>
              )}
            </div>
          );
        })}

        {/* Recent Visitors */}
        <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mt-6">Recent Visitors</h3>
        {visitors.length === 0 ? (
          <div className="bg-dark-800 border border-white/10 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-xs">No visitors yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {visitors.map(visitor => (
              <div key={visitor.id} className="bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm">
                  {visitor.avatar || '😀'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{visitor.name}</p>
                </div>
                <span className="text-white/30 text-xs">{getTimeSince(visitor.visited_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeBase;

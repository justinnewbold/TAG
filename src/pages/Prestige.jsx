import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Zap, Trophy, Gift, ChevronRight, RotateCcw, Crown, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { prestigeService } from '../services/prestigeService';
import { PRESTIGE_CONFIG } from '../../shared/constants.js';

function Prestige() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [prestige, setPrestige] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prestiging, setPrestiging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tab, setTab] = useState('status'); // status, rewards, leaderboard
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrestige();
  }, []);

  const loadPrestige = async () => {
    try {
      setLoading(true);
      const [prestigeData, leaderData] = await Promise.all([
        prestigeService.getPrestige(),
        prestigeService.getLeaderboard(),
      ]);
      setPrestige(prestigeData.prestige);
      setLeaders(leaderData.leaders || []);
    } catch (err) {
      setError('Failed to load prestige info');
    } finally {
      setLoading(false);
    }
  };

  const handlePrestige = async () => {
    try {
      setPrestiging(true);
      setError('');
      const result = await prestigeService.performPrestige();
      setShowConfirm(false);
      loadPrestige();
    } catch (err) {
      setError(err.message);
    } finally {
      setPrestiging(false);
    }
  };

  const getXpForLevel = (level) => level * 100;

  const getXpProgress = () => {
    if (!prestige) return 0;
    if (prestige.current_level >= PRESTIGE_CONFIG.MAX_LEVEL) return 100;
    const needed = getXpForLevel(prestige.current_level);
    return Math.min((prestige.current_xp / needed) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPrestigeName = prestige?.prestigeName || 'Unranked';
  const currentPrestigeColor = prestige?.prestigeColor || 'gray-400';

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              <span className="text-neon-cyan">Prestige</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Reset. Ascend. Dominate.</p>
          </div>
          {prestige && (
            <div className={`bg-${currentPrestigeColor}/20 border border-${currentPrestigeColor}/30 rounded-xl px-3 py-1.5`}>
              <span className={`text-${currentPrestigeColor} font-bold text-sm`}>
                {currentPrestigeName} {prestige.prestige_level > 0 ? `P${prestige.prestige_level}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'status', label: 'Status', icon: Star },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'leaderboard', label: 'Rankings', icon: Trophy },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Status Tab */}
        {tab === 'status' && prestige && (
          <>
            {/* Level Display */}
            <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 rounded-2xl p-6 text-center">
              <div className="relative inline-block">
                <div className={`w-24 h-24 rounded-full bg-${currentPrestigeColor}/20 border-4 border-${currentPrestigeColor}/40 flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-3xl font-bold text-white">{prestige.current_level}</span>
                </div>
                {prestige.prestige_level > 0 && (
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-neon-cyan rounded-full flex items-center justify-center border-2 border-dark-900">
                    <span className="text-dark-900 font-bold text-xs">P{prestige.prestige_level}</span>
                  </div>
                )}
              </div>

              <h2 className={`text-${currentPrestigeColor} text-xl font-bold`}>{currentPrestigeName}</h2>
              <p className="text-white/40 text-sm">Level {prestige.current_level} / {PRESTIGE_CONFIG.MAX_LEVEL}</p>

              {/* XP Bar */}
              <div className="mt-4 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                  <span>{prestige.current_xp?.toLocaleString()} XP</span>
                  <span>{getXpForLevel(prestige.current_level).toLocaleString()} XP</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all"
                    style={{ width: `${getXpProgress()}%` }}
                  />
                </div>
              </div>

              {/* XP Multiplier */}
              {prestige.xpMultiplier > 1 && (
                <div className="mt-3 inline-flex items-center gap-1 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg px-3 py-1">
                  <Zap className="w-3.5 h-3.5 text-neon-cyan" />
                  <span className="text-neon-cyan text-xs font-bold">{prestige.xpMultiplier.toFixed(1)}x XP Multiplier</span>
                </div>
              )}

              <div className="mt-2 text-white/30 text-xs">
                Lifetime XP: {prestige.lifetime_xp?.toLocaleString()}
              </div>
            </div>

            {/* Prestige Button */}
            {prestige.canPrestige ? (
              <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/30 rounded-2xl p-4">
                <h3 className="text-white font-bold text-center mb-2 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-neon-cyan" />
                  Ready to Prestige!
                </h3>
                <p className="text-white/50 text-xs text-center mb-4">
                  Reset to level 1 and earn Prestige {prestige.prestige_level + 1} rewards.
                  Your XP multiplier will increase to {(1 + ((prestige.prestige_level + 1) * 0.10)).toFixed(1)}x.
                </p>
                {prestige.nextReward && (
                  <div className="bg-dark-800/50 rounded-xl p-3 mb-4 text-center">
                    <p className="text-amber-400 font-bold">{prestige.nextReward.coins.toLocaleString()} Coins</p>
                    <p className="text-neon-purple text-xs">+ "{prestige.nextReward.title}" Title</p>
                    <p className="text-white/30 text-xs">+ Exclusive Cosmetic</p>
                  </div>
                )}
                {showConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePrestige}
                      disabled={prestiging}
                      className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-dark-900 rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      {prestiging ? 'Ascending...' : 'Confirm Prestige'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-dark-900 rounded-xl font-bold hover:shadow-lg hover:shadow-neon-purple/25 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Prestige Now
                  </button>
                )}
              </div>
            ) : prestige.prestige_level >= PRESTIGE_CONFIG.MAX_PRESTIGE ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                <Crown className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h3 className="text-amber-400 font-bold">Maximum Prestige Reached</h3>
                <p className="text-white/40 text-xs mt-1">You have achieved the highest prestige level.</p>
              </div>
            ) : (
              <div className="bg-dark-800 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-white/50 text-sm">
                  Reach level {PRESTIGE_CONFIG.MAX_LEVEL} to prestige
                </p>
                <p className="text-white/30 text-xs mt-1">
                  {PRESTIGE_CONFIG.MAX_LEVEL - (prestige.current_level || 1)} levels remaining
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-dark-800 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-neon-purple">{prestige.total_prestiges || 0}</p>
                <p className="text-white/40 text-xs">Times Prestiged</p>
              </div>
              <div className="bg-dark-800 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-neon-cyan">{prestige.xpMultiplier?.toFixed(1) || '1.0'}x</p>
                <p className="text-white/40 text-xs">XP Multiplier</p>
              </div>
            </div>
          </>
        )}

        {/* Rewards Tab */}
        {tab === 'rewards' && (
          <div className="space-y-2">
            {Object.entries(PRESTIGE_CONFIG.REWARDS).map(([level, reward]) => {
              const prestigeLevel = parseInt(level);
              const isUnlocked = (prestige?.prestige_level || 0) >= prestigeLevel;
              const isCurrent = prestigeLevel === (prestige?.prestige_level || 0) + 1;
              const color = PRESTIGE_CONFIG.PRESTIGE_COLORS[prestigeLevel - 1];
              const name = PRESTIGE_CONFIG.PRESTIGE_NAMES[prestigeLevel - 1];

              return (
                <div
                  key={level}
                  className={`bg-dark-800 border rounded-2xl p-4 transition-all ${
                    isUnlocked ? 'border-green-500/30 bg-green-500/5' :
                    isCurrent ? `border-${color}/30 bg-${color}/5` :
                    'border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isUnlocked ? 'bg-green-500/20' : `bg-${color}/20`
                    }`}>
                      <span className="text-2xl font-bold text-white">P{prestigeLevel}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${isUnlocked ? 'text-green-400' : `text-${color}`}`}>
                        {name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-amber-400 text-xs">{reward.coins.toLocaleString()} coins</span>
                        <span className="text-neon-purple text-xs">"{reward.title}" title</span>
                      </div>
                    </div>
                    {isUnlocked && (
                      <span className="text-green-400 text-xs font-bold">EARNED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {leaders.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No prestige rankings yet</p>
              </div>
            ) : (
              leaders.map((leader, index) => {
                const pColor = leader.prestige_level > 0 ? PRESTIGE_CONFIG.PRESTIGE_COLORS[leader.prestige_level - 1] : 'gray-400';
                const pName = leader.prestige_level > 0 ? PRESTIGE_CONFIG.PRESTIGE_NAMES[leader.prestige_level - 1] : 'None';
                return (
                  <div
                    key={leader.user_id}
                    className="bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-500/30 text-amber-400' :
                      index === 1 ? 'bg-gray-400/30 text-gray-300' :
                      index === 2 ? 'bg-orange-600/30 text-orange-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-lg">
                      {leader.avatar || '😀'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{leader.name}</p>
                      <p className={`text-${pColor} text-xs`}>
                        {pName} P{leader.prestige_level} - Lv.{leader.current_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-neon-cyan text-xs font-bold">{parseInt(leader.lifetime_xp).toLocaleString()} XP</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Prestige;

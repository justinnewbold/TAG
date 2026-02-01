import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, TrendingUp, TrendingDown, Minus, Eye, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { nemesisService } from '../services/nemesisService';
import { NEMESIS_CONFIG } from '../../shared/constants.js';

function Nemesis() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [rivalries, setRivalries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRivalries();
  }, []);

  const loadRivalries = async () => {
    try {
      setLoading(true);
      const data = await nemesisService.getRivalries();
      setRivalries(data.rivalries || []);
    } catch (err) {
      setError('Failed to load rivalries');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  };

  const getTitleBadge = (title, color) => {
    const bgColors = {
      'yellow-400': 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      'orange-500': 'bg-orange-500/20 border-orange-500/30 text-orange-400',
      'red-500': 'bg-red-500/20 border-red-500/30 text-red-400',
    };
    return bgColors[color] || 'bg-white/10 border-white/20 text-white/50';
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              <span className="text-orange-400">Nemesis</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Your fiercest rivalries</p>
          </div>
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{rivalries.length} Rivals</span>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Nemesis explanation */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-4">
          <h3 className="text-orange-400 font-semibold text-sm mb-2 flex items-center gap-2">
            <Swords className="w-4 h-4" /> How Rivalries Form
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {Object.entries(NEMESIS_CONFIG.TITLES).map(([key, title]) => (
              <div key={key} className={`rounded-lg p-2 border ${getTitleBadge(title.name, title.color)}`}>
                <p className="text-xs font-bold">{title.name}</p>
                <p className="text-[10px] opacity-70">{title.min}+ encounters</p>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-2">
            Tag the same player repeatedly to form rivalries. Tagging your nemesis earns +{NEMESIS_CONFIG.NEMESIS_BONUS_XP} bonus XP!
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Loading rivalries...</p>
          </div>
        ) : rivalries.length === 0 ? (
          <div className="text-center py-12">
            <Swords className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">No rivalries yet</p>
            <p className="text-white/30 text-sm mt-1">
              Tag the same player {NEMESIS_CONFIG.MIN_ENCOUNTERS}+ times to start a rivalry
            </p>
          </div>
        ) : (
          rivalries.map((rivalry, index) => {
            const winRate = Math.round(rivalry.winRate * 100);
            const isWinning = winRate > 50;
            const isTied = winRate === 50;
            const TrendIcon = isWinning ? TrendingUp : isTied ? Minus : TrendingDown;
            const trendColor = isWinning ? 'text-green-400' : isTied ? 'text-white/50' : 'text-red-400';

            return (
              <div
                key={rivalry.opponentId}
                className="bg-dark-800 border border-white/10 rounded-2xl p-4 hover:border-orange-500/30 transition-all"
              >
                {/* Title badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getTitleBadge(rivalry.title, rivalry.titleColor)}`}>
                    {rivalry.title}
                  </span>
                  <span className="text-white/30 text-xs">{getTimeSince(rivalry.lastEncounter)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-dark-700 flex items-center justify-center text-2xl border-2 border-orange-500/30">
                    {rivalry.opponentAvatar || '😈'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg truncate">{rivalry.opponentName}</h3>
                    <p className="text-white/40 text-xs">{rivalry.totalEncounters} total encounters</p>
                  </div>
                  <button
                    onClick={() => navigate(`/profile/${rivalry.opponentId}`)}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
                  >
                    <Eye className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Score */}
                <div className="mt-3 bg-dark-700 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-green-400 font-bold text-xl">{rivalry.myTags}</p>
                      <p className="text-white/40 text-[10px]">YOUR TAGS</p>
                    </div>
                    <div className="text-center px-4">
                      <div className={`flex items-center gap-1 ${trendColor}`}>
                        <TrendIcon className="w-4 h-4" />
                        <span className="font-bold text-sm">{winRate}%</span>
                      </div>
                      <p className="text-white/40 text-[10px]">WIN RATE</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 font-bold text-xl">{rivalry.theirTags}</p>
                      <p className="text-white/40 text-[10px]">THEIR TAGS</p>
                    </div>
                  </div>

                  {/* Visual bar */}
                  <div className="mt-2 h-2 bg-red-500/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Nemesis;

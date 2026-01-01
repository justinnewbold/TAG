import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Star, Shield, Award, Zap } from 'lucide-react';
import { aiService } from '../../services/ai';

const TIER_CONFIG = {
  legend: {
    name: 'Legend',
    color: 'from-amber-400 to-orange-500',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    icon: Trophy,
    minRating: 1800,
  },
  diamond: {
    name: 'Diamond',
    color: 'from-cyan-400 to-blue-500',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500',
    icon: Star,
    minRating: 1500,
  },
  gold: {
    name: 'Gold',
    color: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500',
    icon: Award,
    minRating: 1300,
  },
  silver: {
    name: 'Silver',
    color: 'from-gray-300 to-gray-400',
    bgColor: 'bg-gray-400/20',
    borderColor: 'border-gray-400',
    icon: Shield,
    minRating: 1100,
  },
  bronze: {
    name: 'Bronze',
    color: 'from-orange-600 to-orange-700',
    bgColor: 'bg-orange-600/20',
    borderColor: 'border-orange-600',
    icon: Zap,
    minRating: 0,
  },
  unranked: {
    name: 'Unranked',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500',
    icon: Zap,
    minRating: 0,
  },
};

export default function SkillRating({ playerId, compact = false }) {
  const [rating, setRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    loadRating();
  }, [playerId]);

  const loadRating = async () => {
    setIsLoading(true);
    try {
      const data = await aiService.getSkillRating(playerId);
      setRating(data);
    } catch (error) {
      console.error('Failed to load rating:', error);
      setRating({ rating: 1000, tier: 'unranked', confidence: 'low' });
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-sm text-white/50">Loading rank...</span>
      </div>
    );
  }

  if (!rating) return null;

  const tierConfig = TIER_CONFIG[rating.tier] || TIER_CONFIG.unranked;
  const TierIcon = tierConfig.icon;
  const nextTier = Object.values(TIER_CONFIG).find(t => t.minRating > rating.rating);
  const progressToNext = nextTier 
    ? ((rating.rating - tierConfig.minRating) / (nextTier.minRating - tierConfig.minRating)) * 100
    : 100;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${tierConfig.bgColor} border ${tierConfig.borderColor}`}>
        <TierIcon className="w-4 h-4" />
        <span className="text-sm font-bold">{rating.rating}</span>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neon-cyan" />
          Skill Rating
        </h3>
        <span className="text-xs text-white/50">
          {rating.confidence} confidence
        </span>
      </div>

      {/* Main rating display */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${tierConfig.color}`}>
          <TierIcon className="w-10 h-10 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold">{rating.rating}</p>
          <p className={`text-lg font-medium bg-gradient-to-r ${tierConfig.color} bg-clip-text text-transparent`}>
            {tierConfig.name}
          </p>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>{tierConfig.name}</span>
            <span>{nextTier.name}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${tierConfig.color} transition-all duration-500`}
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1 text-center">
            {nextTier.minRating - rating.rating} points to {nextTier.name}
          </p>
        </div>
      )}

      {/* Breakdown toggle */}
      {rating.breakdown && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full text-center text-sm text-neon-cyan hover:text-neon-cyan/80"
          >
            {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 p-3 bg-white/5 rounded-xl">
              {Object.entries(rating.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-white/60 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={value > 0 ? 'text-green-400' : 'text-white/40'}>
                    +{value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

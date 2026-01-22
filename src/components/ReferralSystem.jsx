import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Gift,
  Copy,
  Check,
  Share2,
  Trophy,
  Star,
  Crown,
  Zap,
  Target,
  ChevronRight,
  Clock,
  Award,
  Sparkles,
  UserPlus,
  MessageSquare,
  Mail,
  QrCode,
  Download,
  ExternalLink,
  TrendingUp,
  Calendar,
  Gem,
  Coins,
  Shield,
} from 'lucide-react';

// Referral tiers with escalating rewards
const REFERRAL_TIERS = [
  {
    id: 'bronze',
    name: 'Bronze Recruiter',
    referrals: 1,
    icon: UserPlus,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    rewards: [
      { type: 'coins', amount: 500, label: '500 Coins' },
      { type: 'xp_boost', amount: 10, label: '10% XP Boost (24h)' },
    ],
  },
  {
    id: 'silver',
    name: 'Silver Recruiter',
    referrals: 5,
    icon: Star,
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400/30',
    rewards: [
      { type: 'coins', amount: 2000, label: '2,000 Coins' },
      { type: 'gems', amount: 50, label: '50 Gems' },
      { type: 'skin', id: 'recruiter_silver', label: 'Silver Recruiter Skin' },
    ],
  },
  {
    id: 'gold',
    name: 'Gold Recruiter',
    referrals: 15,
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    rewards: [
      { type: 'coins', amount: 5000, label: '5,000 Coins' },
      { type: 'gems', amount: 150, label: '150 Gems' },
      { type: 'title', id: 'gold_recruiter', label: '"Gold Recruiter" Title' },
      { type: 'trail', id: 'gold_trail', label: 'Golden Trail Effect' },
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum Recruiter',
    referrals: 30,
    icon: Award,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    rewards: [
      { type: 'coins', amount: 10000, label: '10,000 Coins' },
      { type: 'gems', amount: 300, label: '300 Gems' },
      { type: 'battle_pass', label: 'Free Battle Pass' },
      { type: 'avatar_frame', id: 'platinum_frame', label: 'Platinum Avatar Frame' },
    ],
  },
  {
    id: 'diamond',
    name: 'Diamond Recruiter',
    referrals: 50,
    icon: Crown,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    rewards: [
      { type: 'coins', amount: 25000, label: '25,000 Coins' },
      { type: 'gems', amount: 500, label: '500 Gems' },
      { type: 'exclusive_skin', id: 'diamond_legend', label: 'Diamond Legend Skin (Exclusive)' },
      { type: 'badge', id: 'community_builder', label: 'Community Builder Badge' },
      { type: 'revenue_share', amount: 5, label: '5% Revenue Share on Referrals' },
    ],
  },
];

// Milestone bonuses for specific achievements
const MILESTONE_BONUSES = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Get your first successful referral',
    condition: 'first_referral',
    reward: { type: 'gems', amount: 25 },
    icon: Target,
  },
  {
    id: 'quick_start',
    name: 'Quick Start',
    description: '3 referrals in your first week',
    condition: 'three_in_week',
    reward: { type: 'coins', amount: 1000 },
    icon: Zap,
  },
  {
    id: 'friend_group',
    name: 'Friend Group',
    description: 'Have 5 referrals play together in one game',
    condition: 'group_game',
    reward: { type: 'skin', id: 'squad_leader' },
    icon: Users,
  },
  {
    id: 'active_network',
    name: 'Active Network',
    description: '10 referrals reach level 10',
    condition: 'ten_level_ten',
    reward: { type: 'gems', amount: 200 },
    icon: TrendingUp,
  },
  {
    id: 'legendary_recruiter',
    name: 'Legendary Recruiter',
    description: 'Have a referral reach Diamond rank',
    condition: 'referral_diamond',
    reward: { type: 'exclusive_title', id: 'mentor' },
    icon: Crown,
  },
];

// Share methods configuration
const SHARE_METHODS = [
  { id: 'copy', name: 'Copy Link', icon: Copy, color: 'bg-gray-600' },
  { id: 'qr', name: 'QR Code', icon: QrCode, color: 'bg-blue-600' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, color: 'bg-green-600' },
  { id: 'email', name: 'Email', icon: Mail, color: 'bg-red-600' },
  { id: 'share', name: 'Share', icon: Share2, color: 'bg-purple-600' },
];

// Custom hook for referral system state
const useReferralSystem = () => {
  const [referralData, setReferralData] = useState({
    code: 'TAG-PLAYER123',
    link: 'https://playtag.game/r/PLAYER123',
    totalReferrals: 23,
    activeReferrals: 18,
    pendingReferrals: 3,
    currentTier: 'gold',
    totalEarnings: { coins: 7500, gems: 200 },
    lifetimeValue: 156.50,
    claimedMilestones: ['first_blood', 'quick_start', 'friend_group'],
    claimedTiers: ['bronze', 'silver', 'gold'],
  });

  const [referrals, setReferrals] = useState([
    {
      id: 1,
      username: 'SpeedyRunner',
      avatar: null,
      joinedAt: '2024-01-15',
      status: 'active',
      level: 24,
      gamesPlayed: 156,
      earnings: 45.00,
    },
    {
      id: 2,
      username: 'NightHunter',
      avatar: null,
      joinedAt: '2024-01-18',
      status: 'active',
      level: 18,
      gamesPlayed: 89,
      earnings: 32.50,
    },
    {
      id: 3,
      username: 'TagMaster99',
      avatar: null,
      joinedAt: '2024-01-20',
      status: 'active',
      level: 31,
      gamesPlayed: 234,
      earnings: 67.00,
    },
    {
      id: 4,
      username: 'NewPlayer42',
      avatar: null,
      joinedAt: '2024-01-22',
      status: 'pending',
      level: 2,
      gamesPlayed: 3,
      earnings: 0,
    },
    {
      id: 5,
      username: 'GhostTag',
      avatar: null,
      joinedAt: '2024-01-10',
      status: 'inactive',
      level: 8,
      gamesPlayed: 24,
      earnings: 12.00,
    },
  ]);

  const [weeklyStats, setWeeklyStats] = useState({
    newReferrals: 4,
    activeGames: 127,
    coinsEarned: 850,
    gemsEarned: 25,
  });

  const regenerateCode = useCallback(() => {
    const newCode = 'TAG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setReferralData(prev => ({
      ...prev,
      code: newCode,
      link: `https://playtag.game/r/${newCode.replace('TAG-', '')}`,
    }));
  }, []);

  const claimTierReward = useCallback((tierId) => {
    if (!referralData.claimedTiers.includes(tierId)) {
      setReferralData(prev => ({
        ...prev,
        claimedTiers: [...prev.claimedTiers, tierId],
      }));
    }
  }, [referralData.claimedTiers]);

  const claimMilestone = useCallback((milestoneId) => {
    if (!referralData.claimedMilestones.includes(milestoneId)) {
      setReferralData(prev => ({
        ...prev,
        claimedMilestones: [...prev.claimedMilestones, milestoneId],
      }));
    }
  }, [referralData.claimedMilestones]);

  return {
    referralData,
    referrals,
    weeklyStats,
    regenerateCode,
    claimTierReward,
    claimMilestone,
  };
};

// Referral code share card
const ShareCard = ({ code, link, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleShare = useCallback(async (method) => {
    switch (method) {
      case 'copy':
        copyToClipboard(link);
        break;
      case 'qr':
        setShowQR(true);
        break;
      case 'sms':
        window.open(`sms:?body=Join me on TAG! Use my code ${code} for bonus rewards: ${link}`);
        break;
      case 'email':
        window.open(`mailto:?subject=Play TAG with me!&body=Join me on TAG! Use my code ${code} for bonus rewards: ${link}`);
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: 'Join TAG!',
            text: `Use my referral code ${code} for bonus rewards!`,
            url: link,
          });
        }
        break;
    }
  }, [code, link, copyToClipboard]);

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Your Referral Code</h3>
        <div className="flex items-center justify-center gap-3">
          <div className="bg-gray-900/50 rounded-lg px-6 py-3 border border-gray-700">
            <span className="text-2xl font-mono font-bold text-purple-400">{code}</span>
          </div>
          <button
            onClick={() => copyToClipboard(code)}
            className="p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Share this code with friends to earn rewards!
        </p>
      </div>

      {/* Share methods */}
      <div className="flex justify-center gap-3 mb-4">
        {SHARE_METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => handleShare(method.id)}
              className={`${method.color} hover:opacity-80 p-3 rounded-lg transition-all`}
              title={method.name}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      {/* Referral link */}
      <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-3">
        <input
          type="text"
          value={link}
          readOnly
          className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
        />
        <button
          onClick={() => copyToClipboard(link)}
          className="text-purple-400 hover:text-purple-300 text-sm font-medium"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <button
        onClick={onRegenerate}
        className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
      >
        Generate New Code
      </button>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full">
            <h4 className="text-lg font-semibold text-white text-center mb-4">
              Scan to Join
            </h4>
            <div className="bg-white rounded-lg p-4 mx-auto w-48 h-48 flex items-center justify-center">
              <QrCode size={160} className="text-gray-900" />
            </div>
            <p className="text-gray-400 text-sm text-center mt-4">
              Code: {code}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {}}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
              >
                <Download size={16} />
                Save
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stats overview cards
const StatsOverview = ({ data, weeklyStats }) => {
  const stats = [
    {
      label: 'Total Referrals',
      value: data.totalReferrals,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      label: 'Active Players',
      value: data.activeReferrals,
      icon: Zap,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      label: 'Coins Earned',
      value: data.totalEarnings.coins.toLocaleString(),
      icon: Coins,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    },
    {
      label: 'Gems Earned',
      value: data.totalEarnings.gems,
      icon: Gem,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`${stat.bgColor} rounded-xl p-4 border border-gray-700/50`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={stat.color} />
              <span className="text-gray-400 text-xs">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
};

// Tier progress section
const TierProgress = ({ currentTier, totalReferrals, claimedTiers, onClaimReward }) => {
  const currentTierIndex = REFERRAL_TIERS.findIndex(t => t.id === currentTier);
  const nextTier = REFERRAL_TIERS[currentTierIndex + 1];

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Recruiter Tiers</h3>

      {/* Progress bar to next tier */}
      {nextTier && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress to {nextTier.name}</span>
            <span className="text-white">{totalReferrals} / {nextTier.referrals}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totalReferrals / nextTier.referrals) * 100, 100)}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">
            {nextTier.referrals - totalReferrals} more referrals needed
          </p>
        </div>
      )}

      {/* Tier list */}
      <div className="space-y-3">
        {REFERRAL_TIERS.map((tier, index) => {
          const Icon = tier.icon;
          const isUnlocked = totalReferrals >= tier.referrals;
          const isClaimed = claimedTiers.includes(tier.id);
          const isCurrent = tier.id === currentTier;

          return (
            <div
              key={tier.id}
              className={`rounded-lg p-4 border transition-all ${
                isCurrent
                  ? `${tier.bgColor} ${tier.borderColor}`
                  : isUnlocked
                  ? 'bg-gray-700/50 border-gray-600'
                  : 'bg-gray-800/50 border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tier.bgColor}`}>
                    <Icon size={20} className={tier.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                        {tier.name}
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm">{tier.referrals} referrals</span>
                  </div>
                </div>

                {isUnlocked && !isClaimed ? (
                  <button
                    onClick={() => onClaimReward(tier.id)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Claim
                  </button>
                ) : isClaimed ? (
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <Check size={16} />
                    Claimed
                  </span>
                ) : (
                  <Shield size={20} className="text-gray-600" />
                )}
              </div>

              {/* Rewards preview */}
              {(isUnlocked || isCurrent) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tier.rewards.map((reward, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-gray-900/50 text-gray-300 px-2 py-1 rounded-full"
                    >
                      {reward.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Milestone bonuses section
const MilestoneBonuses = ({ claimedMilestones, onClaim }) => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-yellow-400" />
        Milestone Bonuses
      </h3>

      <div className="space-y-3">
        {MILESTONE_BONUSES.map((milestone) => {
          const Icon = milestone.icon;
          const isClaimed = claimedMilestones.includes(milestone.id);
          const isUnlocked = isClaimed; // Simplified - in real app would check condition

          return (
            <div
              key={milestone.id}
              className={`rounded-lg p-4 border transition-all ${
                isClaimed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-gray-700/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isClaimed ? 'bg-green-500/20' : 'bg-gray-600/50'}`}>
                    <Icon size={18} className={isClaimed ? 'text-green-400' : 'text-gray-400'} />
                  </div>
                  <div>
                    <div className={`font-medium ${isClaimed ? 'text-white' : 'text-gray-300'}`}>
                      {milestone.name}
                    </div>
                    <div className="text-gray-500 text-sm">{milestone.description}</div>
                  </div>
                </div>

                {isClaimed ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                    {milestone.reward.amount} {milestone.reward.type}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Referral list
const ReferralList = ({ referrals }) => {
  const [filter, setFilter] = useState('all');

  const filteredReferrals = useMemo(() => {
    if (filter === 'all') return referrals;
    return referrals.filter(r => r.status === filter);
  }, [referrals, filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'inactive': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Referrals</h3>
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredReferrals.map((referral) => (
          <div
            key={referral.id}
            className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                {referral.username[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{referral.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(referral.status)}`}>
                    {referral.status}
                  </span>
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-3">
                  <span>Level {referral.level}</span>
                  <span>•</span>
                  <span>{referral.gamesPlayed} games</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-green-400 font-medium">
                ${referral.earnings.toFixed(2)}
              </div>
              <div className="text-gray-500 text-xs">
                Joined {new Date(referral.joinedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}

        {filteredReferrals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No {filter === 'all' ? '' : filter} referrals found
          </div>
        )}
      </div>
    </div>
  );
};

// Weekly bonus section
const WeeklyBonus = ({ weeklyStats }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);

      const diff = endOfWeek - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setTimeLeft(`${days}d ${hours}h`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar size={20} className="text-yellow-400" />
          Weekly Bonus
        </h3>
        <div className="flex items-center gap-2 text-yellow-400">
          <Clock size={16} />
          <span className="text-sm">{timeLeft} left</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">New Referrals</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">{weeklyStats.newReferrals}</span>
            <span className="text-green-400 text-sm">+{weeklyStats.coinsEarned} coins</span>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Active Games</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">{weeklyStats.activeGames}</span>
            <span className="text-cyan-400 text-sm">+{weeklyStats.gemsEarned} gems</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-yellow-400 font-medium">Weekly Challenge</div>
            <div className="text-gray-400 text-sm">Get 5 new referrals for 2x rewards!</div>
          </div>
          <div className="text-white font-bold">
            {weeklyStats.newReferrals}/5
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full"
            style={{ width: `${Math.min((weeklyStats.newReferrals / 5) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Main Referral System Component
const ReferralSystem = () => {
  const {
    referralData,
    referrals,
    weeklyStats,
    regenerateCode,
    claimTierReward,
    claimMilestone,
  } = useReferralSystem();

  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Users },
    { id: 'tiers', name: 'Tiers', icon: Trophy },
    { id: 'referrals', name: 'Referrals', icon: UserPlus },
    { id: 'milestones', name: 'Milestones', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gift className="text-purple-400" />
            Referral Program
          </h1>
          <p className="text-gray-400 mt-1">
            Invite friends and earn rewards together!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <ShareCard
                code={referralData.code}
                link={referralData.link}
                onRegenerate={regenerateCode}
              />
              <StatsOverview data={referralData} weeklyStats={weeklyStats} />
              <WeeklyBonus weeklyStats={weeklyStats} />
            </>
          )}

          {activeTab === 'tiers' && (
            <TierProgress
              currentTier={referralData.currentTier}
              totalReferrals={referralData.totalReferrals}
              claimedTiers={referralData.claimedTiers}
              onClaimReward={claimTierReward}
            />
          )}

          {activeTab === 'referrals' && (
            <ReferralList referrals={referrals} />
          )}

          {activeTab === 'milestones' && (
            <MilestoneBonuses
              claimedMilestones={referralData.claimedMilestones}
              onClaim={claimMilestone}
            />
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <Gift size={16} />
            Both you and your friend get bonus rewards when they join!
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;

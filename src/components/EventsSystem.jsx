/**
 * Limited-Time Events System Component
 * Seasonal events with unique challenges, rewards, and time-limited cosmetics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Gift,
  Star,
  Trophy,
  Target,
  Zap,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Heart,
  Sparkles,
  Crown,
  Medal,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  X,
  Bell,
  BellOff,
  Share2,
  Users,
  MapPin,
  Gem,
  Coins,
  Info,
  Play,
  Award,
} from 'lucide-react';

// Event themes
const EVENT_THEMES = {
  halloween: {
    name: 'Halloween',
    icon: '🎃',
    gradient: 'from-orange-500/20 via-purple-500/20 to-black/20',
    border: 'border-orange-500/50',
    accent: 'text-orange-400',
  },
  winter: {
    name: 'Winter',
    icon: '❄️',
    gradient: 'from-cyan-500/20 via-blue-500/20 to-white/10',
    border: 'border-cyan-500/50',
    accent: 'text-cyan-400',
  },
  valentine: {
    name: 'Valentine',
    icon: '💕',
    gradient: 'from-pink-500/20 via-red-500/20 to-purple-500/20',
    border: 'border-pink-500/50',
    accent: 'text-pink-400',
  },
  summer: {
    name: 'Summer',
    icon: '☀️',
    gradient: 'from-yellow-500/20 via-orange-500/20 to-red-500/20',
    border: 'border-yellow-500/50',
    accent: 'text-yellow-400',
  },
  anniversary: {
    name: 'Anniversary',
    icon: '🎂',
    gradient: 'from-purple-500/20 via-pink-500/20 to-cyan-500/20',
    border: 'border-purple-500/50',
    accent: 'text-purple-400',
  },
  lunar: {
    name: 'Lunar New Year',
    icon: '🏮',
    gradient: 'from-red-500/20 via-yellow-500/20 to-red-500/20',
    border: 'border-red-500/50',
    accent: 'text-red-400',
  },
};

// Format time remaining
function formatTimeRemaining(endTime) {
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return { text: 'Ended', urgent: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 7) return { text: `${days} days left`, urgent: false };
  if (days > 0) return { text: `${days}d ${hours}h left`, urgent: days <= 2 };
  if (hours > 0) return { text: `${hours}h ${minutes}m left`, urgent: true };
  return { text: `${minutes}m left`, urgent: true };
}

// Countdown timer component
function CountdownTimer({ endTime, size = 'md' }) {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(endTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [endTime]);

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${sizes[size]} ${
        timeLeft.urgent ? 'text-red-400' : 'text-gray-400'
      }`}
    >
      <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className="font-medium">{timeLeft.text}</span>
    </div>
  );
}

// Event challenge component
function EventChallenge({ challenge, onClaim }) {
  const progress = Math.min(100, (challenge.current / challenge.target) * 100);
  const isComplete = challenge.current >= challenge.target;
  const canClaim = isComplete && !challenge.claimed;

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        challenge.claimed
          ? 'bg-green-500/10 border-green-500/30'
          : isComplete
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-gray-800/50 border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            challenge.claimed
              ? 'bg-green-500/20'
              : isComplete
              ? 'bg-yellow-500/20'
              : 'bg-gray-700'
          }`}
        >
          {challenge.claimed ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : isComplete ? (
            <Gift className="w-5 h-5 text-yellow-400" />
          ) : (
            <Target className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Challenge info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-white">{challenge.name}</h4>
            {challenge.difficulty && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  challenge.difficulty === 'hard'
                    ? 'bg-red-500/20 text-red-400'
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                {challenge.difficulty}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-3">{challenge.description}</p>

          {/* Progress bar */}
          {!challenge.claimed && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">
                  {challenge.current} / {challenge.target}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isComplete ? 'bg-yellow-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {challenge.rewards.map((reward, i) => (
                <div key={i} className="flex items-center gap-1 text-sm">
                  <span>{reward.icon}</span>
                  <span className="text-gray-300">{reward.amount}</span>
                </div>
              ))}
            </div>

            {canClaim && (
              <button
                onClick={() => onClaim(challenge)}
                className="px-4 py-1.5 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Claim
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Event reward tier
function EventRewardTier({ tier, currentPoints, onClaim }) {
  const isUnlocked = currentPoints >= tier.requiredPoints;
  const canClaim = isUnlocked && !tier.claimed;

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all ${
        tier.claimed
          ? 'bg-green-500/10 border-green-500'
          : isUnlocked
          ? 'bg-yellow-500/10 border-yellow-500'
          : 'bg-gray-800/30 border-gray-700 opacity-60'
      }`}
    >
      {/* Points requirement */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 rounded-full text-xs text-gray-400 border border-gray-700">
        {tier.requiredPoints} pts
      </div>

      {/* Reward */}
      <div className="text-center pt-2">
        <div className="text-4xl mb-2">{tier.reward.icon}</div>
        <div className="text-sm font-medium text-white">{tier.reward.name}</div>
        <div className="text-xs text-gray-400">{tier.reward.type}</div>
      </div>

      {/* Claim button */}
      {canClaim && (
        <button
          onClick={() => onClaim(tier)}
          className="w-full mt-3 py-1.5 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Claim
        </button>
      )}

      {tier.claimed && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-green-400" />
        </div>
      )}
    </div>
  );
}

// Global event progress
function GlobalEventProgress({ event }) {
  const progress = (event.globalProgress / event.globalGoal) * 100;

  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Community Goal
        </h4>
        <span className="text-sm text-gray-400">
          {event.participantCount.toLocaleString()} players participating
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-3">{event.globalDescription}</p>

      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white font-medium">
            {event.globalProgress.toLocaleString()} / {event.globalGoal.toLocaleString()}
          </span>
          <span className="text-cyan-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Milestone markers */}
      <div className="relative h-6">
        {event.milestones?.map((milestone, i) => {
          const position = (milestone.target / event.globalGoal) * 100;
          const reached = event.globalProgress >= milestone.target;

          return (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  reached ? 'bg-yellow-500' : 'bg-gray-600'
                }`}
              />
              <span className="text-xs text-gray-500 mt-1">{milestone.reward}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Event card for event list
function EventCard({ event, onClick, isActive }) {
  const theme = EVENT_THEMES[event.theme] || EVENT_THEMES.anniversary;

  return (
    <button
      onClick={() => onClick(event)}
      className={`w-full p-4 rounded-xl text-left transition-all ${
        isActive
          ? `bg-gradient-to-r ${theme.gradient} border-2 ${theme.border}`
          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{theme.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white">{event.name}</h3>
            {isActive && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">{event.description}</p>
          <div className="flex items-center gap-4">
            <CountdownTimer endTime={event.endTime} size="sm" />
            <span className="text-xs text-gray-500">
              {event.challenges?.length || 0} challenges
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500" />
      </div>
    </button>
  );
}

// Leaderboard entry
function LeaderboardEntry({ entry, rank, isCurrentUser }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isCurrentUser
          ? 'bg-cyan-500/20 border border-cyan-500'
          : 'bg-gray-800/30'
      }`}
    >
      <div
        className={`w-8 text-center font-bold ${
          rank === 1
            ? 'text-yellow-400'
            : rank === 2
            ? 'text-gray-300'
            : rank === 3
            ? 'text-orange-400'
            : 'text-gray-500'
        }`}
      >
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </div>
      <span className="text-xl">{entry.avatar}</span>
      <span className="flex-1 font-medium text-white truncate">{entry.name}</span>
      <span className="text-cyan-400 font-bold">{entry.points.toLocaleString()}</span>
    </div>
  );
}

// Main EventsSystem component
export default function EventsSystem({
  userId,
  onJoinEvent,
  className = '',
}) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('challenges');
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  // Load events
  useEffect(() => {
    // Mock event data
    const mockEvents = [
      {
        id: 'winter-2024',
        name: 'Winter Wonderland',
        theme: 'winter',
        description: 'Celebrate the winter season with frosty challenges and exclusive rewards!',
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        endTime: Date.now() + 14 * 24 * 60 * 60 * 1000,
        userPoints: 2500,
        challenges: [
          {
            id: 'c1',
            name: 'Snowball Fighter',
            description: 'Tag 50 players in any game mode',
            target: 50,
            current: 42,
            difficulty: 'easy',
            rewards: [{ icon: '❄️', amount: 100 }, { icon: '💎', amount: 50 }],
            claimed: false,
          },
          {
            id: 'c2',
            name: 'Frosty Survivor',
            description: 'Survive for a total of 30 minutes without being tagged',
            target: 30,
            current: 30,
            difficulty: 'medium',
            rewards: [{ icon: '❄️', amount: 200 }, { icon: '💰', amount: 500 }],
            claimed: false,
          },
          {
            id: 'c3',
            name: 'Ice Champion',
            description: 'Win 10 games during the event',
            target: 10,
            current: 6,
            difficulty: 'hard',
            rewards: [{ icon: '❄️', amount: 500 }, { icon: '🎁', amount: 1 }],
            claimed: false,
          },
          {
            id: 'c4',
            name: 'Team Spirit',
            description: 'Play 5 team games with friends',
            target: 5,
            current: 5,
            difficulty: 'easy',
            rewards: [{ icon: '❄️', amount: 150 }],
            claimed: true,
          },
        ],
        rewardTiers: [
          { requiredPoints: 500, reward: { icon: '❄️', name: 'Snowflake Avatar', type: 'Avatar' }, claimed: true },
          { requiredPoints: 1500, reward: { icon: '⛄', name: 'Snowman Trail', type: 'Trail' }, claimed: true },
          { requiredPoints: 3000, reward: { icon: '🌨️', name: 'Blizzard Effect', type: 'Skin' }, claimed: false },
          { requiredPoints: 5000, reward: { icon: '👑', name: 'Ice Crown', type: 'Legendary' }, claimed: false },
        ],
        globalProgress: 8500000,
        globalGoal: 10000000,
        globalDescription: 'Community goal: Tag 10 million players together!',
        participantCount: 45230,
        milestones: [
          { target: 2500000, reward: '2x XP' },
          { target: 5000000, reward: 'Free Skin' },
          { target: 7500000, reward: 'Bonus Gems' },
          { target: 10000000, reward: 'Exclusive Title' },
        ],
        leaderboard: [
          { id: '1', name: 'FrostKing', avatar: '🐺', points: 8500 },
          { id: '2', name: 'IceQueen', avatar: '👸', points: 7200 },
          { id: '3', name: 'Blizzard', avatar: '❄️', points: 6800 },
          { id: '4', name: 'SnowStorm', avatar: '🌨️', points: 5500 },
          { id: '5', name: 'You', avatar: '👤', points: 2500, isCurrentUser: true },
        ],
        exclusiveItems: [
          { id: 'i1', name: 'Frost Bite', icon: '🥶', price: 1000, currency: 'event' },
          { id: 'i2', name: 'Ice Trail', icon: '❄️', price: 750, currency: 'event' },
          { id: 'i3', name: 'Snowflake', icon: '✨', price: 500, currency: 'event' },
        ],
      },
    ];

    setEvents(mockEvents);
    if (mockEvents.length > 0) {
      setSelectedEvent(mockEvents[0]);
    }
  }, []);

  // Handle challenge claim
  const handleClaimChallenge = useCallback((challenge) => {
    setSelectedEvent((prev) => ({
      ...prev,
      challenges: prev.challenges.map((c) =>
        c.id === challenge.id ? { ...c, claimed: true } : c
      ),
    }));
  }, []);

  // Handle tier claim
  const handleClaimTier = useCallback((tier) => {
    setSelectedEvent((prev) => ({
      ...prev,
      rewardTiers: prev.rewardTiers.map((t) =>
        t.requiredPoints === tier.requiredPoints ? { ...t, claimed: true } : t
      ),
    }));
  }, []);

  const theme = selectedEvent
    ? EVENT_THEMES[selectedEvent.theme] || EVENT_THEMES.anniversary
    : null;

  const tabs = [
    { id: 'challenges', label: 'Challenges', icon: Target },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'shop', label: 'Event Shop', icon: Sparkles },
  ];

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div
        className={`p-6 border-b border-gray-700 ${
          theme ? `bg-gradient-to-r ${theme.gradient}` : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Events</h2>
          </div>

          <button
            onClick={() => setIsNotificationsEnabled(!isNotificationsEnabled)}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            {isNotificationsEnabled ? (
              <Bell className="w-5 h-5 text-cyan-400" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Active event header */}
        {selectedEvent && (
          <div className="flex items-start gap-4">
            <div className="text-5xl">{theme?.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold text-white">{selectedEvent.name}</h3>
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">{selectedEvent.description}</p>
              <div className="flex items-center gap-6">
                <CountdownTimer endTime={selectedEvent.endTime} size="lg" />
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold">
                    {selectedEvent.userPoints.toLocaleString()} points
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {selectedEvent && (
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? `${theme?.accent || 'text-cyan-400'} border-b-2 border-current`
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        {!selectedEvent ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No active events</p>
            <p className="text-sm mt-1">Check back soon for exciting events!</p>
          </div>
        ) : (
          <>
            {activeTab === 'challenges' && (
              <div className="space-y-4">
                {/* Global progress */}
                <GlobalEventProgress event={selectedEvent} />

                {/* Challenges */}
                <h4 className="font-bold text-white mt-6 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  Event Challenges
                </h4>
                <div className="space-y-3">
                  {selectedEvent.challenges.map((challenge) => (
                    <EventChallenge
                      key={challenge.id}
                      challenge={challenge}
                      onClaim={handleClaimChallenge}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="p-4 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Your Progress</span>
                    <span className={`font-bold ${theme?.accent || 'text-cyan-400'}`}>
                      {selectedEvent.userPoints.toLocaleString()} points
                    </span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedEvent.userPoints /
                            selectedEvent.rewardTiers[selectedEvent.rewardTiers.length - 1]
                              .requiredPoints) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Reward tiers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedEvent.rewardTiers.map((tier, i) => (
                    <EventRewardTier
                      key={i}
                      tier={tier}
                      currentPoints={selectedEvent.userPoints}
                      onClaim={handleClaimTier}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Event Leaderboard</h4>
                  <span className="text-sm text-gray-400">
                    {selectedEvent.participantCount.toLocaleString()} participants
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedEvent.leaderboard.map((entry, i) => (
                    <LeaderboardEntry
                      key={entry.id}
                      entry={entry}
                      rank={i + 1}
                      isCurrentUser={entry.isCurrentUser}
                    />
                  ))}
                </div>

                <button className="w-full py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors">
                  View Full Leaderboard
                </button>
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Exclusive Event Items</h4>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{selectedEvent.userPoints}</span>
                    <span className="text-gray-500 text-sm">event points</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {selectedEvent.exclusiveItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center"
                    >
                      <div className="text-4xl mb-2">{item.icon}</div>
                      <div className="font-medium text-white text-sm">{item.name}</div>
                      <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{item.price}</span>
                      </div>
                      <button
                        disabled={selectedEvent.userPoints < item.price}
                        className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          selectedEvent.userPoints >= item.price
                            ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {selectedEvent.userPoints >= item.price ? 'Purchase' : 'Not enough'}
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Event items are only available during the event period
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event list (if multiple events) */}
      {events.length > 1 && (
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Other Events</h4>
          <div className="space-y-2">
            {events
              .filter((e) => e.id !== selectedEvent?.id)
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={setSelectedEvent}
                  isActive={false}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for event data
export function useEvents(userId) {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events || []);
      setCurrentEvent(data.events?.[0] || null);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    currentEvent,
    isLoading,
    refresh: loadEvents,
  };
}

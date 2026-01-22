/**
 * Real-time Game Feed & Highlights Component
 * Shows live action feed, tag events, achievements, and game highlights
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  Zap,
  Target,
  Trophy,
  Clock,
  MapPin,
  Users,
  Star,
  TrendingUp,
  Shield,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  Filter,
  Bell,
  BellOff,
  Play,
  Pause,
} from 'lucide-react';

// Event types with icons and colors
const EVENT_TYPES = {
  TAG: {
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    label: 'Tag',
  },
  TAG_ATTEMPT: {
    icon: Target,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    label: 'Near Miss',
  },
  NEW_IT: {
    icon: Crown,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    label: 'New IT',
  },
  STREAK: {
    icon: Flame,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    label: 'Streak',
  },
  SURVIVAL: {
    icon: Shield,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    label: 'Survival',
  },
  ACHIEVEMENT: {
    icon: Trophy,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/50',
    label: 'Achievement',
  },
  POWERUP: {
    icon: Star,
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/50',
    label: 'Power-up',
  },
  ZONE: {
    icon: MapPin,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    label: 'Zone',
  },
  PLAYER_JOIN: {
    icon: Users,
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    label: 'Join',
  },
  PLAYER_LEAVE: {
    icon: Users,
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    label: 'Leave',
  },
  GAME_START: {
    icon: Play,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    label: 'Start',
  },
  GAME_END: {
    icon: Trophy,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    label: 'End',
  },
};

// Crown icon component
function Crown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14" />
    </svg>
  );
}

// Format time ago
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Single feed event component
function FeedEvent({ event, isHighlight = false }) {
  const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.TAG;
  const IconComponent = eventType.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
        isHighlight
          ? `${eventType.bg} ${eventType.border} border animate-pulse`
          : 'bg-gray-800/50 hover:bg-gray-800/80'
      }`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-full ${eventType.bg}`}>
        <IconComponent className={`w-4 h-4 ${eventType.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Players involved */}
          {event.players?.map((player, i) => (
            <React.Fragment key={player.id}>
              {i > 0 && <span className="text-gray-500 text-sm">{event.connector || '→'}</span>}
              <div className="flex items-center gap-1">
                <span className="text-lg">{player.avatar || '👤'}</span>
                <span className="font-medium text-white text-sm">{player.name}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mt-0.5">{event.description}</p>

        {/* Extra info */}
        {event.extra && (
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            {event.extra.distance && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.extra.distance}m
              </span>
            )}
            {event.extra.streak && (
              <span className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3 h-3" />
                {event.extra.streak}x streak
              </span>
            )}
            {event.extra.points && (
              <span className="flex items-center gap-1 text-cyan-400">
                +{event.extra.points} pts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {formatTimeAgo(event.timestamp)}
      </div>
    </div>
  );
}

// Highlight reel component (shows exciting moments)
function HighlightReel({ highlights, onHighlightClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (highlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [highlights.length]);

  if (highlights.length === 0) return null;

  const current = highlights[currentIndex];
  const eventType = EVENT_TYPES[current.type] || EVENT_TYPES.TAG;

  return (
    <div
      className="relative bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-xl p-4 border border-purple-500/30 cursor-pointer"
      onClick={() => onHighlightClick?.(current)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-cyan-400">
        <Star className="w-3 h-3 fill-current" />
        Highlight
      </div>

      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-full ${eventType.bg}`}>
          <eventType.icon className={`w-6 h-6 ${eventType.color}`} />
        </div>

        <div className="flex-1">
          <div className="font-bold text-white">{current.title || eventType.label}</div>
          <p className="text-sm text-gray-300">{current.description}</p>
          {current.players && (
            <div className="flex items-center gap-2 mt-1">
              {current.players.map((player) => (
                <span key={player.id} className="text-lg">{player.avatar || '👤'}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indicators */}
      {highlights.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {highlights.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-cyan-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Live stats bar
function LiveStatsBar({ stats }) {
  return (
    <div className="flex items-center justify-around p-2 bg-gray-800/50 rounded-lg text-xs">
      <div className="flex items-center gap-1 text-yellow-400">
        <Zap className="w-3 h-3" />
        <span>{stats.totalTags || 0} tags</span>
      </div>
      <div className="flex items-center gap-1 text-cyan-400">
        <TrendingUp className="w-3 h-3" />
        <span>{stats.tagsPerMinute || 0}/min</span>
      </div>
      <div className="flex items-center gap-1 text-green-400">
        <Shield className="w-3 h-3" />
        <span>{stats.longestSurvival || '0:00'}</span>
      </div>
      <div className="flex items-center gap-1 text-purple-400">
        <Flame className="w-3 h-3" />
        <span>{stats.highestStreak || 0}x</span>
      </div>
    </div>
  );
}

// Filter pill button
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500'
          : 'bg-gray-700/50 text-gray-400 border border-transparent hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

// Main GameFeed component
export default function GameFeed({
  events = [],
  highlights = [],
  stats = {},
  onHighlightClick,
  onEventClick,
  maxEvents = 50,
  showFilters = true,
  showStats = true,
  showHighlights = true,
  autoScroll = true,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeFilters, setActiveFilters] = useState(new Set(['all']));
  const feedRef = useRef(null);
  const lastEventRef = useRef(null);

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'tags', label: 'Tags', types: ['TAG', 'TAG_ATTEMPT', 'NEW_IT'] },
    { id: 'achievements', label: 'Achievements', types: ['ACHIEVEMENT', 'STREAK', 'SURVIVAL'] },
    { id: 'powerups', label: 'Power-ups', types: ['POWERUP'] },
    { id: 'players', label: 'Players', types: ['PLAYER_JOIN', 'PLAYER_LEAVE'] },
  ];

  // Filter events
  const filteredEvents = useMemo(() => {
    if (activeFilters.has('all')) {
      return events.slice(0, maxEvents);
    }

    const allowedTypes = new Set();
    for (const filter of activeFilters) {
      const option = filterOptions.find((f) => f.id === filter);
      if (option?.types) {
        option.types.forEach((t) => allowedTypes.add(t));
      }
    }

    return events.filter((e) => allowedTypes.has(e.type)).slice(0, maxEvents);
  }, [events, activeFilters, maxEvents]);

  // Toggle filter
  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (filterId === 'all') {
        return new Set(['all']);
      }
      next.delete('all');
      if (next.has(filterId)) {
        next.delete(filterId);
        if (next.size === 0) return new Set(['all']);
      } else {
        next.add(filterId);
      }
      return next;
    });
  }, []);

  // Auto-scroll to new events
  useEffect(() => {
    if (autoScroll && !isPaused && feedRef.current && lastEventRef.current) {
      lastEventRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [filteredEvents.length, autoScroll, isPaused]);

  // Recent highlight (event from last 5 seconds that's exciting)
  const recentHighlight = useMemo(() => {
    const now = Date.now();
    return events.find(
      (e) =>
        now - e.timestamp < 5000 &&
        ['TAG', 'STREAK', 'ACHIEVEMENT', 'NEW_IT'].includes(e.type)
    );
  }, [events]);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gray-800/90 backdrop-blur-sm rounded-full border border-gray-700 ${className}`}
      >
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-white">Live Feed</span>
        {events.length > 0 && (
          <span className="px-1.5 py-0.5 bg-cyan-500/30 text-cyan-400 text-xs rounded-full">
            {events.length}
          </span>
        )}
        <ChevronUp className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white">Live Feed</h3>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-gray-400" />
            ) : (
              <Pause className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Notifications toggle */}
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 text-cyan-400" />
            ) : (
              <BellOff className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Collapse */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Live stats */}
        {showStats && <LiveStatsBar stats={stats} />}

        {/* Highlight reel */}
        {showHighlights && highlights.length > 0 && (
          <HighlightReel highlights={highlights} onHighlightClick={onHighlightClick} />
        )}

        {/* Recent highlight alert */}
        {recentHighlight && notificationsEnabled && (
          <FeedEvent event={recentHighlight} isHighlight={true} />
        )}

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {filterOptions.map((filter) => (
              <FilterPill
                key={filter.id}
                label={filter.label}
                active={activeFilters.has(filter.id)}
                onClick={() => toggleFilter(filter.id)}
              />
            ))}
          </div>
        )}

        {/* Event list */}
        <div ref={feedRef} className="space-y-2 max-h-64 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events yet</p>
              <p className="text-xs">Game activity will appear here</p>
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <div
                key={event.id || index}
                ref={index === 0 ? lastEventRef : null}
                onClick={() => onEventClick?.(event)}
              >
                <FeedEvent event={event} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing game feed state
export function useGameFeed(socket, gameId) {
  const [events, setEvents] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [stats, setStats] = useState({
    totalTags: 0,
    tagsPerMinute: 0,
    longestSurvival: '0:00',
    highestStreak: 0,
  });

  // Add new event
  const addEvent = useCallback((event) => {
    const newEvent = {
      ...event,
      id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: event.timestamp || Date.now(),
    };

    setEvents((prev) => [newEvent, ...prev].slice(0, 100));

    // Check if this should be a highlight
    if (isHighlightWorthy(newEvent)) {
      setHighlights((prev) => [newEvent, ...prev].slice(0, 10));
    }

    // Update stats
    updateStats(newEvent);
  }, []);

  // Check if event is highlight-worthy
  const isHighlightWorthy = (event) => {
    if (event.type === 'STREAK' && (event.extra?.streak || 0) >= 3) return true;
    if (event.type === 'ACHIEVEMENT') return true;
    if (event.type === 'SURVIVAL' && event.extra?.duration >= 60000) return true;
    return false;
  };

  // Update stats based on new event
  const updateStats = useCallback((event) => {
    setStats((prev) => {
      const updated = { ...prev };

      if (event.type === 'TAG') {
        updated.totalTags++;
      }

      if (event.type === 'STREAK') {
        const streak = event.extra?.streak || 0;
        if (streak > updated.highestStreak) {
          updated.highestStreak = streak;
        }
      }

      return updated;
    });
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleTag = (data) => {
      addEvent({
        type: 'TAG',
        players: [
          { id: data.taggerId, name: data.taggerName, avatar: data.taggerAvatar },
          { id: data.taggedId, name: data.taggedName, avatar: data.taggedAvatar },
        ],
        description: `${data.taggerName} tagged ${data.taggedName}!`,
        connector: '→',
        extra: {
          distance: data.distance,
          points: data.points,
        },
      });
    };

    const handleNewIt = (data) => {
      addEvent({
        type: 'NEW_IT',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: `${data.playerName} is now IT!`,
      });
    };

    const handleStreak = (data) => {
      addEvent({
        type: 'STREAK',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: `${data.playerName} is on a ${data.streak}x tagging streak!`,
        title: `${data.streak}x Streak!`,
        extra: { streak: data.streak },
      });
    };

    const handleAchievement = (data) => {
      addEvent({
        type: 'ACHIEVEMENT',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: data.description,
        title: data.name,
        extra: { points: data.points },
      });
    };

    const handlePowerUp = (data) => {
      addEvent({
        type: 'POWERUP',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: `${data.playerName} collected ${data.powerUpName}!`,
      });
    };

    const handlePlayerJoin = (data) => {
      addEvent({
        type: 'PLAYER_JOIN',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: `${data.playerName} joined the game`,
      });
    };

    const handlePlayerLeave = (data) => {
      addEvent({
        type: 'PLAYER_LEAVE',
        players: [{ id: data.playerId, name: data.playerName, avatar: data.avatar }],
        description: `${data.playerName} left the game`,
      });
    };

    socket.on('game:tag', handleTag);
    socket.on('game:newIt', handleNewIt);
    socket.on('game:streak', handleStreak);
    socket.on('game:achievement', handleAchievement);
    socket.on('game:powerup', handlePowerUp);
    socket.on('game:playerJoin', handlePlayerJoin);
    socket.on('game:playerLeave', handlePlayerLeave);

    return () => {
      socket.off('game:tag', handleTag);
      socket.off('game:newIt', handleNewIt);
      socket.off('game:streak', handleStreak);
      socket.off('game:achievement', handleAchievement);
      socket.off('game:powerup', handlePowerUp);
      socket.off('game:playerJoin', handlePlayerJoin);
      socket.off('game:playerLeave', handlePlayerLeave);
    };
  }, [socket, addEvent]);

  // Calculate tags per minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const recentTags = events.filter(
        (e) => e.type === 'TAG' && now - e.timestamp < 60000
      ).length;
      setStats((prev) => ({ ...prev, tagsPerMinute: recentTags }));
    }, 5000);

    return () => clearInterval(interval);
  }, [events]);

  return {
    events,
    highlights,
    stats,
    addEvent,
    clearEvents: () => setEvents([]),
    clearHighlights: () => setHighlights([]),
  };
}

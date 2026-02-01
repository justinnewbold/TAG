import React, { useState, useEffect, useCallback } from 'react';
import { Target, Zap, DollarSign, Flag, Star, Swords, Trophy, Shield, Crown } from 'lucide-react';
import { socketService } from '../services/socket';
import { killFeedService } from '../services/killFeedService';
import { KILL_FEED_CONFIG } from '../../shared/constants.js';

const EVENT_CONFIG = {
  tag: { icon: Target, color: 'text-red-400', bg: 'bg-red-500/20', label: 'tagged' },
  elimination: { icon: Target, color: 'text-red-500', bg: 'bg-red-500/20', label: 'eliminated' },
  bounty_claimed: { icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'claimed bounty on' },
  zone_captured: { icon: Flag, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'captured a zone' },
  heist_complete: { icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'completed a heist' },
  contract_complete: { icon: Trophy, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'completed a contract' },
  prestige: { icon: Crown, color: 'text-neon-purple', bg: 'bg-purple-500/20', label: 'prestiged to' },
  achievement: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'unlocked' },
  powerup_used: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'used' },
  base_raided: { icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'raided base of' },
  nemesis_tag: { icon: Swords, color: 'text-orange-500', bg: 'bg-orange-500/20', label: 'NEMESIS TAG on' },
};

function KillFeed({ gameId, compact = false }) {
  const [events, setEvents] = useState([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Load initial events
    const loadEvents = async () => {
      try {
        const data = gameId
          ? await killFeedService.getGameFeed(gameId)
          : await killFeedService.getGlobalFeed();
        setEvents(data.events || []);
      } catch {
        // Silent fail for feed
      }
    };
    loadEvents();

    // Listen for new events via socket
    const handleFeedEvent = (event) => {
      setEvents(prev => {
        const updated = [event, ...prev].slice(0, KILL_FEED_CONFIG.MAX_ENTRIES);
        return updated;
      });
    };

    const unsubscribe = killFeedService.onFeedEvent(handleFeedEvent);

    // Socket listener
    const socketHandler = (event) => {
      killFeedService.emitToListeners(event);
    };

    if (socketService.socket) {
      socketService.socket.on('killFeedEvent', socketHandler);
      if (gameId) {
        socketService.socket.on('gameFeedEvent', socketHandler);
      }
    }

    return () => {
      unsubscribe();
      if (socketService.socket) {
        socketService.socket.off('killFeedEvent', socketHandler);
        socketService.socket.off('gameFeedEvent', socketHandler);
      }
    };
  }, [gameId]);

  // Auto-fade old events
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev =>
        prev.filter(e => Date.now() - e.timestamp < KILL_FEED_CONFIG.FADE_TIME * 10)
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || events.length === 0) return null;

  const displayEvents = events.slice(0, compact ? 3 : KILL_FEED_CONFIG.DISPLAY_COUNT);

  return (
    <div className={`${compact ? '' : 'fixed top-16 right-3 z-30 w-72'} pointer-events-none`}>
      <div className="space-y-1.5">
        {displayEvents.map((event, index) => {
          const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.tag;
          const Icon = config.icon;
          const age = Date.now() - event.timestamp;
          const opacity = Math.max(0.3, 1 - (age / (KILL_FEED_CONFIG.FADE_TIME * 2)));

          return (
            <div
              key={event.id || index}
              className={`${config.bg} backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 pointer-events-auto transition-all`}
              style={{ opacity }}
            >
              <Icon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0`} />
              <p className="text-xs text-white/90 truncate">
                <span className="font-bold text-white">{event.actorName || 'Someone'}</span>
                {' '}
                <span className="text-white/50">{config.label}</span>
                {' '}
                {event.targetName && (
                  <span className="font-bold text-white">{event.targetName}</span>
                )}
                {event.message && (
                  <span className="text-white/50">{event.message}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {!compact && events.length > 0 && (
        <button
          onClick={() => setVisible(false)}
          className="mt-1 text-white/20 text-[10px] hover:text-white/40 pointer-events-auto"
        >
          Hide feed
        </button>
      )}
    </div>
  );
}

export default KillFeed;

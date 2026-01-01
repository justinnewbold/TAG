import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, Trophy, Clock, Users, Star } from 'lucide-react';

// Seasonal event definitions
const SEASONAL_EVENTS = {
  winter: {
    name: 'Winter Wonderland',
    emoji: '❄️',
    theme: 'from-blue-400 to-cyan-500',
    description: 'Freeze tag with a twist! Special ice power-ups available.',
    rewards: ['Snowflake Badge', '500 XP Bonus', 'Winter Avatar Frame'],
    gameModes: ['freeze_tag', 'ice_hunt'],
  },
  halloween: {
    name: 'Spooky Season',
    emoji: '🎃',
    theme: 'from-orange-500 to-purple-600',
    description: 'Ghost mode for everyone! Hunt in the dark.',
    rewards: ['Pumpkin Badge', '666 XP Bonus', 'Spooky Avatar Frame'],
    gameModes: ['ghost_hunt', 'monster_tag'],
  },
  summer: {
    name: 'Summer Sprint',
    emoji: '☀️',
    theme: 'from-yellow-400 to-orange-500',
    description: 'Speed boost events! Run faster, tag harder.',
    rewards: ['Sunshine Badge', '400 XP Bonus', 'Beach Avatar Frame'],
    gameModes: ['sprint_tag', 'beach_battle'],
  },
  spring: {
    name: 'Spring Fling',
    emoji: '🌸',
    theme: 'from-pink-400 to-green-400',
    description: 'Easter egg hunt mode! Find hidden power-ups.',
    rewards: ['Flower Badge', '350 XP Bonus', 'Garden Avatar Frame'],
    gameModes: ['egg_hunt', 'bloom_tag'],
  },
  newyear: {
    name: 'New Year Bash',
    emoji: '🎆',
    theme: 'from-purple-500 to-pink-500',
    description: 'Celebrate with fireworks and double XP!',
    rewards: ['Firework Badge', '1000 XP Bonus', 'Sparkle Avatar Frame'],
    gameModes: ['countdown_tag', 'party_mode'],
  },
};

export default function SeasonalEvent({ eventId, onJoin }) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [activeParticipants, setActiveParticipants] = useState(0);

  const event = SEASONAL_EVENTS[eventId] || SEASONAL_EVENTS.winter;

  useEffect(() => {
    // Simulate countdown timer (would connect to backend in production)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Event ends in 7 days

    const updateTimer = () => {
      const now = new Date();
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    // Simulate active participants
    setActiveParticipants(Math.floor(Math.random() * 500) + 100);

    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div className={`bg-gradient-to-br ${event.theme} rounded-2xl overflow-hidden shadow-xl`}>
      {/* Event Header */}
      <div className="p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl">{event.emoji}</span>
          <div>
            <h2 className="text-2xl font-bold">{event.name}</h2>
            <p className="text-white/80 text-sm">Limited Time Event</p>
          </div>
        </div>

        <p className="text-white/90 mb-4">{event.description}</p>

        {/* Timer */}
        {timeRemaining && (
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-white/70" />
            <span className="text-sm">
              Ends in: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          </div>
        )}

        {/* Active Players */}
        <div className="flex items-center gap-2 mb-6">
          <Users size={16} className="text-white/70" />
          <span className="text-sm">{activeParticipants} players active now</span>
        </div>

        {/* Rewards Preview */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Gift size={16} /> Event Rewards
          </h3>
          <div className="space-y-2">
            {event.rewards.map((reward, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Star size={14} className="text-yellow-300" />
                <span>{reward}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onJoin?.(eventId)}
            className="flex-1 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-white/90 transition-colors"
          >
            Join Event
          </button>
          <button
            onClick={() => navigate('/leaderboard', { state: { event: eventId } })}
            className="px-4 py-3 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition-colors"
          >
            <Trophy size={20} />
          </button>
        </div>
      </div>

      {/* Game Modes */}
      <div className="bg-black/20 p-4">
        <h3 className="text-white/80 text-sm font-semibold mb-2">Special Game Modes</h3>
        <div className="flex gap-2">
          {event.gameModes.map((mode, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-white/20 rounded-full text-white text-xs capitalize"
            >
              {mode.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mini event card for listing multiple events
export function SeasonalEventCard({ eventId, onClick }) {
  const event = SEASONAL_EVENTS[eventId] || SEASONAL_EVENTS.winter;

  return (
    <button
      onClick={() => onClick?.(eventId)}
      className={`w-full bg-gradient-to-r ${event.theme} rounded-xl p-4 text-left text-white hover:scale-[1.02] transition-transform`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{event.emoji}</span>
        <div className="flex-1">
          <h3 className="font-bold">{event.name}</h3>
          <p className="text-white/70 text-sm">Tap to join!</p>
        </div>
        <div className="bg-white/20 px-3 py-1 rounded-full text-xs">
          Active
        </div>
      </div>
    </button>
  );
}

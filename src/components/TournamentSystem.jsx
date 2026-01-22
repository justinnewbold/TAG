/**
 * Tournament & League System Component
 * Organized competitive play with brackets, scheduling, and rankings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  MapPin,
  Crown,
  Medal,
  Award,
  Star,
  Swords,
  Shield,
  Flag,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Bell,
  BellOff,
  Settings,
  Share2,
  Copy,
  ExternalLink,
  Filter,
  Search,
  Zap,
  Target,
  Lock,
  Unlock,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';

// Tournament formats
const TOURNAMENT_FORMATS = {
  SINGLE_ELIMINATION: {
    id: 'single_elimination',
    name: 'Single Elimination',
    description: 'Lose once and you\'re out',
    icon: '🏆',
  },
  DOUBLE_ELIMINATION: {
    id: 'double_elimination',
    name: 'Double Elimination',
    description: 'Two losses to be eliminated',
    icon: '🎯',
  },
  ROUND_ROBIN: {
    id: 'round_robin',
    name: 'Round Robin',
    description: 'Everyone plays everyone',
    icon: '🔄',
  },
  SWISS: {
    id: 'swiss',
    name: 'Swiss System',
    description: 'Players matched by performance',
    icon: '🎲',
  },
};

// Tournament status
const TOURNAMENT_STATUS = {
  UPCOMING: { label: 'Upcoming', color: 'text-blue-400 bg-blue-500/20' },
  REGISTRATION: { label: 'Registration Open', color: 'text-green-400 bg-green-500/20' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-400 bg-yellow-500/20' },
  COMPLETED: { label: 'Completed', color: 'text-gray-400 bg-gray-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400 bg-red-500/20' },
};

// League tiers
const LEAGUE_TIERS = {
  BRONZE: { name: 'Bronze', color: 'from-amber-700 to-amber-900', icon: '🥉', minPoints: 0 },
  SILVER: { name: 'Silver', color: 'from-gray-300 to-gray-500', icon: '🥈', minPoints: 1000 },
  GOLD: { name: 'Gold', color: 'from-yellow-400 to-yellow-600', icon: '🥇', minPoints: 2500 },
  PLATINUM: { name: 'Platinum', color: 'from-cyan-300 to-cyan-500', icon: '💎', minPoints: 5000 },
  DIAMOND: { name: 'Diamond', color: 'from-purple-400 to-purple-600', icon: '👑', minPoints: 10000 },
};

// Format date helper
function formatDate(timestamp, includeTime = false) {
  const date = new Date(timestamp);
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('en-US', options);
}

// Countdown timer component
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-2">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="bg-gray-800 rounded-lg px-2 py-1 min-w-[40px]">
            <div className="text-lg font-bold text-white">{value.toString().padStart(2, '0')}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{unit}</div>
        </div>
      ))}
    </div>
  );
}

// Bracket match component
function BracketMatch({ match, onMatchClick }) {
  const isComplete = match.winnerId != null;

  return (
    <button
      onClick={() => onMatchClick?.(match)}
      className={`w-48 bg-gray-800/50 rounded-lg overflow-hidden border transition-colors ${
        isComplete ? 'border-gray-700' : 'border-cyan-500/50 hover:border-cyan-500'
      }`}
    >
      {/* Player 1 */}
      <div
        className={`flex items-center gap-2 p-2 ${
          match.winnerId === match.player1?.id ? 'bg-green-500/20' : ''
        }`}
      >
        <span className="text-lg">{match.player1?.avatar || '👤'}</span>
        <span className="flex-1 text-sm text-white truncate">
          {match.player1?.name || 'TBD'}
        </span>
        <span className="text-sm font-medium text-gray-400">
          {match.score1 ?? '-'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700" />

      {/* Player 2 */}
      <div
        className={`flex items-center gap-2 p-2 ${
          match.winnerId === match.player2?.id ? 'bg-green-500/20' : ''
        }`}
      >
        <span className="text-lg">{match.player2?.avatar || '👤'}</span>
        <span className="flex-1 text-sm text-white truncate">
          {match.player2?.name || 'TBD'}
        </span>
        <span className="text-sm font-medium text-gray-400">
          {match.score2 ?? '-'}
        </span>
      </div>

      {/* Match time */}
      {match.scheduledTime && !isComplete && (
        <div className="bg-gray-900/50 px-2 py-1 text-xs text-gray-500 text-center">
          {formatDate(match.scheduledTime, true)}
        </div>
      )}
    </button>
  );
}

// Tournament bracket visualization
function TournamentBracket({ rounds, onMatchClick }) {
  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {rounds.map((round, roundIndex) => (
        <div key={roundIndex} className="flex flex-col gap-4">
          <div className="text-sm font-medium text-gray-400 text-center mb-2">
            {round.name || `Round ${roundIndex + 1}`}
          </div>
          <div
            className="flex flex-col justify-around gap-4"
            style={{ minHeight: rounds[0].matches.length * 80 }}
          >
            {round.matches.map((match, matchIndex) => (
              <BracketMatch
                key={matchIndex}
                match={match}
                onMatchClick={onMatchClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Leaderboard row component
function LeaderboardRow({ entry, rank, isCurrentUser }) {
  const getRankDisplay = () => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
        isCurrentUser
          ? 'bg-cyan-500/20 border border-cyan-500'
          : 'bg-gray-800/50 hover:bg-gray-800/80'
      }`}
    >
      {/* Rank */}
      <div className="w-10 flex justify-center">{getRankDisplay()}</div>

      {/* Player info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl">{entry.avatar || '👤'}</span>
        <div className="min-w-0">
          <div className="font-medium text-white truncate">{entry.name}</div>
          <div className="text-xs text-gray-500">{entry.team || 'Solo'}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="text-white font-medium">{entry.wins}</div>
          <div className="text-xs text-gray-500">Wins</div>
        </div>
        <div className="text-center">
          <div className="text-white font-medium">{entry.losses}</div>
          <div className="text-xs text-gray-500">Losses</div>
        </div>
        <div className="text-center">
          <div className="text-cyan-400 font-bold">{entry.points}</div>
          <div className="text-xs text-gray-500">Points</div>
        </div>
      </div>
    </div>
  );
}

// Tournament card for listing
function TournamentCard({ tournament, onJoin, onView, isRegistered }) {
  const status = TOURNAMENT_STATUS[tournament.status] || TOURNAMENT_STATUS.UPCOMING;
  const format = TOURNAMENT_FORMATS[tournament.format] || TOURNAMENT_FORMATS.SINGLE_ELIMINATION;

  return (
    <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Banner */}
      <div className={`h-20 bg-gradient-to-r ${tournament.bannerGradient || 'from-cyan-500/20 to-purple-500/20'} relative`}>
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-3xl">{format.icon}</div>
          <div>
            <h3 className="font-bold text-white">{tournament.name}</h3>
            <p className="text-sm text-gray-400">{format.name}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(tournament.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{tournament.registeredCount}/{tournament.maxPlayers} players</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>{tournament.prizePool || 'Bragging rights'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {tournament.status === 'REGISTRATION' && !isRegistered && (
            <button
              onClick={() => onJoin?.(tournament)}
              className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
            >
              Register
            </button>
          )}
          {isRegistered && (
            <div className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium text-center">
              ✓ Registered
            </div>
          )}
          <button
            onClick={() => onView?.(tournament)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}

// League progress card
function LeagueProgressCard({ currentTier, points, nextTierPoints }) {
  const tier = LEAGUE_TIERS[currentTier] || LEAGUE_TIERS.BRONZE;
  const nextTier = Object.values(LEAGUE_TIERS).find(t => t.minPoints > points);
  const progress = nextTier
    ? ((points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100
    : 100;

  return (
    <div className={`bg-gradient-to-br ${tier.color} rounded-2xl p-6 text-white`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm opacity-80">Current League</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <span>{tier.icon}</span>
            {tier.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{points.toLocaleString()}</div>
          <div className="text-sm opacity-80">League Points</div>
        </div>
      </div>

      {nextTier && (
        <>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-white/80 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{tier.name}</span>
            <span>{nextTier.minPoints - points} pts to {nextTier.name}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Season info component
function SeasonInfo({ season }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white">Season {season.number}</h3>
          <p className="text-sm text-gray-400">{season.name}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Ends in</div>
          <CountdownTimer targetDate={season.endDate} />
        </div>
      </div>

      {/* Season rewards preview */}
      <div className="flex items-center gap-4 mt-4 p-3 bg-gray-900/50 rounded-lg">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Season Rewards</div>
          <div className="text-xs text-gray-400">Exclusive badges, titles, and more</div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  );
}

// Main TournamentSystem component
export default function TournamentSystem({
  currentUserId,
  onJoinTournament,
  onCreateTournament,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [leagueData, setLeagueData] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    setTournaments([
      {
        id: '1',
        name: 'Weekly Tag Championship',
        format: 'SINGLE_ELIMINATION',
        status: 'REGISTRATION',
        startDate: Date.now() + 86400000 * 2,
        registeredCount: 24,
        maxPlayers: 32,
        prizePool: '1000 XP + Champion Badge',
        bannerGradient: 'from-yellow-500/30 to-orange-500/30',
      },
      {
        id: '2',
        name: 'City-wide Tag Battle',
        format: 'DOUBLE_ELIMINATION',
        status: 'UPCOMING',
        startDate: Date.now() + 86400000 * 7,
        registeredCount: 45,
        maxPlayers: 64,
        prizePool: '5000 XP + Exclusive Skin',
        bannerGradient: 'from-purple-500/30 to-pink-500/30',
      },
      {
        id: '3',
        name: 'Beginners Cup',
        format: 'ROUND_ROBIN',
        status: 'IN_PROGRESS',
        startDate: Date.now() - 86400000,
        registeredCount: 16,
        maxPlayers: 16,
        prizePool: '500 XP',
        bannerGradient: 'from-green-500/30 to-cyan-500/30',
      },
    ]);

    setLeagueData({
      currentTier: 'GOLD',
      points: 3250,
      rank: 156,
      totalPlayers: 10000,
      season: {
        number: 3,
        name: 'Summer Sprint',
        startDate: Date.now() - 86400000 * 30,
        endDate: Date.now() + 86400000 * 60,
      },
      leaderboard: [
        { id: '1', name: 'SpeedDemon', avatar: '🦊', wins: 45, losses: 5, points: 12500, team: 'Blitz' },
        { id: '2', name: 'TagMaster', avatar: '🐺', wins: 42, losses: 8, points: 11200, team: 'Hunters' },
        { id: '3', name: 'ShadowRunner', avatar: '👻', wins: 40, losses: 10, points: 10800, team: null },
        { id: '4', name: 'FlashTag', avatar: '⚡', wins: 38, losses: 12, points: 9500, team: 'Blitz' },
        { id: '5', name: 'NinjaEvade', avatar: '🥷', wins: 35, losses: 15, points: 8200, team: null },
      ],
    });
  }, []);

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tournaments, filterStatus, searchQuery]);

  // View tournament details
  const viewTournament = useCallback((tournament) => {
    setSelectedTournament(tournament);
  }, []);

  // Join tournament
  const handleJoinTournament = useCallback((tournament) => {
    onJoinTournament?.(tournament);
  }, [onJoinTournament]);

  const tabs = [
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'league', label: 'League', icon: Crown },
    { id: 'history', label: 'My History', icon: Clock },
  ];

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Competitive</h2>
          </div>
          <button
            onClick={onCreateTournament}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Tournament
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tournaments..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="REGISTRATION">Open Registration</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Tournament list */}
            {filteredTournaments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tournaments found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onJoin={handleJoinTournament}
                    onView={viewTournament}
                    isRegistered={tournament.registeredPlayers?.includes(currentUserId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'league' && leagueData && (
          <div className="space-y-6">
            {/* League progress */}
            <LeagueProgressCard
              currentTier={leagueData.currentTier}
              points={leagueData.points}
            />

            {/* Season info */}
            <SeasonInfo season={leagueData.season} />

            {/* Leaderboard */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Leaderboard</h3>
                <div className="text-sm text-gray-400">
                  Your rank: #{leagueData.rank} of {leagueData.totalPlayers.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                {leagueData.leaderboard.map((entry, index) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={entry.id === currentUserId}
                  />
                ))}
              </div>
              <button className="w-full mt-4 py-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors">
                View Full Leaderboard
              </button>
            </div>

            {/* League tiers */}
            <div>
              <h3 className="font-bold text-white mb-4">League Tiers</h3>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(LEAGUE_TIERS).map(([key, tier]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl text-center ${
                      key === leagueData.currentTier
                        ? `bg-gradient-to-br ${tier.color}`
                        : 'bg-gray-800/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{tier.icon}</div>
                    <div className={`text-xs ${key === leagueData.currentTier ? 'text-white' : 'text-gray-400'}`}>
                      {tier.name}
                    </div>
                    <div className={`text-xs ${key === leagueData.currentTier ? 'text-white/80' : 'text-gray-500'}`}>
                      {tier.minPoints}+
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Your tournament history will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Tournament detail modal */}
      {selectedTournament && (
        <TournamentDetailModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onJoin={handleJoinTournament}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

// Tournament detail modal
function TournamentDetailModal({ tournament, onClose, onJoin, currentUserId }) {
  const [activeView, setActiveView] = useState('info');
  const status = TOURNAMENT_STATUS[tournament.status] || TOURNAMENT_STATUS.UPCOMING;
  const format = TOURNAMENT_FORMATS[tournament.format] || TOURNAMENT_FORMATS.SINGLE_ELIMINATION;

  // Mock bracket data
  const mockBracket = [
    {
      name: 'Quarterfinals',
      matches: [
        { player1: { id: '1', name: 'Player A', avatar: '🦊' }, player2: { id: '2', name: 'Player B', avatar: '🐺' }, score1: 3, score2: 1, winnerId: '1' },
        { player1: { id: '3', name: 'Player C', avatar: '👻' }, player2: { id: '4', name: 'Player D', avatar: '⚡' }, score1: 2, score2: 3, winnerId: '4' },
        { player1: { id: '5', name: 'Player E', avatar: '🦁' }, player2: null },
        { player1: { id: '7', name: 'Player G', avatar: '🐲' }, player2: { id: '8', name: 'Player H', avatar: '🎮' } },
      ],
    },
    {
      name: 'Semifinals',
      matches: [
        { player1: { id: '1', name: 'Player A', avatar: '🦊' }, player2: { id: '4', name: 'Player D', avatar: '⚡' } },
        { player1: null, player2: null },
      ],
    },
    {
      name: 'Finals',
      matches: [{ player1: null, player2: null }],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className={`bg-gradient-to-r ${tournament.bannerGradient || 'from-cyan-500/20 to-purple-500/20'} p-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 rounded-lg hover:bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-5xl">{format.icon}</div>
            <div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${status.color}`}>
                {status.label}
              </div>
              <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
              <p className="text-gray-300">{format.name}</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-700">
          {['info', 'bracket', 'participants'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeView === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeView === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Start Date</span>
                  </div>
                  <div className="text-white font-medium">
                    {formatDate(tournament.startDate, true)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Players</span>
                  </div>
                  <div className="text-white font-medium">
                    {tournament.registeredCount}/{tournament.maxPlayers}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Prize Pool</span>
                  </div>
                  <div className="text-yellow-400 font-medium">
                    {tournament.prizePool}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Format</span>
                  </div>
                  <div className="text-white font-medium">{format.name}</div>
                </div>
              </div>

              {/* Countdown */}
              {tournament.status === 'REGISTRATION' && (
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-2">Registration closes in</div>
                  <CountdownTimer targetDate={tournament.startDate} />
                </div>
              )}

              {/* Rules */}
              <div>
                <h3 className="font-bold text-white mb-3">Rules</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-400 mt-0.5" />
                    Best of 3 matches per round
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-400 mt-0.5" />
                    5 minute time limit per match
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-400 mt-0.5" />
                    Standard tag rules apply
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeView === 'bracket' && (
            <TournamentBracket
              rounds={mockBracket}
              onMatchClick={(match) => console.log('Match clicked:', match)}
            />
          )}

          {activeView === 'participants' && (
            <div className="space-y-2">
              {[
                { id: '1', name: 'SpeedDemon', avatar: '🦊', seed: 1 },
                { id: '2', name: 'TagMaster', avatar: '🐺', seed: 2 },
                { id: '3', name: 'ShadowRunner', avatar: '👻', seed: 3 },
                { id: '4', name: 'FlashTag', avatar: '⚡', seed: 4 },
              ].map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl"
                >
                  <div className="w-8 text-center text-sm text-gray-500">#{player.seed}</div>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="font-medium text-white">{player.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {tournament.status === 'REGISTRATION' && (
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => onJoin?.(tournament)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Register for Tournament
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for tournament data
export function useTournaments(userId) {
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTournaments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tournaments');
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinTournament = useCallback(async (tournamentId) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
      });
      loadTournaments();
    } catch (err) {
      console.error('Failed to join tournament:', err);
    }
  }, [loadTournaments]);

  const leaveTournament = useCallback(async (tournamentId) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/leave`, {
        method: 'POST',
      });
      loadTournaments();
    } catch (err) {
      console.error('Failed to leave tournament:', err);
    }
  }, [loadTournaments]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  return {
    tournaments,
    myTournaments,
    isLoading,
    joinTournament,
    leaveTournament,
    refresh: loadTournaments,
  };
}

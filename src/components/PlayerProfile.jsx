/**
 * Player Profile & Stats Component
 * Detailed stats page with graphs, match history, and performance trends
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Trophy,
  Target,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Users,
  Star,
  Award,
  Activity,
  BarChart2,
  PieChart,
  Flame,
  Crown,
  Medal,
  ChevronRight,
  ChevronDown,
  Settings,
  Edit3,
  Camera,
  Share2,
  Copy,
  Check,
  X,
  Eye,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  Lock,
  Globe,
} from 'lucide-react';

// Stat card component
function StatCard({ icon: Icon, label, value, change, suffix = '', color = 'cyan' }) {
  const colors = {
    cyan: 'text-cyan-400 bg-cyan-500/20',
    green: 'text-green-400 bg-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    red: 'text-red-400 bg-red-500/20',
    orange: 'text-orange-400 bg-orange-500/20',
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${
            change >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {change >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-sm text-gray-400 ml-1">{suffix}</span>}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

// Simple bar chart component
function BarChart({ data, height = 120 }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: 4 }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-xs text-gray-500 truncate w-full text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Circular progress component
function CircularProgress({ value, max, size = 80, strokeWidth = 8, color = 'cyan' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  const colors = {
    cyan: 'stroke-cyan-500',
    green: 'stroke-green-500',
    yellow: 'stroke-yellow-500',
    purple: 'stroke-purple-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colors[color]}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}

// Match history item
function MatchHistoryItem({ match, onClick }) {
  const isWin = match.result === 'win';
  const resultColors = {
    win: 'bg-green-500/20 text-green-400 border-green-500',
    loss: 'bg-red-500/20 text-red-400 border-red-500',
    draw: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  };

  return (
    <button
      onClick={() => onClick?.(match)}
      className="w-full flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800/80 transition-colors text-left"
    >
      {/* Result indicator */}
      <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${resultColors[match.result]}`}>
        {match.result.toUpperCase()}
      </div>

      {/* Game info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white">{match.gameMode}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <Users className="w-3 h-3" />
          {match.playerCount} players
          <span>•</span>
          <Clock className="w-3 h-3" />
          {match.duration}
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 text-yellow-400">
            <Zap className="w-3 h-3" />
            {match.tags}
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <Shield className="w-3 h-3" />
            {match.survivalTime}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatDate(match.timestamp)}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-500" />
    </button>
  );
}

// Format date helper
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Achievement badge component
function AchievementBadge({ achievement, size = 'md' }) {
  const sizes = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 flex items-center justify-center`}
      title={achievement.name}
    >
      {achievement.icon}
    </div>
  );
}

// Rank badge component
function RankBadge({ rank, points }) {
  const ranks = {
    bronze: { color: 'from-amber-700 to-amber-900', icon: '🥉', name: 'Bronze' },
    silver: { color: 'from-gray-300 to-gray-500', icon: '🥈', name: 'Silver' },
    gold: { color: 'from-yellow-400 to-yellow-600', icon: '🥇', name: 'Gold' },
    platinum: { color: 'from-cyan-300 to-cyan-500', icon: '💎', name: 'Platinum' },
    diamond: { color: 'from-purple-400 to-purple-600', icon: '👑', name: 'Diamond' },
  };

  const currentRank = ranks[rank] || ranks.bronze;

  return (
    <div className={`relative bg-gradient-to-br ${currentRank.color} rounded-2xl p-4`}>
      <div className="text-4xl mb-2">{currentRank.icon}</div>
      <div className="font-bold text-white">{currentRank.name}</div>
      <div className="text-sm text-white/80">{points.toLocaleString()} RP</div>
    </div>
  );
}

// Edit profile modal
function EditProfileModal({ profile, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar || '👤');
  const [isPublic, setIsPublic] = useState(profile.isPublic ?? true);

  const avatarOptions = ['👤', '🏃', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐲', '👻', '🤖', '👽', '🎮', '⚡', '🔥', '💀'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Edit Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 text-xl rounded-lg transition-all ${
                    avatar === emoji
                      ? 'bg-cyan-500/30 border-2 border-cyan-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="Tell others about yourself..."
            />
          </div>

          {/* Privacy */}
          <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-3">
              {isPublic ? <Globe className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-gray-400" />}
              <div>
                <div className="text-white font-medium">Public Profile</div>
                <div className="text-xs text-gray-400">Others can see your stats</div>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ displayName, bio, avatar, isPublic })}
            className="flex-1 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Main PlayerProfile component
export default function PlayerProfile({
  profile,
  stats,
  matchHistory = [],
  achievements = [],
  isOwnProfile = false,
  isFriend = false,
  onAddFriend,
  onRemoveFriend,
  onUpdateProfile,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate derived stats
  const derivedStats = useMemo(() => {
    const totalGames = (stats?.wins || 0) + (stats?.losses || 0);
    const winRate = totalGames > 0 ? ((stats?.wins || 0) / totalGames) * 100 : 0;
    const avgTagsPerGame = totalGames > 0 ? (stats?.totalTags || 0) / totalGames : 0;

    return {
      totalGames,
      winRate: Math.round(winRate),
      avgTagsPerGame: Math.round(avgTagsPerGame * 10) / 10,
    };
  }, [stats]);

  // Weekly activity data
  const weeklyActivity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((label, i) => ({
      label,
      value: Math.floor(Math.random() * 10), // Would come from real data
    }));
  }, []);

  // Copy profile link
  const copyProfileLink = useCallback(() => {
    const link = `https://taggame.app/player/${profile?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile?.id]);

  // Handle profile update
  const handleProfileUpdate = useCallback((updates) => {
    onUpdateProfile?.(updates);
    setShowEditModal(false);
  }, [onUpdateProfile]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
  ];

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header / Banner */}
      <div className="relative h-32 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
      </div>

      {/* Profile info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-12 left-6">
          <div className="w-24 h-24 rounded-2xl bg-gray-800 border-4 border-gray-900 flex items-center justify-center text-5xl">
            {profile?.avatar || '👤'}
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-0 right-0 p-1.5 bg-cyan-500 rounded-lg"
            >
              <Camera className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3">
          {isOwnProfile ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl text-white hover:bg-gray-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <>
              {isFriend ? (
                <button
                  onClick={onRemoveFriend}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove Friend
                </button>
              ) : (
                <button
                  onClick={onAddFriend}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </button>
              )}
            </>
          )}
          <button
            onClick={copyProfileLink}
            className="p-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Name and info */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{profile?.displayName || 'Player'}</h1>
            {profile?.isVerified && (
              <div className="p-1 bg-cyan-500/20 rounded-full">
                <Check className="w-4 h-4 text-cyan-400" />
              </div>
            )}
          </div>
          <p className="text-gray-400 mt-1">@{profile?.username}</p>
          {profile?.bio && <p className="text-gray-300 mt-2">{profile.bio}</p>}

          {/* Quick stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-white font-medium">{stats?.friendCount || 0}</span>
              <span className="text-gray-500">friends</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-white font-medium">{stats?.wins || 0}</span>
              <span className="text-gray-500">wins</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Joined {formatDate(profile?.joinedAt || Date.now())}</span>
            </div>
          </div>
        </div>

        {/* Rank badge */}
        <div className="absolute top-3 right-6">
          <RankBadge rank={stats?.rank || 'bronze'} points={stats?.rankPoints || 0} />
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

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Trophy} label="Total Wins" value={stats?.wins || 0} change={12} color="yellow" />
              <StatCard icon={Zap} label="Total Tags" value={stats?.totalTags || 0} change={8} color="cyan" />
              <StatCard icon={Shield} label="Survival Time" value={stats?.totalSurvivalTime || '0h'} color="green" />
              <StatCard icon={Flame} label="Best Streak" value={stats?.bestStreak || 0} color="orange" />
            </div>

            {/* Win rate circle */}
            <div className="flex items-center gap-8 p-6 bg-gray-800/50 rounded-xl">
              <CircularProgress
                value={derivedStats.winRate}
                max={100}
                size={100}
                color="cyan"
              />
              <div>
                <div className="text-3xl font-bold text-white">{derivedStats.winRate}%</div>
                <div className="text-gray-400">Win Rate</div>
                <div className="text-sm text-gray-500 mt-1">
                  {stats?.wins || 0}W - {stats?.losses || 0}L
                </div>
              </div>
            </div>

            {/* Weekly activity */}
            <div className="p-6 bg-gray-800/50 rounded-xl">
              <h3 className="font-medium text-white mb-4">Weekly Activity</h3>
              <BarChart data={weeklyActivity} />
            </div>

            {/* Recent achievements */}
            {achievements.length > 0 && (
              <div>
                <h3 className="font-medium text-white mb-3">Recent Achievements</h3>
                <div className="flex gap-3">
                  {achievements.slice(0, 5).map((achievement) => (
                    <AchievementBadge key={achievement.id} achievement={achievement} />
                  ))}
                  {achievements.length > 5 && (
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                      +{achievements.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Detailed stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Target} label="Games Played" value={derivedStats.totalGames} color="purple" />
              <StatCard icon={Zap} label="Avg Tags/Game" value={derivedStats.avgTagsPerGame} color="cyan" />
              <StatCard icon={Clock} label="Time Played" value={stats?.totalPlayTime || '0h'} color="green" />
              <StatCard icon={Flame} label="Current Streak" value={stats?.currentStreak || 0} color="orange" />
              <StatCard icon={MapPin} label="Distance Run" value={stats?.totalDistance || '0'} suffix="km" color="purple" />
              <StatCard icon={Star} label="Total XP" value={stats?.totalXP || 0} color="yellow" />
            </div>

            {/* Role breakdown */}
            <div className="p-6 bg-gray-800/50 rounded-xl">
              <h3 className="font-medium text-white mb-4">Role Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-white">As IT</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats?.tagsAsIt || 0}</div>
                  <div className="text-sm text-gray-400">total tags</div>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-white">As Runner</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats?.survivalWins || 0}</div>
                  <div className="text-sm text-gray-400">survival wins</div>
                </div>
              </div>
            </div>

            {/* Game mode stats */}
            <div className="p-6 bg-gray-800/50 rounded-xl">
              <h3 className="font-medium text-white mb-4">Favorite Game Modes</h3>
              <div className="space-y-3">
                {(stats?.gameModeStats || [
                  { mode: 'Classic', games: 45, winRate: 60 },
                  { mode: 'Elimination', games: 30, winRate: 45 },
                  { mode: 'Team Tag', games: 25, winRate: 55 },
                ]).map((mode) => (
                  <div key={mode.mode} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-400">{mode.mode}</div>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        style={{ width: `${mode.winRate}%` }}
                      />
                    </div>
                    <div className="text-sm text-white w-16 text-right">{mode.winRate}% WR</div>
                    <div className="text-sm text-gray-500 w-16">{mode.games} games</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {matchHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No match history yet</p>
              </div>
            ) : (
              matchHistory.map((match) => (
                <MatchHistoryItem
                  key={match.id}
                  match={match}
                  onClick={(m) => console.log('View match:', m)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {achievements.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No achievements yet</p>
              </div>
            ) : (
              achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex flex-col items-center p-4 bg-gray-800/50 rounded-xl"
                >
                  <AchievementBadge achievement={achievement} size="lg" />
                  <div className="text-sm font-medium text-white mt-2 text-center">
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-500">{achievement.xp} XP</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit profile modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onSave={handleProfileUpdate}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

// Hook for loading player profile
export function usePlayerProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players/${userId}/profile`);
      const data = await response.json();

      setProfile(data.profile);
      setStats(data.stats);
      setMatchHistory(data.matchHistory || []);
      setAchievements(data.achievements || []);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(async (updates) => {
    try {
      const response = await fetch(`/api/players/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  }, [userId]);

  return {
    profile,
    stats,
    matchHistory,
    achievements,
    isLoading,
    error,
    updateProfile,
    refresh: loadProfile,
  };
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Shield,
  Crown,
  Star,
  Trophy,
  Swords,
  MessageSquare,
  Settings,
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronLeft,
  Search,
  Copy,
  Check,
  Edit3,
  Upload,
  Lock,
  Unlock,
  Bell,
  Calendar,
  Target,
  Zap,
  Award,
  TrendingUp,
  Gift,
  Flame,
  Medal,
  Clock,
  MapPin,
  Send,
  MoreVertical,
  LogOut,
  Flag,
  X,
  Plus,
  Home,
  Activity,
  Sparkles,
} from 'lucide-react';

// Clan ranks/roles
const CLAN_ROLES = [
  { id: 'leader', name: 'Leader', icon: Crown, color: 'text-yellow-400', permissions: ['all'] },
  { id: 'co_leader', name: 'Co-Leader', icon: Star, color: 'text-purple-400', permissions: ['invite', 'kick', 'promote', 'war', 'settings'] },
  { id: 'elder', name: 'Elder', icon: Shield, color: 'text-blue-400', permissions: ['invite', 'kick'] },
  { id: 'member', name: 'Member', icon: Users, color: 'text-gray-400', permissions: [] },
];

// Clan perks that unlock with level
const CLAN_PERKS = [
  { level: 1, name: 'Clan Chat', description: 'Private chat for clan members', icon: MessageSquare },
  { level: 2, name: 'Clan Tag', description: 'Display clan tag next to your name', icon: Flag },
  { level: 3, name: 'XP Boost', description: '+5% XP for all members', icon: Zap, value: 5 },
  { level: 5, name: 'Clan Wars', description: 'Participate in clan wars', icon: Swords },
  { level: 7, name: 'XP Boost II', description: '+10% XP for all members', icon: Zap, value: 10 },
  { level: 10, name: 'Clan Events', description: 'Host private clan events', icon: Calendar },
  { level: 12, name: 'Coin Boost', description: '+5% coins for all members', icon: Trophy, value: 5 },
  { level: 15, name: 'Custom Emblem', description: 'Upload custom clan emblem', icon: Upload },
  { level: 18, name: 'XP Boost III', description: '+15% XP for all members', icon: Zap, value: 15 },
  { level: 20, name: 'Legendary Status', description: 'Exclusive legendary clan perks', icon: Crown },
];

// Clan war leagues
const WAR_LEAGUES = [
  { id: 'bronze', name: 'Bronze League', icon: Shield, color: 'text-orange-400', minTrophies: 0 },
  { id: 'silver', name: 'Silver League', icon: Shield, color: 'text-gray-300', minTrophies: 1000 },
  { id: 'gold', name: 'Gold League', icon: Shield, color: 'text-yellow-400', minTrophies: 3000 },
  { id: 'platinum', name: 'Platinum League', icon: Star, color: 'text-cyan-400', minTrophies: 6000 },
  { id: 'diamond', name: 'Diamond League', icon: Star, color: 'text-purple-400', minTrophies: 10000 },
  { id: 'champion', name: 'Champion League', icon: Crown, color: 'text-red-400', minTrophies: 15000 },
];

// Custom hook for clan data
const useClanSystem = () => {
  const [userClan, setUserClan] = useState({
    id: 'clan_123',
    name: 'Shadow Hunters',
    tag: 'SHDW',
    description: 'Elite tag hunters seeking glory. Active daily, war focused!',
    emblem: '🐺',
    level: 8,
    xp: 4500,
    xpToNextLevel: 6000,
    trophies: 4850,
    warLeague: 'gold',
    memberCount: 32,
    maxMembers: 50,
    isPublic: true,
    minLevel: 10,
    createdAt: '2023-06-15',
    warWins: 24,
    warLosses: 8,
    currentWarStreak: 5,
    totalDonations: 12500,
  });

  const [members, setMembers] = useState([
    { id: 1, username: 'ShadowKing', level: 45, role: 'leader', trophies: 2400, donations: 850, lastActive: 'Online', avatar: '👑' },
    { id: 2, username: 'NightBlade', level: 42, role: 'co_leader', trophies: 2250, donations: 720, lastActive: '5m ago', avatar: '⚔️' },
    { id: 3, username: 'StealthMaster', level: 38, role: 'co_leader', trophies: 2100, donations: 680, lastActive: '15m ago', avatar: '🥷' },
    { id: 4, username: 'SwiftRunner', level: 35, role: 'elder', trophies: 1950, donations: 540, lastActive: '1h ago', avatar: '🏃' },
    { id: 5, username: 'TagLegend', level: 33, role: 'elder', trophies: 1800, donations: 490, lastActive: '2h ago', avatar: '🎯' },
    { id: 6, username: 'GhostHunter', level: 31, role: 'member', trophies: 1650, donations: 320, lastActive: '3h ago', avatar: '👻' },
    { id: 7, username: 'SpeedDemon', level: 29, role: 'member', trophies: 1500, donations: 280, lastActive: 'Online', avatar: '💨' },
    { id: 8, username: 'NightOwl', level: 27, role: 'member', trophies: 1350, donations: 210, lastActive: '1d ago', avatar: '🦉' },
  ]);

  const [clanChat, setClanChat] = useState([
    { id: 1, author: 'ShadowKing', message: 'Great war today everyone! 💪', timestamp: '10:30 AM', role: 'leader' },
    { id: 2, author: 'NightBlade', message: 'We crushed them! 5 win streak!', timestamp: '10:32 AM', role: 'co_leader' },
    { id: 3, author: 'SwiftRunner', message: 'Ready for the next one', timestamp: '10:35 AM', role: 'elder' },
    { id: 4, author: 'GhostHunter', message: 'Just joined, excited to be here!', timestamp: '11:00 AM', role: 'member' },
    { id: 5, author: 'ShadowKing', message: 'Welcome! Check the war rules in settings', timestamp: '11:02 AM', role: 'leader' },
  ]);

  const [pendingRequests, setPendingRequests] = useState([
    { id: 101, username: 'NewChallenger', level: 22, trophies: 980, message: 'Looking for active clan!' },
    { id: 102, username: 'TagRookie', level: 15, trophies: 650, message: 'Will participate in all wars' },
  ]);

  const [currentWar, setCurrentWar] = useState({
    opponent: 'Thunder Strikers',
    opponentEmblem: '⚡',
    status: 'battle', // preparation, battle, ended
    timeLeft: 14400, // seconds
    ourScore: 28,
    theirScore: 24,
    participants: 15,
  });

  const [activityFeed, setActivityFeed] = useState([
    { type: 'join', user: 'GhostHunter', timestamp: '2h ago' },
    { type: 'war_win', opponent: 'Night Stalkers', timestamp: '1d ago' },
    { type: 'level_up', newLevel: 8, timestamp: '2d ago' },
    { type: 'promotion', user: 'SwiftRunner', newRole: 'elder', timestamp: '3d ago' },
    { type: 'donation', user: 'NightBlade', amount: 100, timestamp: '3d ago' },
  ]);

  const userRole = 'co_leader'; // Current user's role

  const sendMessage = useCallback((message) => {
    setClanChat(prev => [...prev, {
      id: Date.now(),
      author: 'You',
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: userRole,
    }]);
  }, [userRole]);

  const acceptRequest = useCallback((requestId) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const rejectRequest = useCallback((requestId) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const promoteMember = useCallback((memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const currentIndex = CLAN_ROLES.findIndex(r => r.id === m.role);
        if (currentIndex > 1) {
          return { ...m, role: CLAN_ROLES[currentIndex - 1].id };
        }
      }
      return m;
    }));
  }, []);

  const demoteMember = useCallback((memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const currentIndex = CLAN_ROLES.findIndex(r => r.id === m.role);
        if (currentIndex < CLAN_ROLES.length - 1) {
          return { ...m, role: CLAN_ROLES[currentIndex + 1].id };
        }
      }
      return m;
    }));
  }, []);

  const kickMember = useCallback((memberId) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);

  return {
    userClan,
    members,
    clanChat,
    pendingRequests,
    currentWar,
    activityFeed,
    userRole,
    sendMessage,
    acceptRequest,
    rejectRequest,
    promoteMember,
    demoteMember,
    kickMember,
  };
};

// Clan overview tab
const ClanOverview = ({ clan, members, activityFeed, currentWar }) => {
  const warLeague = WAR_LEAGUES.find(l => l.id === clan.warLeague);
  const LeagueIcon = warLeague?.icon || Shield;

  return (
    <div className="space-y-4">
      {/* Clan header card */}
      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-5 border border-purple-500/30">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{clan.emblem}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{clan.name}</h2>
              <span className="text-purple-400 font-mono text-sm bg-purple-500/20 px-2 py-0.5 rounded">
                [{clan.tag}]
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{clan.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Users size={14} className="text-gray-500" />
                <span className="text-gray-300 text-sm">{clan.memberCount}/{clan.maxMembers}</span>
              </div>
              <div className="flex items-center gap-1">
                <LeagueIcon size={14} className={warLeague?.color} />
                <span className="text-gray-300 text-sm">{warLeague?.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-gray-300 text-sm">{clan.trophies.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Clan Level {clan.level}</span>
            <span className="text-gray-400">{clan.xp.toLocaleString()} / {clan.xpToNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              style={{ width: `${(clan.xp / clan.xpToNextLevel) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current war banner */}
      {currentWar && currentWar.status !== 'ended' && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords size={24} className="text-red-400" />
              <div>
                <div className="text-white font-semibold">War in Progress!</div>
                <div className="text-gray-400 text-sm">vs {currentWar.opponent} {currentWar.opponentEmblem}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                <span className="text-green-400">{currentWar.ourScore}</span>
                <span className="text-gray-500 mx-2">-</span>
                <span className="text-red-400">{currentWar.theirScore}</span>
              </div>
              <div className="text-gray-500 text-xs">
                {Math.floor(currentWar.timeLeft / 3600)}h {Math.floor((currentWar.timeLeft % 3600) / 60)}m left
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <Swords size={20} className="text-red-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">{clan.warWins}</div>
          <div className="text-gray-500 text-xs">War Wins</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <Flame size={20} className="text-orange-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">{clan.currentWarStreak}</div>
          <div className="text-gray-500 text-xs">Win Streak</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <Gift size={20} className="text-green-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">{clan.totalDonations.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Donations</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <Calendar size={20} className="text-blue-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">{Math.floor((Date.now() - new Date(clan.createdAt)) / (1000 * 60 * 60 * 24))}</div>
          <div className="text-gray-500 text-xs">Days Old</div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Activity size={18} className="text-purple-400" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {activityFeed.map((activity, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              {activity.type === 'join' && (
                <>
                  <UserPlus size={16} className="text-green-400" />
                  <span className="text-gray-300"><span className="text-white">{activity.user}</span> joined the clan</span>
                </>
              )}
              {activity.type === 'war_win' && (
                <>
                  <Trophy size={16} className="text-yellow-400" />
                  <span className="text-gray-300">Won war against <span className="text-white">{activity.opponent}</span></span>
                </>
              )}
              {activity.type === 'level_up' && (
                <>
                  <Zap size={16} className="text-purple-400" />
                  <span className="text-gray-300">Clan reached <span className="text-white">Level {activity.newLevel}</span></span>
                </>
              )}
              {activity.type === 'promotion' && (
                <>
                  <Star size={16} className="text-blue-400" />
                  <span className="text-gray-300"><span className="text-white">{activity.user}</span> promoted to {activity.newRole}</span>
                </>
              )}
              {activity.type === 'donation' && (
                <>
                  <Gift size={16} className="text-green-400" />
                  <span className="text-gray-300"><span className="text-white">{activity.user}</span> donated {activity.amount} items</span>
                </>
              )}
              <span className="text-gray-600 ml-auto">{activity.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Perks section */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-400" />
          Clan Perks
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CLAN_PERKS.map((perk) => {
            const isUnlocked = clan.level >= perk.level;
            const Icon = perk.icon;
            return (
              <div
                key={perk.level}
                className={`p-3 rounded-lg border ${
                  isUnlocked
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-gray-900/50 border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={isUnlocked ? 'text-green-400' : 'text-gray-500'} />
                  <span className={`text-xs font-medium ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {perk.name}
                  </span>
                </div>
                <div className="text-gray-500 text-xs">
                  {isUnlocked ? perk.description : `Unlocks at Lvl ${perk.level}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Members tab
const ClanMembers = ({ members, userRole, onPromote, onDemote, onKick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  const filteredMembers = useMemo(() => {
    return members
      .filter(m => m.username.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const roleOrder = CLAN_ROLES.findIndex(r => r.id === a.role) - CLAN_ROLES.findIndex(r => r.id === b.role);
        if (roleOrder !== 0) return roleOrder;
        return b.trophies - a.trophies;
      });
  }, [members, searchQuery]);

  const canManage = ['leader', 'co_leader', 'elder'].includes(userRole);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {filteredMembers.map((member) => {
          const role = CLAN_ROLES.find(r => r.id === member.role);
          const RoleIcon = role?.icon || Users;

          return (
            <div
              key={member.id}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{member.avatar}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{member.username}</span>
                      <div className={`flex items-center gap-1 text-xs ${role?.color}`}>
                        <RoleIcon size={12} />
                        {role?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>Lvl {member.level}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Trophy size={12} className="text-yellow-400" />
                        {member.trophies}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Gift size={12} className="text-green-400" />
                        {member.donations}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs ${member.lastActive === 'Online' ? 'text-green-400' : 'text-gray-500'}`}>
                    {member.lastActive}
                  </span>
                  {canManage && member.role !== 'leader' && (
                    <button
                      onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Member actions dropdown */}
              {selectedMember === member.id && canManage && (
                <div className="mt-3 pt-3 border-t border-gray-700 flex gap-2">
                  {userRole === 'leader' && member.role !== 'co_leader' && (
                    <button
                      onClick={() => onPromote(member.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 rounded-lg text-sm transition-colors"
                    >
                      <TrendingUp size={14} />
                      Promote
                    </button>
                  )}
                  {userRole === 'leader' && member.role !== 'member' && (
                    <button
                      onClick={() => onDemote(member.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 rounded-lg text-sm transition-colors"
                    >
                      <TrendingUp size={14} className="rotate-180" />
                      Demote
                    </button>
                  )}
                  <button
                    onClick={() => onKick(member.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg text-sm transition-colors"
                  >
                    <UserMinus size={14} />
                    Kick
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Chat tab
const ClanChat = ({ messages, onSendMessage, userRole }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = React.useRef(null);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => {
          const role = CLAN_ROLES.find(r => r.id === msg.role);
          return (
            <div key={msg.id} className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium">{msg.author}</span>
                {role && (
                  <span className={`text-xs ${role.color}`}>{role.name}</span>
                )}
                <span className="text-gray-600 text-xs ml-auto">{msg.timestamp}</span>
              </div>
              <p className="text-gray-300 text-sm">{msg.message}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 rounded-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

// Wars tab
const ClanWars = ({ clan, currentWar }) => {
  const warHistory = [
    { opponent: 'Night Stalkers', result: 'win', ourScore: 32, theirScore: 28, date: '2 days ago' },
    { opponent: 'Speed Demons', result: 'win', ourScore: 30, theirScore: 25, date: '5 days ago' },
    { opponent: 'Ghost Squad', result: 'win', ourScore: 35, theirScore: 30, date: '1 week ago' },
    { opponent: 'Tag Masters', result: 'loss', ourScore: 22, theirScore: 28, date: '2 weeks ago' },
    { opponent: 'Urban Runners', result: 'win', ourScore: 40, theirScore: 32, date: '2 weeks ago' },
  ];

  return (
    <div className="space-y-4">
      {/* Current war */}
      {currentWar && currentWar.status !== 'ended' ? (
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-5 border border-red-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Swords size={20} className="text-red-400" />
            <h3 className="text-white font-semibold">Current War</h3>
            <span className="ml-auto text-xs bg-red-500/30 text-red-400 px-2 py-1 rounded-full">
              {currentWar.status === 'preparation' ? 'Preparation' : 'Battle Day'}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-3xl mb-1">{clan.emblem}</div>
              <div className="text-white font-medium">{clan.name}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                <span className="text-green-400">{currentWar.ourScore}</span>
                <span className="text-gray-500 mx-3">vs</span>
                <span className="text-red-400">{currentWar.theirScore}</span>
              </div>
              <div className="text-gray-500 text-sm mt-1">
                <Clock size={14} className="inline mr-1" />
                {Math.floor(currentWar.timeLeft / 3600)}h {Math.floor((currentWar.timeLeft % 3600) / 60)}m remaining
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">{currentWar.opponentEmblem}</div>
              <div className="text-white font-medium">{currentWar.opponent}</div>
            </div>
          </div>

          <button className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Target size={18} />
            Attack Now
          </button>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 text-center">
          <Swords size={32} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No Active War</h3>
          <p className="text-gray-500 text-sm mb-4">Start a new war to battle other clans!</p>
          <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Find Opponent
          </button>
        </div>
      )}

      {/* War stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{clan.warWins}</div>
          <div className="text-gray-500 text-sm">Wins</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-red-400">{clan.warLosses}</div>
          <div className="text-gray-500 text-sm">Losses</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">{Math.round((clan.warWins / (clan.warWins + clan.warLosses)) * 100)}%</div>
          <div className="text-gray-500 text-sm">Win Rate</div>
        </div>
      </div>

      {/* War history */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3">War History</h3>
        <div className="space-y-2">
          {warHistory.map((war, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg ${
                war.result === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {war.result === 'win' ? (
                  <Trophy size={18} className="text-green-400" />
                ) : (
                  <X size={18} className="text-red-400" />
                )}
                <span className="text-white">vs {war.opponent}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-300 font-mono">
                  {war.ourScore} - {war.theirScore}
                </span>
                <span className="text-gray-500 text-sm">{war.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Requests tab (for leaders/co-leaders)
const JoinRequests = ({ requests, onAccept, onReject }) => {
  if (requests.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
        <UserPlus size={32} className="text-gray-600 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">No Pending Requests</h3>
        <p className="text-gray-500 text-sm">New join requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white font-medium">{request.username}</div>
              <div className="text-gray-500 text-sm">
                Level {request.level} • {request.trophies} trophies
              </div>
            </div>
          </div>
          {request.message && (
            <p className="text-gray-400 text-sm mb-3 italic">"{request.message}"</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(request.id)}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <X size={16} />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Clan search for players without a clan
const ClanSearch = ({ onJoin }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clans, setClans] = useState([
    { id: 1, name: 'Shadow Hunters', tag: 'SHDW', emblem: '🐺', level: 8, members: 32, maxMembers: 50, trophies: 4850, isPublic: true },
    { id: 2, name: 'Thunder Strikers', tag: 'THDR', emblem: '⚡', level: 12, members: 48, maxMembers: 50, trophies: 8200, isPublic: true },
    { id: 3, name: 'Night Stalkers', tag: 'NGHT', emblem: '🌙', level: 6, members: 25, maxMembers: 50, trophies: 3100, isPublic: false },
    { id: 4, name: 'Speed Demons', tag: 'FAST', emblem: '💨', level: 10, members: 45, maxMembers: 50, trophies: 6500, isPublic: true },
  ]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search clans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="space-y-3">
        {clans.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((clan) => (
          <div
            key={clan.id}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{clan.emblem}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{clan.name}</span>
                  <span className="text-purple-400 text-xs font-mono">[{clan.tag}]</span>
                  {!clan.isPublic && <Lock size={12} className="text-gray-500" />}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Lvl {clan.level}</span>
                  <span>•</span>
                  <span>{clan.members}/{clan.maxMembers}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Trophy size={12} className="text-yellow-400" />
                    {clan.trophies.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onJoin(clan)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {clan.isPublic ? 'Join' : 'Request'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button className="text-purple-400 hover:text-purple-300 text-sm">
          Create New Clan
        </button>
      </div>
    </div>
  );
};

// Main Clan System Component
const ClanSystem = () => {
  const {
    userClan,
    members,
    clanChat,
    pendingRequests,
    currentWar,
    activityFeed,
    userRole,
    sendMessage,
    acceptRequest,
    rejectRequest,
    promoteMember,
    demoteMember,
    kickMember,
  } = useClanSystem();

  const [activeTab, setActiveTab] = useState('overview');
  const [hasClan] = useState(true); // Toggle to show clan search

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Home },
    { id: 'members', name: 'Members', icon: Users, badge: members.length },
    { id: 'chat', name: 'Chat', icon: MessageSquare },
    { id: 'wars', name: 'Wars', icon: Swords },
    ...(userRole === 'leader' || userRole === 'co_leader'
      ? [{ id: 'requests', name: 'Requests', icon: UserPlus, badge: pendingRequests.length }]
      : []),
  ];

  if (!hasClan) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="text-purple-400" />
              Find a Clan
            </h1>
            <p className="text-gray-400 mt-1">Join a clan to unlock wars, perks, and team play!</p>
          </div>
          <ClanSearch onJoin={(clan) => console.log('Joining:', clan)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="text-purple-400" />
            {userClan.name}
          </h1>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Settings size={20} className="text-gray-400" />
          </button>
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
                {tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <ClanOverview
            clan={userClan}
            members={members}
            activityFeed={activityFeed}
            currentWar={currentWar}
          />
        )}

        {activeTab === 'members' && (
          <ClanMembers
            members={members}
            userRole={userRole}
            onPromote={promoteMember}
            onDemote={demoteMember}
            onKick={kickMember}
          />
        )}

        {activeTab === 'chat' && (
          <ClanChat
            messages={clanChat}
            onSendMessage={sendMessage}
            userRole={userRole}
          />
        )}

        {activeTab === 'wars' && (
          <ClanWars clan={userClan} currentWar={currentWar} />
        )}

        {activeTab === 'requests' && (
          <JoinRequests
            requests={pendingRequests}
            onAccept={acceptRequest}
            onReject={rejectRequest}
          />
        )}

        {/* Leave clan button */}
        <div className="mt-8 pt-4 border-t border-gray-800">
          <button className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors">
            <LogOut size={16} />
            Leave Clan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClanSystem;

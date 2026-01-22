/**
 * Team Mode Component
 * Adds team-based tag variants with team colors, shared objectives, and team chat
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Shield,
  Swords,
  Flag,
  Crown,
  MessageCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Zap,
  Target,
  Trophy,
  Star,
  Lock,
  Unlock,
  Shuffle,
  UserPlus,
  UserMinus,
  Volume2,
  VolumeX,
} from 'lucide-react';

// Team colors and themes
const TEAM_THEMES = {
  red: {
    name: 'Red Team',
    primary: 'bg-red-500',
    secondary: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
    gradient: 'from-red-500 to-red-600',
    emoji: '🔴',
  },
  blue: {
    name: 'Blue Team',
    primary: 'bg-blue-500',
    secondary: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
    emoji: '🔵',
  },
  green: {
    name: 'Green Team',
    primary: 'bg-green-500',
    secondary: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-400',
    gradient: 'from-green-500 to-green-600',
    emoji: '🟢',
  },
  yellow: {
    name: 'Yellow Team',
    primary: 'bg-yellow-500',
    secondary: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    gradient: 'from-yellow-500 to-yellow-600',
    emoji: '🟡',
  },
  purple: {
    name: 'Purple Team',
    primary: 'bg-purple-500',
    secondary: 'bg-purple-500/20',
    border: 'border-purple-500',
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
    emoji: '🟣',
  },
  orange: {
    name: 'Orange Team',
    primary: 'bg-orange-500',
    secondary: 'bg-orange-500/20',
    border: 'border-orange-500',
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-orange-600',
    emoji: '🟠',
  },
};

// Team game modes
const TEAM_MODES = {
  TEAM_TAG: {
    id: 'team_tag',
    name: 'Team Tag',
    description: 'One team is IT, tag all members of the other team',
    icon: Zap,
    minTeams: 2,
    maxTeams: 2,
  },
  CAPTURE_FLAG: {
    id: 'capture_flag',
    name: 'Capture the Flag',
    description: 'Steal the enemy flag and return it to your base',
    icon: Flag,
    minTeams: 2,
    maxTeams: 4,
  },
  TEAM_ELIMINATION: {
    id: 'team_elimination',
    name: 'Team Elimination',
    description: 'Eliminate all players on opposing teams',
    icon: Target,
    minTeams: 2,
    maxTeams: 4,
  },
  KING_OF_HILL: {
    id: 'king_of_hill',
    name: 'King of the Hill',
    description: 'Control the zone for the longest time',
    icon: Crown,
    minTeams: 2,
    maxTeams: 4,
  },
  PROTECT_VIP: {
    id: 'protect_vip',
    name: 'Protect the VIP',
    description: 'Guard your VIP while hunting the enemy VIP',
    icon: Shield,
    minTeams: 2,
    maxTeams: 2,
  },
};

// Team member card
function TeamMemberCard({ player, team, isLeader, isSelf, isVIP, onKick, onPromote, canManage }) {
  const theme = TEAM_THEMES[team];

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg ${
        isSelf ? `${theme.secondary} ${theme.border} border` : 'bg-gray-800/50'
      }`}
    >
      <div className="relative">
        <span className="text-2xl">{player.avatar || '👤'}</span>
        {isLeader && (
          <Crown className={`absolute -top-1 -right-1 w-4 h-4 ${theme.text}`} />
        )}
        {isVIP && (
          <Star className="absolute -bottom-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{player.name}</span>
          {isSelf && <span className="text-xs text-gray-500">(You)</span>}
        </div>
        <div className="text-xs text-gray-400">
          {isLeader ? 'Team Leader' : isVIP ? 'VIP' : 'Member'}
        </div>
      </div>

      {canManage && !isSelf && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPromote?.(player.id)}
            className="p-1.5 hover:bg-white/10 rounded-lg"
            title="Make leader"
          >
            <Crown className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onKick?.(player.id)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg"
            title="Kick from team"
          >
            <UserMinus className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}

// Team chat message
function TeamChatMessage({ message, theme }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-lg flex-shrink-0">{message.avatar || '👤'}</span>
      <div>
        <span className={`font-medium ${theme.text}`}>{message.author}</span>
        <span className="text-gray-300 ml-2">{message.text}</span>
      </div>
    </div>
  );
}

// Team score display
function TeamScoreCard({ team, score, isWinning, playerCount }) {
  const theme = TEAM_THEMES[team];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl ${theme.secondary} ${
        isWinning ? `${theme.border} border-2` : 'border border-transparent'
      }`}
    >
      <div className={`w-10 h-10 rounded-full ${theme.primary} flex items-center justify-center`}>
        <span className="text-xl">{theme.emoji}</span>
      </div>
      <div className="flex-1">
        <div className="font-bold text-white">{theme.name}</div>
        <div className="text-xs text-gray-400">{playerCount} players</div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-bold ${theme.text}`}>{score}</div>
        {isWinning && <div className="text-xs text-yellow-400">Leading</div>}
      </div>
    </div>
  );
}

// Team selection panel
function TeamSelectionPanel({ teams, currentTeam, onJoinTeam, isLocked }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Select Team</h3>
        {isLocked && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Lock className="w-3 h-3" />
            Teams locked
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(teams).map(([teamId, team]) => {
          const theme = TEAM_THEMES[teamId];
          const isCurrentTeam = currentTeam === teamId;

          return (
            <button
              key={teamId}
              onClick={() => !isLocked && onJoinTeam(teamId)}
              disabled={isLocked && !isCurrentTeam}
              className={`p-4 rounded-xl transition-all ${
                isCurrentTeam
                  ? `${theme.secondary} ${theme.border} border-2`
                  : `bg-gray-800/50 border border-transparent ${
                      isLocked ? 'opacity-50' : 'hover:border-gray-600'
                    }`
              }`}
            >
              <div className={`w-12 h-12 mx-auto rounded-full ${theme.primary} flex items-center justify-center mb-2`}>
                <span className="text-2xl">{theme.emoji}</span>
              </div>
              <div className="font-medium text-white">{theme.name}</div>
              <div className="text-sm text-gray-400">{team.players?.length || 0} players</div>
              {isCurrentTeam && (
                <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${theme.text}`}>
                  <Check className="w-3 h-3" />
                  Joined
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Main TeamMode component
export default function TeamMode({
  game,
  teams = {},
  currentUserId,
  socket,
  onLeaveTeam,
  className = '',
}) {
  const [showChat, setShowChat] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  // Get current user's team
  const currentTeam = useMemo(() => {
    for (const [teamId, team] of Object.entries(teams)) {
      if (team.players?.some((p) => p.id === currentUserId)) {
        return teamId;
      }
    }
    return null;
  }, [teams, currentUserId]);

  const currentTeamData = teams[currentTeam];
  const theme = currentTeam ? TEAM_THEMES[currentTeam] : null;

  // Check if current user is team leader
  const isTeamLeader = currentTeamData?.leaderId === currentUserId;

  // Get team scores
  const teamScores = useMemo(() => {
    return Object.entries(teams).map(([teamId, team]) => ({
      teamId,
      score: team.score || 0,
      playerCount: team.players?.length || 0,
    }));
  }, [teams]);

  const maxScore = Math.max(...teamScores.map((t) => t.score));

  // Join team
  const joinTeam = useCallback((teamId) => {
    socket?.emit('team:join', { gameId: game.id, teamId });
  }, [socket, game?.id]);

  // Leave team
  const leaveTeam = useCallback(() => {
    socket?.emit('team:leave', { gameId: game.id });
    onLeaveTeam?.();
  }, [socket, game?.id, onLeaveTeam]);

  // Kick player
  const kickPlayer = useCallback((playerId) => {
    socket?.emit('team:kick', { gameId: game.id, playerId });
  }, [socket, game?.id]);

  // Promote player
  const promotePlayer = useCallback((playerId) => {
    socket?.emit('team:promote', { gameId: game.id, playerId });
  }, [socket, game?.id]);

  // Send chat message
  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !currentTeam) return;

    socket?.emit('team:chat', {
      gameId: game.id,
      teamId: currentTeam,
      message: chatInput.trim(),
    });
    setChatInput('');
  }, [chatInput, socket, game?.id, currentTeam]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data) => {
      if (data.teamId === currentTeam) {
        setChatMessages((prev) => [...prev, data].slice(-100));
      }
    };

    socket.on('team:chatMessage', handleChatMessage);

    return () => {
      socket.off('team:chatMessage', handleChatMessage);
    };
  }, [socket, currentTeam]);

  // Not on a team yet - show team selection
  if (!currentTeam) {
    return (
      <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 ${className}`}>
        <TeamSelectionPanel
          teams={teams}
          currentTeam={currentTeam}
          onJoinTeam={joinTeam}
          isLocked={game?.teamsLocked}
        />
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header with team colors */}
      <div className={`bg-gradient-to-r ${theme.gradient} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{theme.emoji}</span>
            <div>
              <h3 className="font-bold text-white text-lg">{theme.name}</h3>
              <div className="text-sm text-white/80">
                {currentTeamData?.players?.length || 0} members
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={leaveTeam}
              className="px-3 py-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition-colors text-white text-sm font-medium"
            >
              Leave Team
            </button>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          {teamScores.map(({ teamId, score, playerCount }) => (
            <TeamScoreCard
              key={teamId}
              team={teamId}
              score={score}
              playerCount={playerCount}
              isWinning={score === maxScore && score > 0}
            />
          ))}
        </div>
      </div>

      <div className="flex h-64">
        {/* Team members */}
        {showMembers && (
          <div className="w-48 border-r border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Members
              </span>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {currentTeamData?.players?.map((player) => (
                <TeamMemberCard
                  key={player.id}
                  player={player}
                  team={currentTeam}
                  isLeader={player.id === currentTeamData.leaderId}
                  isSelf={player.id === currentUserId}
                  isVIP={player.id === currentTeamData.vipId}
                  onKick={kickPlayer}
                  onPromote={promotePlayer}
                  canManage={isTeamLeader}
                />
              ))}
            </div>
          </div>
        )}

        {/* Team chat */}
        {showChat && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50">
              <span className={`text-sm font-medium flex items-center gap-2 ${theme.text}`}>
                <MessageCircle className="w-4 h-4" />
                Team Chat
              </span>
              {!showMembers && (
                <button
                  onClick={() => setShowMembers(true)}
                  className="p-1 hover:bg-white/10 rounded text-xs text-gray-400"
                >
                  Show Members
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No messages yet. Say hi to your team!
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <TeamChatMessage key={i} message={msg} theme={theme} />
                ))
              )}
            </div>
            <div className="p-2 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="Message your team..."
                  className={`flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${theme.border}`}
                />
                <button
                  onClick={sendChat}
                  className={`p-2 ${theme.primary} rounded-lg hover:opacity-90 transition-opacity`}
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Team setup component for game creation
export function TeamSetup({ onConfigChange, config = {} }) {
  const [mode, setMode] = useState(config.mode || 'team_tag');
  const [teamCount, setTeamCount] = useState(config.teamCount || 2);
  const [autoBalance, setAutoBalance] = useState(config.autoBalance ?? true);
  const [allowSwitch, setAllowSwitch] = useState(config.allowSwitch ?? false);
  const [teamColors, setTeamColors] = useState(config.teamColors || ['red', 'blue']);

  const selectedMode = TEAM_MODES[mode.toUpperCase()] || TEAM_MODES.TEAM_TAG;
  const availableColors = Object.keys(TEAM_THEMES);

  // Update config when settings change
  useEffect(() => {
    onConfigChange?.({
      mode,
      teamCount,
      autoBalance,
      allowSwitch,
      teamColors: teamColors.slice(0, teamCount),
    });
  }, [mode, teamCount, autoBalance, allowSwitch, teamColors, onConfigChange]);

  const handleTeamCountChange = (count) => {
    setTeamCount(count);
    // Ensure we have enough colors
    if (teamColors.length < count) {
      const newColors = [...teamColors];
      for (let i = teamColors.length; i < count; i++) {
        const availableColor = availableColors.find((c) => !newColors.includes(c));
        if (availableColor) newColors.push(availableColor);
      }
      setTeamColors(newColors);
    }
  };

  const handleColorChange = (index, color) => {
    const newColors = [...teamColors];
    newColors[index] = color;
    setTeamColors(newColors);
  };

  return (
    <div className="space-y-6">
      {/* Game mode selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">Game Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(TEAM_MODES).map((gameMode) => (
            <button
              key={gameMode.id}
              onClick={() => setMode(gameMode.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                mode === gameMode.id
                  ? 'bg-cyan-500/20 border-2 border-cyan-500'
                  : 'bg-gray-800/50 border border-transparent hover:border-gray-600'
              }`}
            >
              <gameMode.icon
                className={`w-6 h-6 mb-2 ${mode === gameMode.id ? 'text-cyan-400' : 'text-gray-400'}`}
              />
              <div className="font-medium text-white">{gameMode.name}</div>
              <div className="text-xs text-gray-400 mt-1">{gameMode.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Team count */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">Number of Teams</label>
        <div className="flex gap-2">
          {[2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => handleTeamCountChange(count)}
              disabled={count < selectedMode.minTeams || count > selectedMode.maxTeams}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                teamCount === count
                  ? 'bg-cyan-500 text-white'
                  : count < selectedMode.minTeams || count > selectedMode.maxTeams
                  ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800/50 text-white hover:bg-gray-700/50'
              }`}
            >
              {count} Teams
            </button>
          ))}
        </div>
      </div>

      {/* Team colors */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">Team Colors</label>
        <div className="space-y-3">
          {Array.from({ length: teamCount }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-16">Team {index + 1}</span>
              <div className="flex gap-2">
                {availableColors.map((color) => {
                  const theme = TEAM_THEMES[color];
                  const isSelected = teamColors[index] === color;
                  const isUsed = teamColors.includes(color) && teamColors[index] !== color;

                  return (
                    <button
                      key={color}
                      onClick={() => !isUsed && handleColorChange(index, color)}
                      disabled={isUsed}
                      className={`w-8 h-8 rounded-full ${theme.primary} transition-all ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                          : isUsed
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:scale-110'
                      }`}
                      title={theme.name}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl cursor-pointer">
          <div>
            <div className="font-medium text-white">Auto-balance Teams</div>
            <div className="text-xs text-gray-400">Automatically balance team sizes</div>
          </div>
          <button
            onClick={() => setAutoBalance(!autoBalance)}
            className={`w-12 h-6 rounded-full transition-colors ${
              autoBalance ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                autoBalance ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl cursor-pointer">
          <div>
            <div className="font-medium text-white">Allow Team Switching</div>
            <div className="text-xs text-gray-400">Players can switch teams mid-game</div>
          </div>
          <button
            onClick={() => setAllowSwitch(!allowSwitch)}
            className={`w-12 h-6 rounded-full transition-colors ${
              allowSwitch ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                allowSwitch ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}

// Hook for team mode state
export function useTeamMode(socket, gameId, userId) {
  const [teams, setTeams] = useState({});
  const [currentTeam, setCurrentTeam] = useState(null);
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  useEffect(() => {
    if (!socket || !gameId) return;

    const handleTeamsUpdate = (data) => {
      setTeams(data.teams);

      // Find current team
      for (const [teamId, team] of Object.entries(data.teams)) {
        if (team.players?.some((p) => p.id === userId)) {
          setCurrentTeam(teamId);
          setIsTeamLeader(team.leaderId === userId);
          break;
        }
      }
    };

    const handleTeamJoined = (data) => {
      setCurrentTeam(data.teamId);
    };

    const handleTeamLeft = () => {
      setCurrentTeam(null);
      setIsTeamLeader(false);
    };

    socket.on('team:update', handleTeamsUpdate);
    socket.on('team:joined', handleTeamJoined);
    socket.on('team:left', handleTeamLeft);

    // Request initial team data
    socket.emit('team:getData', { gameId });

    return () => {
      socket.off('team:update', handleTeamsUpdate);
      socket.off('team:joined', handleTeamJoined);
      socket.off('team:left', handleTeamLeft);
    };
  }, [socket, gameId, userId]);

  const joinTeam = useCallback((teamId) => {
    socket?.emit('team:join', { gameId, teamId });
  }, [socket, gameId]);

  const leaveTeam = useCallback(() => {
    socket?.emit('team:leave', { gameId });
  }, [socket, gameId]);

  const shuffleTeams = useCallback(() => {
    socket?.emit('team:shuffle', { gameId });
  }, [socket, gameId]);

  return {
    teams,
    currentTeam,
    isTeamLeader,
    joinTeam,
    leaveTeam,
    shuffleTeams,
  };
}

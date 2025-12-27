import { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { 
  Users, 
  UserPlus, 
  Shuffle, 
  Check,
  Crown,
  Lock,
  Unlock,
  Play,
  Settings,
  ArrowRight
} from 'lucide-react';

// Predefined team colors
const TEAM_COLORS = [
  { id: 'red', name: 'Red', color: '#ef4444', lightColor: '#fef2f2' },
  { id: 'blue', name: 'Blue', color: '#3b82f6', lightColor: '#eff6ff' },
  { id: 'green', name: 'Green', color: '#22c55e', lightColor: '#f0fdf4' },
  { id: 'purple', name: 'Purple', color: '#a855f7', lightColor: '#faf5ff' },
  { id: 'orange', name: 'Orange', color: '#f97316', lightColor: '#fff7ed' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4', lightColor: '#ecfeff' }
];

export default function TeamLobby({ 
  gameId, 
  maxTeams = 2, 
  playersPerTeam = 4,
  isHost = false,
  onStartGame,
  onLeave 
}) {
  const { socket, currentUser, players } = useGameStore();
  
  const [teams, setTeams] = useState([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState([]);
  const [settings, setSettings] = useState({
    autoBalance: true,
    allowTeamSwitch: true,
    lockedTeams: false
  });
  const [countdown, setCountdown] = useState(null);

  // Initialize teams
  useEffect(() => {
    const initialTeams = Array.from({ length: maxTeams }, (_, i) => ({
      id: `team-${i + 1}`,
      ...TEAM_COLORS[i % TEAM_COLORS.length],
      members: [],
      captainId: null,
      ready: false
    }));
    setTeams(initialTeams);
  }, [maxTeams]);

  // Update players
  useEffect(() => {
    const allPlayerIds = teams.flatMap(t => t.members.map(m => m.id));
    const unassigned = players.filter(p => !allPlayerIds.includes(p.id));
    setUnassignedPlayers(unassigned);
  }, [teams, players]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleTeamUpdate = (data) => {
      setTeams(data.teams);
    };

    const handleCountdown = (data) => {
      setCountdown(data.seconds);
    };

    socket.on('lobby:teamUpdate', handleTeamUpdate);
    socket.on('lobby:countdown', handleCountdown);

    return () => {
      socket.off('lobby:teamUpdate', handleTeamUpdate);
      socket.off('lobby:countdown', handleCountdown);
    };
  }, [socket]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onStartGame?.();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onStartGame]);

  // Join team
  const joinTeam = (teamId) => {
    if (settings.lockedTeams && !isHost) return;
    
    const team = teams.find(t => t.id === teamId);
    if (team.members.length >= playersPerTeam) return;
    
    socket?.emit('lobby:joinTeam', { gameId, teamId });
    
    // Optimistic update
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          members: [...t.members, { 
            id: currentUser.id, 
            name: currentUser.name,
            avatar: currentUser.avatar 
          }],
          captainId: t.members.length === 0 ? currentUser.id : t.captainId
        };
      }
      return {
        ...t,
        members: t.members.filter(m => m.id !== currentUser.id)
      };
    }));
  };

  // Leave team
  const leaveTeam = () => {
    socket?.emit('lobby:leaveTeam', { gameId });
    
    setTeams(prev => prev.map(t => ({
      ...t,
      members: t.members.filter(m => m.id !== currentUser.id),
      captainId: t.captainId === currentUser.id && t.members.length > 1
        ? t.members.find(m => m.id !== currentUser.id)?.id
        : t.captainId
    })));
  };

  // Auto-balance teams
  const autoBalance = () => {
    if (!isHost) return;
    
    socket?.emit('lobby:autoBalance', { gameId });
    
    // Simple auto-balance algorithm
    const allPlayers = [...unassignedPlayers, ...teams.flatMap(t => t.members)];
    const shuffled = allPlayers.sort(() => Math.random() - 0.5);
    
    const balancedTeams = teams.map((team, i) => ({
      ...team,
      members: shuffled.slice(
        i * playersPerTeam, 
        Math.min((i + 1) * playersPerTeam, shuffled.length / maxTeams * (i + 1))
      ),
      captainId: shuffled[i * playersPerTeam]?.id
    }));
    
    setTeams(balancedTeams);
  };

  // Toggle team lock
  const toggleLock = () => {
    if (!isHost) return;
    setSettings(prev => ({ ...prev, lockedTeams: !prev.lockedTeams }));
    socket?.emit('lobby:settings', { gameId, lockedTeams: !settings.lockedTeams });
  };

  // Start countdown
  const startCountdown = () => {
    if (!isHost) return;
    
    const allAssigned = unassignedPlayers.length === 0;
    const teamsReady = teams.every(t => t.members.length > 0);
    
    if (!allAssigned || !teamsReady) {
      alert('All players must be assigned to teams');
      return;
    }
    
    socket?.emit('lobby:startCountdown', { gameId });
    setCountdown(5);
  };

  // Get current user's team
  const myTeam = teams.find(t => t.members.some(m => m.id === currentUser?.id));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Lobby</h1>
            <p className="text-gray-500">Choose your team before the game starts</p>
          </div>
          
          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLock}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                  settings.lockedTeams 
                    ? 'bg-red-50 border-red-200 text-red-600' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {settings.lockedTeams ? <Lock size={18} /> : <Unlock size={18} />}
                {settings.lockedTeams ? 'Locked' : 'Unlocked'}
              </button>
              
              <button
                onClick={autoBalance}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Shuffle size={18} />
                Auto Balance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-9xl font-black text-white animate-pulse">
              {countdown}
            </div>
            <div className="text-2xl text-white/80 mt-4">Game starting...</div>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="max-w-4xl mx-auto">
        <div className={`grid gap-4 ${maxTeams === 2 ? 'grid-cols-2' : maxTeams <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-2xl border-2 overflow-hidden transition-all"
              style={{ borderColor: team.color }}
            >
              {/* Team Header */}
              <div 
                className="p-4 text-white"
                style={{ backgroundColor: team.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={20} />
                    <span className="font-bold text-lg">{team.name} Team</span>
                  </div>
                  <span className="text-sm opacity-80">
                    {team.members.length}/{playersPerTeam}
                  </span>
                </div>
              </div>

              {/* Members List */}
              <div className="p-4 min-h-[200px]">
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-xl"
                      style={{ backgroundColor: team.lightColor }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.color }}
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {member.name}
                          {member.id === currentUser?.id && ' (You)'}
                        </span>
                      </div>
                      {member.id === team.captainId && (
                        <Crown size={16} className="text-yellow-500" />
                      )}
                    </div>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: playersPerTeam - team.members.length }).map((_, i) => (
                    <div 
                      key={`empty-${i}`}
                      className="flex items-center justify-center p-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400"
                    >
                      <span className="text-sm">Empty Slot</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join Button */}
              <div className="p-4 border-t border-gray-100">
                {myTeam?.id === team.id ? (
                  <button
                    onClick={leaveTeam}
                    className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Leave Team
                  </button>
                ) : (
                  <button
                    onClick={() => joinTeam(team.id)}
                    disabled={settings.lockedTeams || team.members.length >= playersPerTeam}
                    className="w-full py-2 px-4 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: team.members.length >= playersPerTeam ? '#9ca3af' : team.color
                    }}
                  >
                    {team.members.length >= playersPerTeam ? 'Team Full' : 'Join Team'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned Players */}
        {unassignedPlayers.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={18} className="text-gray-500" />
              <span className="font-medium text-gray-700">
                Waiting to Join ({unassignedPlayers.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((player) => (
                <div 
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                    {player.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Game Button (Host Only) */}
        {isHost && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={startCountdown}
              disabled={unassignedPlayers.length > 0 || teams.some(t => t.members.length === 0)}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={24} />
              Start Game
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Leave Lobby */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLeave}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

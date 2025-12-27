import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store';
import { 
  Users, 
  Crown, 
  Shield, 
  Eye, 
  Sword, 
  MessageCircle,
  Settings,
  UserPlus,
  UserMinus,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Flag,
  AlertCircle
} from 'lucide-react';

// Team roles with their abilities
const TEAM_ROLES = {
  CAPTAIN: {
    id: 'captain',
    name: 'Captain',
    icon: Crown,
    color: '#FFD700',
    description: 'Team leader with full control',
    abilities: ['Assign roles', 'Set strategies', 'Call team moves']
  },
  SCOUT: {
    id: 'scout',
    name: 'Scout',
    icon: Eye,
    color: '#00BCD4',
    description: 'Fast player who tracks enemies',
    abilities: ['Extended radar', 'Speed boost', 'Enemy markers']
  },
  DEFENDER: {
    id: 'defender',
    name: 'Defender',
    icon: Shield,
    color: '#4CAF50',
    description: 'Protects teammates from tags',
    abilities: ['Shield bubble', 'Slow aura', 'Tag immunity (short)']
  },
  HUNTER: {
    id: 'hunter',
    name: 'Hunter',
    icon: Sword,
    color: '#F44336',
    description: 'Aggressive player focused on tags',
    abilities: ['Tag boost', 'Lock-on tracking', 'Sprint burst']
  }
};

// Team strategies
const TEAM_STRATEGIES = [
  { id: 'hunt', name: 'Hunt Mode', icon: Target, description: 'All players pursue aggressively' },
  { id: 'defend', name: 'Defend Mode', icon: Shield, description: 'Protect territory and teammates' },
  { id: 'scatter', name: 'Scatter', icon: Zap, description: 'Spread out to cover more ground' },
  { id: 'regroup', name: 'Regroup', icon: Users, description: 'Meet at rally point' },
  { id: 'ambush', name: 'Ambush', icon: Flag, description: 'Set up trap at location' }
];

export default function TeamManagement({ gameId, teamId, onClose }) {
  const { players, currentUser, socket } = useGameStore();
  
  const [team, setTeam] = useState({
    id: teamId || 'team-1',
    name: 'Red Team',
    color: '#ef4444',
    members: [],
    captain: null,
    strategy: null,
    stats: {
      totalTags: 0,
      totalSurvivalTime: 0,
      wins: 0,
      losses: 0
    }
  });
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showStrategyPanel, setShowStrategyPanel] = useState(false);
  const [teamChat, setTeamChat] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Initialize team data
  useEffect(() => {
    // Simulate team data - in production this comes from socket/API
    const teamMembers = players.filter(p => p.teamId === teamId).map(p => ({
      ...p,
      role: p.id === currentUser?.id ? TEAM_ROLES.CAPTAIN : TEAM_ROLES.HUNTER,
      stats: {
        tags: Math.floor(Math.random() * 10),
        tagged: Math.floor(Math.random() * 5),
        assists: Math.floor(Math.random() * 8)
      }
    }));
    
    setTeam(prev => ({
      ...prev,
      members: teamMembers.length > 0 ? teamMembers : [
        { id: '1', name: 'You (Captain)', role: TEAM_ROLES.CAPTAIN, stats: { tags: 12, tagged: 2, assists: 5 } },
        { id: '2', name: 'Player 2', role: TEAM_ROLES.SCOUT, stats: { tags: 8, tagged: 4, assists: 10 } },
        { id: '3', name: 'Player 3', role: TEAM_ROLES.DEFENDER, stats: { tags: 3, tagged: 1, assists: 15 } },
        { id: '4', name: 'Player 4', role: TEAM_ROLES.HUNTER, stats: { tags: 15, tagged: 6, assists: 3 } }
      ],
      captain: currentUser?.id || '1'
    }));
  }, [players, teamId, currentUser]);

  // Handle role assignment
  const assignRole = useCallback((memberId, role) => {
    setTeam(prev => ({
      ...prev,
      members: prev.members.map(m => 
        m.id === memberId ? { ...m, role: TEAM_ROLES[role] } : m
      )
    }));
    
    // Emit to socket in production
    socket?.emit('team:assignRole', { gameId, teamId, memberId, role });
    setShowRoleSelector(false);
    setSelectedMember(null);
  }, [socket, gameId, teamId]);

  // Handle strategy change
  const setStrategy = useCallback((strategy) => {
    setTeam(prev => ({ ...prev, strategy }));
    socket?.emit('team:setStrategy', { gameId, teamId, strategy: strategy.id });
    setShowStrategyPanel(false);
  }, [socket, gameId, teamId]);

  // Send team chat message
  const sendChatMessage = useCallback(() => {
    if (!chatMessage.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      sender: currentUser?.name || 'You',
      text: chatMessage,
      timestamp: new Date().toISOString()
    };
    
    setTeamChat(prev => [...prev, newMessage]);
    socket?.emit('team:chat', { gameId, teamId, message: chatMessage });
    setChatMessage('');
  }, [chatMessage, currentUser, socket, gameId, teamId]);

  // Quick commands
  const QUICK_COMMANDS = [
    { text: 'Help!', icon: AlertCircle },
    { text: 'Got one!', icon: Target },
    { text: 'Regroup!', icon: Users },
    { text: 'Watch out!', icon: Eye }
  ];

  const isCaptain = team.captain === (currentUser?.id || '1');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div 
          className="p-4 text-white"
          style={{ backgroundColor: team.color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{team.name}</h2>
                <p className="text-sm opacity-80">{team.members.length} members</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Team Stats Summary */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{team.stats.totalTags}</div>
              <div className="text-xs opacity-70">Tags</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{team.stats.wins}</div>
              <div className="text-xs opacity-70">Wins</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{team.members.length}</div>
              <div className="text-xs opacity-70">Active</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{Math.floor(team.stats.totalSurvivalTime / 60)}m</div>
              <div className="text-xs opacity-70">Survived</div>
            </div>
          </div>
        </div>

        {/* Current Strategy Banner */}
        {team.strategy && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <team.strategy.icon size={18} className="text-amber-600" />
                <span className="font-medium text-amber-800">{team.strategy.name}</span>
                <span className="text-sm text-amber-600">Active</span>
              </div>
              {isCaptain && (
                <button 
                  onClick={() => setShowStrategyPanel(true)}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex border-b">
          <button 
            onClick={() => setShowStats(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              !showStats ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Members
          </button>
          <button 
            onClick={() => setShowStats(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              showStats ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Leaderboard
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 350px)' }}>
          {!showStats ? (
            /* Members List */
            <div className="p-4 space-y-3">
              {team.members.map((member) => (
                <div 
                  key={member.id}
                  className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: member.role.color + '20' }}
                      >
                        <member.role.icon size={20} style={{ color: member.role.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.id === team.captain && (
                            <Crown size={14} className="text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{member.role.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="text-gray-900 font-medium">{member.stats.tags} tags</div>
                        <div className="text-gray-500">{member.stats.assists} assists</div>
                      </div>
                      
                      {isCaptain && member.id !== team.captain && (
                        <button 
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRoleSelector(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Role Abilities */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {member.role.abilities.map((ability, idx) => (
                      <span 
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: member.role.color + '15',
                          color: member.role.color
                        }}
                      >
                        {ability}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Team Leaderboard */
            <div className="p-4">
              <div className="space-y-2">
                {[...team.members]
                  .sort((a, b) => b.stats.tags - a.stats.tags)
                  .map((member, index) => (
                    <div 
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                        index === 1 ? 'bg-gray-100 border border-gray-200' :
                        index === 2 ? 'bg-orange-50 border border-orange-200' :
                        'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-200 text-yellow-700' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-200 text-orange-700' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.role.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{member.stats.tags}</div>
                        <div className="text-xs text-gray-500">tags</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Team Chat */}
        <div className="border-t bg-gray-50">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Team Chat</span>
            </div>
            
            {/* Quick Commands */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {QUICK_COMMANDS.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setChatMessage(cmd.text);
                    sendChatMessage();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                >
                  <cmd.icon size={14} />
                  {cmd.text}
                </button>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendChatMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Captain Controls */}
        {isCaptain && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-100">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Captain Controls</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStrategyPanel(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors"
              >
                <Flag size={16} />
                Set Strategy
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors"
              >
                <Target size={16} />
                Mark Target
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Selector Modal */}
      {showRoleSelector && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Assign Role to {selectedMember.name}</h3>
            </div>
            <div className="p-4 space-y-2">
              {Object.values(TEAM_ROLES).map((role) => (
                <button
                  key={role.id}
                  onClick={() => assignRole(selectedMember.id, role.id.toUpperCase())}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: role.color + '20' }}
                  >
                    <role.icon size={20} style={{ color: role.color }} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => {
                  setShowRoleSelector(false);
                  setSelectedMember(null);
                }}
                className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Panel Modal */}
      {showStrategyPanel && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Set Team Strategy</h3>
              <p className="text-sm text-gray-500">Your team will be notified of the change</p>
            </div>
            <div className="p-4 space-y-2">
              {TEAM_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setStrategy(strategy)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    team.strategy?.id === strategy.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <strategy.icon size={20} className="text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{strategy.name}</div>
                    <div className="text-sm text-gray-500">{strategy.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowStrategyPanel(false)}
                className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

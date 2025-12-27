import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store';

// Team roles configuration
export const TEAM_ROLES = {
  CAPTAIN: {
    id: 'captain',
    name: 'Captain',
    color: '#FFD700',
    abilities: ['assignRoles', 'setStrategy', 'callMoves', 'kickMember']
  },
  SCOUT: {
    id: 'scout',
    name: 'Scout',
    color: '#00BCD4',
    abilities: ['extendedRadar', 'speedBoost', 'markEnemies']
  },
  DEFENDER: {
    id: 'defender',
    name: 'Defender',
    color: '#4CAF50',
    abilities: ['shieldBubble', 'slowAura', 'tagImmunity']
  },
  HUNTER: {
    id: 'hunter',
    name: 'Hunter',
    color: '#F44336',
    abilities: ['tagBoost', 'lockOnTracking', 'sprintBurst']
  }
};

// Team strategies
export const TEAM_STRATEGIES = {
  HUNT: { id: 'hunt', name: 'Hunt Mode', cooldown: 30000 },
  DEFEND: { id: 'defend', name: 'Defend Mode', cooldown: 30000 },
  SCATTER: { id: 'scatter', name: 'Scatter', cooldown: 20000 },
  REGROUP: { id: 'regroup', name: 'Regroup', cooldown: 15000 },
  AMBUSH: { id: 'ambush', name: 'Ambush', cooldown: 45000 }
};

export function useTeam(gameId, teamId) {
  const { socket, currentUser, players } = useGameStore();
  
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [teamChat, setTeamChat] = useState([]);
  const [markedTargets, setMarkedTargets] = useState([]);
  const [rallyPoint, setRallyPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const strategyCooldownRef = useRef(null);
  const [strategyCooldown, setStrategyCooldown] = useState(0);

  // Initialize team data
  useEffect(() => {
    if (!gameId || !teamId) return;
    
    const initializeTeam = async () => {
      setLoading(true);
      try {
        // In production, fetch from API
        // const response = await fetch(`/api/games/${gameId}/teams/${teamId}`);
        // const data = await response.json();
        
        // Mock initialization
        const teamData = {
          id: teamId,
          name: teamId === 'team-1' ? 'Red Team' : 'Blue Team',
          color: teamId === 'team-1' ? '#ef4444' : '#3b82f6',
          captainId: currentUser?.id,
          stats: {
            totalTags: 0,
            totalSurvivalTime: 0,
            wins: 0,
            gamesPlayed: 0
          }
        };
        
        setTeam(teamData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    initializeTeam();
  }, [gameId, teamId, currentUser]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMemberJoin = (data) => {
      if (data.teamId !== teamId) return;
      setMembers(prev => [...prev, {
        ...data.member,
        role: TEAM_ROLES.HUNTER,
        joinedAt: Date.now()
      }]);
    };

    const handleMemberLeave = (data) => {
      if (data.teamId !== teamId) return;
      setMembers(prev => prev.filter(m => m.id !== data.memberId));
    };

    const handleRoleChange = (data) => {
      if (data.teamId !== teamId) return;
      setMembers(prev => prev.map(m => 
        m.id === data.memberId ? { ...m, role: TEAM_ROLES[data.role] } : m
      ));
    };

    const handleStrategyChange = (data) => {
      if (data.teamId !== teamId) return;
      setStrategy(TEAM_STRATEGIES[data.strategy.toUpperCase()]);
    };

    const handleTeamChat = (data) => {
      if (data.teamId !== teamId) return;
      setTeamChat(prev => [...prev, {
        id: Date.now(),
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.message,
        timestamp: data.timestamp
      }]);
    };

    const handleTargetMarked = (data) => {
      if (data.teamId !== teamId) return;
      setMarkedTargets(prev => [...prev, {
        playerId: data.targetId,
        markedBy: data.markedBy,
        expiresAt: Date.now() + 30000
      }]);
    };

    const handleRallyPointSet = (data) => {
      if (data.teamId !== teamId) return;
      setRallyPoint(data.location);
    };

    socket.on('team:memberJoin', handleMemberJoin);
    socket.on('team:memberLeave', handleMemberLeave);
    socket.on('team:roleChange', handleRoleChange);
    socket.on('team:strategyChange', handleStrategyChange);
    socket.on('team:chat', handleTeamChat);
    socket.on('team:targetMarked', handleTargetMarked);
    socket.on('team:rallyPoint', handleRallyPointSet);

    return () => {
      socket.off('team:memberJoin', handleMemberJoin);
      socket.off('team:memberLeave', handleMemberLeave);
      socket.off('team:roleChange', handleRoleChange);
      socket.off('team:strategyChange', handleStrategyChange);
      socket.off('team:chat', handleTeamChat);
      socket.off('team:targetMarked', handleTargetMarked);
      socket.off('team:rallyPoint', handleRallyPointSet);
    };
  }, [socket, teamId]);

  // Update members from players list
  useEffect(() => {
    const teamMembers = players
      .filter(p => p.teamId === teamId)
      .map(p => ({
        ...p,
        role: p.id === team?.captainId ? TEAM_ROLES.CAPTAIN : (p.role || TEAM_ROLES.HUNTER),
        stats: p.stats || { tags: 0, tagged: 0, assists: 0 }
      }));
    
    if (teamMembers.length > 0) {
      setMembers(teamMembers);
    }
  }, [players, teamId, team?.captainId]);

  // Clean up expired marked targets
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMarkedTargets(prev => prev.filter(t => t.expiresAt > now));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Strategy cooldown timer
  useEffect(() => {
    if (strategyCooldown <= 0) return;
    
    strategyCooldownRef.current = setInterval(() => {
      setStrategyCooldown(prev => {
        if (prev <= 1000) {
          clearInterval(strategyCooldownRef.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => {
      if (strategyCooldownRef.current) {
        clearInterval(strategyCooldownRef.current);
      }
    };
  }, [strategyCooldown]);

  // Check if current user is captain
  const isCaptain = useCallback(() => {
    return team?.captainId === currentUser?.id;
  }, [team, currentUser]);

  // Get current user's role
  const getMyRole = useCallback(() => {
    const member = members.find(m => m.id === currentUser?.id);
    return member?.role || null;
  }, [members, currentUser]);

  // Assign role to member (captain only)
  const assignRole = useCallback((memberId, roleId) => {
    if (!isCaptain()) {
      console.warn('Only captain can assign roles');
      return false;
    }
    
    if (!TEAM_ROLES[roleId.toUpperCase()]) {
      console.error('Invalid role:', roleId);
      return false;
    }
    
    socket?.emit('team:assignRole', { 
      gameId, 
      teamId, 
      memberId, 
      role: roleId.toUpperCase() 
    });
    
    // Optimistic update
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: TEAM_ROLES[roleId.toUpperCase()] } : m
    ));
    
    return true;
  }, [isCaptain, socket, gameId, teamId]);

  // Set team strategy (captain only)
  const changeStrategy = useCallback((strategyId) => {
    if (!isCaptain()) {
      console.warn('Only captain can change strategy');
      return false;
    }
    
    if (strategyCooldown > 0) {
      console.warn('Strategy on cooldown');
      return false;
    }
    
    const newStrategy = TEAM_STRATEGIES[strategyId.toUpperCase()];
    if (!newStrategy) {
      console.error('Invalid strategy:', strategyId);
      return false;
    }
    
    socket?.emit('team:setStrategy', { 
      gameId, 
      teamId, 
      strategy: strategyId.toUpperCase() 
    });
    
    setStrategy(newStrategy);
    setStrategyCooldown(newStrategy.cooldown);
    
    return true;
  }, [isCaptain, strategyCooldown, socket, gameId, teamId]);

  // Send team chat message
  const sendMessage = useCallback((text) => {
    if (!text.trim()) return false;
    
    const message = {
      id: Date.now(),
      senderId: currentUser?.id,
      senderName: currentUser?.name || 'Anonymous',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    
    socket?.emit('team:chat', { 
      gameId, 
      teamId, 
      message: text.trim() 
    });
    
    // Optimistic update
    setTeamChat(prev => [...prev, message]);
    
    return true;
  }, [socket, gameId, teamId, currentUser]);

  // Mark enemy target (visible to team)
  const markTarget = useCallback((targetPlayerId) => {
    socket?.emit('team:markTarget', { 
      gameId, 
      teamId, 
      targetId: targetPlayerId 
    });
    
    // Optimistic update
    setMarkedTargets(prev => [...prev, {
      playerId: targetPlayerId,
      markedBy: currentUser?.id,
      expiresAt: Date.now() + 30000
    }]);
    
    return true;
  }, [socket, gameId, teamId, currentUser]);

  // Set rally point (captain only)
  const setRallyPointLocation = useCallback((location) => {
    if (!isCaptain()) {
      console.warn('Only captain can set rally point');
      return false;
    }
    
    socket?.emit('team:setRallyPoint', { 
      gameId, 
      teamId, 
      location 
    });
    
    setRallyPoint(location);
    
    return true;
  }, [isCaptain, socket, gameId, teamId]);

  // Transfer captain role
  const transferCaptain = useCallback((newCaptainId) => {
    if (!isCaptain()) {
      console.warn('Only captain can transfer leadership');
      return false;
    }
    
    socket?.emit('team:transferCaptain', { 
      gameId, 
      teamId, 
      newCaptainId 
    });
    
    setTeam(prev => prev ? { ...prev, captainId: newCaptainId } : null);
    
    return true;
  }, [isCaptain, socket, gameId, teamId]);

  // Get team stats
  const getTeamStats = useCallback(() => {
    return {
      ...team?.stats,
      memberCount: members.length,
      activeTags: members.reduce((sum, m) => sum + (m.stats?.tags || 0), 0),
      totalAssists: members.reduce((sum, m) => sum + (m.stats?.assists || 0), 0)
    };
  }, [team, members]);

  // Get sorted leaderboard
  const getLeaderboard = useCallback((sortBy = 'tags') => {
    return [...members].sort((a, b) => {
      const aValue = a.stats?.[sortBy] || 0;
      const bValue = b.stats?.[sortBy] || 0;
      return bValue - aValue;
    });
  }, [members]);

  return {
    // State
    team,
    members,
    strategy,
    teamChat,
    markedTargets,
    rallyPoint,
    loading,
    error,
    strategyCooldown,
    
    // Computed
    isCaptain,
    getMyRole,
    getTeamStats,
    getLeaderboard,
    
    // Actions
    assignRole,
    changeStrategy,
    sendMessage,
    markTarget,
    setRallyPoint: setRallyPointLocation,
    transferCaptain,
    
    // Constants
    TEAM_ROLES,
    TEAM_STRATEGIES
  };
}

export default useTeam;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, Send, X, Users, Smile, Mic, MicOff,
  Volume2, VolumeX, ChevronDown, ChevronUp, Radio,
  MessageSquare, Zap, AlertCircle
} from 'lucide-react';
import { socketService } from '../services/socket';
import { useStore } from '../store';
import { getDistance } from '../../shared/utils';

// Quick preset messages for fast communication
const PRESET_MESSAGES = [
  { emoji: '👀', text: 'I see you!', category: 'alert' },
  { emoji: '🏃', text: 'Run!', category: 'alert' },
  { emoji: '⚠️', text: 'Behind you!', category: 'alert' },
  { emoji: '👋', text: 'Over here!', category: 'location' },
  { emoji: '🎯', text: 'Got you!', category: 'taunt' },
  { emoji: '😱', text: 'Close call!', category: 'react' },
  { emoji: '🛡️', text: 'Safe zone!', category: 'location' },
  { emoji: '🤝', text: 'Help me!', category: 'team' },
  { emoji: '👍', text: 'Good game!', category: 'react' },
  { emoji: '😂', text: 'LOL', category: 'react' },
  { emoji: '💨', text: 'So fast!', category: 'react' },
  { emoji: '🎉', text: 'Nice!', category: 'react' },
];

// Categories for filtering presets
const PRESET_CATEGORIES = [
  { id: 'all', label: 'All', icon: MessageSquare },
  { id: 'alert', label: 'Alerts', icon: AlertCircle },
  { id: 'location', label: 'Location', icon: Radio },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'react', label: 'React', icon: Smile },
];

// Proximity voice chat settings
const VOICE_CHAT_RANGE = 50; // meters

/**
 * Enhanced Game Chat Component
 * Features:
 * - Quick preset messages for fast communication
 * - Proximity-based voice chat (when close to other players)
 * - Team chat for team modes
 * - Minimizable interface
 */
export default function GameChat({ 
  gameId, 
  players, 
  currentUserId,
  teamId = null,
  userLocation = null,
  isMinimized = false, 
  onToggle 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presetCategory, setPresetCategory] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatMode, setChatMode] = useState('all');
  
  // Voice chat state
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nearbyPlayers, setNearbyPlayers] = useState([]);
  const [speakingPlayers, setSpeakingPlayers] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Listen for chat messages
  useEffect(() => {
    const handleChatMessage = ({ senderId, senderName, message, timestamp, isEmote, isPreset, teamOnly }) => {
      if (teamOnly && teamId && senderId !== currentUserId) {
        const senderPlayer = players.find(p => p.id === senderId);
        if (senderPlayer?.teamId !== teamId) return;
      }

      setMessages(prev => [...prev.slice(-99), {
        id: `${Date.now()}-${senderId}`,
        senderId,
        senderName,
        message,
        timestamp,
        isEmote,
        isPreset,
        teamOnly,
      }]);

      if (isMinimized && senderId !== currentUserId) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleProximityChat = ({ playerId, message }) => {
      const player = players.find(p => p.id === playerId);
      if (player && userLocation) {
        const distance = getDistance(
          userLocation.lat, userLocation.lng,
          player.location?.lat, player.location?.lng
        );
        if (distance <= VOICE_CHAT_RANGE) {
          setMessages(prev => [...prev.slice(-99), {
            id: `prox-${Date.now()}-${playerId}`,
            senderId: playerId,
            senderName: player.name,
            message: `🎤 ${message}`,
            timestamp: Date.now(),
            isProximity: true,
          }]);
        }
      }
    };

    socketService.on('chat:message', handleChatMessage);
    socketService.on('chat:proximity', handleProximityChat);

    return () => {
      socketService.off('chat:message', handleChatMessage);
      socketService.off('chat:proximity', handleProximityChat);
    };
  }, [isMinimized, currentUserId, teamId, players, userLocation]);

  // Clear unread when opened
  useEffect(() => {
    if (!isMinimized) {
      setUnreadCount(0);
    }
  }, [isMinimized]);

  // Calculate nearby players for voice chat
  useEffect(() => {
    if (!voiceChatEnabled || !userLocation) return;

    const nearby = players.filter(p => {
      if (p.id === currentUserId) return false;
      if (!p.location) return false;
      
      const distance = getDistance(
        userLocation.lat, userLocation.lng,
        p.location.lat, p.location.lng
      );
      return distance <= VOICE_CHAT_RANGE;
    });

    setNearbyPlayers(nearby);
  }, [voiceChatEnabled, userLocation, players, currentUserId]);

  // Send a message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    socketService.emit('chat:send', {
      gameId,
      message: newMessage.trim(),
      isEmote: false,
      isPreset: false,
      teamOnly: chatMode === 'team',
    });

    setNewMessage('');
  }, [newMessage, gameId, chatMode]);

  // Send a preset message
  const sendPreset = useCallback((preset) => {
    socketService.emit('chat:send', {
      gameId,
      message: `${preset.emoji} ${preset.text}`,
      isEmote: true,
      isPreset: true,
      teamOnly: chatMode === 'team',
    });
    setShowPresets(false);
  }, [gameId, chatMode]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Toggle voice chat
  const toggleVoiceChat = async () => {
    if (voiceChatEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      setVoiceChatEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setVoiceChatEnabled(true);
        setIsMuted(false);
      } catch (err) {
        console.error('Failed to get audio:', err);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Filter presets by category
  const filteredPresets = presetCategory === 'all' 
    ? PRESET_MESSAGES 
    : PRESET_MESSAGES.filter(p => p.category === presetCategory);

  // Get player color
  const getPlayerColor = (playerId) => {
    const index = players.findIndex(p => p.id === playerId);
    const colors = ['#00f5ff', '#a855f7', '#f97316', '#22c55e', '#ef4444', '#3b82f6'];
    return colors[index % colors.length];
  };

  // Minimized view
  if (isMinimized) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-dark-800 border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-dark-700 transition-colors"
      >
        <MessageCircle className="w-6 h-6 text-neon-cyan" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Full chat view
  return (
    <div className="fixed bottom-24 right-4 left-4 z-40 max-w-md ml-auto">
      <div className="bg-dark-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '60vh' }}>
        {/* Header */}
        <div className="p-3 bg-dark-700 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-neon-cyan" />
            <span className="font-semibold">Game Chat</span>
            {teamId && (
              <span className="text-xs px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded-full">
                Team
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Voice chat toggle */}
            <button
              onClick={toggleVoiceChat}
              className={`p-2 rounded-lg transition-colors ${
                voiceChatEnabled 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
              title={voiceChatEnabled ? 'Disable voice chat' : 'Enable voice chat'}
            >
              {voiceChatEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            {voiceChatEnabled && (
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg transition-colors ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-neon-cyan/20 text-neon-cyan'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            
            <button
              onClick={onToggle}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice chat indicator */}
        {voiceChatEnabled && nearbyPlayers.length > 0 && (
          <div className="px-3 py-2 bg-green-500/10 border-b border-green-500/20">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{nearbyPlayers.length} player{nearbyPlayers.length > 1 ? 's' : ''} nearby</span>
            </div>
          </div>
        )}

        {/* Chat mode tabs (for team games) */}
        {teamId && (
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setChatMode('all')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                chatMode === 'all' 
                  ? 'text-neon-cyan border-b-2 border-neon-cyan' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChatMode('team')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                chatMode === 'team' 
                  ? 'text-neon-purple border-b-2 border-neon-purple' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Team Only
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
          {messages.length === 0 ? (
            <div className="text-center text-white/30 py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Use presets for quick communication!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.senderId === currentUserId ? 'items-end' : 'items-start'
                }`}
              >
                {msg.senderId !== currentUserId && (
                  <span 
                    className="text-xs mb-0.5 font-medium"
                    style={{ color: getPlayerColor(msg.senderId) }}
                  >
                    {msg.senderName}
                    {msg.teamOnly && <span className="ml-1 text-neon-purple">(team)</span>}
                  </span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[80%] ${
                    msg.senderId === currentUserId
                      ? 'bg-neon-cyan/20 text-white rounded-br-md'
                      : msg.isProximity
                      ? 'bg-green-500/20 text-green-300 rounded-bl-md'
                      : msg.teamOnly
                      ? 'bg-neon-purple/20 text-white rounded-bl-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                  } ${msg.isPreset ? 'text-lg' : 'text-sm'}`}
                >
                  {msg.message}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset messages panel */}
        {showPresets && (
          <div className="border-t border-white/10 bg-dark-700/50">
            {/* Category tabs */}
            <div className="flex overflow-x-auto p-2 gap-1 border-b border-white/5">
              {PRESET_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setPresetCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      presetCategory === cat.id
                        ? 'bg-neon-cyan/20 text-neon-cyan'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            
            {/* Preset buttons */}
            <div className="grid grid-cols-4 gap-1 p-2">
              {filteredPresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => sendPreset(preset)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-center transition-colors"
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="block text-[10px] text-white/50 truncate">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-2 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`p-2 rounded-lg transition-colors ${
              showPresets 
                ? 'bg-neon-cyan/20 text-neon-cyan' 
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={chatMode === 'team' ? "Message your team..." : "Type a message..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
          />
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

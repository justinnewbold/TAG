import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Users, Smile } from 'lucide-react';
import { socketService } from '../services/socket';

// Quick emotes for fast communication
const QUICK_EMOTES = [
  { emoji: '👋', label: 'Wave' },
  { emoji: '🏃', label: 'Running' },
  { emoji: '😱', label: 'Scared' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '👀', label: 'Looking' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '🛡️', label: 'Safe' },
  { emoji: '💨', label: 'Fast' },
];

function GameChat({ gameId, players, currentUserId, isMinimized = false, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Listen for chat messages
    const handleChatMessage = ({ senderId, senderName, message, timestamp, isEmote }) => {
      setMessages(prev => [...prev.slice(-49), { // Keep last 50 messages
        id: Date.now(),
        senderId,
        senderName,
        message,
        timestamp,
        isEmote,
      }]);

      if (isMinimized && senderId !== currentUserId) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socketService.on('chat:message', handleChatMessage);

    return () => {
      socketService.off('chat:message', handleChatMessage);
    };
  }, [isMinimized, currentUserId]);

  useEffect(() => {
    if (!isMinimized) {
      setUnreadCount(0);
    }
  }, [isMinimized]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    socketService.emit('chat:send', {
      gameId,
      message: newMessage.trim(),
      isEmote: false,
    });

    setNewMessage('');
  };

  const sendEmote = (emoji) => {
    socketService.emit('chat:send', {
      gameId,
      message: emoji,
      isEmote: true,
    });
    setShowEmotes(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPlayerColor = (playerId) => {
    const player = players?.find(p => p.id === playerId);
    if (player?.isIt) return 'text-neon-orange';
    if (player?.team === 'red') return 'text-red-400';
    if (player?.team === 'blue') return 'text-blue-400';
    return 'text-neon-cyan';
  };

  if (isMinimized) {
    return (
      <button
        onClick={onToggle}
        className="relative p-3 bg-dark-800/90 backdrop-blur-sm rounded-full border border-white/10 shadow-lg"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6 text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-orange rounded-full text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col bg-dark-800/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl overflow-hidden max-h-80">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-neon-cyan" />
          <span className="font-medium text-sm">Game Chat</span>
          <span className="text-xs text-white/40">
            <Users className="w-3 h-3 inline mr-1" />
            {players?.length || 0}
          </span>
        </div>
        <button onClick={onToggle} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-32 max-h-48">
        {messages.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${msg.senderId === currentUserId ? 'text-right' : ''}`}
            >
              {msg.isEmote ? (
                <div className={`inline-block ${msg.senderId === currentUserId ? 'text-right' : ''}`}>
                  <span className="text-2xl">{msg.message}</span>
                  <p className={`text-xs ${getPlayerColor(msg.senderId)}`}>
                    {msg.senderId === currentUserId ? 'You' : msg.senderName}
                  </p>
                </div>
              ) : (
                <div className={`inline-block max-w-[80%] ${
                  msg.senderId === currentUserId 
                    ? 'bg-neon-cyan/20 rounded-l-lg rounded-tr-lg' 
                    : 'bg-white/10 rounded-r-lg rounded-tl-lg'
                } px-3 py-2`}>
                  <p className={`text-xs font-medium ${getPlayerColor(msg.senderId)}`}>
                    {msg.senderId === currentUserId ? 'You' : msg.senderName}
                  </p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Emotes */}
      {showEmotes && (
        <div className="px-3 py-2 border-t border-white/10 flex gap-2 overflow-x-auto">
          {QUICK_EMOTES.map((emote) => (
            <button
              key={emote.emoji}
              onClick={() => sendEmote(emote.emoji)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-xl flex-shrink-0"
              title={emote.label}
            >
              {emote.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex gap-2">
        <button
          onClick={() => setShowEmotes(!showEmotes)}
          className={`p-2 rounded-lg transition-all ${showEmotes ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/10 text-white/50'}`}
          aria-label="Toggle emotes"
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neon-cyan/50"
          maxLength={200}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="p-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default GameChat;

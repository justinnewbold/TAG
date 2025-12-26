import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, ChevronUp, ChevronDown } from 'lucide-react';
import { socketService } from '../services/socket';
import { useStore } from '../store';

// Quick chat presets
const QUICK_MESSAGES = [
  { emoji: '👋', text: "I see you!" },
  { emoji: '🏃', text: "Run!" },
  { emoji: '👀', text: "Behind you!" },
  { emoji: '😈', text: "Coming for you!" },
  { emoji: '🙈', text: "Can't find anyone" },
  { emoji: '🤝', text: "Team up?" },
  { emoji: '⏰', text: "Hurry!" },
  { emoji: '😅', text: "That was close!" },
  { emoji: '🎉', text: "GG!" },
  { emoji: '📍', text: "Over here!" },
];

export default function GameChat({ gameId, isTeamMode = false, teamId = null }) {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Listen for chat messages
    const handleChatMessage = (message) => {
      setMessages(prev => [...prev, message].slice(-50)); // Keep last 50 messages
      
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socketService.on('game:chat', handleChatMessage);

    return () => {
      socketService.off('game:chat', handleChatMessage);
    };
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    // Clear unread when opening
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = (text, isQuick = false) => {
    if (!text.trim()) return;

    const message = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: text.trim(),
      isQuick,
      teamOnly: isTeamMode && teamId,
      timestamp: Date.now(),
    };

    // Emit to server
    socketService.emit('game:chat', {
      gameId,
      message,
      teamId: isTeamMode ? teamId : null,
    });

    // Add to local messages immediately
    setMessages(prev => [...prev, { ...message, isOwn: true }]);
    setCustomMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(customMessage);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-indigo-600 transition-all hover:scale-105"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-24 right-4 w-80 bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 z-40 overflow-hidden transition-all ${
      isMinimized ? 'h-14' : 'h-96'
    }`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-white/10 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-white">
            {isTeamMode ? 'Team Chat' : 'Game Chat'}
          </span>
          {messages.length > 0 && (
            <span className="text-xs text-white/40">({messages.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-white/10 rounded transition">
            {isMinimized ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-48 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-white/40 text-sm py-8">
                No messages yet. Say hi! 👋
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="text-xl flex-shrink-0">{msg.userAvatar}</div>
                  <div className={`max-w-[75%] ${msg.isOwn ? 'items-end' : ''}`}>
                    <div className={`px-3 py-2 rounded-2xl ${
                      msg.isOwn 
                        ? 'bg-indigo-500 text-white rounded-br-md' 
                        : 'bg-white/10 text-white rounded-bl-md'
                    }`}>
                      {!msg.isOwn && (
                        <div className="text-xs text-white/60 mb-1">{msg.userName}</div>
                      )}
                      <div className={msg.isQuick ? 'text-lg' : 'text-sm'}>{msg.text}</div>
                    </div>
                    <div className={`text-xs text-white/30 mt-1 ${msg.isOwn ? 'text-right' : ''}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Messages Toggle */}
          <button
            onClick={() => setShowQuickMessages(!showQuickMessages)}
            className="w-full px-3 py-1 text-xs text-white/40 hover:text-white/60 border-t border-white/10 flex items-center justify-center gap-1"
          >
            Quick messages {showQuickMessages ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Quick Messages */}
          {showQuickMessages && (
            <div className="px-3 py-2 border-t border-white/10 overflow-x-auto">
              <div className="flex gap-2">
                {QUICK_MESSAGES.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(`${msg.emoji} ${msg.text}`, true)}
                    className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/80 transition whitespace-nowrap"
                  >
                    {msg.emoji} {msg.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={100}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!customMessage.trim()}
                className="p-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 transition disabled:opacity-50 disabled:hover:bg-indigo-500"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

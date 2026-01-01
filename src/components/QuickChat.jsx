import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { socketService } from '../services/socket';

const QUICK_MESSAGES = [
  { emoji: '👋', text: 'Hey!' },
  { emoji: '🏃', text: 'Running!' },
  { emoji: '😈', text: 'Coming for you!' },
  { emoji: '🙈', text: 'Can\'t find anyone!' },
  { emoji: '🎯', text: 'Got you!' },
  { emoji: '😱', text: 'Close call!' },
  { emoji: '🤝', text: 'Good game!' },
  { emoji: '⏰', text: 'Times almost up!' },
  { emoji: '📍', text: 'Over here!' },
  { emoji: '🆘', text: 'Help!' },
  { emoji: '😂', text: 'LOL' },
  { emoji: '👏', text: 'Nice one!' },
];

export default function QuickChat({ gameId, isOpen, onClose }) {
  const { user } = useStore();
  const [messages, setMessages] = useState([]);
  const [cooldown, setCooldown] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!gameId) return;

    const handleChatMessage = (data) => {
      setMessages(prev => [...prev.slice(-20), {
        id: Date.now(),
        sender: data.sender,
        senderId: data.senderId,
        emoji: data.emoji,
        text: data.text,
        timestamp: Date.now(),
      }]);
    };

    socketService.on('game:chat', handleChatMessage);

    return () => {
      socketService.off('game:chat', handleChatMessage);
    };
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (msg) => {
    if (cooldown || !gameId) return;

    socketService.emit('game:chat', {
      gameId,
      emoji: msg.emoji,
      text: msg.text,
      sender: user?.username || 'Player',
      senderId: user?.id,
    });

    // Add own message to display
    setMessages(prev => [...prev.slice(-20), {
      id: Date.now(),
      sender: user?.username || 'You',
      senderId: user?.id,
      emoji: msg.emoji,
      text: msg.text,
      timestamp: Date.now(),
      isOwn: true,
    }]);

    // 2 second cooldown
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">Quick Chat</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[120px] max-h-[200px]">
          {messages.length === 0 ? (
            <p className="text-center text-slate-400 text-sm">No messages yet</p>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id}
                className={`flex items-start gap-2 ${msg.isOwn ? 'justify-end' : ''}`}
              >
                <div className={`rounded-xl px-3 py-2 max-w-[80%] ${
                  msg.isOwn 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                }`}>
                  <span className="text-xs opacity-75 block">{msg.sender}</span>
                  <span className="text-lg">{msg.emoji}</span> {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Message Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_MESSAGES.map((msg, i) => (
              <button
                key={i}
                onClick={() => sendMessage(msg)}
                disabled={cooldown}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  cooldown 
                    ? 'bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95'
                }`}
              >
                <span className="text-2xl">{msg.emoji}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                  {msg.text}
                </span>
              </button>
            ))}
          </div>
          {cooldown && (
            <p className="text-center text-xs text-slate-400 mt-2">Wait a moment...</p>
          )}
        </div>
      </div>
    </div>
  );
}

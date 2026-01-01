import { useState, useEffect } from 'react';
import { MessageSquare, Send, Zap, X, Sparkles } from 'lucide-react';
import { aiService } from '../services/ai';
import { socketService } from '../services/socket';

export default function SmartQuickChat({ 
  isOpen, 
  onClose, 
  playerRole, // 'it' or 'runner'
  gameState,  // 'default', 'winning', 'losing', 'just_tagged', 'just_escaped'
  onSend,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, playerRole, gameState]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const context = {
        playerRole,
        gameState: gameState || 'default',
      };
      const fetchedMessages = await aiService.getTrashTalk(context);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Fallback messages
      setMessages(aiService.getFallbackTrashTalk({ playerRole }));
    }
    setIsLoading(false);
  };

  const handleSend = (message) => {
    setSelectedMessage(message);
    
    // Send via socket
    socketService.emit('chat:message', {
      type: 'quick',
      content: message,
    });

    // Callback
    if (onSend) onSend(message);

    // Visual feedback then close
    setTimeout(() => {
      setSelectedMessage(null);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div className="bg-dark-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-4 pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-neon-cyan/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-bold">Quick Chat</h3>
              <div className="flex items-center gap-1 text-xs text-neon-cyan">
                <Sparkles className="w-3 h-3" />
                <span>AI-powered suggestions</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role indicator */}
        <div className={`mb-3 px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${
          playerRole === 'it' 
            ? 'bg-red-500/20 text-red-400' 
            : 'bg-green-500/20 text-green-400'
        }`}>
          <Zap className="w-4 h-4" />
          {playerRole === 'it' ? 'You are IT' : 'Runner mode'}
        </div>

        {/* Messages grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {messages.map((message, index) => (
              <button
                key={index}
                onClick={() => handleSend(message)}
                disabled={selectedMessage === message}
                className={`p-3 text-left rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  selectedMessage === message
                    ? 'bg-neon-cyan/30 border-2 border-neon-cyan scale-95'
                    : 'bg-white/10 border border-white/10 hover:bg-white/20'
                }`}
              >
                <span className="line-clamp-2">{message}</span>
              </button>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={loadMessages}
          disabled={isLoading}
          className="mt-3 w-full py-2 text-center text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          {isLoading ? 'Loading...' : '↻ Get new suggestions'}
        </button>
      </div>
    </div>
  );
}

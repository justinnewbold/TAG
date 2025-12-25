import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useStore } from '../store';
import { socketService } from '../services/socket';

// Available emotes
const EMOTES = [
  { id: 'wave', emoji: '👋', label: 'Wave', sound: 'whoosh' },
  { id: 'taunt', emoji: '😏', label: 'Taunt', sound: 'taunt' },
  { id: 'laugh', emoji: '😂', label: 'Laugh', sound: 'laugh' },
  { id: 'scared', emoji: '😱', label: 'Scared', sound: 'scream' },
  { id: 'run', emoji: '🏃', label: 'Run!', sound: 'run' },
  { id: 'victory', emoji: '🎉', label: 'Victory', sound: 'victory' },
  { id: 'sad', emoji: '😢', label: 'Sad', sound: 'sad' },
  { id: 'angry', emoji: '😤', label: 'Angry', sound: 'angry' },
  { id: 'love', emoji: '❤️', label: 'Love', sound: 'heart' },
  { id: 'fire', emoji: '🔥', label: 'On Fire', sound: 'fire' },
  { id: 'cold', emoji: '🥶', label: 'Cold', sound: 'freeze' },
  { id: 'eyes', emoji: '👀', label: 'Watching', sound: 'ping' },
];

// Quick phrases
const QUICK_PHRASES = [
  "Can't catch me!",
  "Over here!",
  "Too slow!",
  "Good game!",
  "Nice tag!",
  "Watch out!",
  "Behind you!",
  "Let's go!",
];

export default function QuickEmotes({ isOpen, onClose, onEmote }) {
  const { user, currentGame, settings } = useStore();
  const [recentEmotes, setRecentEmotes] = useState([]);
  const [cooldown, setCooldown] = useState(false);
  const [floatingEmotes, setFloatingEmotes] = useState([]);

  // Listen for emotes from other players
  useEffect(() => {
    const handleEmote = (data) => {
      if (data.playerId === user?.id) return;
      
      // Add floating emote
      const id = Date.now();
      setFloatingEmotes(prev => [...prev, {
        id,
        emoji: data.emoji,
        playerName: data.playerName,
        x: Math.random() * 60 + 20, // 20-80% from left
      }]);
      
      // Remove after animation
      setTimeout(() => {
        setFloatingEmotes(prev => prev.filter(e => e.id !== id));
      }, 3000);
    };

    socketService.on('player:emote', handleEmote);
    return () => socketService.off('player:emote', handleEmote);
  }, [user?.id]);

  // Send emote
  const sendEmote = (emote) => {
    if (cooldown || !currentGame) return;
    
    // Emit to server
    socketService.emit('player:emote', {
      gameId: currentGame.id,
      emoteId: emote.id,
      emoji: emote.emoji,
    });
    
    // Track recent
    setRecentEmotes(prev => [emote.id, ...prev.slice(0, 2)]);
    
    // Cooldown
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
    
    // Haptic feedback
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    onEmote?.(emote);
    onClose();
  };

  // Send quick phrase
  const sendPhrase = (phrase) => {
    if (cooldown || !currentGame) return;
    
    socketService.emit('game:chat', {
      gameId: currentGame.id,
      message: phrase,
      isQuickPhrase: true,
    });
    
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
    
    onClose();
  };

  return (
    <>
      {/* Floating emotes from other players */}
      {floatingEmotes.map(emote => (
        <div
          key={emote.id}
          className="fixed z-50 pointer-events-none animate-float-up"
          style={{ 
            left: `${emote.x}%`,
            bottom: '20%',
          }}
        >
          <div className="flex flex-col items-center">
            <span className="text-5xl animate-bounce">{emote.emoji}</span>
            <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded-full mt-1">
              {emote.playerName}
            </span>
          </div>
        </div>
      ))}

      {/* Emote picker */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-gradient-to-t from-dark-900 via-dark-900 to-transparent">
          <div className="bg-dark-800/95 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-neon-cyan" />
                <span className="font-semibold text-white">Quick Emotes</span>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Emotes grid */}
            <div className="p-3">
              <div className="grid grid-cols-6 gap-2 mb-3">
                {EMOTES.map(emote => (
                  <button
                    key={emote.id}
                    onClick={() => sendEmote(emote)}
                    disabled={cooldown}
                    className={`
                      aspect-square rounded-xl flex items-center justify-center text-2xl
                      transition-all active:scale-90
                      ${cooldown 
                        ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                        : 'bg-white/10 hover:bg-white/20 hover:scale-110'
                      }
                      ${recentEmotes.includes(emote.id) ? 'ring-2 ring-neon-cyan' : ''}
                    `}
                    title={emote.label}
                  >
                    {emote.emoji}
                  </button>
                ))}
              </div>

              {/* Quick phrases */}
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-white/40 mb-2">Quick Messages</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PHRASES.map(phrase => (
                    <button
                      key={phrase}
                      onClick={() => sendPhrase(phrase)}
                      disabled={cooldown}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium
                        transition-all active:scale-95
                        ${cooldown
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-white/10 text-white hover:bg-neon-cyan/20 hover:text-neon-cyan'
                        }
                      `}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cooldown indicator */}
            {cooldown && (
              <div className="px-3 pb-3">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-neon-cyan animate-shrink-width" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-150px) scale(1.5); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 3s ease-out forwards;
        }
        @keyframes shrink-width {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        .animate-shrink-width {
          animation: shrink-width 2s linear forwards;
        }
      `}</style>
    </>
  );
}

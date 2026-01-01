import { useState, useEffect, useRef } from 'react';
import { Radio, Volume2, VolumeX } from 'lucide-react';
import { aiService } from '../services/ai';

export default function AICommentator({ events, isActive = true }) {
  const [commentary, setCommentary] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef(null);
  const lastEventRef = useRef(null);

  useEffect(() => {
    if (!events || events.length === 0) return;
    
    const latestEvent = events[events.length - 1];
    
    // Don't repeat same event
    if (lastEventRef.current?.id === latestEvent.id) return;
    lastEventRef.current = latestEvent;

    // Generate commentary
    const newCommentary = aiService.generateLocalCommentary(latestEvent);
    
    addCommentary(newCommentary, latestEvent.type);
  }, [events]);

  const addCommentary = (text, type) => {
    const newEntry = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date(),
    };

    setCommentary(prev => [...prev.slice(-4), newEntry]); // Keep last 5

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setCommentary(prev => prev.filter(c => c.id !== newEntry.id));
    }, 5000);

    // Play sound effect if not muted
    if (!isMuted) {
      playCommentarySound(type);
    }
  };

  const playCommentarySound = (type) => {
    // Use Web Audio API for simple sound effects
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different sounds for different events
      const soundConfig = {
        tag: { freq: 880, duration: 0.15 },
        close_call: { freq: 660, duration: 0.2 },
        power_up: { freq: 1200, duration: 0.1 },
        default: { freq: 440, duration: 0.1 },
      };

      const config = soundConfig[type] || soundConfig.default;
      oscillator.frequency.value = config.freq;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (e) {
      // Audio not supported
    }
  };

  if (!isActive || commentary.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed top-20 left-0 right-0 z-30 px-4 pointer-events-none"
    >
      <div className="max-w-md mx-auto space-y-2">
        {commentary.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto animate-slide-down"
          >
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl
              border shadow-lg animate-pulse-subtle
              ${item.type === 'tag' 
                ? 'bg-red-500/20 border-red-500/50 text-red-100' 
                : item.type === 'close_call'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-100'
                : item.type === 'power_up'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100'
                : 'bg-purple-500/20 border-purple-500/50 text-purple-100'
              }
            `}>
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium flex-1">{item.text}</span>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 rounded-full hover:bg-white/10"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 opacity-50" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Zap } from 'lucide-react';
import { liveCommentaryService } from '../services/liveCommentaryService';

// Excitement meter component
function ExcitementMeter({ level }) {
  const getColor = () => {
    if (level > 80) return 'from-red-500 to-orange-500';
    if (level > 60) return 'from-orange-500 to-yellow-500';
    if (level > 40) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-cyan-500';
  };

  return (
    <div className="flex items-center gap-2">
      <Zap className={`w-4 h-4 ${level > 60 ? 'text-orange-400 animate-pulse' : 'text-white/40'}`} />
      <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-300`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

// Main commentary display
function LiveCommentary({ compact = false }) {
  const [commentary, setCommentary] = useState(null);
  const [history, setHistory] = useState([]);
  const [excitement, setExcitement] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const unsubscribe = liveCommentaryService.subscribe((event) => {
      setCommentary(event);
      setExcitement(event.excitement);
      setIsAnimating(true);

      // Add to history
      setHistory(prev => [...prev.slice(-4), event]);

      // Reset animation
      setTimeout(() => setIsAnimating(false), 500);
    });

    return () => unsubscribe();
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    liveCommentaryService.setMuted(newMuted);
  }, [isMuted]);

  const toggleEnabled = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    liveCommentaryService.setEnabled(newEnabled);
  }, [isEnabled]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-dark-800/80 backdrop-blur-sm rounded-xl">
        <button
          onClick={toggleMute}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-white/40" />
          ) : (
            <Volume2 className="w-4 h-4 text-neon-cyan" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          {commentary ? (
            <p className={`text-xs font-medium truncate ${isAnimating ? 'animate-pulse text-neon-cyan' : ''}`}>
              {commentary.text}
            </p>
          ) : (
            <p className="text-xs text-white/40">Commentary ready...</p>
          )}
        </div>
        <ExcitementMeter level={excitement} />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-sm font-bold uppercase tracking-wider">Live Commentary</span>
        </div>
        <div className="flex items-center gap-2">
          <ExcitementMeter level={excitement} />
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white/40" />
            ) : (
              <Volume2 className="w-5 h-5 text-neon-cyan" />
            )}
          </button>
          <button
            onClick={toggleEnabled}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isEnabled ? (
              <Mic className="w-5 h-5 text-red-400" />
            ) : (
              <MicOff className="w-5 h-5 text-white/40" />
            )}
          </button>
        </div>
      </div>

      {/* Main Commentary */}
      <div className="p-4">
        {commentary ? (
          <div
            className={`text-lg font-bold text-center transition-all duration-300 ${
              isAnimating ? 'scale-105 text-neon-cyan' : 'scale-100'
            } ${excitement > 80 ? 'text-orange-400' : excitement > 60 ? 'text-yellow-400' : ''}`}
          >
            {commentary.text}
          </div>
        ) : (
          <div className="text-center text-white/40">
            Waiting for action...
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="px-4 pb-4">
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {history.slice(0, -1).reverse().map((item, i) => (
              <p
                key={item.timestamp}
                className="text-xs text-white/40 truncate"
                style={{ opacity: 1 - (i * 0.2) }}
              >
                {item.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveCommentary;

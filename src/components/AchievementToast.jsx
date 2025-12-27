import React, { useEffect } from 'react';
import { Award, X } from 'lucide-react';
import { useStore } from '../store';
import { useSoundHaptic } from '../hooks/useSoundHaptic';
import confetti from 'canvas-confetti';

function AchievementToast() {
  const { newAchievement, clearNewAchievement } = useStore();
  const sound = useSoundHaptic();
  
  useEffect(() => {
    if (newAchievement) {
      // Play achievement sound with new sound service
      sound.playAchievement();
      
      // Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f5ff', '#a855f7', '#fbbf24'],
      });
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        clearNewAchievement();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [newAchievement, sound, clearNewAchievement]);
  
  if (!newAchievement) return null;
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="card-glow p-4 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/50">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="text-4xl p-3 bg-white/10 rounded-xl animate-bounce">
            {newAchievement.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-neon-cyan font-semibold uppercase tracking-wider">
                Achievement Unlocked!
              </span>
            </div>
            <h3 className="font-display font-bold text-lg mt-1">
              {newAchievement.name}
            </h3>
            <p className="text-sm text-white/60">
              {newAchievement.description}
            </p>
          </div>
          
          {/* Close */}
          <button
            onClick={clearNewAchievement}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AchievementToast;

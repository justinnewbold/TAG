import React, { useEffect } from 'react';
import { Award, X } from 'lucide-react';
import { useStore, useSounds } from '../store';
import confetti from 'canvas-confetti';

function AchievementToast() {
  const { newAchievement, clearNewAchievement } = useStore();
  const { playSound, vibrate } = useSounds();
  
  useEffect(() => {
    if (newAchievement) {
      // Play sound and vibrate
      playSound('achievement');
      vibrate([100, 50, 100, 50, 200]);
      
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
  }, [newAchievement]);
  
  if (!newAchievement) return null;
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="card p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-lg">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="text-4xl p-3 bg-white rounded-xl shadow-sm animate-bounce">
            {newAchievement.icon}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                Achievement Unlocked!
              </span>
            </div>
            <h3 className="font-display font-bold text-lg mt-1 text-gray-900">
              {newAchievement.name}
            </h3>
            <p className="text-sm text-gray-500">
              {newAchievement.description}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={clearNewAchievement}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AchievementToast;

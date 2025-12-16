import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Lock, CheckCircle } from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';

function Achievements() {
  const navigate = useNavigate();
  const { achievements, stats } = useStore();
  
  const allAchievements = Object.values(ACHIEVEMENTS);
  const unlockedCount = achievements.length;
  const totalCount = allAchievements.length;
  const progress = (unlockedCount / totalCount) * 100;
  
  // Get progress for each achievement
  const getProgress = (achievement) => {
    switch (achievement.id) {
      case 'firstTag':
        return { current: stats.totalTags, target: 1 };
      case 'tagged10':
        return { current: stats.totalTags, target: 10 };
      case 'tagged50':
        return { current: stats.totalTags, target: 50 };
      case 'survivor':
        return { current: Math.floor(stats.longestSurvival / 60000), target: 5 };
      case 'firstWin':
        return { current: stats.gamesWon, target: 1 };
      case 'win5':
        return { current: stats.gamesWon, target: 5 };
      case 'social':
        return { current: stats.uniqueFriendsPlayed, target: 10 };
      case 'marathoner':
        return { current: stats.gamesPlayed, target: 10 };
      case 'quickTag':
        return { current: stats.fastestTag ? Math.floor(stats.fastestTag / 1000) : 0, target: 30 };
      case 'nightOwl':
        return { current: stats.playedAtNight ? 1 : 0, target: 1 };
      default:
        return { current: 0, target: 1 };
    }
  };
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Achievements</h1>
          <p className="text-sm text-white/50">{unlockedCount} of {totalCount} unlocked</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Overall Progress</span>
          <span className="text-sm font-medium text-neon-cyan">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-white/40">🔓 {unlockedCount} Unlocked</span>
          <span className="text-xs text-white/40">🔒 {totalCount - unlockedCount} Locked</span>
        </div>
      </div>
      
      {/* Achievements Grid */}
      <div className="grid gap-4">
        {allAchievements.map((achievement) => {
          const isUnlocked = achievements.includes(achievement.id);
          const progress = getProgress(achievement);
          const progressPercent = Math.min((progress.current / progress.target) * 100, 100);
          
          return (
            <div
              key={achievement.id}
              className={`card p-4 transition-all ${
                isUnlocked 
                  ? 'bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/30' 
                  : 'opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`text-4xl p-3 rounded-xl ${
                  isUnlocked 
                    ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20' 
                    : 'bg-white/5 grayscale'
                }`}>
                  {isUnlocked ? achievement.icon : '🔒'}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                      {achievement.name}
                    </h3>
                    {isUnlocked && (
                      <CheckCircle className="w-4 h-4 text-neon-cyan" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${isUnlocked ? 'text-white/60' : 'text-white/40'}`}>
                    {achievement.description}
                  </p>
                  
                  {/* Progress */}
                  {!isUnlocked && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                        <span>Progress</span>
                        <span>{progress.current} / {progress.target}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/30 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {isUnlocked && (
                    <p className="text-xs text-neon-cyan mt-2">✓ Unlocked!</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Completion Message */}
      {unlockedCount === totalCount && (
        <div className="mt-8 card-glow p-6 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-display font-bold text-neon-cyan mb-2">
            Achievement Master!
          </h2>
          <p className="text-white/60">
            You've unlocked all achievements. You're a TAG legend!
          </p>
        </div>
      )}
    </div>
  );
}

export default Achievements;

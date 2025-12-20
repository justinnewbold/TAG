import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Lock, CheckCircle, RefreshCw, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';
import { useSwipe, usePullToRefresh } from '../hooks/useGestures';
import BottomSheet from '../components/BottomSheet';

function Achievements() {
  const navigate = useNavigate();
  const { achievements, stats } = useStore();
  const [filter, setFilter] = useState('all'); // all, unlocked, locked
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Swipe gestures
  const swipeHandlers = useSwipe({
    onSwipeRight: () => navigate(-1),
    threshold: 80,
  });
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);
  
  const { pullHandlers, isPulling, isRefreshing, pullProgress } = usePullToRefresh(handleRefresh);
  
  const allAchievements = Object.values(ACHIEVEMENTS);
  const unlockedCount = achievements.length;
  const totalCount = allAchievements.length;
  const progress = (unlockedCount / totalCount) * 100;
  
  // Filter achievements
  const filteredAchievements = allAchievements.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return achievements.includes(a.id);
    if (filter === 'locked') return !achievements.includes(a.id);
    return true;
  });
  
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
  
  const handleAchievementTap = (achievement) => {
    setSelectedAchievement(achievement);
    setShowDetail(true);
  };
  
  return (
    <div 
      className="min-h-screen pb-32 overflow-y-auto"
      {...swipeHandlers}
      {...pullHandlers}
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center py-4 z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullProgress * 60, 60)}px)` }}
        >
          <div className={`p-3 rounded-full bg-dark-800 shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className={`w-6 h-6 ${pullProgress >= 1 ? 'text-neon-cyan' : 'text-white/40'}`} />
          </div>
        </div>
      )}
      
      {/* Header - Sticky with progress */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Achievements</h1>
            <p className="text-xs text-white/50">{unlockedCount} of {totalCount} unlocked</p>
          </div>
          {isRefreshing && (
            <RefreshCw className="w-5 h-5 text-neon-cyan animate-spin" />
          )}
        </div>
        
        {/* Progress Bar - Always visible */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>Overall Progress</span>
            <span className="text-neon-cyan font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Filter Tabs - Large touch targets */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unlocked', label: `🔓 ${unlockedCount}` },
            { key: 'locked', label: `🔒 ${totalCount - unlockedCount}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                filter === key
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Swipe hint */}
      <div className="px-4 py-2 text-center">
        <span className="text-xs text-white/30">← Swipe right to go back • Tap for details</span>
      </div>
      
      {/* Achievements Grid - 2 column for thumb reach */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = achievements.includes(achievement.id);
          const prog = getProgress(achievement);
          const progressPercent = Math.min((prog.current / prog.target) * 100, 100);
          
          return (
            <button
              key={achievement.id}
              onClick={() => handleAchievementTap(achievement)}
              className={`card p-4 text-left min-h-[140px] transition-all active:scale-95 ${
                isUnlocked 
                  ? 'bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/30' 
                  : 'opacity-75'
              }`}
            >
              {/* Icon */}
              <div className={`text-4xl mb-3 ${!isUnlocked && 'grayscale opacity-50'}`}>
                {isUnlocked ? achievement.icon : '🔒'}
              </div>
              
              {/* Name */}
              <h3 className={`font-semibold text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                {achievement.name}
              </h3>
              
              {/* Progress or Unlocked indicator */}
              {isUnlocked ? (
                <div className="flex items-center gap-1 text-neon-cyan">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Unlocked!</span>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/30 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">{prog.current}/{prog.target}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Completion Message */}
      {unlockedCount === totalCount && (
        <div className="mx-4 mt-6 card-glow p-6 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-display font-bold text-neon-cyan mb-2">
            Achievement Master!
          </h2>
          <p className="text-white/60">
            You've unlocked all achievements. You're a TAG legend!
          </p>
        </div>
      )}
      
      {/* Achievement Detail Bottom Sheet */}
      <BottomSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Achievement Details"
      >
        {selectedAchievement && (
          <div className="p-4 space-y-6">
            {/* Icon and Title */}
            <div className="text-center">
              <div className={`text-7xl mb-4 ${!achievements.includes(selectedAchievement.id) && 'grayscale'}`}>
                {achievements.includes(selectedAchievement.id) ? selectedAchievement.icon : '🔒'}
              </div>
              <h3 className="text-2xl font-display font-bold mb-2">
                {selectedAchievement.name}
              </h3>
              <p className="text-white/60">
                {selectedAchievement.description}
              </p>
            </div>
            
            {/* Progress */}
            {!achievements.includes(selectedAchievement.id) && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Progress</span>
                  <span className="text-sm font-medium">
                    {getProgress(selectedAchievement).current} / {getProgress(selectedAchievement).target}
                  </span>
                </div>
                <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all"
                    style={{ width: `${Math.min((getProgress(selectedAchievement).current / getProgress(selectedAchievement).target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Status */}
            {achievements.includes(selectedAchievement.id) ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-neon-cyan/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-neon-cyan" />
                <span className="text-lg font-medium text-neon-cyan">Unlocked!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-xl">
                <Lock className="w-6 h-6 text-white/40" />
                <span className="text-lg font-medium text-white/40">Keep playing to unlock</span>
              </div>
            )}
            
            {/* Share Button */}
            {achievements.includes(selectedAchievement.id) && (
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `I unlocked ${selectedAchievement.name}!`,
                      text: `${selectedAchievement.icon} I just unlocked the "${selectedAchievement.name}" achievement in TAG!`,
                    });
                  }
                }}
                className="w-full btn-primary flex items-center justify-center gap-2 min-h-[56px]"
              >
                <Share2 className="w-5 h-5" />
                Share Achievement
              </button>
            )}
          </div>
        )}
      </BottomSheet>
      
      {/* Bottom FAB - Share all achievements */}
      {unlockedCount > 0 && (
        <div className="fixed bottom-24 right-4 z-50">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My TAG Achievements',
                  text: `I've unlocked ${unlockedCount} of ${totalCount} achievements in TAG! 🏆`,
                });
              }
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan shadow-lg shadow-neon-purple/30 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Share achievements"
          >
            <Share2 className="w-6 h-6 text-dark-900" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Achievements;

import { useState, useEffect } from 'react';
import { useAchievements } from '../hooks/useAchievements';

/**
 * Achievement & Badge Display Component
 * Shows achievements, badges, progress, and unlock notifications
 */
export default function AchievementBadges({ showNotifications = true }) {
  const {
    achievements,
    stats,
    recentUnlock,
    loading,
    getByCategory,
    getRecent,
    getAlmostComplete,
    getAllCategoryStats,
    dismissUnlock,
    categories,
    rarities
  } = useAchievements();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);

  // Handle unlock notification
  useEffect(() => {
    if (recentUnlock) {
      setShowUnlockAnimation(true);
      const timer = setTimeout(() => setShowUnlockAnimation(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [recentUnlock]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const categoryStats = getAllCategoryStats();
  const displayAchievements = activeTab === 'all' 
    ? achievements.filter(a => !a.hidden || a.unlocked)
    : getByCategory(activeTab).filter(a => !a.hidden || a.unlocked);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Unlock Notification */}
      {showNotifications && showUnlockAnimation && recentUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm text-center animate-bounceIn shadow-2xl">
            <div className="text-6xl mb-4 animate-pulse">{recentUnlock.icon}</div>
            <div 
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: recentUnlock.rarity.color }}
            >
              {recentUnlock.rarity.name} Achievement Unlocked!
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{recentUnlock.name}</h3>
            <p className="text-gray-600 mb-4">{recentUnlock.description}</p>
            <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold">
              <span>+{recentUnlock.xpReward} XP</span>
            </div>
            <button
              onClick={dismissUnlock}
              className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">🏆 Achievements</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.unlocked}</div>
            <div className="text-sm opacity-80">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.percentage}%</div>
            <div className="text-sm opacity-80">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.totalXP.toLocaleString()}</div>
            <div className="text-sm opacity-80">XP Earned</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="text-xs mt-1 opacity-80">
            {stats.unlocked} of {stats.total} achievements unlocked
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex px-2 py-2 gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({stats.unlocked}/{stats.total})
          </button>
          
          {categoryStats.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setActiveTab(cat.category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === cat.category
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="text-xs opacity-70">({cat.unlocked}/{cat.total})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Almost Complete Section */}
      {activeTab === 'all' && getAlmostComplete().length > 0 && (
        <div className="p-4 bg-amber-50 border-b">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">🔥 Almost There!</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {getAlmostComplete().map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white rounded-lg p-3 border border-amber-200 cursor-pointer hover:border-amber-400 transition-colors"
                onClick={() => setSelectedAchievement(achievement)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{achievement.icon}</span>
                  <span className="font-medium text-sm truncate">{achievement.name}</span>
                </div>
                <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-500 rounded-full"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{Math.round(achievement.progress)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {displayAchievements.map((achievement) => (
          <div
            key={achievement.id}
            onClick={() => setSelectedAchievement(achievement)}
            className={`relative rounded-xl p-4 cursor-pointer transition-all hover:scale-105 ${
              achievement.unlocked
                ? 'bg-white border-2 shadow-md hover:shadow-lg'
                : 'bg-gray-100 border-2 border-transparent opacity-60 hover:opacity-80'
            }`}
            style={{
              borderColor: achievement.unlocked ? achievement.rarity.color : 'transparent'
            }}
          >
            {/* Rarity indicator */}
            {achievement.unlocked && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{ backgroundColor: achievement.rarity.color }}
              />
            )}
            
            {/* Icon */}
            <div className={`text-3xl mb-2 ${achievement.unlocked ? '' : 'grayscale'}`}>
              {achievement.unlocked ? achievement.icon : '🔒'}
            </div>
            
            {/* Name */}
            <h4 className={`font-semibold text-sm truncate ${
              achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {achievement.hidden && !achievement.unlocked ? '???' : achievement.name}
            </h4>
            
            {/* Progress or XP */}
            {achievement.unlocked ? (
              <div className="text-xs text-amber-600 mt-1">+{achievement.xpReward} XP</div>
            ) : achievement.progress > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{Math.round(achievement.progress)}%</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge */}
            <div className="text-center mb-4">
              <div 
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl ${
                  selectedAchievement.unlocked ? 'animate-pulse' : 'grayscale bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedAchievement.unlocked 
                    ? `${selectedAchievement.rarity.color}20` 
                    : undefined
                }}
              >
                {selectedAchievement.unlocked ? selectedAchievement.icon : '🔒'}
              </div>
            </div>

            {/* Rarity */}
            <div 
              className="text-center text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: selectedAchievement.rarity.color }}
            >
              {selectedAchievement.rarity.name}
            </div>

            {/* Name & Description */}
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              {selectedAchievement.hidden && !selectedAchievement.unlocked 
                ? '???' 
                : selectedAchievement.name}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {selectedAchievement.hidden && !selectedAchievement.unlocked
                ? 'This is a secret achievement. Keep playing to discover it!'
                : selectedAchievement.description}
            </p>

            {/* Progress */}
            {!selectedAchievement.unlocked && selectedAchievement.progress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{Math.round(selectedAchievement.progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${selectedAchievement.progress}%` }}
                  />
                </div>
                {selectedAchievement.requirement?.count && (
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {selectedAchievement.currentCount} / {selectedAchievement.requirement.count}
                  </div>
                )}
              </div>
            )}

            {/* Reward */}
            <div className="bg-amber-50 rounded-lg p-3 text-center mb-4">
              <span className="text-amber-600 font-semibold">
                {selectedAchievement.unlocked ? '✓ Earned' : 'Reward:'} +{selectedAchievement.xpReward} XP
              </span>
            </div>

            {/* Unlock Date */}
            {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
              <div className="text-center text-sm text-gray-500">
                Unlocked {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedAchievement(null)}
              className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out; }
      `}</style>
    </div>
  );
}

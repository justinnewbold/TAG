import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Target, Clock, Gift, CheckCircle, Circle, Flame } from 'lucide-react';

const DAILY_CHALLENGES = [
  { id: 'tag_3', title: 'Tag 3 Players', description: 'Successfully tag 3 different players', target: 3, xp: 50, type: 'tags' },
  { id: 'survive_5', title: 'Survivor', description: 'Avoid being tagged for 5 minutes total', target: 300, xp: 75, type: 'survival' },
  { id: 'play_3', title: 'Active Player', description: 'Play 3 complete games', target: 3, xp: 100, type: 'games' },
  { id: 'win_1', title: 'Victory', description: 'Win a game', target: 1, xp: 150, type: 'wins' },
  { id: 'distance_1k', title: 'Marathon', description: 'Run 1km total in games', target: 1000, xp: 100, type: 'distance' },
  { id: 'powerup_5', title: 'Power Collector', description: 'Collect 5 power-ups', target: 5, xp: 60, type: 'powerups' },
  { id: 'streak_3', title: 'Hot Streak', description: 'Tag 3 players in a row', target: 3, xp: 125, type: 'streak' },
  { id: 'friend_game', title: 'Social Butterfly', description: 'Play a game with a friend', target: 1, xp: 75, type: 'social' },
];

export default function DailyChallenge({ challenges = [], onClaimReward }) {
  const { stats } = useStore();
  const [claimedIds, setClaimedIds] = useState([]);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  // Calculate time until daily reset (midnight UTC)
  useEffect(() => {
    const updateResetTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const diff = tomorrow - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateResetTimer();
    const interval = setInterval(updateResetTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use provided challenges or default to 3 random daily challenges
  const todaysChallenges = challenges.length > 0 
    ? challenges 
    : DAILY_CHALLENGES.slice(0, 3);

  const claimReward = (challengeId, xp) => {
    if (claimedIds.includes(challengeId)) return;
    
    setClaimedIds(prev => [...prev, challengeId]);
    onClaimReward?.(challengeId, xp);
  };

  const getProgress = (challenge) => {
    // In production, this would come from the backend
    const progressMap = {
      tags: stats?.tagsToday || 0,
      survival: stats?.survivalTime || 0,
      games: stats?.gamesToday || 0,
      wins: stats?.winsToday || 0,
      distance: stats?.distanceToday || 0,
      powerups: stats?.powerupsToday || 0,
      streak: stats?.bestStreakToday || 0,
      social: stats?.friendGamesToday || 0,
    };
    return progressMap[challenge.type] || 0;
  };

  const totalXP = todaysChallenges.reduce((sum, c) => sum + c.xp, 0);
  const completedCount = todaysChallenges.filter(c => getProgress(c) >= c.target).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6" />
            <h2 className="font-bold text-lg">Daily Challenges</h2>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <Clock size={14} />
            <span>Resets in {timeUntilReset}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>{completedCount}/{todaysChallenges.length} Completed</span>
          <span className="flex items-center gap-1">
            <Gift size={14} />
            Up to {totalXP} XP
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${(completedCount / todaysChallenges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Challenges List */}
      <div className="p-4 space-y-3">
        {todaysChallenges.map(challenge => {
          const progress = getProgress(challenge);
          const isComplete = progress >= challenge.target;
          const isClaimed = claimedIds.includes(challenge.id);
          const progressPercent = Math.min((progress / challenge.target) * 100, 100);

          return (
            <div 
              key={challenge.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                isComplete 
                  ? isClaimed 
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                    : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`mt-1 ${isComplete ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
                  {isComplete ? <CheckCircle size={24} /> : <Circle size={24} />}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{challenge.title}</h3>
                    <span className="text-sm font-bold text-orange-500">+{challenge.xp} XP</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{challenge.description}</p>
                  
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[50px] text-right">
                      {progress}/{challenge.target}
                    </span>
                  </div>
                </div>

                {/* Claim Button */}
                {isComplete && !isClaimed && (
                  <button
                    onClick={() => claimReward(challenge.id, challenge.xp)}
                    className="px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-lg animate-pulse hover:scale-105 transition-transform"
                  >
                    Claim!
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus for completing all */}
      {completedCount === todaysChallenges.length && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white text-center">
            <span className="text-3xl block mb-2">🎉</span>
            <p className="font-bold">All Challenges Complete!</p>
            <p className="text-sm opacity-80">+100 Bonus XP</p>
          </div>
        </div>
      )}
    </div>
  );
}

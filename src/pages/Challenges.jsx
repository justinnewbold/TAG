import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Trophy, Clock, Flame, Gift, CheckCircle, Star, Zap, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { challengeService, CHALLENGE_TEMPLATES, ChallengeType } from '../services/challengeService';

// Local challenge progress (simulated for demo)
function useChallengeProgress() {
  const { stats } = useStore();

  // Calculate progress based on user stats
  const calculateProgress = (requirement) => {
    switch (requirement.type) {
      case 'tag_count':
        return Math.min(stats.totalTags, requirement.value);
      case 'win_games':
        return Math.min(stats.gamesWon, requirement.value);
      case 'play_games':
        return Math.min(stats.gamesPlayed, requirement.value);
      case 'survive_time':
        return Math.min(stats.longestSurvival, requirement.value);
      case 'fastest_tag':
        return stats.fastestTag && stats.fastestTag <= requirement.value ? 1 : 0;
      case 'streak':
        return Math.min(stats.currentWinStreak, requirement.value);
      default:
        return 0;
    }
  };

  return { calculateProgress };
}

function ChallengeCard({ challenge, progress, onClaim, claimed }) {
  const progressPercent = Math.min(100, Math.round((progress / challenge.requirement.value) * 100));
  const isComplete = progress >= challenge.requirement.value;

  const difficultyColors = {
    easy: 'from-green-500/20 to-green-600/20 border-green-500/30',
    medium: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    hard: 'from-red-500/20 to-red-600/20 border-red-500/30',
    epic: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  };

  const difficultyText = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-red-400',
    epic: 'text-purple-400',
  };

  return (
    <div
      className={`card p-4 bg-gradient-to-br ${difficultyColors[challenge.difficulty]} border ${
        isComplete && !claimed ? 'ring-2 ring-neon-cyan animate-pulse' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold">{challenge.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${difficultyText[challenge.difficulty]}`}>
              {challenge.difficulty}
            </span>
          </div>
          <p className="text-sm text-white/60">{challenge.description}</p>
        </div>
        {isComplete && !claimed && (
          <button
            onClick={() => onClaim(challenge.id)}
            className="px-3 py-1.5 bg-neon-cyan text-dark-900 rounded-lg text-sm font-bold flex items-center gap-1"
          >
            <Gift className="w-4 h-4" />
            Claim
          </button>
        )}
        {claimed && (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            isComplete ? 'bg-neon-cyan' : 'bg-gradient-to-r from-neon-purple to-neon-cyan'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">
          {progress} / {challenge.requirement.value}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-amber-400">
            <Star className="w-3 h-3" /> {challenge.reward.xp} XP
          </span>
          <span className="flex items-center gap-1 text-neon-cyan">
            <Zap className="w-3 h-3" /> {challenge.reward.coins}
          </span>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak, bonus }) {
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="card p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-xl">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold">Daily Streak</h3>
            <p className="text-xs text-white/50">Play every day for bonuses!</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-400">{streak}</p>
          <p className="text-xs text-white/50">days</p>
        </div>
      </div>

      {/* Streak progress */}
      <div className="flex gap-1 mb-3">
        {days.map((day) => (
          <div
            key={day}
            className={`flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
              day <= streak
                ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
                : day === streak + 1
                ? 'bg-orange-500/20 border-2 border-dashed border-orange-500/50 text-orange-400'
                : 'bg-white/5 text-white/30'
            }`}
          >
            {day <= streak ? <CheckCircle className="w-5 h-5" /> : day}
          </div>
        ))}
      </div>

      {/* Bonus display */}
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-sm text-white/60">Current Bonus</span>
        <span className="text-lg font-bold text-orange-400">
          {bonus > 1 ? `+${Math.round((bonus - 1) * 100)}%` : 'No bonus'}
        </span>
      </div>
    </div>
  );
}

function Challenges() {
  const navigate = useNavigate();
  const { stats } = useStore();
  const { calculateProgress } = useChallengeProgress();
  const [activeTab, setActiveTab] = useState('daily');
  const [claimedChallenges, setClaimedChallenges] = useState(new Set());

  // Get daily and weekly challenges (randomized from templates for demo)
  const dailyChallenges = useMemo(() => {
    const dailyTemplates = CHALLENGE_TEMPLATES.filter(c => c.id.startsWith('daily_'));
    // Pick 3 random daily challenges
    const shuffled = [...dailyTemplates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const weeklyChallenges = useMemo(() => {
    return CHALLENGE_TEMPLATES.filter(c => c.id.startsWith('weekly_'));
  }, []);

  // Calculate streak
  const streak = stats.currentDailyStreak || 0;
  const bonus = challengeService.calculateStreakBonus(streak);

  // Time until reset
  const [timeUntilReset, setTimeUntilReset] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const ms = activeTab === 'daily'
        ? challengeService.getTimeUntilDailyReset()
        : challengeService.getTimeUntilWeeklyReset();
      setTimeUntilReset(challengeService.formatTimeRemaining(ms));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleClaim = (challengeId) => {
    // In real app, would call challengeService.claimReward(challengeId)
    setClaimedChallenges(prev => new Set([...prev, challengeId]));
  };

  const currentChallenges = activeTab === 'daily' ? dailyChallenges : weeklyChallenges;

  // Calculate total completion
  const completedCount = currentChallenges.filter(c => {
    const progress = calculateProgress(c.requirement);
    return progress >= c.requirement.value;
  }).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Challenges</h1>
            <p className="text-xs text-white/50">Complete tasks for rewards</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-neon-cyan">{completedCount}/{currentChallenges.length}</p>
            <p className="text-xs text-white/50">Completed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
              activeTab === 'daily'
                ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-white/5 border border-white/10 text-white/60'
            }`}
          >
            <Target className="w-4 h-4" />
            Daily
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
              activeTab === 'weekly'
                ? 'bg-neon-purple/20 border border-neon-purple/50 text-neon-purple'
                : 'bg-white/5 border border-white/10 text-white/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Weekly
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Streak Card */}
        <StreakCard streak={streak} bonus={bonus} />

        {/* Reset Timer */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {activeTab === 'daily' ? 'Daily' : 'Weekly'} reset in
            </span>
          </div>
          <span className="text-sm font-mono text-neon-cyan">{timeUntilReset}</span>
        </div>

        {/* Challenges List */}
        <div className="space-y-3">
          {currentChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              progress={calculateProgress(challenge.requirement)}
              onClaim={handleClaim}
              claimed={claimedChallenges.has(challenge.id)}
            />
          ))}
        </div>

        {/* Bonus Rewards Section */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold">Complete All {activeTab === 'daily' ? 'Daily' : 'Weekly'}</h3>
              <p className="text-xs text-white/50">Bonus reward for completing all challenges</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-neon-cyan/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="font-bold">{activeTab === 'daily' ? 200 : 1000} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-5 h-5 text-neon-cyan" />
                <span className="font-bold">{activeTab === 'daily' ? 50 : 250}</span>
              </div>
            </div>
            {completedCount === currentChallenges.length ? (
              <button className="px-4 py-2 bg-neon-cyan text-dark-900 rounded-lg font-bold text-sm">
                Claim Bonus
              </button>
            ) : (
              <span className="text-sm text-white/50">
                {currentChallenges.length - completedCount} remaining
              </span>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="text-center text-xs text-white/30 pt-4">
          <p>Play games to make progress on challenges</p>
          <p>Streak bonuses multiply all XP earned!</p>
        </div>
      </div>
    </div>
  );
}

export default Challenges;

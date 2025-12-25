import React, { useEffect, useState } from 'react';
import { Calendar, Trophy, Flame, Target, Users, Clock, Zap, Gift, Star, CheckCircle2, X } from 'lucide-react';
import { useStore } from '../store';

// Challenge types with requirements
const CHALLENGE_POOL = [
  // Easy challenges
  { id: 'play_game', name: 'Ready to Play', desc: 'Play 1 game', target: 1, type: 'games_played', xp: 50, difficulty: 'easy', icon: '🎮' },
  { id: 'tag_1', name: 'First Tag', desc: 'Tag 1 player', target: 1, type: 'tags', xp: 50, difficulty: 'easy', icon: '🏃' },
  { id: 'survive_2min', name: 'Survivor', desc: 'Survive 2 minutes', target: 120, type: 'survival_time', xp: 75, difficulty: 'easy', icon: '🛡️' },
  
  // Medium challenges
  { id: 'tag_3', name: 'Tag Streak', desc: 'Tag 3 players', target: 3, type: 'tags', xp: 100, difficulty: 'medium', icon: '🔥' },
  { id: 'win_game', name: 'Victory', desc: 'Win a game', target: 1, type: 'wins', xp: 150, difficulty: 'medium', icon: '🏆' },
  { id: 'play_friends', name: 'Social Hour', desc: 'Play with 2+ friends', target: 2, type: 'friends_in_game', xp: 100, difficulty: 'medium', icon: '👥' },
  { id: 'survive_5min', name: 'Marathon Runner', desc: 'Survive 5 minutes', target: 300, type: 'survival_time', xp: 125, difficulty: 'medium', icon: '⏱️' },
  { id: 'use_powerup', name: 'Power Player', desc: 'Use 2 power-ups', target: 2, type: 'powerups_used', xp: 100, difficulty: 'medium', icon: '⚡' },
  
  // Hard challenges
  { id: 'tag_5', name: 'Tag Master', desc: 'Tag 5 players in one game', target: 5, type: 'tags_single_game', xp: 200, difficulty: 'hard', icon: '🎯' },
  { id: 'win_streak', name: 'On Fire', desc: 'Win 2 games in a row', target: 2, type: 'win_streak', xp: 250, difficulty: 'hard', icon: '🔥' },
  { id: 'quick_tag', name: 'Speed Demon', desc: 'Tag someone within 30 seconds', target: 1, type: 'quick_tag', xp: 175, difficulty: 'hard', icon: '💨' },
  { id: 'play_modes', name: 'Variety Pack', desc: 'Play 3 different game modes', target: 3, type: 'unique_modes', xp: 200, difficulty: 'hard', icon: '🎲' },
];

// Get daily challenges (deterministic based on date)
function getDailyChallenges(date = new Date()) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const hashA = (seed * 31 + a.id.charCodeAt(0)) % 1000;
    const hashB = (seed * 31 + b.id.charCodeAt(0)) % 1000;
    return hashA - hashB;
  });
  
  // Return 3 challenges: 1 easy, 1 medium, 1 hard
  const easy = shuffled.find(c => c.difficulty === 'easy');
  const medium = shuffled.find(c => c.difficulty === 'medium');
  const hard = shuffled.find(c => c.difficulty === 'hard');
  
  return [easy, medium, hard].filter(Boolean);
}

// Get time until reset (midnight UTC)
function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow - now;
}

function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function DailyChallenges({ isOpen, onClose }) {
  const { stats, updateStats } = useStore();
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState({});
  const [timeLeft, setTimeLeft] = useState(getTimeUntilReset());
  const [streak, setStreak] = useState(stats?.currentDailyStreak || 0);

  // Load challenges
  useEffect(() => {
    const dailyChallenges = getDailyChallenges();
    setChallenges(dailyChallenges);
    
    // Load progress from localStorage
    const today = new Date().toISOString().split('T')[0];
    const savedProgress = JSON.parse(localStorage.getItem('dailyChallengeProgress') || '{}');
    if (savedProgress.date === today) {
      setProgress(savedProgress.progress || {});
    } else {
      // New day, reset progress
      setProgress({});
      localStorage.setItem('dailyChallengeProgress', JSON.stringify({ date: today, progress: {} }));
    }
  }, []);

  // Update timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate completion
  const getProgress = (challenge) => {
    return progress[challenge.id] || 0;
  };

  const isCompleted = (challenge) => {
    return getProgress(challenge) >= challenge.target;
  };

  const allCompleted = challenges.every(isCompleted);
  const totalXP = challenges.reduce((sum, c) => sum + (isCompleted(c) ? c.xp : 0), 0);
  const bonusXP = allCompleted ? 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Daily Challenges</h2>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Clock className="w-3 h-3" />
                <span>Resets in {formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
          
          {/* Streak */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="font-bold">{streak}</span>
              <span className="text-xs">day streak</span>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan">
              <Star className="w-4 h-4" />
              <span className="font-bold">{totalXP + bonusXP}</span>
              <span className="text-xs">XP earned</span>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
          {challenges.map((challenge, index) => {
            const prog = getProgress(challenge);
            const completed = isCompleted(challenge);
            const percentage = Math.min((prog / challenge.target) * 100, 100);
            
            return (
              <div 
                key={challenge.id}
                className={`
                  relative p-4 rounded-xl border transition-all
                  ${completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-xl
                    ${completed ? 'bg-green-500/20' : 'bg-white/10'}
                  `}>
                    {completed ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : challenge.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${completed ? 'text-green-400' : 'text-white'}`}>
                        {challenge.name}
                      </h3>
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${challenge.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : ''}
                        ${challenge.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                        ${challenge.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : ''}
                      `}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-0.5">{challenge.desc}</p>
                    
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/40">{prog}/{challenge.target}</span>
                        <span className="text-neon-cyan">+{challenge.xp} XP</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            completed 
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                              : 'bg-gradient-to-r from-neon-cyan to-neon-purple'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bonus Section */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className={`
            p-3 rounded-xl border-2 border-dashed
            ${allCompleted 
              ? 'border-green-500/50 bg-green-500/10' 
              : 'border-white/20 bg-white/5'
            }
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${allCompleted ? 'bg-green-500/20' : 'bg-white/10'}
              `}>
                <Gift className={`w-5 h-5 ${allCompleted ? 'text-green-400' : 'text-white/40'}`} />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${allCompleted ? 'text-green-400' : 'text-white/60'}`}>
                  All Challenges Bonus
                </h4>
                <p className="text-xs text-white/40">Complete all 3 challenges</p>
              </div>
              <div className={`text-lg font-bold ${allCompleted ? 'text-green-400' : 'text-white/30'}`}>
                +100 XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

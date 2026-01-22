import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  Trophy,
  Target,
  Zap,
  Shield,
  Users,
  Map,
  Clock,
  Award,
  BookOpen,
  Lightbulb,
  Brain,
  Footprints,
  Eye,
  Navigation,
  Compass,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Settings,
  ArrowRight,
  CheckCircle,
  Circle,
  Sparkles,
  Gift,
  Bot,
  Crosshair,
  Timer,
  Route,
  Heart,
  Flame,
} from 'lucide-react';

// Tutorial categories and lessons
const TUTORIAL_CATEGORIES = [
  {
    id: 'basics',
    name: 'Game Basics',
    icon: BookOpen,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Learn the fundamentals of TAG',
    lessons: [
      {
        id: 'intro',
        name: 'Welcome to TAG',
        duration: '2 min',
        xpReward: 50,
        steps: [
          { type: 'info', title: 'What is TAG?', content: 'TAG is a real-world GPS-based game of chase. Players are either Hunters or Runners in an exciting outdoor pursuit!' },
          { type: 'info', title: 'The Objective', content: 'Hunters must tag Runners before time runs out. Runners must evade capture and survive until the timer ends.' },
          { type: 'info', title: 'Play Area', content: 'Games take place within a defined boundary. Stay inside the zone or you\'ll be automatically caught!' },
          { type: 'action', title: 'Try It!', content: 'Tap the map to see how the play boundary works.', action: 'tap_map' },
        ],
      },
      {
        id: 'controls',
        name: 'Controls & Interface',
        duration: '3 min',
        xpReward: 75,
        steps: [
          { type: 'info', title: 'Your Location', content: 'The blue dot shows your real-time GPS position. Make sure location services are enabled!' },
          { type: 'highlight', title: 'The Radar', content: 'The radar shows nearby players. Red dots are enemies, green are teammates.', highlight: 'radar' },
          { type: 'highlight', title: 'Game Timer', content: 'Keep an eye on the timer. When it hits zero, the round ends!', highlight: 'timer' },
          { type: 'action', title: 'Practice Moving', content: 'Walk around to see your position update on the map.', action: 'move' },
        ],
      },
      {
        id: 'roles',
        name: 'Hunter vs Runner',
        duration: '4 min',
        xpReward: 100,
        steps: [
          { type: 'info', title: 'Playing as Hunter', content: 'As a Hunter, your goal is to get close enough to Runners to tag them. Use the compass to track your targets!' },
          { type: 'info', title: 'Playing as Runner', content: 'As a Runner, stay mobile and use the environment to your advantage. Watch your radar for approaching Hunters!' },
          { type: 'info', title: 'Tagging', content: 'To tag someone, get within 5 meters of them. The tag happens automatically when you\'re close enough.' },
          { type: 'action', title: 'Simulate a Tag', content: 'Move toward the practice target to simulate tagging.', action: 'tag_practice' },
        ],
      },
    ],
  },
  {
    id: 'hunter',
    name: 'Hunter Training',
    icon: Crosshair,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Master the art of pursuit',
    lessons: [
      {
        id: 'tracking',
        name: 'Tracking Basics',
        duration: '5 min',
        xpReward: 150,
        steps: [
          { type: 'info', title: 'Using the Compass', content: 'The hunting compass points toward the nearest Runner. The closer they are, the more it pulses!' },
          { type: 'info', title: 'Reading Distance', content: 'Pay attention to the distance indicator. Plan your approach based on how far away your target is.' },
          { type: 'action', title: 'Follow the Compass', content: 'Use the compass to locate the practice target.', action: 'compass_track' },
          { type: 'info', title: 'Prediction', content: 'Don\'t just follow - predict where Runners will go. Cut them off at corners and intersections!' },
        ],
      },
      {
        id: 'coordination',
        name: 'Team Hunting',
        duration: '6 min',
        xpReward: 200,
        prerequisite: 'tracking',
        steps: [
          { type: 'info', title: 'Communication', content: 'Use voice chat or quick messages to coordinate with fellow Hunters. Call out Runner positions!' },
          { type: 'info', title: 'Pincer Movement', content: 'The most effective strategy is to approach from multiple directions. Trap Runners between teammates.' },
          { type: 'info', title: 'Zone Control', content: 'Spread out to cover more area. Don\'t cluster together or Runners can easily avoid you all.' },
          { type: 'action', title: 'Coordinate Attack', content: 'Work with the AI teammate to corner the practice Runner.', action: 'team_hunt' },
        ],
      },
      {
        id: 'advanced_pursuit',
        name: 'Advanced Pursuit',
        duration: '7 min',
        xpReward: 250,
        prerequisite: 'coordination',
        steps: [
          { type: 'info', title: 'Sprint Management', content: 'Your sprint has a cooldown. Save it for when you\'re close to a Runner, not for long-distance chasing.' },
          { type: 'info', title: 'Terrain Awareness', content: 'Know your surroundings. Runners often hide behind buildings or use obstacles to break line of sight.' },
          { type: 'info', title: 'Anticipation', content: 'Watch for patterns. Most Runners have habits - learn them and be waiting at their next move.' },
          { type: 'action', title: 'Sprint Challenge', content: 'Complete the pursuit course using optimal sprint timing.', action: 'sprint_course' },
        ],
      },
    ],
  },
  {
    id: 'runner',
    name: 'Runner Training',
    icon: Footprints,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Learn evasion techniques',
    lessons: [
      {
        id: 'evasion',
        name: 'Evasion Basics',
        duration: '5 min',
        xpReward: 150,
        steps: [
          { type: 'info', title: 'Stay Aware', content: 'Your radar is your lifeline. Always know where Hunters are and plan escape routes accordingly.' },
          { type: 'info', title: 'Keep Moving', content: 'A stationary Runner is an easy target. Stay mobile, but don\'t waste energy running aimlessly.' },
          { type: 'info', title: 'Use Cover', content: 'Buildings, trees, and obstacles block line of sight. Use them to hide your movements.' },
          { type: 'action', title: 'Evasion Practice', content: 'Evade the AI Hunter for 60 seconds using basic techniques.', action: 'basic_evasion' },
        ],
      },
      {
        id: 'hiding',
        name: 'Hiding Spots',
        duration: '5 min',
        xpReward: 175,
        prerequisite: 'evasion',
        steps: [
          { type: 'info', title: 'Strategic Hiding', content: 'Good hiding spots have multiple escape routes. Never corner yourself!' },
          { type: 'info', title: 'Timing', content: 'Hide when Hunters are far away. If they\'re close, keep moving - hiding only works with distance.' },
          { type: 'info', title: 'Misdirection', content: 'Run one direction, then quickly double back. Make Hunters think you went somewhere else.' },
          { type: 'action', title: 'Hide and Survive', content: 'Find a hiding spot and avoid detection for 90 seconds.', action: 'hide_challenge' },
        ],
      },
      {
        id: 'advanced_evasion',
        name: 'Advanced Evasion',
        duration: '8 min',
        xpReward: 275,
        prerequisite: 'hiding',
        steps: [
          { type: 'info', title: 'Juking', content: 'Quick direction changes can throw off pursuers. Practice sudden stops and sharp turns.' },
          { type: 'info', title: 'Boundary Play', content: 'The boundary edge is risky but useful. Hunters hesitate near edges - use this to your advantage.' },
          { type: 'info', title: 'Cooldown Management', content: 'Your abilities have cooldowns. Track them mentally and don\'t waste your escape tools.' },
          { type: 'action', title: 'Ultimate Evasion', content: 'Survive against 2 AI Hunters for 2 minutes.', action: 'advanced_evasion' },
        ],
      },
    ],
  },
  {
    id: 'strategy',
    name: 'Advanced Strategy',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'Master high-level tactics',
    lessons: [
      {
        id: 'map_reading',
        name: 'Map Mastery',
        duration: '6 min',
        xpReward: 200,
        steps: [
          { type: 'info', title: 'Know Your Arena', content: 'Before the game starts, study the map. Identify choke points, open areas, and escape routes.' },
          { type: 'info', title: 'Spawn Points', content: 'Learn common spawn locations. This helps you predict where players will be at game start.' },
          { type: 'info', title: 'Traffic Patterns', content: 'Real-world obstacles affect gameplay. Streets, parks, and buildings create natural game flow.' },
          { type: 'action', title: 'Map Quiz', content: 'Identify key tactical locations on the practice map.', action: 'map_quiz' },
        ],
      },
      {
        id: 'game_sense',
        name: 'Game Sense',
        duration: '7 min',
        xpReward: 225,
        prerequisite: 'map_reading',
        steps: [
          { type: 'info', title: 'Time Management', content: 'As a Runner, you win by surviving. Sometimes hiding for the last 30 seconds is the right play.' },
          { type: 'info', title: 'Reading Players', content: 'Watch how opponents move. Aggressive players rush, cautious ones wait. Adapt your strategy.' },
          { type: 'info', title: 'Risk vs Reward', content: 'Taking risks can pay off, but calculate the odds. A desperate play rarely works.' },
          { type: 'action', title: 'Scenario Training', content: 'Make tactical decisions in simulated game scenarios.', action: 'scenarios' },
        ],
      },
      {
        id: 'team_tactics',
        name: 'Team Tactics',
        duration: '8 min',
        xpReward: 300,
        prerequisite: 'game_sense',
        steps: [
          { type: 'info', title: 'Role Assignment', content: 'In team games, assign roles. Have dedicated chasers, zone controllers, and sweepers.' },
          { type: 'info', title: 'Communication Protocol', content: 'Use consistent callouts. "North entrance", "Behind the fountain" - be specific and quick.' },
          { type: 'info', title: 'Sacrifice Plays', content: 'Sometimes one player should draw attention while others execute the main strategy.' },
          { type: 'action', title: 'Team Drill', content: 'Complete a team objective with AI teammates.', action: 'team_drill' },
        ],
      },
    ],
  },
];

// Skill challenges with varying difficulty
const SKILL_CHALLENGES = [
  {
    id: 'speed_tag',
    name: 'Speed Tag',
    description: 'Tag 5 targets as fast as possible',
    icon: Zap,
    difficulty: 'easy',
    category: 'hunter',
    timeLimit: 120,
    targets: 5,
    rewards: { xp: 100, coins: 50 },
    medals: { gold: 45, silver: 60, bronze: 90 },
  },
  {
    id: 'survival',
    name: 'Survival',
    description: 'Evade capture for as long as possible',
    icon: Timer,
    difficulty: 'medium',
    category: 'runner',
    timeLimit: 300,
    rewards: { xp: 150, coins: 75 },
    medals: { gold: 180, silver: 120, bronze: 60 },
  },
  {
    id: 'precision_pursuit',
    name: 'Precision Pursuit',
    description: 'Tag targets without leaving the path',
    icon: Route,
    difficulty: 'medium',
    category: 'hunter',
    timeLimit: 90,
    targets: 3,
    rewards: { xp: 175, coins: 100 },
    medals: { gold: 50, silver: 65, bronze: 80 },
  },
  {
    id: 'ghost_runner',
    name: 'Ghost Runner',
    description: 'Complete the course without being detected',
    icon: Eye,
    difficulty: 'hard',
    category: 'runner',
    timeLimit: 180,
    checkpoints: 5,
    rewards: { xp: 250, coins: 150 },
    medals: { gold: 120, silver: 150, bronze: 180 },
  },
  {
    id: 'multi_tag',
    name: 'Multi-Tag Mayhem',
    description: 'Tag 3 runners within 10 seconds of each other',
    icon: Users,
    difficulty: 'hard',
    category: 'hunter',
    timeLimit: 180,
    rewards: { xp: 300, coins: 200 },
    medals: { gold: 1, silver: 2, bronze: 3 },
  },
  {
    id: 'endurance',
    name: 'Endurance Run',
    description: 'Survive against increasing hunter difficulty',
    icon: Heart,
    difficulty: 'expert',
    category: 'runner',
    timeLimit: 600,
    waves: 5,
    rewards: { xp: 500, coins: 300 },
    medals: { gold: 5, silver: 4, bronze: 3 },
  },
];

// AI Bot difficulty settings
const BOT_DIFFICULTIES = [
  {
    id: 'rookie',
    name: 'Rookie',
    icon: Circle,
    color: 'text-green-400',
    description: 'Slow reactions, predictable patterns',
    stats: { speed: 0.6, reaction: 2000, accuracy: 0.4 },
  },
  {
    id: 'regular',
    name: 'Regular',
    icon: Circle,
    color: 'text-yellow-400',
    description: 'Average speed and moderate awareness',
    stats: { speed: 0.8, reaction: 1200, accuracy: 0.6 },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: Circle,
    color: 'text-orange-400',
    description: 'Quick reactions, uses basic strategy',
    stats: { speed: 0.95, reaction: 800, accuracy: 0.75 },
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Star,
    color: 'text-red-400',
    description: 'Near-perfect play, advanced tactics',
    stats: { speed: 1.0, reaction: 400, accuracy: 0.9 },
  },
  {
    id: 'legend',
    name: 'Legend',
    icon: Crown,
    color: 'text-purple-400',
    description: 'Superhuman AI, for the ultimate challenge',
    stats: { speed: 1.1, reaction: 200, accuracy: 0.98 },
  },
];

// Tips database
const TIPS_DATABASE = [
  { category: 'hunter', tip: 'Don\'t chase directly behind a Runner - cut off their escape routes instead.' },
  { category: 'hunter', tip: 'Use the compass pulse rate to gauge distance. Faster pulses mean you\'re getting close!' },
  { category: 'hunter', tip: 'Coordinate with teammates to create pincer movements and trap Runners.' },
  { category: 'hunter', tip: 'Save your sprint for the final approach, not for long-distance running.' },
  { category: 'runner', tip: 'Always have two escape routes planned. Never let yourself get cornered.' },
  { category: 'runner', tip: 'Use buildings and obstacles to break line of sight before changing direction.' },
  { category: 'runner', tip: 'Watch the radar constantly. Situational awareness is your best defense.' },
  { category: 'runner', tip: 'Sometimes the best hiding spot is in plain sight where Hunters have already searched.' },
  { category: 'general', tip: 'Learn the map before playing. Knowing shortcuts gives you a huge advantage.' },
  { category: 'general', tip: 'Stay hydrated and take breaks. Real-world running is part of the game!' },
  { category: 'general', tip: 'Play with friends using voice chat for the best team coordination.' },
  { category: 'general', tip: 'Check your battery and GPS signal before starting a game.' },
];

// Custom hook for training progress
const useTrainingProgress = () => {
  const [progress, setProgress] = useState({
    completedLessons: ['intro', 'controls'],
    completedChallenges: ['speed_tag'],
    totalXP: 425,
    currentStreak: 3,
    practiceTime: 47, // minutes
    medals: { gold: 1, silver: 2, bronze: 3 },
  });

  const completeLesson = useCallback((lessonId, xp) => {
    setProgress(prev => ({
      ...prev,
      completedLessons: [...new Set([...prev.completedLessons, lessonId])],
      totalXP: prev.totalXP + xp,
    }));
  }, []);

  const completeChallenge = useCallback((challengeId, xp, medal) => {
    setProgress(prev => ({
      ...prev,
      completedChallenges: [...new Set([...prev.completedChallenges, challengeId])],
      totalXP: prev.totalXP + xp,
      medals: {
        ...prev.medals,
        [medal]: (prev.medals[medal] || 0) + 1,
      },
    }));
  }, []);

  return { progress, completeLesson, completeChallenge };
};

// Tutorial lesson viewer
const LessonViewer = ({ lesson, category, onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const step = lesson.steps[currentStep];
  const isLastStep = currentStep === lesson.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete(lesson.id, lesson.xpReward);
    } else {
      setCurrentStep(prev => prev + 1);
      setStepCompleted(false);
    }
  };

  const handleAction = () => {
    // Simulate action completion
    setTimeout(() => setStepCompleted(true), 1500);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${category.bgColor} border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-300 text-sm">{lesson.duration}</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mt-3">{lesson.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <Star size={14} className="text-yellow-400" />
          <span className="text-yellow-400 text-sm">+{lesson.xpReward} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-gray-900/50">
        <div className="flex gap-1">
          {lesson.steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx < currentStep
                  ? 'bg-green-500'
                  : idx === currentStep
                  ? 'bg-purple-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <div className="text-gray-500 text-xs mt-1">
          Step {currentStep + 1} of {lesson.steps.length}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="min-h-[200px]">
          <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
          <p className="text-gray-300 leading-relaxed">{step.content}</p>

          {/* Action area */}
          {step.type === 'action' && (
            <div className="mt-6">
              <div className="bg-gray-900/50 rounded-lg p-6 border border-dashed border-gray-600">
                {!stepCompleted ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <Target size={32} className="text-purple-400" />
                    </div>
                    <button
                      onClick={handleAction}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Start Practice
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-green-400" />
                    </div>
                    <p className="text-green-400 font-medium">Practice Complete!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Highlight area */}
          {step.type === 'highlight' && (
            <div className="mt-6 bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
              <div className="flex items-center gap-2 text-yellow-400">
                <Lightbulb size={18} />
                <span className="font-medium">UI Highlight: {step.highlight}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={step.type === 'action' && !stepCompleted}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isLastStep ? 'Complete' : 'Next'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Category card
const CategoryCard = ({ category, progress, onSelect }) => {
  const Icon = category.icon;
  const completedCount = category.lessons.filter(l =>
    progress.completedLessons.includes(l.id)
  ).length;
  const totalLessons = category.lessons.length;
  const percentComplete = Math.round((completedCount / totalLessons) * 100);

  return (
    <button
      onClick={() => onSelect(category)}
      className={`w-full ${category.bgColor} rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-all text-left`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg bg-gray-900/50`}>
          <Icon size={24} className={category.color} />
        </div>
        {percentComplete === 100 && (
          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
            Complete
          </span>
        )}
      </div>
      <h3 className="text-white font-semibold mb-1">{category.name}</h3>
      <p className="text-gray-400 text-sm mb-3">{category.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm">{completedCount}/{totalLessons} lessons</span>
        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>
    </button>
  );
};

// Lesson list
const LessonList = ({ category, progress, onSelectLesson, onBack }) => {
  const Icon = category.icon;

  const isLessonUnlocked = (lesson) => {
    if (!lesson.prerequisite) return true;
    return progress.completedLessons.includes(lesson.prerequisite);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
      >
        <ChevronLeft size={20} />
        Back to Categories
      </button>

      <div className={`${category.bgColor} rounded-xl p-5 border border-gray-700`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon size={24} className={category.color} />
          <h2 className="text-xl font-bold text-white">{category.name}</h2>
        </div>
        <p className="text-gray-400">{category.description}</p>
      </div>

      <div className="space-y-3">
        {category.lessons.map((lesson, idx) => {
          const isCompleted = progress.completedLessons.includes(lesson.id);
          const isUnlocked = isLessonUnlocked(lesson);

          return (
            <button
              key={lesson.id}
              onClick={() => isUnlocked && onSelectLesson(lesson)}
              disabled={!isUnlocked}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                isCompleted
                  ? 'bg-green-500/10 border-green-500/30'
                  : isUnlocked
                  ? 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                  : 'bg-gray-900/50 border-gray-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500/20'
                    : isUnlocked
                    ? 'bg-gray-700'
                    : 'bg-gray-800'
                }`}>
                  {isCompleted ? (
                    <Check size={20} className="text-green-400" />
                  ) : isUnlocked ? (
                    <span className="text-white font-medium">{idx + 1}</span>
                  ) : (
                    <Lock size={16} className="text-gray-600" />
                  )}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {lesson.name}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">{lesson.duration}</span>
                    <span className="text-yellow-400">+{lesson.xpReward} XP</span>
                  </div>
                </div>
              </div>
              {isUnlocked && !isCompleted && (
                <ChevronRight size={20} className="text-gray-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Challenge card
const ChallengeCard = ({ challenge, isCompleted, onStart }) => {
  const Icon = challenge.icon;

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-orange-400 bg-orange-500/20',
    expert: 'text-red-400 bg-red-500/20',
  };

  return (
    <div className={`bg-gray-800/50 rounded-xl p-5 border ${
      isCompleted ? 'border-green-500/30' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 rounded-lg bg-gray-700/50">
          <Icon size={24} className="text-white" />
        </div>
        <span className={`text-xs px-2 py-1 rounded-full capitalize ${difficultyColors[challenge.difficulty]}`}>
          {challenge.difficulty}
        </span>
      </div>

      <h3 className="text-white font-semibold mb-1">{challenge.name}</h3>
      <p className="text-gray-400 text-sm mb-4">{challenge.description}</p>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-gray-500 flex items-center gap-1">
          <Clock size={14} />
          {Math.floor(challenge.timeLimit / 60)}:{(challenge.timeLimit % 60).toString().padStart(2, '0')}
        </span>
        <span className="text-yellow-400 flex items-center gap-1">
          <Star size={14} />
          {challenge.rewards.xp} XP
        </span>
      </div>

      {/* Medal thresholds */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-gray-500 text-xs">{challenge.medals.gold}s</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy size={14} className="text-gray-300" />
          <span className="text-gray-500 text-xs">{challenge.medals.silver}s</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy size={14} className="text-orange-400" />
          <span className="text-gray-500 text-xs">{challenge.medals.bronze}s</span>
        </div>
      </div>

      <button
        onClick={() => onStart(challenge)}
        className={`w-full py-2 rounded-lg font-medium transition-colors ${
          isCompleted
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
      >
        {isCompleted ? 'Replay' : 'Start Challenge'}
      </button>
    </div>
  );
};

// Practice mode configuration
const PracticeConfig = ({ onStart, onBack }) => {
  const [config, setConfig] = useState({
    role: 'runner',
    botCount: 2,
    botDifficulty: 'regular',
    duration: 300,
    mapSize: 'medium',
  });

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Bot size={24} className="text-purple-400" />
          Practice Mode Setup
        </h2>

        {/* Role selection */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Your Role</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfig(c => ({ ...c, role: 'runner' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.role === 'runner'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <Footprints size={24} className="text-blue-400 mx-auto mb-2" />
              <div className="text-white font-medium">Runner</div>
              <div className="text-gray-500 text-sm">Evade the bots</div>
            </button>
            <button
              onClick={() => setConfig(c => ({ ...c, role: 'hunter' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.role === 'hunter'
                  ? 'border-red-500 bg-red-500/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <Crosshair size={24} className="text-red-400 mx-auto mb-2" />
              <div className="text-white font-medium">Hunter</div>
              <div className="text-gray-500 text-sm">Chase the bots</div>
            </button>
          </div>
        </div>

        {/* Bot count */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Number of Bots</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => setConfig(c => ({ ...c, botCount: num }))}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  config.botCount === num
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Bot difficulty */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Bot Difficulty</label>
          <div className="space-y-2">
            {BOT_DIFFICULTIES.map(diff => (
              <button
                key={diff.id}
                onClick={() => setConfig(c => ({ ...c, botDifficulty: diff.id }))}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  config.botDifficulty === diff.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <diff.icon size={18} className={diff.color} />
                  <div className="text-left">
                    <div className="text-white font-medium">{diff.name}</div>
                    <div className="text-gray-500 text-xs">{diff.description}</div>
                  </div>
                </div>
                {config.botDifficulty === diff.id && (
                  <Check size={18} className="text-purple-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Duration</label>
          <div className="flex gap-2">
            {[
              { value: 120, label: '2 min' },
              { value: 300, label: '5 min' },
              { value: 600, label: '10 min' },
              { value: 0, label: 'Endless' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setConfig(c => ({ ...c, duration: opt.value }))}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  config.duration === opt.value
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(config)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          <Play size={20} />
          Start Practice
        </button>
      </div>
    </div>
  );
};

// Tips carousel
const TipsCarousel = ({ category = 'general' }) => {
  const [currentTip, setCurrentTip] = useState(0);
  const relevantTips = TIPS_DATABASE.filter(t =>
    t.category === category || t.category === 'general'
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % relevantTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [relevantTips.length]);

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-5 border border-yellow-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-yellow-400" />
        <span className="text-yellow-400 font-medium">Pro Tip</span>
      </div>
      <p className="text-gray-300">{relevantTips[currentTip]?.tip}</p>
      <div className="flex gap-1 mt-4">
        {relevantTips.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentTip(idx)}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentTip ? 'bg-yellow-400' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Progress overview
const ProgressOverview = ({ progress }) => {
  const totalLessons = TUTORIAL_CATEGORIES.reduce((acc, cat) => acc + cat.lessons.length, 0);
  const completedPercent = Math.round((progress.completedLessons.length / totalLessons) * 100);

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">Your Progress</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{progress.totalXP}</div>
          <div className="text-gray-500 text-sm">Total XP</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{progress.completedLessons.length}</div>
          <div className="text-gray-500 text-sm">Lessons Done</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{progress.medals.gold}</div>
          <div className="text-gray-500 text-sm">Gold Medals</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{progress.currentStreak}</div>
          <div className="text-gray-500 text-sm">Day Streak</div>
        </div>
      </div>

      <div className="mb-2 flex justify-between text-sm">
        <span className="text-gray-400">Tutorial Progress</span>
        <span className="text-white">{completedPercent}%</span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
          style={{ width: `${completedPercent}%` }}
        />
      </div>
    </div>
  );
};

// Main Training Mode Component
const TrainingMode = () => {
  const { progress, completeLesson, completeChallenge } = useTrainingProgress();
  const [activeTab, setActiveTab] = useState('tutorials');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);

  const tabs = [
    { id: 'tutorials', name: 'Tutorials', icon: BookOpen },
    { id: 'challenges', name: 'Challenges', icon: Target },
    { id: 'practice', name: 'Practice', icon: Bot },
  ];

  const handleLessonComplete = (lessonId, xp) => {
    completeLesson(lessonId, xp);
    setSelectedLesson(null);
  };

  const handleStartPractice = (config) => {
    console.log('Starting practice with config:', config);
    setShowPracticeConfig(false);
    // Would launch practice game
  };

  const handleStartChallenge = (challenge) => {
    console.log('Starting challenge:', challenge);
    // Would launch challenge
  };

  // Render lesson viewer
  if (selectedLesson && selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <LessonViewer
            lesson={selectedLesson}
            category={selectedCategory}
            onComplete={handleLessonComplete}
            onBack={() => setSelectedLesson(null)}
          />
        </div>
      </div>
    );
  }

  // Render practice config
  if (showPracticeConfig) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <PracticeConfig
            onStart={handleStartPractice}
            onBack={() => setShowPracticeConfig(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <GraduationCap className="text-purple-400" />
            Training Academy
          </h1>
          <p className="text-gray-400 mt-1">
            Master the game with tutorials, challenges, and practice modes
          </p>
        </div>

        {/* Progress Overview */}
        <ProgressOverview progress={progress} />

        {/* Tab Navigation */}
        <div className="flex gap-2 my-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedCategory(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'tutorials' && (
          <div className="space-y-6">
            {selectedCategory ? (
              <LessonList
                category={selectedCategory}
                progress={progress}
                onSelectLesson={setSelectedLesson}
                onBack={() => setSelectedCategory(null)}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TUTORIAL_CATEGORIES.map(category => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      progress={progress}
                      onSelect={setSelectedCategory}
                    />
                  ))}
                </div>
                <TipsCarousel />
              </>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Skill Challenges</h2>
              <div className="flex items-center gap-2 text-sm">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-gray-400">
                  {progress.completedChallenges.length}/{SKILL_CHALLENGES.length} completed
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SKILL_CHALLENGES.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isCompleted={progress.completedChallenges.includes(challenge.id)}
                  onStart={handleStartChallenge}
                />
              ))}
            </div>

            <TipsCarousel category="general" />
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 rounded-xl bg-gray-900/50">
                  <Bot size={32} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Practice Mode</h2>
                  <p className="text-gray-400">
                    Train against AI opponents with customizable difficulty
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <Clock size={24} className="text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-medium">{progress.practiceTime} min</div>
                  <div className="text-gray-500 text-sm">Practice Time</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <Flame size={24} className="text-orange-400 mx-auto mb-2" />
                  <div className="text-white font-medium">{progress.currentStreak}</div>
                  <div className="text-gray-500 text-sm">Day Streak</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <Award size={24} className="text-yellow-400 mx-auto mb-2" />
                  <div className="text-white font-medium">
                    {progress.medals.gold + progress.medals.silver + progress.medals.bronze}
                  </div>
                  <div className="text-gray-500 text-sm">Total Medals</div>
                </div>
              </div>

              <button
                onClick={() => setShowPracticeConfig(true)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Configure Practice Session
              </button>
            </div>

            {/* Quick start options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleStartPractice({ role: 'runner', botCount: 2, botDifficulty: 'regular', duration: 300 })}
                className="flex items-center gap-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl p-5 border border-blue-500/30 transition-all"
              >
                <Footprints size={32} className="text-blue-400" />
                <div className="text-left">
                  <div className="text-white font-semibold">Quick Runner Practice</div>
                  <div className="text-gray-400 text-sm">2 Regular bots, 5 minutes</div>
                </div>
              </button>
              <button
                onClick={() => handleStartPractice({ role: 'hunter', botCount: 3, botDifficulty: 'regular', duration: 300 })}
                className="flex items-center gap-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl p-5 border border-red-500/30 transition-all"
              >
                <Crosshair size={32} className="text-red-400" />
                <div className="text-left">
                  <div className="text-white font-semibold">Quick Hunter Practice</div>
                  <div className="text-gray-400 text-sm">3 Regular bots, 5 minutes</div>
                </div>
              </button>
            </div>

            <TipsCarousel />
          </div>
        )}

        {/* Completion reward banner */}
        {progress.completedLessons.length >= 10 && (
          <div className="mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-5 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift size={24} className="text-yellow-400" />
                <div>
                  <div className="text-white font-semibold">Training Rewards Available!</div>
                  <div className="text-gray-400 text-sm">Claim your rewards for completing tutorials</div>
                </div>
              </div>
              <button className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Claim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingMode;

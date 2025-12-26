import React, { useState, useEffect } from 'react';
import { 
  MapPin, Users, Target, Trophy, Zap, Shield, 
  ChevronRight, ChevronLeft, X, Check, Play,
  Timer, Skull, Users2, Eye, Snowflake, Flame,
  Gamepad2, Crown, Info
} from 'lucide-react';
import { useStore, GAME_MODES } from '../store';

/**
 * Enhanced Interactive Onboarding Tutorial
 * 
 * Features:
 * - Shows on first game join (not just app open)
 * - Game mode explanations before starting
 * - Contextual help based on where the user is
 */
export default function OnboardingTutorial({ 
  onComplete, 
  onSkip,
  trigger = 'app_open', // 'app_open', 'first_join', 'game_mode', 'help'
  gameMode = null // If showing game mode tutorial
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const { settings, updateSettings } = useStore();

  // Different step sets based on trigger
  const getSteps = () => {
    // Game mode specific tutorial
    if (trigger === 'game_mode' && gameMode) {
      return getGameModeSteps(gameMode);
    }

    // First time joining a game
    if (trigger === 'first_join') {
      return firstJoinSteps;
    }

    // Default app open tutorial
    return appOpenSteps;
  };

  const steps = getSteps();
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (trigger === 'app_open') {
      updateSettings({ hasSeenOnboarding: true });
    }
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          {/* Icon header */}
          <div className={`p-8 bg-gradient-to-br ${currentStepData.color}`}>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto">
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-xl font-bold text-center mb-1">
              {currentStepData.title}
            </h2>
            <p className="text-neon-cyan text-sm text-center mb-4">
              {currentStepData.subtitle}
            </p>
            <p className="text-gray-300 text-center mb-4">
              {currentStepData.description}
            </p>

            {/* Tip Box */}
            {currentStepData.tip && (
              <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neon-cyan">{currentStepData.tip}</p>
                </div>
              </div>
            )}

            {/* Extra content for game modes */}
            {currentStepData.rules && (
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-sm mb-2">How to Play:</h4>
                <ul className="space-y-2">
                  {currentStepData.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="text-neon-purple">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-6 bg-neon-cyan'
                      : index < currentStep
                      ? 'bg-neon-cyan/50'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex-1 py-3 bg-gradient-to-r ${currentStepData.color} rounded-xl font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2`}
              >
                {isLastStep ? (
                  <>
                    <Play className="w-5 h-5" />
                    {trigger === 'game_mode' ? "Let's Play!" : "Get Started"}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// App open tutorial steps
const appOpenSteps = [
  {
    icon: MapPin,
    title: "Welcome to TAG!",
    subtitle: "The real-world GPS hunt game",
    description: "Chase your friends in the real world using GPS tracking. Get close enough to tag them and become the hunter!",
    color: "from-cyan-500 to-blue-500",
    tip: "Make sure GPS is enabled for the best experience",
  },
  {
    icon: Users,
    title: "Create or Join Games",
    subtitle: "Play with friends anywhere",
    description: "Create a game and share the code with friends, or join using a code they give you. Games work anywhere - parks, neighborhoods, or events!",
    color: "from-purple-500 to-pink-500",
    tip: "Games work best in open areas with good GPS signal",
  },
  {
    icon: Target,
    title: "Tag Mechanics",
    subtitle: "Get close to make a tag",
    description: "When you're IT, get within the tag radius of another player and tap to tag them. They become IT and you run! The tag radius shows as a circle on the map.",
    color: "from-red-500 to-orange-500",
    tip: "Watch your distance indicator - it updates in real-time",
  },
  {
    icon: Shield,
    title: "Safe Zones & Times",
    subtitle: "Strategic gameplay",
    description: "Game hosts can set up safe zones where you can't be tagged, and no-tag times for breaks. Use these strategically to plan your escape!",
    color: "from-green-500 to-emerald-500",
    tip: "Safe zones appear as green circles on the map",
  },
  {
    icon: Zap,
    title: "Power-ups & Modes",
    subtitle: "7 different game modes",
    description: "Try Classic Tag, Freeze Tag, Infection, Team Tag, Manhunt, Hot Potato, or Hide & Seek. Each mode has unique rules and strategies!",
    color: "from-yellow-500 to-amber-500",
    tip: "Collect power-ups during games for special abilities",
  },
  {
    icon: Trophy,
    title: "Stats & Achievements",
    subtitle: "Track your progress",
    description: "Earn XP, unlock achievements, climb leaderboards, and track your stats. Become the ultimate TAG champion!",
    color: "from-indigo-500 to-violet-500",
    tip: "Complete daily challenges for bonus XP",
  },
];

// First time joining a game tutorial
const firstJoinSteps = [
  {
    icon: Play,
    title: "Your First Game!",
    subtitle: "Here's what to expect",
    description: "You're about to join your first game of TAG! Let's quickly cover the basics so you're ready to play.",
    color: "from-neon-cyan to-blue-500",
    tip: "Stay with us - this only takes 30 seconds!",
  },
  {
    icon: MapPin,
    title: "GPS Tracking",
    subtitle: "Your location is shared",
    description: "While in a game, other players can see your location on the map. Your position updates every few seconds based on game settings.",
    color: "from-purple-500 to-pink-500",
    tip: "Make sure location is set to 'Always' or 'While Using' for best results",
  },
  {
    icon: Target,
    title: "Getting Tagged",
    subtitle: "Watch the distance!",
    description: "If you're not IT, run away! The person who is IT will try to get close to you. You'll see their distance and get alerts when they're near.",
    color: "from-red-500 to-orange-500",
    tip: "Proximity alerts will buzz when the tagger is within 50m",
  },
  {
    icon: Zap,
    title: "Making a Tag",
    subtitle: "When you're IT",
    description: "If you're IT, get within the tag radius of another player. A TAG button will appear - tap it to tag them! They become IT and you escape.",
    color: "from-yellow-500 to-amber-500",
    tip: "The tag radius is shown as a circle around you on the map",
  },
  {
    icon: Shield,
    title: "Safe Zones",
    subtitle: "Temporary refuge",
    description: "Look for green zones on the map - these are safe zones where you can't be tagged. Great for catching your breath!",
    color: "from-green-500 to-emerald-500",
    tip: "Don't stay in safe zones too long - it's more fun to play!",
  },
];

// Get game mode specific steps
function getGameModeSteps(mode) {
  const modeSteps = {
    classic: [
      {
        icon: Target,
        title: "Classic Tag",
        subtitle: "The original game",
        description: "One player starts as IT and must tag someone else. When tagged, you become IT. Simple, fast, and fun!",
        color: "from-neon-cyan to-blue-500",
        rules: [
          "One person is IT at a time",
          "Tag someone to make them IT",
          "Last person to never be IT wins",
        ],
        tip: "The game ends when time runs out - whoever was IT least wins!",
      },
    ],
    freeze: [
      {
        icon: Snowflake,
        title: "Freeze Tag",
        subtitle: "Teamwork matters",
        description: "When you get tagged, you freeze in place! Another player can unfreeze you by getting close. IT wins by freezing everyone!",
        color: "from-cyan-400 to-blue-600",
        rules: [
          "Getting tagged freezes you in place",
          "Teammates can unfreeze you by being near you for 3 seconds",
          "IT wins by freezing all players",
          "Runners win by surviving until time runs out",
        ],
        tip: "Stay near teammates so you can rescue each other!",
      },
    ],
    infection: [
      {
        icon: Skull,
        title: "Infection",
        subtitle: "Survive the horde",
        description: "One player starts infected. When tagged, you become infected too and help catch others. Survivors try to last until the end!",
        color: "from-green-600 to-emerald-800",
        rules: [
          "Tagged players become infected",
          "Infected players can tag others",
          "Last survivor wins",
          "Infected team wins if everyone is caught",
        ],
        tip: "As the infected spread, work together to corner survivors!",
      },
    ],
    team: [
      {
        icon: Users2,
        title: "Team Tag",
        subtitle: "Red vs Blue",
        description: "Two teams compete! Tag players from the other team. The team with the most tags at the end wins!",
        color: "from-red-500 to-blue-600",
        rules: [
          "Two teams: Red and Blue",
          "Tag players from the opposite team",
          "Tagged players respawn after 10 seconds",
          "Team with most total tags wins",
        ],
        tip: "Coordinate with your team to corner opponents!",
      },
    ],
    manhunt: [
      {
        icon: Eye,
        title: "Manhunt",
        subtitle: "One vs All",
        description: "One hunter, many runners. The hunter must catch everyone before time runs out. Runners just need to survive!",
        color: "from-orange-600 to-red-700",
        rules: [
          "One player is the Hunter",
          "Hunter must tag all other players",
          "Runners can't fight back - only run and hide",
          "Hunter wins by catching everyone",
          "Runners win if anyone survives when time ends",
        ],
        tip: "Runners should split up to make hunting harder!",
      },
    ],
    hotpotato: [
      {
        icon: Flame,
        title: "Hot Potato",
        subtitle: "Don't be IT when time's up!",
        description: "The hot potato (being IT) passes around. When the timer hits zero, whoever is IT is eliminated! Last player standing wins.",
        color: "from-orange-400 to-red-500",
        rules: [
          "Tag someone to pass the 'hot potato'",
          "When the timer ends, IT is eliminated",
          "Timer resets after elimination",
          "Last player standing wins",
        ],
        tip: "Stay mobile - you never know when the timer will end!",
      },
    ],
    hideseek: [
      {
        icon: Eye,
        title: "Hide & Seek",
        subtitle: "Classic with a twist",
        description: "Hiders get time to scatter and hide. Then the seeker hunts! Hiders try to avoid detection until time runs out.",
        color: "from-indigo-600 to-purple-700",
        rules: [
          "Hiders get a head start to find hiding spots",
          "Seeker's view is limited during hiding phase",
          "Once seeking begins, seeker can see all players",
          "Found players are eliminated",
          "Hiders win if anyone survives",
        ],
        tip: "During hiding phase, find cover and stay still!",
      },
    ],
  };

  return modeSteps[mode] || [
    {
      icon: Gamepad2,
      title: GAME_MODES[mode]?.name || "Game Mode",
      subtitle: GAME_MODES[mode]?.description || "Ready to play!",
      description: "This is a custom game mode. Have fun and good luck!",
      color: "from-neon-cyan to-neon-purple",
      tip: "Ask the host if you have questions about the rules!",
    },
  ];
}

/**
 * Game Mode Info Card - Compact version for lobby
 */
export function GameModeInfoCard({ mode, onLearnMore }) {
  const modeInfo = GAME_MODES[mode];
  
  if (!modeInfo) return null;

  const iconMap = {
    classic: Target,
    freeze: Snowflake,
    infection: Skull,
    team: Users2,
    manhunt: Eye,
    hotpotato: Flame,
    hideseek: Eye,
  };

  const Icon = iconMap[mode] || Gamepad2;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-neon-cyan/20 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <h3 className="font-semibold">{modeInfo.name}</h3>
          <p className="text-xs text-white/50">{modeInfo.description}</p>
        </div>
      </div>
      
      <button
        onClick={() => onLearnMore?.(mode)}
        className="w-full py-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Info className="w-4 h-4" />
        Learn How to Play
      </button>
    </div>
  );
}

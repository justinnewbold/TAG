import React, { useState } from 'react';
import { 
  MapPin, Users, Target, Trophy, Zap, Shield, 
  ChevronRight, ChevronLeft, X, Check
} from 'lucide-react';

/**
 * Interactive onboarding tutorial for new players
 */
export default function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
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

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Skip button */}
        <button
          onClick={onSkip}
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
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {currentStepData.title}
              </h2>
              <p className="text-primary-400 font-medium">
                {currentStepData.subtitle}
              </p>
            </div>

            <p className="text-gray-300 text-center mb-4">
              {currentStepData.description}
            </p>

            {/* Tip box */}
            <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
              <p className="text-sm text-gray-400 text-center">
                💡 <span className="text-gray-300">{currentStepData.tip}</span>
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pb-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-6 bg-primary-500' 
                    : 'bg-dark-600 hover:bg-dark-500'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="p-4 bg-dark-900/50 border-t border-dark-700 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <span className="text-gray-500 text-sm">
              {currentStep + 1} / {steps.length}
            </span>

            <button
              onClick={handleNext}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLastStep
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {isLastStep ? (
                <>
                  <Check className="w-5 h-5" />
                  Let's Play!
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
  );
}

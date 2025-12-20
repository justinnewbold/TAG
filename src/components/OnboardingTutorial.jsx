import React, { useState } from 'react';
import { MapPin, Users, Target, Zap, ChevronRight, ChevronLeft, X } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    icon: <MapPin className="w-16 h-16 text-neon-cyan" />,
    title: "Real-World GPS Tag",
    description: "TAG uses your phone's GPS to track players in real-time. Run, hide, and chase your friends across your neighborhood!",
    tip: "Make sure to enable location services for the best experience.",
  },
  {
    icon: <Target className="w-16 h-16 text-neon-orange" />,
    title: "Tag Within Range",
    description: "When you're IT, get close enough to other players to tag them. The tag radius can be set from 10m to 1km!",
    tip: "Watch the distance indicator to see how close you are.",
  },
  {
    icon: <Users className="w-16 h-16 text-neon-purple" />,
    title: "Play Together",
    description: "Create a game and share the code with friends. They can join from anywhere and start playing instantly.",
    tip: "Games work best with 3-10 players.",
  },
  {
    icon: <Zap className="w-16 h-16 text-yellow-400" />,
    title: "Multiple Game Modes",
    description: "Try Classic Tag, Freeze Tag, Infection, Manhunt, and more! Each mode has unique rules and strategies.",
    tip: "Start with Classic to learn the basics.",
  },
];

function OnboardingTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => onComplete(), 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Skip tutorial"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {ONBOARDING_STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentStep 
                ? 'w-6 bg-neon-cyan' 
                : index < currentStep 
                ? 'bg-neon-cyan/50' 
                : 'bg-white/20'
            }`}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md text-center">
        <div className="mb-6 p-6 rounded-full bg-white/5 border border-white/10">
          {step.icon}
        </div>
        
        <h2 className="text-2xl font-display font-bold mb-4">{step.title}</h2>
        
        <p className="text-white/70 mb-6 leading-relaxed">{step.description}</p>
        
        <div className="px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
          <p className="text-sm text-neon-cyan">💡 {step.tip}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 w-full max-w-md">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
            currentStep === 0 
              ? 'opacity-0 pointer-events-none' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <button
          onClick={handleNext}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neon-cyan text-dark-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-all"
        >
          {isLastStep ? (
            <>
              Let's Play!
              <Zap className="w-5 h-5" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Step counter */}
      <p className="mt-4 text-xs text-white/40">
        Step {currentStep + 1} of {ONBOARDING_STEPS.length}
      </p>
    </div>
  );
}

export default OnboardingTutorial;

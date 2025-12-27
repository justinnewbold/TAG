import React, { useState, useEffect } from 'react';
import { Star, X, Heart, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import { useStore } from '../store';

/**
 * AppRatingPrompt - Asks users to rate the app after positive experiences
 * Triggers after: winning a game, achieving a milestone, playing 5+ games
 */
export default function AppRatingPrompt() {
  const { settings, updateSettings, stats } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('initial'); // initial, rating, feedback, thanks
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Check if we should show the prompt
  useEffect(() => {
    const shouldShow = checkShouldShowPrompt();
    if (shouldShow) {
      // Delay showing to not interrupt immediately
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [stats.gamesWon, stats.totalTags]);

  function checkShouldShowPrompt() {
    // Never show if user dismissed permanently
    if (settings?.ratingDismissed) return false;
    
    // Never show if already rated
    if (settings?.hasRated) return false;
    
    // Check cooldown (show at most once every 7 days)
    const lastPromptTime = settings?.lastRatingPrompt || 0;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (lastPromptTime > sevenDaysAgo) return false;
    
    // Show after milestones
    const wins = stats?.gamesWon || 0;
    const tags = stats?.totalTags || 0;
    
    // Show after first win, 5 wins, or every 10 wins
    if (wins === 1 || wins === 5 || (wins > 0 && wins % 10 === 0)) {
      return true;
    }
    
    // Show after 25, 50, 100 tags
    if (tags === 25 || tags === 50 || tags === 100) {
      return true;
    }
    
    return false;
  }

  function handleClose(permanent = false) {
    setIsOpen(false);
    updateSettings({
      lastRatingPrompt: Date.now(),
      ...(permanent && { ratingDismissed: true })
    });
  }

  function handleRate(selectedRating) {
    setRating(selectedRating);
    
    if (selectedRating >= 4) {
      // High rating - ask to rate on app store
      setStep('store');
    } else {
      // Low rating - ask for feedback
      setStep('feedback');
    }
  }

  function handleStoreRate() {
    updateSettings({ hasRated: true });
    
    // Detect platform and open appropriate store
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      // iOS App Store - placeholder URL
      window.open('https://apps.apple.com/app/tag', '_blank');
    } else if (/android/i.test(userAgent)) {
      // Google Play Store - placeholder URL
      window.open('https://play.google.com/store/apps/details?id=cloud.newbold.tag', '_blank');
    } else {
      // Web - show share dialog
      if (navigator.share) {
        navigator.share({
          title: 'TAG! - GPS Tag Game',
          text: 'Hunt your friends in real life with TAG!',
          url: 'https://tag.newbold.cloud'
        });
      }
    }
    
    setStep('thanks');
  }

  function handleFeedback() {
    // Open feedback form or email
    window.open('mailto:feedback@newbold.cloud?subject=TAG! Feedback', '_blank');
    setStep('thanks');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {step === 'initial' && 'Enjoying TAG!?'}
            {step === 'store' && "We're glad! 🎉"}
            {step === 'feedback' && 'Help us improve'}
            {step === 'thanks' && 'Thank you! 💜'}
          </h3>
          <button
            onClick={() => handleClose(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'initial' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🏃‍♂️</div>
              <p className="text-slate-300 mb-6">
                {"You've had some great games! How would you rate your experience?"}
              </p>
              
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleRate(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={36}
                      className={`transition-colors ${
                        star <= (hoveredStar || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handleClose(true)}
                className="text-sm text-slate-500 hover:text-slate-400 transition"
              >
                {"Don't ask again"}
              </button>
            </div>
          )}

          {step === 'store' && (
            <div className="text-center">
              <div className="text-5xl mb-4">⭐</div>
              <p className="text-slate-300 mb-6">
                Would you mind rating us on the app store? It really helps!
              </p>
              
              <button
                onClick={handleStoreRate}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition mb-3"
              >
                <ExternalLink size={18} />
                Rate TAG!
              </button>
              
              <button
                onClick={() => {
                  navigator.share?.({
                    title: 'TAG! - GPS Tag Game',
                    text: 'Hunt your friends in real life!',
                    url: 'https://tag.newbold.cloud'
                  });
                  setStep('thanks');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 rounded-xl font-semibold hover:bg-slate-700 transition"
              >
                <Share2 size={18} />
                Share with Friends
              </button>
            </div>
          )}

          {step === 'feedback' && (
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-slate-300 mb-6">
                {"We'd love to hear how we can make TAG! better for you."}
              </p>
              
              <button
                onClick={handleFeedback}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition mb-3"
              >
                <MessageCircle size={18} />
                Send Feedback
              </button>
              
              <button
                onClick={() => handleClose(false)}
                className="text-sm text-slate-500 hover:text-slate-400 transition"
              >
                Maybe later
              </button>
            </div>
          )}

          {step === 'thanks' && (
            <div className="text-center">
              <div className="text-5xl mb-4">
                <Heart className="text-pink-500 fill-pink-500 w-12 h-12 mx-auto animate-pulse" />
              </div>
              <p className="text-slate-300 mb-2">
                Thanks for your support!
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Your feedback helps us make TAG! even better.
              </p>
              
              <button
                onClick={() => handleClose(false)}
                className="px-6 py-3 bg-slate-800 rounded-xl font-semibold hover:bg-slate-700 transition"
              >
                Continue Playing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

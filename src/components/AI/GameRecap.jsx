import { useState, useEffect } from 'react';
import { Trophy, Share2, X, Sparkles, Clock, Target, Users, Flame } from 'lucide-react';
import { aiService } from '../../services/ai';

export default function GameRecap({ gameData, onClose }) {
  const [recap, setRecap] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    generateRecap();
  }, [gameData]);

  const generateRecap = async () => {
    setIsLoading(true);
    try {
      const generatedRecap = await aiService.generateRecap(gameData);
      setRecap(generatedRecap);
    } catch (error) {
      console.error('Failed to generate recap:', error);
      setRecap('Great game! 🎮');
    }
    setIsLoading(false);
  };

  const handleShare = async () => {
    const shareText = `${recap}\n\n🏷️ Play TAG! at tag.newbold.cloud`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TAG! Game Recap',
          text: shareText,
        });
      } catch (error) {
        // User cancelled or error
        navigator.clipboard.writeText(shareText);
      }
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  const stats = {
    duration: Math.round((gameData.duration || 0) / 60000),
    totalTags: gameData.tags?.length || 0,
    players: gameData.players?.length || 0,
    mvp: gameData.mvp?.name || gameData.winner?.name || 'Unknown',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-br from-dark-800 to-dark-900 rounded-3xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-b border-white/10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-neon-purple/20 rounded-xl">
              <Trophy className="w-8 h-8 text-neon-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Game Over!</h2>
              <p className="text-white/60 text-sm">
                {gameData.gameMode} • {stats.duration} min
              </p>
            </div>
          </div>
        </div>

        {/* AI Recap */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-neon-cyan animate-pulse" />
            <span className="text-sm text-neon-cyan font-medium">AI Recap</span>
          </div>
          
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 min-h-[80px]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-white/50">
                <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                <span>Generating recap...</span>
              </div>
            ) : (
              <p className="text-lg leading-relaxed">{recap}</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Clock className="w-5 h-5 mx-auto mb-1 text-neon-orange" />
              <p className="text-lg font-bold">{stats.duration}</p>
              <p className="text-xs text-white/50">min</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Target className="w-5 h-5 mx-auto mb-1 text-neon-purple" />
              <p className="text-lg font-bold">{stats.totalTags}</p>
              <p className="text-xs text-white/50">tags</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Users className="w-5 h-5 mx-auto mb-1 text-neon-cyan" />
              <p className="text-lg font-bold">{stats.players}</p>
              <p className="text-xs text-white/50">players</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Flame className="w-5 h-5 mx-auto mb-1 text-amber-400" />
              <p className="text-sm font-bold truncate">{stats.mvp}</p>
              <p className="text-xs text-white/50">MVP</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

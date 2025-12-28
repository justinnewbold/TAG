import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad2, AlertCircle, Camera, Hash, Loader2 } from 'lucide-react';
import { useStore, useSounds } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinGame, syncGameState, games, user } = useStore();
  const { vibrate } = useSounds();

  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const hasAutoJoined = useRef(false);
  const inputRefs = useRef([]);

  const handleJoin = useCallback(async (code = gameCode) => {
    if (!code || code.length < 6) {
      setError('Please enter a valid game code');
      vibrate([100, 50, 100]);
      return;
    }

    if (isJoining) return;

    setIsJoining(true);
    setError('');

    try {
      // Try to join via API
      const { game } = await api.joinGame(code.toUpperCase());

      // Sync game state to store
      syncGameState(game);

      // Join the socket room
      socketService.joinGameRoom(game.id);

      vibrate([50, 30, 100]);
      navigate('/lobby');
    } catch (err) {
      if (import.meta.env.DEV) console.error('Join game error:', err);

      // Fallback to local-only mode if server is unavailable
      const isNetworkError =
        err.message === 'Failed to fetch' ||
        err.message.includes('NetworkError') ||
        err.message.includes('Unable to connect') ||
        err.message.includes('fetch');

      if (isNetworkError) {
        // Try local games
        const localGame = games.find(g => g.code === code.toUpperCase() && g.status === 'waiting');

        if (localGame) {
          const joined = joinGame(code.toUpperCase());
          if (joined) {
            vibrate([50, 30, 100]);
            navigate('/lobby');
            return;
          }
        }
        setError('Server offline. Local games only available on this device.');
      } else {
        setError(err.message || 'Failed to join game');
      }
      vibrate([100, 50, 100]);
    } finally {
      setIsJoining(false);
    }
  }, [gameCode, isJoining, vibrate, syncGameState, navigate, games, joinGame]);

  // Check for game code in URL params (deep link)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && !hasAutoJoined.current) {
      hasAutoJoined.current = true;
      setGameCode(codeFromUrl.toUpperCase());
      // Auto-join if code is provided
      handleJoin(codeFromUrl.toUpperCase());
    }
  }, [searchParams, handleJoin]);
  
  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setGameCode(value);
    setError('');
  };

  // Handle individual digit input for the split code boxes
  const handleDigitChange = (index, value) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const newCode = gameCode.split('');
    newCode[index] = char;
    const updatedCode = newCode.join('').slice(0, 6);
    setGameCode(updatedCode);
    setError('');
    
    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (updatedCode.length === 6) {
      vibrate([30]);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !gameCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setGameCode(pastedText);
    if (pastedText.length === 6) {
      vibrate([30]);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Join Game</h1>
            <p className="text-xs text-white/50">Enter the code from your host</p>
          </div>
        </div>
      </div>
      
      {/* Main Content - Vertically centered for thumb reach */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-32">
        {/* Code Entry - Large touch targets */}
        <div className="card-glow p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-neon-purple/10 rounded-xl">
              <Hash className="w-8 h-8 text-neon-purple" />
            </div>
            <h2 className="font-bold text-lg">Game Code</h2>
          </div>
          
          {/* 6-digit code input boxes - Large for thumb */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                value={gameCode[index] || ''}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                className={`w-12 h-16 text-center text-2xl font-mono font-bold rounded-xl border-2 bg-white/5 transition-all
                  ${gameCode[index] 
                    ? 'border-neon-purple bg-neon-purple/10 text-neon-purple' 
                    : 'border-white/20 focus:border-neon-cyan'
                  }`}
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </div>
          
          {/* Or use single input */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-dark-800 text-xs text-white/40">or paste code</span>
            </div>
          </div>
          
          <input
            type="text"
            value={gameCode}
            onChange={handleCodeChange}
            placeholder="ABC123"
            className="input-field text-center text-xl font-mono tracking-widest uppercase py-4"
            maxLength={6}
            autoComplete="off"
          />
          
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Tips - Collapsed by default on mobile */}
        <div className="card p-4 text-center">
          <p className="text-sm text-white/50">
            🎮 Ask your host for the 6-character code
          </p>
        </div>
      </div>
      
      {/* Fixed Bottom Action Bar - Thumb zone */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <button
          onClick={() => handleJoin()}
          disabled={gameCode.length < 6 || isJoining}
          className="w-full h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Gamepad2 className="w-6 h-6" />
              Join Game
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default JoinGame;

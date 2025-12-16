import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad2, AlertCircle } from 'lucide-react';
import { useStore, useSounds } from '../store';

function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinGame, games, user } = useStore();
  const { vibrate } = useSounds();
  
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Check for game code in URL params (deep link)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setGameCode(codeFromUrl.toUpperCase());
      // Auto-join if code is provided
      handleJoin(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);
  
  const handleJoin = async (code = gameCode) => {
    if (!code || code.length < 6) {
      setError('Please enter a valid game code');
      vibrate([100, 50, 100]);
      return;
    }
    
    setIsJoining(true);
    setError('');
    
    // Check if game exists
    const game = games.find(g => g.code === code.toUpperCase() && g.status === 'waiting');
    
    if (!game) {
      setError('Game not found or already started');
      setIsJoining(false);
      vibrate([100, 50, 100]);
      return;
    }
    
    // Check if game is full
    if (game.players.length >= game.settings.maxPlayers) {
      setError('This game is full');
      setIsJoining(false);
      vibrate([100, 50, 100]);
      return;
    }
    
    // Check if already in game
    if (game.players.some(p => p.id === user?.id)) {
      navigate('/lobby');
      return;
    }
    
    // Join the game
    const joined = joinGame(code.toUpperCase());
    
    if (joined) {
      vibrate([50, 30, 100]);
      navigate('/lobby');
    } else {
      setError('Failed to join game');
      setIsJoining(false);
    }
  };
  
  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setGameCode(value);
    setError('');
  };
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Join Game</h1>
          <p className="text-sm text-white/50">Enter the game code to join</p>
        </div>
      </div>
      
      {/* Join Form */}
      <div className="card-glow p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-neon-purple/10 rounded-2xl">
            <Users className="w-8 h-8 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Enter Game Code</h2>
            <p className="text-sm text-white/50">Get the code from the game host</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="label">Game Code</label>
            <input
              type="text"
              value={gameCode}
              onChange={handleCodeChange}
              placeholder="ABC123"
              className="input-field text-center text-2xl font-mono tracking-widest uppercase"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <button
            onClick={() => handleJoin()}
            disabled={gameCode.length < 6 || isJoining}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Gamepad2 className="w-5 h-5" />
                Join Game
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Tips */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Tips</h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-start gap-2">
            <span className="text-neon-cyan">•</span>
            Ask the game host for the 6-character code
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neon-purple">•</span>
            You can also scan a QR code to join instantly
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neon-orange">•</span>
            Make sure location services are enabled
          </li>
        </ul>
      </div>
    </div>
  );
}

export default JoinGame;

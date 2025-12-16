import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, LogIn } from 'lucide-react';
import { useStore } from '../store';

function JoinGame() {
  const navigate = useNavigate();
  const { joinGame } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  
  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Game code must be 6 characters');
      return;
    }
    
    const game = joinGame(code.toUpperCase());
    
    if (game) {
      navigate('/lobby');
    } else {
      setError('Game not found or already started');
    }
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Join Game</h1>
          <p className="text-white/50 text-sm">Enter the game code</p>
        </div>
      </div>
      
      {/* Join form */}
      <form onSubmit={handleJoin} className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-neon-cyan" />
            <label className="font-semibold">Game Code</label>
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="input-field text-center text-3xl font-bold tracking-[0.5em] uppercase"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        
        <button
          type="submit"
          disabled={code.length !== 6}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          Join Game
        </button>
      </form>
      
      {/* Info */}
      <div className="mt-8 p-4 card">
        <p className="text-sm text-white/60 text-center">
          Ask the game host for the 6-character code to join their game.
        </p>
      </div>
    </div>
  );
}

export default JoinGame;

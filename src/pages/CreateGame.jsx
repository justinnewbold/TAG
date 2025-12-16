import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, Target, Users, Timer, Gamepad2 } from 'lucide-react';
import { useStore, useSounds } from '../store';

function CreateGame() {
  const navigate = useNavigate();
  const { createGame, user } = useStore();
  const { vibrate } = useSounds();
  
  const [settings, setSettings] = useState({
    gameName: `${user?.name || 'Player'}'s Game`,
    gpsInterval: 10000,
    tagRadius: 20,
    duration: null,
    maxPlayers: 10,
  });
  
  const gpsOptions = [
    { value: 5000, label: '5s', desc: 'Real-time' },
    { value: 10000, label: '10s', desc: 'Recommended' },
    { value: 30000, label: '30s', desc: 'Battery saver' },
    { value: 60000, label: '1m', desc: 'Stealth' },
  ];
  
  const radiusOptions = [
    { value: 10, label: '10m', desc: 'Close' },
    { value: 20, label: '20m', desc: 'Standard' },
    { value: 50, label: '50m', desc: 'Wide' },
    { value: 100, label: '100m', desc: 'Very wide' },
  ];
  
  const durationOptions = [
    { value: null, label: 'None', desc: 'Unlimited' },
    { value: 15 * 60 * 1000, label: '15m', desc: 'Quick' },
    { value: 30 * 60 * 1000, label: '30m', desc: 'Standard' },
    { value: 60 * 60 * 1000, label: '1h', desc: 'Long' },
  ];
  
  const handleCreate = () => {
    vibrate([50, 30, 100]);
    const game = createGame(settings);
    if (game) {
      navigate('/lobby');
    }
  };
  
  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Create Game</h1>
          <p className="text-sm text-white/50">Set up your hunt</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="card p-4">
          <label className="label">Game Name</label>
          <input
            type="text"
            value={settings.gameName}
            onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
            placeholder="Enter game name"
            className="input-field"
            maxLength={30}
          />
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-neon-cyan" />
            <div>
              <h3 className="font-medium">GPS Update Interval</h3>
              <p className="text-xs text-white/50">How often locations update</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gpsOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings({ ...settings, gpsInterval: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.gpsInterval === opt.value
                    ? 'bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-neon-purple" />
            <div>
              <h3 className="font-medium">Tag Radius</h3>
              <p className="text-xs text-white/50">Distance to tag someone</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {radiusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings({ ...settings, tagRadius: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.tagRadius === opt.value
                    ? 'bg-neon-purple/20 border-2 border-neon-purple text-neon-purple'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="w-5 h-5 text-neon-orange" />
            <div>
              <h3 className="font-medium">Game Duration</h3>
              <p className="text-xs text-white/50">Time limit for the game</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value || 'none'}
                onClick={() => setSettings({ ...settings, duration: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.duration === opt.value
                    ? 'bg-neon-orange/20 border-2 border-neon-orange text-neon-orange'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium">Max Players</h3>
              <p className="text-xs text-white/50">Maximum players allowed</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[2, 4, 6, 8, 10, 15, 20].map((num) => (
              <button
                key={num}
                onClick={() => setSettings({ ...settings, maxPlayers: num })}
                className={`px-4 py-2 rounded-xl text-center transition-all flex-shrink-0 ${
                  settings.maxPlayers === num
                    ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-400'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        
        <button onClick={handleCreate} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
          <Gamepad2 className="w-5 h-5" />
          Create Game
        </button>
      </div>
    </div>
  );
}

export default CreateGame;

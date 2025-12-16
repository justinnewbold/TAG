import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Target, Clock, Users, Zap } from 'lucide-react';
import { useStore } from '../store';

function CreateGame() {
  const navigate = useNavigate();
  const { createGame, user } = useStore();
  
  const [settings, setSettings] = useState({
    gpsInterval: 10000,
    tagRadius: 20,
    duration: null,
    maxPlayers: 10,
  });
  
  const gpsOptions = [
    { value: 5000, label: '5 sec', desc: 'Real-time' },
    { value: 10000, label: '10 sec', desc: 'Recommended' },
    { value: 30000, label: '30 sec', desc: 'Battery saver' },
    { value: 60000, label: '1 min', desc: 'Stealth mode' },
  ];
  
  const radiusOptions = [
    { value: 10, label: '10m', desc: 'Close range' },
    { value: 20, label: '20m', desc: 'Standard' },
    { value: 50, label: '50m', desc: 'Easy' },
    { value: 100, label: '100m', desc: 'Wide area' },
  ];
  
  const durationOptions = [
    { value: null, label: 'Unlimited', desc: 'Until ended' },
    { value: 15 * 60 * 1000, label: '15 min', desc: 'Quick game' },
    { value: 30 * 60 * 1000, label: '30 min', desc: 'Standard' },
    { value: 60 * 60 * 1000, label: '1 hour', desc: 'Extended' },
  ];
  
  const handleCreate = () => {
    if (!user?.location) {
      alert('Please enable location services to create a game');
      return;
    }
    
    createGame(settings);
    navigate('/lobby');
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create Game</h1>
          <p className="text-white/50 text-sm">Configure your hunt</p>
        </div>
      </div>
      
      {/* GPS Interval */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-5 h-5 text-neon-cyan" />
          <label className="font-semibold">GPS Update Interval</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {gpsOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSettings({ ...settings, gpsInterval: opt.value })}
              className={`p-4 rounded-xl border transition-all ${
                settings.gpsInterval === opt.value
                  ? 'border-neon-cyan bg-neon-cyan/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className="font-bold">{opt.label}</p>
              <p className="text-xs text-white/50">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Tag Radius */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-neon-purple" />
          <label className="font-semibold">Tag Radius</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {radiusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSettings({ ...settings, tagRadius: opt.value })}
              className={`p-4 rounded-xl border transition-all ${
                settings.tagRadius === opt.value
                  ? 'border-neon-purple bg-neon-purple/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className="font-bold">{opt.label}</p>
              <p className="text-xs text-white/50">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Duration */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-neon-pink" />
          <label className="font-semibold">Game Duration</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {durationOptions.map((opt) => (
            <button
              key={opt.value || 'unlimited'}
              onClick={() => setSettings({ ...settings, duration: opt.value })}
              className={`p-4 rounded-xl border transition-all ${
                settings.duration === opt.value
                  ? 'border-neon-pink bg-neon-pink/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className="font-bold">{opt.label}</p>
              <p className="text-xs text-white/50">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Max Players */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-neon-orange" />
          <label className="font-semibold">Max Players: {settings.maxPlayers}</label>
        </div>
        <input
          type="range"
          min="2"
          max="20"
          value={settings.maxPlayers}
          onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
          className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-neon-orange"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>2</span>
          <span>20</span>
        </div>
      </div>
      
      {/* Location warning */}
      {!user?.location && (
        <div className="card p-4 mb-6 border-yellow-500/30 bg-yellow-500/10">
          <p className="text-yellow-400 text-sm">
            ⚠️ Location access required. Please enable location services.
          </p>
        </div>
      )}
      
      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!user?.location}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Zap className="w-5 h-5" />
        Create Game
      </button>
    </div>
  );
}

export default CreateGame;

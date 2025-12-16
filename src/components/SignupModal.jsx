import React, { useState } from 'react';
import { User, MapPin, Check } from 'lucide-react';
import { useStore } from '../store';

function SignupModal({ onClose }) {
  const { setUser } = useStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🏃');
  const [locationStatus, setLocationStatus] = useState('pending');
  
  const avatars = ['🏃', '🏃‍♀️', '🏃‍♂️', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐉', '👤', '⭐'];
  
  const handleRequestLocation = () => {
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('granted');
      },
      (error) => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true }
    );
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const user = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      avatar,
      createdAt: Date.now(),
    };
    
    setUser(user);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold mb-2">
            <span className="text-neon-cyan">TAG</span>
            <span className="text-neon-purple">!</span>
          </h1>
          <p className="text-white/60">Hunt your friends with GPS</p>
        </div>
        
        <form onSubmit={handleSubmit} className="card-glow p-6 space-y-6">
          <div>
            <label className="label">Your Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field pl-12"
                maxLength={20}
                autoFocus
                required
              />
            </div>
          </div>
          
          <div>
            <label className="label">Choose Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatars.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-2xl p-3 rounded-xl transition-all ${
                    avatar === a
                      ? 'bg-neon-cyan/20 ring-2 ring-neon-cyan scale-110'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="label">Location Access</label>
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={locationStatus === 'granted'}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                locationStatus === 'granted'
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : locationStatus === 'denied'
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              {locationStatus === 'granted' ? (
                <Check className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              <span className="flex-1 text-left">
                {locationStatus === 'pending' && 'Enable Location'}
                {locationStatus === 'requesting' && 'Requesting...'}
                {locationStatus === 'granted' && 'Location Enabled'}
                {locationStatus === 'denied' && 'Location Denied - Tap to retry'}
              </span>
            </button>
            <p className="text-xs text-white/40 mt-2">
              Required to play TAG! Your location is only shared during active games.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Playing
          </button>
        </form>
        
        <p className="text-center text-xs text-white/30 mt-6">
          By playing, you agree to share your location with other players during games.
        </p>
      </div>
    </div>
  );
}

export default SignupModal;

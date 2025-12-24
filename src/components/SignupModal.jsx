import React, { useState } from 'react';
import { User, MapPin, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

function SignupModal({ onClose }) {
  const { setUser } = useStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🏃');
  const [locationStatus, setLocationStatus] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Register with the backend
      const { user, token } = await api.register(name.trim(), avatar);

      // Connect to socket after registration
      socketService.connect();

      // Set user in store
      setUser(user);
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Registration error:', err);

      // Detect network/connection errors (including Safari-specific messages)
      const isNetworkError =
        err.message === 'Failed to fetch' ||
        err.message.includes('NetworkError') ||
        err.message.includes('Unable to connect') ||
        err.message.includes('Load failed') ||
        err.name === 'TypeError';

      // Fallback to local-only mode if server is unavailable
      if (isNetworkError) {
        const localUser = {
          id: Math.random().toString(36).substring(2, 9),
          name: name.trim(),
          avatar,
          createdAt: Date.now(),
          isOffline: true,
        };
        setUser(localUser);
        onClose();
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
    >
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 id="signup-title" className="text-5xl font-display font-bold mb-2">
            <span className="text-indigo-600">TAG</span>
            <span className="text-purple-500">!</span>
          </h1>
          <p className="text-gray-500">Hunt your friends with GPS</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-6" aria-label="Create account form">
          <div>
            <label htmlFor="player-name" className="label">Your Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field pl-12"
                maxLength={20}
                autoFocus
                required
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label id="avatar-label" className="label">Choose Avatar</label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="avatar-label">
              {avatars.map((a, index) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  role="radio"
                  aria-checked={avatar === a}
                  aria-label={`Avatar option ${index + 1}`}
                  className={`text-2xl p-3 rounded-xl transition-all ${
                    avatar === a
                      ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
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
                  ? 'bg-green-50 border border-green-300 text-green-600'
                  : locationStatus === 'denied'
                  ? 'bg-red-50 border border-red-300 text-red-600'
                  : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
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
            <p className="text-xs text-gray-400 mt-2">
              Required to play TAG! Your location is only shared during active games.
            </p>
          </div>

          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Start Playing'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          By playing, you agree to share your location with other players during games.
        </p>
      </div>
    </div>
  );
}

export default SignupModal;

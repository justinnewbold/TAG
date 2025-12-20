import React, { useState, useEffect } from 'react';
import { Phone, AlertTriangle, Pause, Play, MapPin, X, Shield, Navigation } from 'lucide-react';
import { useStore, useSounds } from '../store';

function SafetyControls({ currentGame, userLocation, onPause, onResume, isPaused }) {
  const { settings, updateSettings } = useStore();
  const { playSound, vibrate } = useSounds();
  const [showSOS, setShowSOS] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(null);
  const [showBoundaryWarning, setShowBoundaryWarning] = useState(false);
  const [distanceToBoundary, setDistanceToBoundary] = useState(null);

  // Check if player is near or outside game boundary
  useEffect(() => {
    if (!userLocation || !currentGame?.settings?.boundary) return;

    const boundary = currentGame.settings.boundary;
    const distance = getDistanceFromBoundary(userLocation, boundary);

    setDistanceToBoundary(distance);

    // Warn when within 50m of boundary
    if (distance <= 50 && distance > 0) {
      setShowBoundaryWarning(true);
      if (distance <= 20) {
        vibrate([100, 50, 100, 50, 100]);
      }
    } else if (distance < 0) {
      // Outside boundary
      setShowBoundaryWarning(true);
      vibrate([200, 100, 200, 100, 400]);
    } else {
      setShowBoundaryWarning(false);
    }
  }, [userLocation, currentGame?.settings?.boundary]);

  const getDistanceFromBoundary = (location, boundary) => {
    if (!boundary || boundary.type !== 'circle') return Infinity;

    const distance = getDistance(
      location.lat, location.lng,
      boundary.center.lat, boundary.center.lng
    );

    // Positive = inside, negative = outside
    return boundary.radius - distance;
  };

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      playSound('resume');
      vibrate([50, 30, 50]);
      onResume?.();
    } else {
      playSound('pause');
      vibrate([100]);
      onPause?.();
    }
  };

  const initiateSOSCountdown = () => {
    setShowSOS(true);
    setSosCountdown(5);
    vibrate([500]);
  };

  const cancelSOS = () => {
    setShowSOS(false);
    setSosCountdown(null);
  };

  const confirmSOS = () => {
    // Open phone dialer with emergency number
    // This uses the default emergency number format
    window.location.href = 'tel:911';
    setShowSOS(false);
    setSosCountdown(null);
  };

  // SOS countdown timer
  useEffect(() => {
    if (sosCountdown === null) return;

    if (sosCountdown === 0) {
      confirmSOS();
      return;
    }

    const timer = setTimeout(() => {
      setSosCountdown(sosCountdown - 1);
      vibrate([200]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sosCountdown]);

  return (
    <>
      {/* Safety Controls Bar */}
      <div className="flex items-center gap-2">
        {/* Pause Button */}
        <button
          onClick={handlePauseToggle}
          className={`p-3 rounded-full transition-all ${
            isPaused
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          aria-label={isPaused ? 'Resume game' : 'Pause (crossing street)'}
          title={isPaused ? 'Resume game' : 'Pause for safety'}
        >
          {isPaused ? (
            <Play className="w-5 h-5 text-green-400" />
          ) : (
            <Pause className="w-5 h-5 text-white/70" />
          )}
        </button>

        {/* SOS Button */}
        <button
          onClick={initiateSOSCountdown}
          className="p-3 bg-red-500/20 border border-red-500/30 rounded-full hover:bg-red-500/30 transition-all"
          aria-label="Emergency SOS"
          title="Emergency SOS"
        >
          <Phone className="w-5 h-5 text-red-400" />
        </button>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed top-20 left-4 right-4 z-40 animate-slide-down">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-400">Game Paused</p>
              <p className="text-xs text-white/60">
                You're safe from being tagged. Tap play when ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Boundary Warning */}
      {showBoundaryWarning && (
        <div className={`fixed top-20 left-4 right-4 z-40 animate-slide-down ${
          distanceToBoundary < 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-500/20 border-amber-500/30'
        } border rounded-xl p-4 flex items-center gap-3`}>
          <MapPin className={`w-6 h-6 flex-shrink-0 ${
            distanceToBoundary < 0 ? 'text-red-400' : 'text-amber-400'
          }`} />
          <div className="flex-1">
            <p className={`font-medium ${distanceToBoundary < 0 ? 'text-red-400' : 'text-amber-400'}`}>
              {distanceToBoundary < 0 ? 'Outside Play Area!' : 'Near Boundary'}
            </p>
            <p className="text-xs text-white/60">
              {distanceToBoundary < 0
                ? 'Return to the play area to continue'
                : `${Math.round(distanceToBoundary)}m to boundary`
              }
            </p>
          </div>
          <Navigation className={`w-5 h-5 ${distanceToBoundary < 0 ? 'text-red-400' : 'text-amber-400'}`} />
        </div>
      )}

      {/* SOS Confirmation Modal */}
      {showSOS && (
        <div className="fixed inset-0 z-50 bg-red-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-dark-800 rounded-2xl border border-red-500/50 p-6 max-w-sm w-full text-center animate-scale-in">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-red-400 mb-2">Emergency SOS</h2>
            
            {sosCountdown !== null && sosCountdown > 0 ? (
              <>
                <p className="text-white/70 mb-4">
                  Calling emergency services in...
                </p>
                <div className="text-6xl font-bold text-red-400 mb-6 animate-pulse">
                  {sosCountdown}
                </div>
              </>
            ) : (
              <p className="text-white/70 mb-6">
                This will call emergency services (911)
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={cancelSOS}
                className="flex-1 btn-secondary border-white/20"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={confirmSOS}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
              >
                <Phone className="w-4 h-4 mr-2 inline" />
                Call Now
              </button>
            </div>

            <p className="text-xs text-white/40 mt-4">
              Only use in real emergencies
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default SafetyControls;

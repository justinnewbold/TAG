import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  Bell, Users, Trophy, Timer, Vibrate, Volume2
} from 'lucide-react';

// Check-in game mode component
export default function CheckInSystem({ 
  game, 
  userId, 
  onCheckIn, 
  onMissedCheckIn,
  isHost = false 
}) {
  const [checkInState, setCheckInState] = useState('waiting'); // waiting, active, responded, missed
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [nextCheckIn, setNextCheckIn] = useState(null);
  const [gracesUsed, setGracesUsed] = useState(0);
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [showAnimation, setShowAnimation] = useState(false);
  
  const settings = game?.settings || {};
  const checkInFrequencyMin = settings.checkInFrequencyMin || 300000; // 5 min default
  const checkInFrequencyMax = settings.checkInFrequencyMax || 900000; // 15 min default
  const windowDuration = settings.checkInWindowDuration || 60000; // 60 sec default
  const maxGraces = settings.gracePeriods || 1;

  // Schedule next check-in
  const scheduleNextCheckIn = useCallback(() => {
    const delay = Math.random() * (checkInFrequencyMax - checkInFrequencyMin) + checkInFrequencyMin;
    const nextTime = Date.now() + delay;
    setNextCheckIn(nextTime);
    setCheckInState('waiting');
    return nextTime;
  }, [checkInFrequencyMin, checkInFrequencyMax]);

  // Start check-in window
  const startCheckInWindow = useCallback(() => {
    setCheckInState('active');
    setTimeRemaining(windowDuration);
    setShowAnimation(true);
    
    // Vibrate and play sound
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Play alert sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.frequency.setValueAtTime(1760, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext may not be available in all browsers - sound is optional
      console.debug('Could not play check-in alert sound:', e.message);
    }
    
    setTimeout(() => setShowAnimation(false), 500);
  }, [windowDuration]);

  // Handle check-in response
  const handleCheckIn = useCallback(() => {
    if (checkInState !== 'active') return;
    
    setCheckInState('responded');
    setCheckInHistory(prev => [...prev, { time: Date.now(), success: true }]);
    
    // Success vibration
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // Notify parent
    if (onCheckIn) {
      onCheckIn({ playerId: userId, timestamp: Date.now() });
    }
    
    // Schedule next check-in
    setTimeout(() => scheduleNextCheckIn(), 2000);
  }, [checkInState, userId, onCheckIn, scheduleNextCheckIn]);

  // Handle missed check-in
  const handleMissedCheckIn = useCallback(() => {
    if (gracesUsed < maxGraces) {
      setGracesUsed(prev => prev + 1);
      setCheckInState('waiting');
      setCheckInHistory(prev => [...prev, { time: Date.now(), success: false, grace: true }]);
      scheduleNextCheckIn();
    } else {
      setCheckInState('missed');
      setCheckInHistory(prev => [...prev, { time: Date.now(), success: false, grace: false }]);
      
      // Elimination vibration
      if (navigator.vibrate) {
        navigator.vibrate([500, 100, 500]);
      }
      
      if (onMissedCheckIn) {
        onMissedCheckIn({ playerId: userId, timestamp: Date.now() });
      }
    }
  }, [gracesUsed, maxGraces, userId, onMissedCheckIn, scheduleNextCheckIn]);

  // Timer countdown effect
  useEffect(() => {
    if (checkInState !== 'active' || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          handleMissedCheckIn();
          return 0;
        }
        // Warning vibration at 10 seconds
        if (newTime === 10000 && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [checkInState, timeRemaining, handleMissedCheckIn]);

  // Wait for next check-in
  useEffect(() => {
    if (!nextCheckIn || checkInState !== 'waiting') return;
    
    const timeUntilCheckIn = nextCheckIn - Date.now();
    if (timeUntilCheckIn <= 0) {
      startCheckInWindow();
      return;
    }
    
    const timer = setTimeout(() => {
      startCheckInWindow();
    }, timeUntilCheckIn);
    
    return () => clearTimeout(timer);
  }, [nextCheckIn, checkInState, startCheckInWindow]);

  // Initialize on mount
  useEffect(() => {
    if (game?.status === 'active' && game?.gameMode === 'survivalCheckIn') {
      scheduleNextCheckIn();
    }
  }, [game?.status, game?.gameMode, scheduleNextCheckIn]);

  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds;
  };

  const getProgressPercentage = () => {
    return ((windowDuration - timeRemaining) / windowDuration) * 100;
  };

  // Waiting state
  if (checkInState === 'waiting') {
    const timeUntil = nextCheckIn ? Math.max(0, nextCheckIn - Date.now()) : 0;
    const minutesUntil = Math.floor(timeUntil / 60000);
    const secondsUntil = Math.floor((timeUntil % 60000) / 1000);
    
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Next Check-In</div>
                <div className="text-xs text-gray-400">
                  {timeUntil > 0 
                    ? `In ~${minutesUntil}:${secondsUntil.toString().padStart(2, '0')}`
                    : 'Coming soon...'
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">
                Graces: {maxGraces - gracesUsed}/{maxGraces}
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active check-in window
  if (checkInState === 'active') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${showAnimation ? 'animate-pulse' : ''}`}>
        <div className="bg-gray-900 rounded-3xl border-2 border-amber-500 p-8 mx-4 max-w-sm w-full shadow-2xl shadow-amber-500/20">
          {/* Timer ring */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={timeRemaining <= 10000 ? '#ef4444' : '#f59e0b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - getProgressPercentage() / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${timeRemaining <= 10000 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                {formatTime(timeRemaining)}
              </span>
              <span className="text-gray-400 text-sm">seconds</span>
            </div>
          </div>

          {/* Alert message */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold text-white">CHECK IN NOW!</h2>
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">
              Tap the button below before time runs out!
            </p>
            {gracesUsed > 0 && (
              <p className="text-amber-400 text-xs mt-1">
                ⚠️ {maxGraces - gracesUsed} grace period(s) remaining
              </p>
            )}
          </div>

          {/* Check-in button */}
          <button
            onClick={handleCheckIn}
            className="w-full py-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-2xl font-bold rounded-2xl 
                       shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform
                       hover:from-emerald-600 hover:to-green-600"
          >
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8" />
              CHECK IN
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Responded state
  if (checkInState === 'responded') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl border-2 border-emerald-500 p-8 mx-4 max-w-sm w-full shadow-2xl shadow-emerald-500/20 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You're Safe!</h2>
          <p className="text-gray-400">
            Great job! You checked in on time.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Next check-in coming soon...
          </div>
        </div>
      </div>
    );
  }

  // Missed/Eliminated state
  if (checkInState === 'missed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl border-2 border-red-500 p-8 mx-4 max-w-sm w-full shadow-2xl shadow-red-500/20 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <XCircle className="w-16 h-16 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Eliminated!</h2>
          <p className="text-gray-400">
            You missed the check-in window.
          </p>
          <div className="mt-6 p-4 bg-gray-800/50 rounded-xl">
            <div className="text-sm text-gray-400 mb-2">Your stats:</div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{checkInHistory.filter(h => h.success).length}</div>
                <div className="text-xs text-gray-500">Check-ins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{gracesUsed}</div>
                <div className="text-xs text-gray-500">Graces Used</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {/* Navigate to spectate */}}
            className="mt-6 w-full py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            Watch Game
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Settings component for Check-In mode
export function CheckInSettings({ settings = {}, onChange, isHost = false }) {
  const checkInSettings = {
    checkInFrequencyMin: settings.checkInFrequencyMin || 300000,
    checkInFrequencyMax: settings.checkInFrequencyMax || 900000,
    checkInWindowDuration: settings.checkInWindowDuration || 60000,
    gracePeriods: settings.gracePeriods ?? 1,
    checkInSound: settings.checkInSound ?? true,
    checkInVibration: settings.checkInVibration ?? true,
    ...settings,
  };

  const updateSetting = (key, value) => {
    if (onChange) {
      onChange({ ...checkInSettings, [key]: value });
    }
  };

  const formatMinutes = (ms) => `${ms / 60000} min`;

  return (
    <div className="space-y-4">
      {/* Frequency Range */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Timer className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-medium text-white">Check-In Frequency</div>
            <div className="text-xs text-gray-400">
              Random interval between {formatMinutes(checkInSettings.checkInFrequencyMin)} and {formatMinutes(checkInSettings.checkInFrequencyMax)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Minimum</label>
            <select
              value={checkInSettings.checkInFrequencyMin}
              onChange={(e) => updateSetting('checkInFrequencyMin', parseInt(e.target.value))}
              disabled={!isHost}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value={60000}>1 min</option>
              <option value={120000}>2 min</option>
              <option value={300000}>5 min</option>
              <option value={600000}>10 min</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Maximum</label>
            <select
              value={checkInSettings.checkInFrequencyMax}
              onChange={(e) => updateSetting('checkInFrequencyMax', parseInt(e.target.value))}
              disabled={!isHost}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value={300000}>5 min</option>
              <option value={600000}>10 min</option>
              <option value={900000}>15 min</option>
              <option value={1800000}>30 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Response Window */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-medium text-white">Response Window</div>
              <div className="text-xs text-gray-400">Time to respond to check-in</div>
            </div>
          </div>
          <select
            value={checkInSettings.checkInWindowDuration}
            onChange={(e) => updateSetting('checkInWindowDuration', parseInt(e.target.value))}
            disabled={!isHost}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value={15000}>15 sec</option>
            <option value={30000}>30 sec</option>
            <option value={60000}>1 min</option>
            <option value={120000}>2 min</option>
          </select>
        </div>
      </div>

      {/* Grace Periods */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-pink-400" />
            <div>
              <div className="font-medium text-white">Grace Periods</div>
              <div className="text-xs text-gray-400">Free misses allowed</div>
            </div>
          </div>
          <select
            value={checkInSettings.gracePeriods}
            onChange={(e) => updateSetting('gracePeriods', parseInt(e.target.value))}
            disabled={!isHost}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-pink-500"
          >
            <option value={0}>None</option>
            <option value={1}>1 free miss</option>
            <option value={2}>2 free misses</option>
            <option value={3}>3 free misses</option>
          </select>
        </div>
      </div>

      {/* Notification toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-white">Alert Sound</span>
          </div>
          <button
            onClick={() => isHost && updateSetting('checkInSound', !checkInSettings.checkInSound)}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              checkInSettings.checkInSound ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              checkInSettings.checkInSound ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Vibrate className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-white">Vibration</span>
          </div>
          <button
            onClick={() => isHost && updateSetting('checkInVibration', !checkInSettings.checkInVibration)}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              checkInSettings.checkInVibration ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              checkInSettings.checkInVibration ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Leaderboard component for Check-In mode
export function CheckInLeaderboard({ players = [], checkInData = {} }) {
  const sortedPlayers = [...players]
    .filter(p => !p.isEliminated)
    .sort((a, b) => {
      const aCheckins = checkInData[a.id]?.successfulCheckIns || 0;
      const bCheckins = checkInData[b.id]?.successfulCheckIns || 0;
      return bCheckins - aCheckins;
    });

  const eliminatedPlayers = players.filter(p => p.isEliminated);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold text-white">Survivors ({sortedPlayers.length})</h3>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const data = checkInData[player.id] || {};
          return (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400">
                  {index + 1}
                </span>
                <span className="text-2xl">{player.avatar || '👤'}</span>
                <span className="font-medium text-white">{player.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-emerald-400">
                    {data.successfulCheckIns || 0} ✓
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.gracesUsed || 0}/{data.maxGraces || 1} graces
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {eliminatedPlayers.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-gray-400">Eliminated ({eliminatedPlayers.length})</h3>
          </div>

          <div className="space-y-2 opacity-60">
            {eliminatedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale">{player.avatar || '👤'}</span>
                  <span className="text-gray-400 line-through">{player.name}</span>
                </div>
                <span className="text-xs text-red-400">Missed check-in</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

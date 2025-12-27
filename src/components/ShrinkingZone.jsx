import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Circle, Target, AlertTriangle, Timer, MapPin, 
  Minimize2, ChevronDown, ChevronUp, Info, Skull
} from 'lucide-react';

// Shrinking Zone System for Battle Royale mode
export default function ShrinkingZone({ 
  game, 
  userLocation, 
  onOutsideZone,
  onEliminatedByZone 
}) {
  const [zoneState, setZoneState] = useState({
    center: null,
    currentRadius: 0,
    nextRadius: 0,
    phase: 'waiting',
    shrinkStartTime: null,
    shrinkEndTime: null,
    outsideZoneTime: 0,
  });
  const [isOutside, setIsOutside] = useState(false);
  const [warningLevel, setWarningLevel] = useState(0);

  const settings = game?.settings || {};
  const shrinkInterval = settings.shrinkInterval || 120000;
  const shrinkAmount = settings.shrinkAmount || 0.15;
  const outsideZoneGrace = settings.outsideZoneGrace || 30000;
  const damageOutsideZone = settings.damageOutsideZone ?? true;
  const initialRadius = settings.initialZoneRadius || 500;

  const getDistanceFromCenter = useCallback((location, center) => {
    if (!location || !center) return Infinity;
    const R = 6371000;
    const dLat = (location.lat - center.lat) * Math.PI / 180;
    const dLon = (location.lng - center.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(center.lat * Math.PI / 180) * Math.cos(location.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  useEffect(() => {
    if (game?.status === 'active' && game?.gameMode === 'battleRoyale' && !zoneState.center) {
      const players = game.players || [];
      if (players.length > 0) {
        const avgLat = players.reduce((sum, p) => sum + (p.location?.lat || 0), 0) / players.length;
        const avgLng = players.reduce((sum, p) => sum + (p.location?.lng || 0), 0) / players.length;
        setZoneState(prev => ({
          ...prev,
          center: { lat: avgLat, lng: avgLng },
          currentRadius: initialRadius,
          nextRadius: initialRadius * (1 - shrinkAmount),
          phase: 'stable',
          shrinkStartTime: Date.now() + shrinkInterval,
        }));
      }
    }
  }, [game?.status, game?.gameMode, game?.players, initialRadius, shrinkAmount, shrinkInterval, zoneState.center]);

  useEffect(() => {
    if (zoneState.phase !== 'stable' || !zoneState.shrinkStartTime) return;
    const timeUntilShrink = zoneState.shrinkStartTime - Date.now();
    if (timeUntilShrink <= 0) {
      setZoneState(prev => ({ ...prev, phase: 'shrinking', shrinkEndTime: Date.now() + 30000 }));
      return;
    }
    const timer = setTimeout(() => {
      setZoneState(prev => ({ ...prev, phase: 'shrinking', shrinkEndTime: Date.now() + 30000 }));
    }, timeUntilShrink);
    return () => clearTimeout(timer);
  }, [zoneState.phase, zoneState.shrinkStartTime]);

  useEffect(() => {
    if (zoneState.phase !== 'shrinking') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - (zoneState.shrinkEndTime - 30000)) / 30000);
      const newRadius = zoneState.currentRadius - (zoneState.currentRadius - zoneState.nextRadius) * progress;
      if (progress >= 1) {
        setZoneState(prev => ({
          ...prev,
          currentRadius: prev.nextRadius,
          nextRadius: prev.nextRadius * (1 - shrinkAmount),
          phase: 'stable',
          shrinkStartTime: Date.now() + shrinkInterval,
          shrinkEndTime: null,
        }));
      } else {
        setZoneState(prev => ({ ...prev, currentRadius: newRadius }));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [zoneState.phase, zoneState.shrinkEndTime, zoneState.currentRadius, zoneState.nextRadius, shrinkAmount, shrinkInterval]);

  useEffect(() => {
    if (!userLocation || !zoneState.center) return;
    const distance = getDistanceFromCenter(userLocation, zoneState.center);
    const outside = distance > zoneState.currentRadius;
    setIsOutside(outside);
    if (outside) {
      const overage = distance - zoneState.currentRadius;
      if (overage > 100) setWarningLevel(3);
      else if (overage > 50) setWarningLevel(2);
      else setWarningLevel(1);
      if (onOutsideZone) onOutsideZone({ distance, overage, radius: zoneState.currentRadius });
    } else {
      setWarningLevel(0);
    }
  }, [userLocation, zoneState.center, zoneState.currentRadius, getDistanceFromCenter, onOutsideZone]);

  useEffect(() => {
    if (!isOutside || !damageOutsideZone) return;
    const interval = setInterval(() => {
      setZoneState(prev => {
        const newOutsideTime = prev.outsideZoneTime + 1000;
        if (newOutsideTime >= outsideZoneGrace) {
          if (onEliminatedByZone) onEliminatedByZone();
          return prev;
        }
        return { ...prev, outsideZoneTime: newOutsideTime };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOutside, damageOutsideZone, outsideZoneGrace, onEliminatedByZone]);

  useEffect(() => {
    if (!isOutside) setZoneState(prev => ({ ...prev, outsideZoneTime: 0 }));
  }, [isOutside]);

  const timeUntilNextShrink = useMemo(() => {
    if (!zoneState.shrinkStartTime) return 0;
    return Math.max(0, zoneState.shrinkStartTime - Date.now());
  }, [zoneState.shrinkStartTime]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return \`\${minutes}:\${remainingSeconds.toString().padStart(2, '0')}\`;
  };

  return (
    <>
      <div className="fixed top-20 left-4 right-4 z-40">
        <div className={\`p-3 rounded-xl border shadow-lg backdrop-blur-sm \${
          isOutside ? 'bg-red-900/90 border-red-500' 
            : zoneState.phase === 'shrinking' ? 'bg-amber-900/90 border-amber-500'
            : 'bg-gray-900/90 border-gray-700'
        }\`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOutside ? (
                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              ) : zoneState.phase === 'shrinking' ? (
                <Minimize2 className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : (
                <Circle className="w-5 h-5 text-indigo-400" />
              )}
              <div>
                <div className="text-sm font-medium text-white">
                  {isOutside ? 'OUTSIDE ZONE!' : zoneState.phase === 'shrinking' ? 'Zone Shrinking...' : 'Safe Zone Active'}
                </div>
                <div className="text-xs text-gray-400">Radius: {Math.round(zoneState.currentRadius)}m</div>
              </div>
            </div>
            <div className="text-right">
              {isOutside && damageOutsideZone ? (
                <div className="text-red-400 font-bold">
                  <div className="text-lg">{Math.ceil((outsideZoneGrace - zoneState.outsideZoneTime) / 1000)}s</div>
                  <div className="text-xs">until eliminated</div>
                </div>
              ) : zoneState.phase === 'stable' && timeUntilNextShrink > 0 ? (
                <div className="text-gray-300">
                  <div className="text-lg font-medium">{formatTime(timeUntilNextShrink)}</div>
                  <div className="text-xs text-gray-500">until shrink</div>
                </div>
              ) : null}
            </div>
          </div>
          {zoneState.phase === 'shrinking' && (
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-100"
                style={{ width: \`\${((Date.now() - (zoneState.shrinkEndTime - 30000)) / 30000) * 100}%\` }} />
            </div>
          )}
          {isOutside && damageOutsideZone && (
            <div className="mt-2 h-2 bg-red-900 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: \`\${(zoneState.outsideZoneTime / outsideZoneGrace) * 100}%\` }} />
            </div>
          )}
        </div>
      </div>
      {isOutside && warningLevel >= 3 && (
        <div className="fixed inset-0 pointer-events-none z-30">
          <div className="absolute inset-0 border-8 border-red-500 animate-pulse opacity-50" />
        </div>
      )}
    </>
  );
}

export function ShrinkingZoneSettings({ settings = {}, onChange, isHost = false }) {
  const [expanded, setExpanded] = useState(true);
  const zoneSettings = {
    enableShrinkingZone: settings.enableShrinkingZone ?? false,
    initialZoneRadius: settings.initialZoneRadius || 500,
    shrinkInterval: settings.shrinkInterval || 120000,
    shrinkAmount: settings.shrinkAmount || 0.15,
    outsideZoneGrace: settings.outsideZoneGrace || 30000,
    damageOutsideZone: settings.damageOutsideZone ?? true,
    showZoneOnMap: settings.showZoneOnMap ?? true,
    showNextZone: settings.showNextZone ?? true,
    ...settings,
  };

  const updateSetting = (key, value) => {
    if (onChange) onChange({ ...zoneSettings, [key]: value });
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={\`p-2 rounded-lg \${zoneSettings.enableShrinkingZone ? 'bg-rose-500/20' : 'bg-gray-700'}\`}>
            <Minimize2 className={\`w-5 h-5 \${zoneSettings.enableShrinkingZone ? 'text-rose-400' : 'text-gray-400'}\`} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">Shrinking Zone</div>
            <div className="text-sm text-gray-400">{zoneSettings.enableShrinkingZone ? 'Battle Royale style' : 'Disabled'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); isHost && updateSetting('enableShrinkingZone', !zoneSettings.enableShrinkingZone); }}
            disabled={!isHost}
            className={\`relative w-12 h-6 rounded-full transition-colors \${zoneSettings.enableShrinkingZone ? 'bg-rose-500' : 'bg-gray-600'}\`}>
            <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform \${zoneSettings.enableShrinkingZone ? 'left-7' : 'left-1'}\`} />
          </button>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && zoneSettings.enableShrinkingZone && (
        <div className="p-4 border-t border-gray-800 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <Info className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-300">The play area will shrink over time, forcing players together. Stay inside or be eliminated!</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Initial Radius</div>
                <div className="text-xs text-gray-400">Starting zone size</div>
              </div>
              <select value={zoneSettings.initialZoneRadius} onChange={(e) => updateSetting('initialZoneRadius', parseInt(e.target.value))}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value={250}>250m (Small)</option>
                <option value={500}>500m (Medium)</option>
                <option value={1000}>1km (Large)</option>
                <option value={2000}>2km (Huge)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Shrink Interval</div>
                <div className="text-xs text-gray-400">Time between shrinks</div>
              </div>
              <select value={zoneSettings.shrinkInterval} onChange={(e) => updateSetting('shrinkInterval', parseInt(e.target.value))}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value={60000}>1 min (Fast)</option>
                <option value={120000}>2 min (Normal)</option>
                <option value={300000}>5 min (Slow)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Shrink Amount</div>
                <div className="text-xs text-gray-400">How much smaller each phase</div>
              </div>
              <select value={zoneSettings.shrinkAmount} onChange={(e) => updateSetting('shrinkAmount', parseFloat(e.target.value))}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value={0.10}>10% (Gradual)</option>
                <option value={0.15}>15% (Normal)</option>
                <option value={0.25}>25% (Aggressive)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Outside Grace Period</div>
                <div className="text-xs text-gray-400">Time before elimination</div>
              </div>
              <select value={zoneSettings.outsideZoneGrace} onChange={(e) => updateSetting('outsideZoneGrace', parseInt(e.target.value))}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value={15000}>15 sec (Brutal)</option>
                <option value={30000}>30 sec (Normal)</option>
                <option value={60000}>1 min (Forgiving)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Skull className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-white text-sm">Zone Eliminates</div>
                  <div className="text-xs text-gray-400">Eliminate if outside too long</div>
                </div>
              </div>
              <button onClick={() => isHost && updateSetting('damageOutsideZone', !zoneSettings.damageOutsideZone)}
                disabled={!isHost}
                className={\`relative w-12 h-6 rounded-full transition-colors \${zoneSettings.damageOutsideZone ? 'bg-rose-500' : 'bg-gray-600'}\`}>
                <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform \${zoneSettings.damageOutsideZone ? 'left-7' : 'left-1'}\`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ZoneMapOverlay({ center, currentRadius, nextRadius, showNext = true }) {
  if (!center) return null;
  return (
    <>
      <circle cx={center.lng} cy={center.lat} r={currentRadius} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="3" strokeDasharray="10,5" />
      {showNext && nextRadius && (
        <circle cx={center.lng} cy={center.lat} r={nextRadius} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
      )}
    </>
  );
}

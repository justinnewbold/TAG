import React, { useState, useEffect } from 'react';
import { 
  Clock, Shield, AlertCircle, Timer, Users, 
  ChevronDown, ChevronUp, Info, Zap, Target
} from 'lucide-react';

// Cooldown type definitions
const COOLDOWN_TYPES = {
  none: {
    id: 'none',
    name: 'No Cooldowns',
    description: 'Free-for-all! Tags can happen instantly',
    icon: Zap,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  revenge: {
    id: 'revenge',
    name: 'Revenge Protection',
    description: 'Can\'t tag the person who just tagged you',
    icon: Shield,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
  },
  global: {
    id: 'global',
    name: 'Global Cooldown',
    description: 'Can\'t tag anyone for a period after being tagged',
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
  },
  target: {
    id: 'target',
    name: 'Target Protection',
    description: 'Same person can\'t be tagged twice within the cooldown',
    icon: Target,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
};

// Cooldown duration presets
const COOLDOWN_PRESETS = [
  { value: 0, label: 'None', shortLabel: '0' },
  { value: 30000, label: '30 seconds', shortLabel: '30s' },
  { value: 60000, label: '1 minute', shortLabel: '1m' },
  { value: 300000, label: '5 minutes', shortLabel: '5m' },
  { value: 600000, label: '10 minutes', shortLabel: '10m' },
  { value: 1800000, label: '30 minutes', shortLabel: '30m' },
  { value: 3600000, label: '1 hour', shortLabel: '1h' },
];

export default function TagCooldownSystem({ 
  settings = {}, 
  onChange, 
  isHost = false,
  compact = false 
}) {
  const [expanded, setExpanded] = useState(true);
  const [customDuration, setCustomDuration] = useState(60);

  // Default cooldown settings
  const cooldownSettings = {
    cooldownType: settings.cooldownType || 'revenge',
    cooldownDuration: settings.cooldownDuration || 60000,
    revengeDuration: settings.revengeDuration || 60000,
    globalDuration: settings.globalDuration || 30000,
    targetDuration: settings.targetDuration || 120000,
    showCooldownIndicator: settings.showCooldownIndicator ?? true,
    playCooldownSound: settings.playCooldownSound ?? true,
    ...settings,
  };

  const updateSetting = (key, value) => {
    if (onChange) {
      onChange({ ...cooldownSettings, [key]: value });
    }
  };

  const formatDuration = (ms) => {
    if (ms === 0) return 'None';
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    return `${ms / 3600000}h`;
  };

  const handleCustomDuration = (seconds) => {
    const ms = Math.max(0, Math.min(3600, seconds)) * 1000;
    setCustomDuration(seconds);
    
    switch (cooldownSettings.cooldownType) {
      case 'revenge':
        updateSetting('revengeDuration', ms);
        break;
      case 'global':
        updateSetting('globalDuration', ms);
        break;
      case 'target':
        updateSetting('targetDuration', ms);
        break;
      default:
        updateSetting('cooldownDuration', ms);
    }
  };

  const getCurrentDuration = () => {
    switch (cooldownSettings.cooldownType) {
      case 'revenge':
        return cooldownSettings.revengeDuration;
      case 'global':
        return cooldownSettings.globalDuration;
      case 'target':
        return cooldownSettings.targetDuration;
      default:
        return 0;
    }
  };

  const selectedType = COOLDOWN_TYPES[cooldownSettings.cooldownType] || COOLDOWN_TYPES.none;
  const TypeIcon = selectedType.icon;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="font-medium text-white text-sm">Tag Cooldowns</div>
            <div className="text-xs text-gray-400">
              {selectedType.name} • {formatDuration(getCurrentDuration())}
            </div>
          </div>
        </div>
        {isHost && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${selectedType.bgColor}`}>
            <TypeIcon className={`w-5 h-5 ${selectedType.color}`} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">Tag Cooldown System</div>
            <div className="text-sm text-gray-400">
              {selectedType.name} • {formatDuration(getCurrentDuration())} protection
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${selectedType.bgColor} ${selectedType.color}`}>
            {cooldownSettings.cooldownType === 'none' ? 'OFF' : 'ON'}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-gray-800 space-y-6">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Cooldowns prevent frustrating instant "tag-backs" and add strategy to the game. 
              Choose a protection type that fits your play style.
            </p>
          </div>

          {/* Cooldown Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Protection Type</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(COOLDOWN_TYPES).map((type) => {
                const Icon = type.icon;
                const isSelected = cooldownSettings.cooldownType === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => isHost && updateSetting('cooldownType', type.id)}
                    disabled={!isHost}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? `${type.bgColor} ${type.borderColor}`
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? type.color : 'text-gray-400'}`} />
                      <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {type.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Selection (only if not 'none') */}
          {cooldownSettings.cooldownType !== 'none' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Cooldown Duration</label>
              
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                {COOLDOWN_PRESETS.filter(p => p.value > 0).map((preset) => {
                  const currentDuration = getCurrentDuration();
                  const isSelected = currentDuration === preset.value;
                  
                  return (
                    <button
                      key={preset.value}
                      onClick={() => {
                        if (!isHost) return;
                        const key = cooldownSettings.cooldownType === 'revenge' 
                          ? 'revengeDuration' 
                          : cooldownSettings.cooldownType === 'global'
                          ? 'globalDuration'
                          : 'targetDuration';
                        updateSetting(key, preset.value);
                      }}
                      disabled={!isHost}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom duration input */}
              {isHost && (
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <label className="text-sm text-gray-400">Custom:</label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={customDuration}
                    onChange={(e) => handleCustomDuration(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-400">seconds</span>
                </div>
              )}
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Options</label>
            
            {/* Show cooldown indicator */}
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-white text-sm">Show Cooldown Timer</div>
                  <div className="text-xs text-gray-400">Display countdown on players you can't tag</div>
                </div>
              </div>
              <button
                onClick={() => isHost && updateSetting('showCooldownIndicator', !cooldownSettings.showCooldownIndicator)}
                disabled={!isHost}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  cooldownSettings.showCooldownIndicator ? 'bg-indigo-500' : 'bg-gray-600'
                } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  cooldownSettings.showCooldownIndicator ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Play cooldown sound */}
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-white text-sm">Cooldown Sound</div>
                  <div className="text-xs text-gray-400">Play sound when tag is blocked by cooldown</div>
                </div>
              </div>
              <button
                onClick={() => isHost && updateSetting('playCooldownSound', !cooldownSettings.playCooldownSound)}
                disabled={!isHost}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  cooldownSettings.playCooldownSound ? 'bg-indigo-500' : 'bg-gray-600'
                } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  cooldownSettings.playCooldownSound ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
            <div className="text-sm font-medium text-gray-300 mb-2">How it works:</div>
            <div className="text-sm text-gray-400">
              {cooldownSettings.cooldownType === 'none' && (
                <span>🔥 <strong className="text-white">Chaos Mode!</strong> Anyone can tag anyone at any time. No protection!</span>
              )}
              {cooldownSettings.cooldownType === 'revenge' && (
                <span>🛡️ After being tagged, you have <strong className="text-white">{formatDuration(cooldownSettings.revengeDuration)}</strong> where your tagger cannot tag you back.</span>
              )}
              {cooldownSettings.cooldownType === 'global' && (
                <span>⏰ After being tagged, you cannot tag <strong className="text-white">anyone</strong> for <strong className="text-white">{formatDuration(cooldownSettings.globalDuration)}</strong>.</span>
              )}
              {cooldownSettings.cooldownType === 'target' && (
                <span>🎯 Once tagged, you cannot be tagged by <strong className="text-white">the same person</strong> for <strong className="text-white">{formatDuration(cooldownSettings.targetDuration)}</strong>.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using cooldown logic in game
export function useCooldowns(game, userId) {
  const [cooldowns, setCooldowns] = useState(new Map());
  
  useEffect(() => {
    // Clean up expired cooldowns every second
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const now = Date.now();
        const updated = new Map();
        prev.forEach((expiry, key) => {
          if (expiry > now) {
            updated.set(key, expiry);
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const addCooldown = (targetId, duration) => {
    setCooldowns(prev => {
      const updated = new Map(prev);
      updated.set(targetId, Date.now() + duration);
      return updated;
    });
  };
  
  const canTag = (targetId) => {
    if (!game?.settings) return { allowed: true };
    
    const settings = game.settings;
    const cooldownType = settings.cooldownType || 'none';
    
    if (cooldownType === 'none') {
      return { allowed: true };
    }
    
    // Check revenge protection
    if (cooldownType === 'revenge') {
      const lastTag = game.tags?.slice(-1)[0];
      if (lastTag && lastTag.taggerId === targetId && lastTag.taggedId === userId) {
        const timeSinceTag = Date.now() - lastTag.timestamp;
        const revengeDuration = settings.revengeDuration || 60000;
        if (timeSinceTag < revengeDuration) {
          return {
            allowed: false,
            reason: 'Revenge protection active',
            remainingTime: revengeDuration - timeSinceTag,
          };
        }
      }
    }
    
    // Check global cooldown
    if (cooldownType === 'global') {
      const lastTagOnMe = game.tags?.filter(t => t.taggedId === userId).slice(-1)[0];
      if (lastTagOnMe) {
        const timeSinceTag = Date.now() - lastTagOnMe.timestamp;
        const globalDuration = settings.globalDuration || 30000;
        if (timeSinceTag < globalDuration) {
          return {
            allowed: false,
            reason: 'Global cooldown active',
            remainingTime: globalDuration - timeSinceTag,
          };
        }
      }
    }
    
    // Check target cooldown
    if (cooldownType === 'target') {
      const expiry = cooldowns.get(targetId);
      if (expiry && expiry > Date.now()) {
        return {
          allowed: false,
          reason: 'Target protection active',
          remainingTime: expiry - Date.now(),
        };
      }
    }
    
    return { allowed: true };
  };
  
  const getCooldownRemaining = (targetId) => {
    const expiry = cooldowns.get(targetId);
    if (!expiry) return 0;
    return Math.max(0, expiry - Date.now());
  };
  
  return {
    cooldowns,
    addCooldown,
    canTag,
    getCooldownRemaining,
  };
}

// Cooldown indicator component for player markers
export function CooldownIndicator({ remainingMs, size = 'normal' }) {
  const [remaining, setRemaining] = useState(remainingMs);
  
  useEffect(() => {
    setRemaining(remainingMs);
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [remainingMs]);
  
  if (remaining <= 0) return null;
  
  const seconds = Math.ceil(remaining / 1000);
  const sizeClasses = size === 'small' 
    ? 'w-6 h-6 text-xs' 
    : 'w-8 h-8 text-sm';
  
  return (
    <div className={`${sizeClasses} flex items-center justify-center bg-red-500/80 text-white rounded-full font-bold animate-pulse`}>
      {seconds}
    </div>
  );
}

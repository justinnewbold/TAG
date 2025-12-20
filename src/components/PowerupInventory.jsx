import React, { useState } from 'react';
import { X, Zap, Shield, Ghost, Target, Radar, Snowflake, Move, Hand } from 'lucide-react';
import { POWERUPS, powerupManager, formatPowerupDuration } from '../services/powerups';
import { useSounds } from '../store';

const POWERUP_ICONS = {
  speedBoost: Zap,
  invisibility: Ghost,
  decoy: Target,
  shield: Shield,
  radar: Radar,
  freeze: Snowflake,
  teleport: Move,
  tagExtend: Hand,
};

function PowerupInventory({ onUsePowerup, onClose }) {
  const { playSound, vibrate } = useSounds();
  const [selectedPowerup, setSelectedPowerup] = useState(null);
  const inventorySummary = powerupManager.getInventorySummary();
  const activeEffects = powerupManager.activeEffects;

  const handleUsePowerup = (powerupId) => {
    const result = powerupManager.usePowerup(powerupId);
    
    if (result.success) {
      playSound('powerup');
      vibrate([50, 30, 100]);
      if (onUsePowerup) {
        onUsePowerup(powerupId, result);
      }
      setSelectedPowerup(null);
    } else {
      playSound('error');
      vibrate([100, 50, 100]);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'from-amber-400 to-orange-500';
      case 'rare': return 'from-purple-400 to-pink-500';
      case 'uncommon': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityBorder = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'border-amber-400/50';
      case 'rare': return 'border-purple-400/50';
      case 'uncommon': return 'border-blue-400/50';
      default: return 'border-white/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-dark-800 rounded-t-2xl border border-white/10 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl">
              <Zap className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Power-ups</h2>
              <p className="text-xs text-white/50">
                {Object.keys(inventorySummary).length} types available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Active Effects */}
        {activeEffects.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Active Effects
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeEffects.map((effect) => {
                const remaining = Math.max(0, effect.expiresAt - Date.now());
                return (
                  <div
                    key={effect.instanceId}
                    className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg flex-shrink-0"
                  >
                    <span className="text-lg">{effect.icon}</span>
                    <div>
                      <p className="text-xs font-medium">{effect.name}</p>
                      <p className="text-xs text-neon-cyan">
                        {Math.ceil(remaining / 1000)}s
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {Object.keys(inventorySummary).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-white/50">No power-ups yet</p>
              <p className="text-xs text-white/30 mt-1">
                Collect them during the game!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(inventorySummary).map(([id, { count, powerup }]) => {
                const Icon = POWERUP_ICONS[id] || Zap;
                const cooldown = powerupManager.getCooldownRemaining(id);
                const isOnCooldown = cooldown > 0;

                return (
                  <button
                    key={id}
                    onClick={() => setSelectedPowerup(id)}
                    disabled={isOnCooldown}
                    className={`relative p-4 rounded-xl border ${getRarityBorder(powerup.rarity)} 
                      bg-gradient-to-br ${isOnCooldown ? 'from-gray-800 to-gray-900 opacity-50' : 'from-white/5 to-transparent hover:from-white/10'}
                      transition-all text-left`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-br ${getRarityColor(powerup.rarity)}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {count > 1 && (
                        <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                          x{count}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium mt-2 text-sm">{powerup.name}</h4>
                    <p className="text-xs text-white/40 mt-1">
                      {isOnCooldown
                        ? `${Math.ceil(cooldown / 1000)}s cooldown`
                        : formatPowerupDuration(powerup.duration)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Power-up Modal */}
        {selectedPowerup && inventorySummary[selectedPowerup] && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
            <div className="bg-dark-800 rounded-2xl border border-white/10 p-6 max-w-sm w-full animate-scale-in">
              {(() => {
                const { powerup } = inventorySummary[selectedPowerup];
                const Icon = POWERUP_ICONS[selectedPowerup] || Zap;
                const cooldown = powerupManager.getCooldownRemaining(selectedPowerup);

                return (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-br ${getRarityColor(powerup.rarity)}`}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xl">{powerup.name}</h3>
                        <p className="text-xs text-white/40 capitalize">{powerup.rarity}</p>
                      </div>
                    </div>

                    <p className="text-white/70 mb-4">{powerup.description}</p>

                    <div className="flex gap-2 text-xs text-white/40 mb-6">
                      <span className="px-2 py-1 bg-white/10 rounded">
                        Duration: {formatPowerupDuration(powerup.duration)}
                      </span>
                      <span className="px-2 py-1 bg-white/10 rounded">
                        Cooldown: {formatPowerupDuration(powerup.cooldown)}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedPowerup(null)}
                        className="flex-1 btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUsePowerup(selectedPowerup)}
                        disabled={cooldown > 0}
                        className={`flex-1 btn-primary ${
                          cooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {cooldown > 0 ? `Wait ${Math.ceil(cooldown / 1000)}s` : 'Use Now'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PowerupInventory;

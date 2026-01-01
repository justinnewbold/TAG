import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { socketService } from '../services/socket';

const POWER_UPS = {
  speed: { emoji: '⚡', name: 'Speed Boost', duration: 10, color: 'from-yellow-400 to-orange-500', description: '2x speed for 10s' },
  ghost: { emoji: '👻', name: 'Ghost Mode', duration: 8, color: 'from-purple-400 to-indigo-500', description: 'Invisible for 8s' },
  shield: { emoji: '🛡️', name: 'Shield', duration: 5, color: 'from-blue-400 to-cyan-500', description: 'Can\'t be tagged for 5s' },
  radar: { emoji: '📡', name: 'Radar', duration: 15, color: 'from-green-400 to-emerald-500', description: 'See all players for 15s' },
  freeze: { emoji: '❄️', name: 'Freeze Bomb', duration: 3, color: 'from-cyan-400 to-blue-500', description: 'Freeze nearby players 3s' },
  swap: { emoji: '🔄', name: 'Position Swap', duration: 0, color: 'from-pink-400 to-rose-500', description: 'Swap with random player' },
  magnet: { emoji: '🧲', name: 'Magnet', duration: 8, color: 'from-red-400 to-orange-500', description: 'Pull nearby players closer' },
};

export default function PowerUpButton({ gameId, inventory = [], onUse }) {
  const { user } = useStore();
  const [selectedPowerUp, setSelectedPowerUp] = useState(null);
  const [cooldown, setCooldown] = useState({});
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    const handlePowerUpActivated = (data) => {
      if (data.userId === user?.id) {
        setActivePowerUp({ type: data.type, endsAt: Date.now() + (data.duration * 1000) });
      }
    };

    const handlePowerUpCollected = (data) => {
      if (data.userId === user?.id) {
        // Toast notification handled by parent
      }
    };

    socketService.on('powerup:activated', handlePowerUpActivated);
    socketService.on('powerup:collected', handlePowerUpCollected);

    return () => {
      socketService.off('powerup:activated', handlePowerUpActivated);
      socketService.off('powerup:collected', handlePowerUpCollected);
    };
  }, [user?.id]);

  // Update active power-up timer
  useEffect(() => {
    if (!activePowerUp) return;
    
    const interval = setInterval(() => {
      if (Date.now() >= activePowerUp.endsAt) {
        setActivePowerUp(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activePowerUp]);

  const usePowerUp = (type) => {
    if (cooldown[type] || !inventory.includes(type)) return;

    socketService.emit('powerup:use', { gameId, type });
    
    // Set cooldown
    setCooldown(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCooldown(prev => ({ ...prev, [type]: false }));
    }, 30000); // 30 second cooldown

    onUse?.(type);
    setShowInventory(false);
  };

  const uniqueInventory = [...new Set(inventory)];
  const inventoryCount = inventory.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  if (inventory.length === 0) return null;

  return (
    <div className="relative">
      {/* Active Power-Up Indicator */}
      {activePowerUp && (
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r ${POWER_UPS[activePowerUp.type]?.color} px-4 py-2 rounded-full shadow-lg animate-pulse`}>
          <span className="text-white font-bold text-sm flex items-center gap-2">
            {POWER_UPS[activePowerUp.type]?.emoji} Active!
          </span>
        </div>
      )}

      {/* Power-Up Button */}
      <button
        onClick={() => setShowInventory(!showInventory)}
        className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <span className="text-2xl">🎁</span>
        {inventory.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {inventory.length}
          </span>
        )}
      </button>

      {/* Inventory Popup */}
      {showInventory && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 min-w-[200px]">
          <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-center">Power-Ups</h4>
          <div className="space-y-2">
            {uniqueInventory.map(type => {
              const powerUp = POWER_UPS[type];
              if (!powerUp) return null;
              const count = inventoryCount[type];
              const isOnCooldown = cooldown[type];

              return (
                <button
                  key={type}
                  onClick={() => usePowerUp(type)}
                  disabled={isOnCooldown}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    isOnCooldown 
                      ? 'bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                      : `bg-gradient-to-r ${powerUp.color} text-white hover:scale-105 active:scale-95`
                  }`}
                >
                  <span className="text-2xl">{powerUp.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{powerUp.name}</p>
                    <p className="text-xs opacity-80">{powerUp.description}</p>
                  </div>
                  <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                    x{count}
                  </span>
                </button>
              );
            })}
          </div>
          {inventory.length === 0 && (
            <p className="text-center text-slate-400 text-sm">No power-ups collected</p>
          )}
        </div>
      )}
    </div>
  );
}

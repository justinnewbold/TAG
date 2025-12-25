import React, { useState, useRef } from 'react';
import { Gift, Star, Zap, Shield, Ghost, Clock, X } from 'lucide-react';
import { useStore } from '../store';
import { POWERUP_TYPES } from '../../shared/constants';

// Wheel segments
const WHEEL_SEGMENTS = [
  { id: 'xp_50', label: '50 XP', color: '#22d3ee', icon: '⭐', reward: { type: 'xp', amount: 50 } },
  { id: 'speed', label: 'Speed Boost', color: '#fbbf24', icon: '⚡', reward: { type: 'powerup', powerup: 'speed_boost' } },
  { id: 'xp_100', label: '100 XP', color: '#a855f7', icon: '🌟', reward: { type: 'xp', amount: 100 } },
  { id: 'shield', label: 'Shield', color: '#3b82f6', icon: '🛡️', reward: { type: 'powerup', powerup: 'shield' } },
  { id: 'xp_25', label: '25 XP', color: '#22c55e', icon: '✨', reward: { type: 'xp', amount: 25 } },
  { id: 'invisible', label: 'Invisibility', color: '#8b5cf6', icon: '👻', reward: { type: 'powerup', powerup: 'invisibility' } },
  { id: 'xp_200', label: '200 XP', color: '#ef4444', icon: '💎', reward: { type: 'xp', amount: 200 } },
  { id: 'radar', label: 'Radar', color: '#10b981', icon: '📡', reward: { type: 'powerup', powerup: 'radar' } },
];

export default function LuckyWheel({ isOpen, onClose }) {
  const { addPowerup, updateStats, stats } = useStore();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [canSpin, setCanSpin] = useState(true);
  const wheelRef = useRef(null);

  // Check if spin is available (once per day)
  const checkSpinAvailable = () => {
    const lastSpin = localStorage.getItem('lastWheelSpin');
    if (!lastSpin) return true;
    
    const lastSpinDate = new Date(lastSpin).toDateString();
    const today = new Date().toDateString();
    return lastSpinDate !== today;
  };

  // Spin the wheel
  const spinWheel = () => {
    if (isSpinning || !checkSpinAvailable()) return;

    setIsSpinning(true);
    setResult(null);

    // Random segment
    const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const segment = WHEEL_SEGMENTS[segmentIndex];

    // Calculate rotation (multiple full spins + landing position)
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const targetAngle = segmentIndex * segmentAngle + segmentAngle / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const newRotation = rotation + (fullSpins * 360) + (360 - targetAngle);

    setRotation(newRotation);

    // Record spin time
    localStorage.setItem('lastWheelSpin', new Date().toISOString());

    // Reveal result after spin
    setTimeout(() => {
      setIsSpinning(false);
      setResult(segment);
      setCanSpin(false);

      // Apply reward
      if (segment.reward.type === 'xp') {
        // Add XP to stats
        updateStats({ totalXP: (stats.totalXP || 0) + segment.reward.amount });
      } else if (segment.reward.type === 'powerup') {
        // Add powerup to inventory
        addPowerup({
          id: Date.now().toString(),
          type: segment.reward.powerup,
          ...POWERUP_TYPES[segment.reward.powerup.toUpperCase()],
        });
      }

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }, 4000);
  };

  if (!isOpen) return null;

  const segmentAngle = 360 / WHEEL_SEGMENTS.length;
  const spinAvailable = checkSpinAvailable() && canSpin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
          <button onClick={onClose} className="absolute right-4 top-4 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Daily Spin</h2>
              <p className="text-sm text-white/60">Win free rewards!</p>
            </div>
          </div>
        </div>

        {/* Wheel Container */}
        <div className="relative p-6 flex flex-col items-center">
          {/* Pointer */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div className="relative w-64 h-64">
            <svg
              ref={wheelRef}
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-2xl transition-transform duration-[4000ms] ease-out"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {WHEEL_SEGMENTS.map((segment, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = (i + 1) * segmentAngle;
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                
                const x1 = 100 + 95 * Math.cos(startRad);
                const y1 = 100 + 95 * Math.sin(startRad);
                const x2 = 100 + 95 * Math.cos(endRad);
                const y2 = 100 + 95 * Math.sin(endRad);

                const largeArc = segmentAngle > 180 ? 1 : 0;

                // Text position
                const midAngle = (startAngle + endAngle) / 2 - 90;
                const midRad = midAngle * Math.PI / 180;
                const textX = 100 + 60 * Math.cos(midRad);
                const textY = 100 + 60 * Math.sin(midRad);

                return (
                  <g key={segment.id}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="24"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {segment.icon}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="100" cy="100" r="20" fill="#1a1a2e" stroke="white" strokeWidth="3" />
              <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold">
                SPIN
              </text>
            </svg>
          </div>

          {/* Result */}
          {result && !isSpinning && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-center animate-bounce-in">
              <div className="text-4xl mb-2">{result.icon}</div>
              <div className="text-lg font-bold text-white">You won!</div>
              <div className="text-amber-400 font-semibold">{result.label}</div>
            </div>
          )}

          {/* Spin Button */}
          <button
            onClick={spinWheel}
            disabled={isSpinning || !spinAvailable}
            className={`
              mt-4 px-8 py-3 rounded-xl font-bold text-lg transition-all
              ${isSpinning
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : spinAvailable
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-dark-900 hover:scale-105 active:scale-95'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }
            `}
          >
            {isSpinning ? 'Spinning...' : spinAvailable ? '🎰 SPIN!' : '⏰ Come back tomorrow!'}
          </button>

          {/* Next spin timer */}
          {!spinAvailable && !result && (
            <div className="mt-2 text-sm text-white/40 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Next spin available tomorrow
            </div>
          )}
        </div>

        {/* Rewards legend */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40 mb-2">Possible Rewards</p>
          <div className="grid grid-cols-4 gap-2">
            {WHEEL_SEGMENTS.slice(0, 4).map(segment => (
              <div key={segment.id} className="text-center">
                <div className="text-xl">{segment.icon}</div>
                <div className="text-xs text-white/60">{segment.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

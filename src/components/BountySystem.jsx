import React, { useState, useEffect } from 'react';
import { Target, Coins, Clock, TrendingUp, AlertTriangle, Check, X, Crown } from 'lucide-react';
import { useStore } from '../store';
import { sendNotification, showLocalNotification } from './NotificationSender';

/**
 * Bounty System - Place bounties on other players
 * Earn bonus XP for tagging players with bounties
 */

// Bounty tiers
const BOUNTY_TIERS = [
  { amount: 50, label: 'Small', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  { amount: 100, label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { amount: 250, label: 'Large', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { amount: 500, label: 'Mega', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
];

export default function BountySystem({ gameId, players, currentUserId, onBountyPlaced }) {
  const { user, updateUserStats } = useStore();
  const [activeBounties, setActiveBounties] = useState([]);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(BOUNTY_TIERS[0].amount);
  const [placingBounty, setPlacingBounty] = useState(false);
  const [recentClaims, setRecentClaims] = useState([]);

  // Fetch active bounties
  useEffect(() => {
    fetchBounties();
    const interval = setInterval(fetchBounties, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchBounties = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/bounties`);
      const data = await res.json();
      setActiveBounties(data.bounties || []);
    } catch (err) {
      console.error('Failed to fetch bounties:', err);
    }
  };

  const placeBounty = async () => {
    if (!selectedTarget || placingBounty) return;
    
    // Check if user has enough XP
    if ((user?.xp || 0) < selectedAmount) {
      showLocalNotification('❌ Not Enough XP', `You need ${selectedAmount} XP to place this bounty`);
      return;
    }

    setPlacingBounty(true);

    try {
      const res = await fetch(`/api/games/${gameId}/bounties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTarget.id,
          amount: selectedAmount,
          placedBy: currentUserId,
        }),
      });

      if (res.ok) {
        const newBounty = await res.json();
        
        // Deduct XP from user
        await updateUserStats({ xp: (user?.xp || 0) - selectedAmount });

        // Notify target
        await sendNotification(selectedTarget.id, 'BOUNTY_PLACED', {
          from: user?.username,
          amount: selectedAmount,
        });

        showLocalNotification('💰 Bounty Placed!', `${selectedAmount} XP bounty on ${selectedTarget.username}`);
        
        setShowPlaceModal(false);
        setSelectedTarget(null);
        onBountyPlaced?.(newBounty);
        fetchBounties();
      }
    } catch (err) {
      console.error('Failed to place bounty:', err);
    } finally {
      setPlacingBounty(false);
    }
  };

  // Get total bounty on a player
  const getPlayerBounty = (playerId) => {
    return activeBounties
      .filter(b => b.targetId === playerId && !b.claimed)
      .reduce((sum, b) => sum + b.amount, 0);
  };

  // Get bounty tier info
  const getBountyTier = (amount) => {
    if (amount >= 500) return { icon: '👑', color: 'text-yellow-400', glow: 'shadow-yellow-500/50' };
    if (amount >= 250) return { icon: '💎', color: 'text-purple-400', glow: 'shadow-purple-500/50' };
    if (amount >= 100) return { icon: '🎯', color: 'text-blue-400', glow: 'shadow-blue-500/50' };
    return { icon: '💰', color: 'text-gray-400', glow: '' };
  };

  // Players with bounties (sorted by amount)
  const bountiedPlayers = players
    .map(p => ({ ...p, bounty: getPlayerBounty(p.id) }))
    .filter(p => p.bounty > 0)
    .sort((a, b) => b.bounty - a.bounty);

  // Available targets (players without current user's bounties)
  const availableTargets = players.filter(p => 
    p.id !== currentUserId && 
    !activeBounties.some(b => b.targetId === p.id && b.placedBy === currentUserId && !b.claimed)
  );

  return (
    <>
      {/* Bounty HUD - Shows in ActiveGame */}
      <div className="space-y-3">
        {/* Active Bounties Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-400" />
            Active Bounties
          </h3>
          <button
            onClick={() => setShowPlaceModal(true)}
            className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Coins className="w-4 h-4" />
            Place Bounty
          </button>
        </div>

        {/* Bounty List */}
        {bountiedPlayers.length === 0 ? (
          <div className="text-center py-6 bg-dark-800/50 rounded-xl border border-dark-700">
            <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No active bounties</p>
            <p className="text-gray-600 text-xs">Place a bounty to start the hunt!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bountiedPlayers.map((player, index) => {
              const tier = getBountyTier(player.bounty);
              return (
                <div
                  key={player.id}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border
                    bg-gradient-to-r from-dark-800 to-dark-800/50
                    ${index === 0 ? 'border-yellow-500/50' : 'border-dark-700'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-lg
                        ${player.isIt ? 'bg-red-500' : 'bg-green-500'}
                      `}>
                        {player.avatar || '👤'}
                      </div>
                      {index === 0 && (
                        <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{player.username}</p>
                      <p className="text-gray-500 text-xs">
                        {activeBounties.filter(b => b.targetId === player.id && !b.claimed).length} bounties
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${tier.color} bg-dark-700`}>
                    <span className="text-lg">{tier.icon}</span>
                    <span className="font-bold">{player.bounty} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Claims */}
        {recentClaims.length > 0 && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <h4 className="text-green-400 font-medium text-sm mb-2">Recent Claims</h4>
            {recentClaims.map((claim, i) => (
              <div key={i} className="text-sm text-gray-300">
                <span className="text-green-400">{claim.hunter}</span>
                {' claimed '}
                <span className="text-yellow-400">{claim.amount} XP</span>
                {' for tagging '}
                <span className="text-white">{claim.target}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Place Bounty Modal */}
      {showPlaceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-yellow-400" />
                Place Bounty
              </h3>
              <button
                onClick={() => setShowPlaceModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Your XP */}
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
                <span className="text-gray-400">Your XP</span>
                <span className="text-white font-bold flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  {user?.xp || 0}
                </span>
              </div>

              {/* Select Target */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Select Target</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTargets.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No available targets
                    </p>
                  ) : (
                    availableTargets.map(player => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedTarget(player)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl border transition-colors
                          ${selectedTarget?.id === player.id
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-lg
                          ${player.isIt ? 'bg-red-500' : 'bg-green-500'}
                        `}>
                          {player.avatar || '👤'}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{player.username}</p>
                          <p className="text-gray-500 text-xs">
                            {player.isIt ? 'Currently IT' : `${player.tags || 0} tags`}
                          </p>
                        </div>
                        {selectedTarget?.id === player.id && (
                          <Check className="w-5 h-5 text-primary-400" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Select Amount */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Bounty Amount</label>
                <div className="grid grid-cols-2 gap-2">
                  {BOUNTY_TIERS.map(tier => (
                    <button
                      key={tier.amount}
                      onClick={() => setSelectedAmount(tier.amount)}
                      disabled={(user?.xp || 0) < tier.amount}
                      className={`
                        p-3 rounded-xl border transition-colors flex flex-col items-center
                        ${selectedAmount === tier.amount
                          ? 'border-primary-500 bg-primary-500/20'
                          : `${tier.bg} border-dark-600 hover:border-dark-500`
                        }
                        ${(user?.xp || 0) < tier.amount ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <span className={`text-lg font-bold ${tier.color}`}>{tier.amount} XP</span>
                      <span className="text-gray-500 text-xs">{tier.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200/80 text-sm">
                  Bounty XP will be deducted from your account. Anyone who tags this player earns the bounty!
                </p>
              </div>

              {/* Place Button */}
              <button
                onClick={placeBounty}
                disabled={!selectedTarget || placingBounty || (user?.xp || 0) < selectedAmount}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-dark-900 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {placingBounty ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark-900" />
                    Placing...
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    Place {selectedAmount} XP Bounty
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Bounty Badge - Shows on player markers
 */
export function BountyBadge({ amount }) {
  if (!amount || amount <= 0) return null;
  
  const tier = amount >= 500 ? '👑' : amount >= 250 ? '💎' : amount >= 100 ? '🎯' : '💰';
  
  return (
    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-500 rounded-full text-dark-900 text-xs font-bold flex items-center gap-0.5 shadow-lg">
      <span>{tier}</span>
      <span>{amount}</span>
    </div>
  );
}

/**
 * Check if a tag should claim bounties
 */
export async function claimBounties(gameId, taggerId, taggedId, taggerName, taggedName) {
  try {
    const res = await fetch(`/api/games/${gameId}/bounties/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taggerId, taggedId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.claimedAmount > 0) {
        // Notify tagger
        showLocalNotification(
          '💰 Bounty Claimed!',
          `You earned ${data.claimedAmount} XP for tagging ${taggedName}!`
        );
        
        return data.claimedAmount;
      }
    }
  } catch (err) {
    console.error('Failed to claim bounties:', err);
  }
  return 0;
}

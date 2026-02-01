import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, DollarSign, Clock, Trophy, ChevronRight, Plus, X, Search, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { bountyService } from '../services/bountyService';
import { BOUNTY_CONFIG } from '../../shared/constants.js';

function BountyBoard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [bounties, setBounties] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board'); // board, place, leaderboard
  const [targetSearch, setTargetSearch] = useState('');
  const [newBounty, setNewBounty] = useState({ targetId: '', amount: 100, reason: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBounties();
  }, []);

  const loadBounties = async () => {
    try {
      setLoading(true);
      const [bountyData, leaderData] = await Promise.all([
        bountyService.getActiveBounties(),
        bountyService.getLeaderboard(),
      ]);
      setBounties(bountyData.bounties || []);
      setLeaders(leaderData.leaders || []);
    } catch (err) {
      setError('Failed to load bounties');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBounty = async () => {
    if (!newBounty.targetId || !newBounty.amount) return;
    try {
      setPlacing(true);
      setError('');
      await bountyService.placeBounty(newBounty.targetId, newBounty.amount, newBounty.reason);
      setNewBounty({ targetId: '', amount: 100, reason: '' });
      setTab('board');
      loadBounties();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const handleCancelBounty = async (bountyId) => {
    try {
      await bountyService.cancelBounty(bountyId);
      loadBounties();
    } catch (err) {
      setError(err.message);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Bounty <span className="text-amber-400">Board</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Hunt targets, earn rewards</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold text-sm">{bounties.length} Active</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'board', label: 'Bounties', icon: Target },
            { id: 'place', label: 'Place Bounty', icon: Plus },
            { id: 'leaderboard', label: 'Hunters', icon: Trophy },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Active Bounties */}
        {tab === 'board' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-sm">Loading bounties...</p>
              </div>
            ) : bounties.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No active bounties</p>
                <button
                  onClick={() => setTab('place')}
                  className="mt-3 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium"
                >
                  Place the first bounty
                </button>
              </div>
            ) : (
              bounties.map(bounty => (
                <div
                  key={bounty.id}
                  className="bg-dark-800 border border-white/10 rounded-2xl p-4 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                        {bounty.target_avatar || '🎯'}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{bounty.target_name}</h3>
                        <p className="text-white/40 text-xs">
                          Placed by {bounty.placer_name}
                        </p>
                        {bounty.reason && (
                          <p className="text-white/50 text-xs mt-1 italic">"{bounty.reason}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400 font-bold text-lg">
                        <DollarSign className="w-5 h-5" />
                        {bounty.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(bounty.expires_at)}
                      </div>
                    </div>
                  </div>
                  {bounty.placer_id === user?.id && (
                    <button
                      onClick={() => handleCancelBounty(bounty.id)}
                      className="mt-3 w-full py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      Cancel Bounty
                    </button>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* Place Bounty */}
        {tab === 'place' && (
          <div className="space-y-4">
            <div className="bg-dark-800 border border-white/10 rounded-2xl p-4 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                New Bounty
              </h3>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">Target Player ID</label>
                <input
                  type="text"
                  value={newBounty.targetId}
                  onChange={(e) => setNewBounty({ ...newBounty, targetId: e.target.value })}
                  placeholder="Enter player ID"
                  className="w-full bg-dark-700 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">
                  Bounty Amount ({BOUNTY_CONFIG.MIN_AMOUNT} - {BOUNTY_CONFIG.MAX_AMOUNT.toLocaleString()})
                </label>
                <div className="flex gap-2">
                  {[100, 250, 500, 1000, 5000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setNewBounty({ ...newBounty, amount })}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                        newBounty.amount === amount
                          ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      {amount >= 1000 ? `${amount / 1000}k` : amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">Reason (optional)</label>
                <input
                  type="text"
                  value={newBounty.reason}
                  onChange={(e) => setNewBounty({ ...newBounty, reason: e.target.value })}
                  placeholder="Why is there a price on their head?"
                  maxLength={100}
                  className="w-full bg-dark-700 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                onClick={handlePlaceBounty}
                disabled={!newBounty.targetId || !newBounty.amount || placing}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-dark-900 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                {placing ? 'Placing...' : `Place ${newBounty.amount.toLocaleString()} Coin Bounty`}
              </button>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-amber-400/80 text-xs">
                  Bounties expire after {BOUNTY_CONFIG.EXPIRY_HOURS} hours. A {BOUNTY_CONFIG.PLATFORM_CUT * 100}% fee
                  applies. Max {BOUNTY_CONFIG.MAX_ACTIVE_BOUNTIES} active bounties at once.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {leaders.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No bounty hunters yet</p>
              </div>
            ) : (
              leaders.map((leader, index) => (
                <div
                  key={leader.user_id}
                  className="bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500/30 text-amber-400' :
                    index === 1 ? 'bg-gray-400/30 text-gray-300' :
                    index === 2 ? 'bg-orange-600/30 text-orange-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-lg">
                    {leader.avatar || '😀'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{leader.name}</p>
                    <p className="text-white/40 text-xs">{leader.bounties_claimed} bounties claimed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-sm flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {parseInt(leader.total_earned).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BountyBoard;

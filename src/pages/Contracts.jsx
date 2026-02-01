import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, Star, Zap, Target, Trophy, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { contractService } from '../services/contractService';
import { CONTRACT_CONFIG } from '../../shared/constants.js';

function Contracts() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [contracts, setContracts] = useState([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await contractService.getContracts();
      setContracts(data.contracts || []);
      setTotalCompleted(data.totalCompleted || 0);
    } catch (err) {
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilRefresh = () => {
    const now = Date.now();
    const nextDay = (Math.floor(now / 86400000) + 1) * 86400000;
    const remaining = nextDay - now;
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'EASY': return '🟢';
      case 'MEDIUM': return '🟡';
      case 'HARD': return '🟠';
      case 'LEGENDARY': return '🟣';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'tag_count': return Target;
      case 'survive_time': return Clock;
      case 'win_streak': return Zap;
      case 'speed_tag': return Zap;
      case 'tag_bounty': return Star;
      case 'zone_control': return Trophy;
      case 'heist_complete': return Star;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              <span className="text-cyan-400">Contracts</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Daily missions for rewards</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-bold text-sm">{totalCompleted} Done</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {/* Refresh Timer */}
        <div className="bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-white/40" />
            <span className="text-white/50 text-sm">New contracts in</span>
          </div>
          <span className="text-cyan-400 font-mono text-sm font-bold">{getTimeUntilRefresh()}</span>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Loading contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">No contracts available</p>
          </div>
        ) : (
          contracts.map((contract, index) => {
            const TypeIcon = getTypeIcon(contract.type);
            const isComplete = contract.completed;
            const diffConfig = CONTRACT_CONFIG.DIFFICULTIES[contract.difficulty];
            const color = diffConfig?.color || 'white';

            return (
              <div
                key={contract.id}
                className={`bg-dark-800 border rounded-2xl p-4 transition-all ${
                  isComplete
                    ? 'border-green-500/30 bg-green-500/5'
                    : `border-white/10 hover:border-${color}/30`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isComplete ? 'bg-green-500/20' : `bg-${color}/20`
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <TypeIcon className={`w-6 h-6 text-${color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm ${isComplete ? 'text-green-400' : 'text-white'}`}>
                        {contract.title}
                      </h3>
                      <span className="text-xs">{getDifficultyIcon(contract.difficulty)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md bg-${color}/20 text-${color}`}>
                        {contract.difficultyName}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{contract.desc}</p>

                    {/* Rewards */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-amber-400 text-xs flex items-center gap-1">
                        <Star className="w-3 h-3" /> {contract.coinReward} coins
                      </span>
                      <span className="text-cyan-400 text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {contract.xpReward} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!isComplete && contract.params?.count && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                      <span>Progress</span>
                      <span>{contract.progress}/{contract.params.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${color} rounded-full transition-all`}
                        style={{ width: `${Math.min((contract.progress / contract.params.count) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {isComplete && (
                  <div className="mt-3 text-center">
                    <span className="text-green-400 text-xs font-medium">Completed!</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Info Card */}
        <div className="bg-dark-800 border border-white/10 rounded-2xl p-4 mt-6">
          <h3 className="text-white font-semibold text-sm mb-2">How Contracts Work</h3>
          <ul className="space-y-1.5 text-white/40 text-xs">
            <li>- {CONTRACT_CONFIG.MAX_ACTIVE_CONTRACTS} new contracts appear daily</li>
            <li>- Complete them for coins and XP rewards</li>
            <li>- Difficulty determines reward size</li>
            <li>- Contracts reset at midnight UTC</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Contracts;

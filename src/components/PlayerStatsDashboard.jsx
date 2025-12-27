// PlayerStatsDashboard - Comprehensive player statistics and analytics view
import React, { useState } from 'react';
import { useStats } from '../hooks/useStats';

const StatCard = ({ icon, label, value, subValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    cyan: 'from-cyan-500 to-cyan-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center text-white text-lg`}>
          {icon}
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );
};

const FormIndicator = ({ form }) => {
  const getColor = (result) => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'L': return 'bg-red-500';
      case 'D': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="flex gap-1">
      {form.map((result, index) => (
        <div
          key={index}
          className={`w-6 h-6 rounded-md ${getColor(result)} flex items-center justify-center text-white text-xs font-bold`}
          title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
        >
          {result}
        </div>
      ))}
      {form.length === 0 && (
        <span className="text-sm text-gray-400">No recent games</span>
      )}
    </div>
  );
};

const GameModeCard = ({ mode, stats }) => {
  const winRate = stats.played > 0 ? ((stats.won / stats.played) * 100).toFixed(0) : 0;
  
  const modeIcons = {
    classic: '🏃',
    freeze: '❄️',
    infection: '🧟',
    team: '👥',
    manhunt: '🔦',
    hotPotato: '🥔',
    hideSeek: '👀'
  };

  const modeNames = {
    classic: 'Classic Tag',
    freeze: 'Freeze Tag',
    infection: 'Infection',
    team: 'Team Tag',
    manhunt: 'Manhunt',
    hotPotato: 'Hot Potato',
    hideSeek: 'Hide & Seek'
  };

  if (stats.played === 0) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{modeIcons[mode] || '🎮'}</span>
        <h4 className="font-medium text-gray-800">{modeNames[mode] || mode}</h4>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xl font-bold text-gray-900">{stats.played}</p>
          <p className="text-xs text-gray-500">Played</p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">{stats.won}</p>
          <p className="text-xs text-gray-500">Won</p>
        </div>
        <div>
          <p className="text-xl font-bold text-blue-600">{winRate}%</p>
          <p className="text-xs text-gray-500">Win Rate</p>
        </div>
      </div>
    </div>
  );
};

const ActivityChart = ({ data, type }) => {
  const maxValue = Math.max(...data, 1);
  const labels = type === 'hourly' 
    ? Array.from({ length: 24 }, (_, i) => `${i}h`)
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((value, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div 
            className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
            style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
            title={`${labels[index]}: ${value} games`}
          />
          {type === 'weekly' && (
            <span className="text-[10px] text-gray-400 mt-1">{labels[index]}</span>
          )}
        </div>
      ))}
    </div>
  );
};

const RecentGameRow = ({ game }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const resultColors = {
    win: 'bg-green-100 text-green-700',
    loss: 'bg-red-100 text-red-700',
    draw: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${resultColors[game.result]}`}>
          {game.result.toUpperCase()}
        </span>
        <div>
          <p className="font-medium text-gray-800">{game.mode || 'Classic'}</p>
          <p className="text-xs text-gray-500">{formatDate(game.date)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <p className="font-medium text-gray-800">{game.tags}</p>
          <p className="text-xs text-gray-500">Tags</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-800">{formatDuration(game.duration)}</p>
          <p className="text-xs text-gray-500">Duration</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-800">{(game.distance / 1000).toFixed(2)}</p>
          <p className="text-xs text-gray-500">km</p>
        </div>
      </div>
    </div>
  );
};

export default function PlayerStatsDashboard({ onClose }) {
  const { 
    analytics, 
    isLoading, 
    overview, 
    performance, 
    records, 
    recentGames, 
    recentForm, 
    gameModes, 
    powerups,
    activity,
    resetStats,
    exportStats,
    importStats,
    refreshAnalytics
  } = useStats();

  const [activeTab, setActiveTab] = useState('overview');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = () => {
    const data = exportStats();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tag-stats.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const success = importStats(event.target.result);
          if (success) {
            alert('Stats imported successfully!');
          } else {
            alert('Failed to import stats. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    resetStats();
    setShowResetConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading your stats...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'games', label: 'Games', icon: '🎮' },
    { id: 'records', label: 'Records', icon: '🏆' },
    { id: 'powerups', label: 'Power-ups', icon: '⚡' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 pt-8 pb-16">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📊 Your Stats</h2>
                <p className="text-gray-500 text-sm mt-1">Track your progress and performance</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    icon="🎮"
                    label="Games"
                    value={overview.totalGames || 0}
                    subValue={`${overview.winRate}% win rate`}
                    color="blue"
                  />
                  <StatCard
                    icon="👆"
                    label="Tags"
                    value={analytics?.overview?.totalGames > 0 ? performance.averageTagsPerGame : 0}
                    subValue="avg per game"
                    color="green"
                  />
                  <StatCard
                    icon="⏱️"
                    label="Playtime"
                    value={overview.totalPlayTime || '0:00'}
                    subValue={`${overview.averageGameTime} avg`}
                    color="purple"
                  />
                  <StatCard
                    icon="🏃"
                    label="Distance"
                    value={overview.totalDistance || '0 km'}
                    color="orange"
                  />
                  <StatCard
                    icon="🔥"
                    label="Win Streak"
                    value={performance.currentStreak || 0}
                    subValue={`Best: ${performance.bestStreak || 0}`}
                    color="pink"
                  />
                  <StatCard
                    icon="⚡"
                    label="Power-ups"
                    value={powerups.used || 0}
                    subValue={`${powerups.efficiency} usage`}
                    color="cyan"
                  />
                </div>

                {/* Recent Form */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Recent Form</h3>
                  <FormIndicator form={recentForm.form} />
                  {recentForm.form.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Last 10: {recentForm.wins}W - {recentForm.losses}L - {recentForm.draws}D
                    </p>
                  )}
                </div>

                {/* Weekly Activity */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Weekly Activity</h3>
                  <ActivityChart data={activity.weeklyDistribution || Array(7).fill(0)} type="weekly" />
                  {activity.peakDay && (
                    <p className="text-sm text-gray-500 mt-3">
                      Most active on <span className="font-medium text-blue-600">{activity.peakDay}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'games' && (
              <div className="space-y-6">
                {/* Game Mode Stats */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Game Modes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(gameModes).map(([mode, stats]) => (
                      <GameModeCard key={mode} mode={mode} stats={stats} />
                    ))}
                  </div>
                  {Object.values(gameModes).every(s => s.played === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-4xl mb-2">🎮</p>
                      <p>No games played yet!</p>
                      <p className="text-sm">Start playing to see your stats here.</p>
                    </div>
                  )}
                </div>

                {/* Recent Games */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Recent Games</h3>
                  <div className="space-y-2">
                    {recentGames.length > 0 ? (
                      recentGames.map(game => (
                        <RecentGameRow key={game.id} game={game} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-4xl mb-2">📜</p>
                        <p>No games in history yet!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'records' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏅</span>
                      <span className="text-sm font-medium text-yellow-700">Most Tags in Game</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{records.mostTagsInGame || 0}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⏱️</span>
                      <span className="text-sm font-medium text-blue-700">Longest Game</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{records.longestGame || '0:00'}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⚡</span>
                      <span className="text-sm font-medium text-green-700">Fastest Win</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{records.shortestWin || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏃</span>
                      <span className="text-sm font-medium text-purple-700">Farthest Run</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{records.farthestDistance || '0 km'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⚡</span>
                    <span className="font-semibold text-gray-800">Fastest Tag</span>
                  </div>
                  <p className="text-4xl font-bold text-blue-600">{performance.fastestTag || 'N/A'}</p>
                  <p className="text-sm text-gray-500 mt-1">Time to first tag after game start</p>
                </div>
              </div>
            )}

            {activeTab === 'powerups' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-blue-600">{powerups.collected || 0}</p>
                    <p className="text-sm text-gray-600">Collected</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-green-600">{powerups.used || 0}</p>
                    <p className="text-sm text-gray-600">Used</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-purple-600">{powerups.efficiency || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Efficiency</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Power-up Breakdown</h3>
                  <div className="space-y-3">
                    {Object.entries(powerups.breakdown || {}).map(([type, stats]) => {
                      const icons = {
                        speedBoost: '💨',
                        shield: '🛡️',
                        invisibility: '👻',
                        radar: '📡',
                        freeze: '❄️',
                        teleport: '✨'
                      };
                      const names = {
                        speedBoost: 'Speed Boost',
                        shield: 'Shield',
                        invisibility: 'Invisibility',
                        radar: 'Radar',
                        freeze: 'Freeze',
                        teleport: 'Teleport'
                      };
                      
                      return (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{icons[type] || '⚡'}</span>
                            <span className="font-medium text-gray-800">{names[type] || type}</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-center">
                              <p className="font-medium text-blue-600">{stats.collected}</p>
                              <p className="text-xs text-gray-500">Collected</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-green-600">{stats.used}</p>
                              <p className="text-xs text-gray-500">Used</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📤 Export
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📥 Import
                </button>
              </div>
              
              {showResetConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
                >
                  🗑️ Reset All Stats
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

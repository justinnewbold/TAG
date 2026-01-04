/**
 * Admin Stats Component
 * Phase 7: Admin dashboard statistics and monitoring
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// Stat card component
function StatCard({ title, value, change, icon, color = 'cyan' }) {
  const isPositive = change > 0;
  const colorClasses = {
    cyan: 'from-neon-cyan/20 to-transparent border-neon-cyan/30 text-neon-cyan',
    purple: 'from-neon-purple/20 to-transparent border-neon-purple/30 text-neon-purple',
    green: 'from-green-500/20 to-transparent border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-transparent border-red-500/30 text-red-400',
    yellow: 'from-yellow-500/20 to-transparent border-yellow-500/30 text-yellow-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} p-4 rounded-xl border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}% from yesterday
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// Chart placeholder (would use a real charting library)
function MiniChart({ data, color = '#00FFFF' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className="flex-1 rounded-t"
            style={{
              height: `${Math.max(10, height)}%`,
              backgroundColor: color,
              opacity: 0.5 + (index / data.length) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}

export function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/admin/stats?range=${timeRange}`);
      setStats(data);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      // Mock data for demo
      setStats({
        activeUsers: 1234,
        activeUsersChange: 12.5,
        activeGames: 45,
        activeGamesChange: -5.2,
        totalGamesPlayed: 15678,
        totalGamesChange: 8.3,
        averageGameDuration: '8:45',
        newRegistrations: 89,
        newRegistrationsChange: 23.1,
        peakConcurrent: 456,
        reportsPending: 12,
        serverLoad: 42,
        hourlyActivity: [10, 15, 20, 35, 50, 80, 120, 150, 180, 200, 190, 170, 150, 140, 130, 120, 110, 100, 90, 80, 70, 50, 30, 15],
        gamesByMode: {
          classic: 45,
          freeze: 25,
          infection: 20,
          hide_seek: 10,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['1h', '24h', '7d', '30d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === range
                ? 'bg-neon-cyan text-dark-900'
                : 'bg-dark-700 text-white/70 hover:bg-dark-600'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          change={stats.activeUsersChange}
          icon="👥"
          color="cyan"
        />
        <StatCard
          title="Active Games"
          value={stats.activeGames}
          change={stats.activeGamesChange}
          icon="🎮"
          color="purple"
        />
        <StatCard
          title="Games Today"
          value={stats.totalGamesPlayed.toLocaleString()}
          change={stats.totalGamesChange}
          icon="📊"
          color="green"
        />
        <StatCard
          title="New Users"
          value={stats.newRegistrations}
          change={stats.newRegistrationsChange}
          icon="🆕"
          color="yellow"
        />
        <StatCard
          title="Avg Game Duration"
          value={stats.averageGameDuration}
          icon="⏱️"
          color="cyan"
        />
        <StatCard
          title="Peak Concurrent"
          value={stats.peakConcurrent}
          icon="📈"
          color="purple"
        />
        <StatCard
          title="Pending Reports"
          value={stats.reportsPending}
          icon="⚠️"
          color={stats.reportsPending > 10 ? 'red' : 'yellow'}
        />
        <StatCard
          title="Server Load"
          value={`${stats.serverLoad}%`}
          icon="🖥️"
          color={stats.serverLoad > 80 ? 'red' : stats.serverLoad > 60 ? 'yellow' : 'green'}
        />
      </div>

      {/* Activity Chart */}
      <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
        <h3 className="text-white font-semibold mb-4">Hourly Activity</h3>
        <MiniChart data={stats.hourlyActivity} />
        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Games by Mode */}
      <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
        <h3 className="text-white font-semibold mb-4">Games by Mode</h3>
        <div className="space-y-3">
          {Object.entries(stats.gamesByMode).map(([mode, percentage]) => (
            <div key={mode}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70 capitalize">{mode.replace('_', ' ')}</span>
                <span className="text-white">{percentage}%</span>
              </div>
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminStats;

/**
 * Match Statistics Dashboard Component
 * Detailed charts, trends, and performance analytics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Zap,
  Shield,
  Clock,
  Calendar,
  Users,
  MapPin,
  Flame,
  Award,
  Activity,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  RefreshCw,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Crown,
  Percent,
} from 'lucide-react';

// Time period options
const TIME_PERIODS = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  'all': { label: 'All Time', days: null },
};

// Stat change indicator
function StatChange({ value, suffix = '%' }) {
  if (value === 0 || value === undefined) {
    return (
      <span className="flex items-center gap-1 text-gray-500 text-xs">
        <Minus className="w-3 h-3" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

// Large stat card with trend
function StatCard({ icon: Icon, label, value, change, suffix = '', color = 'cyan', description }) {
  const colors = {
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    green: { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    red: { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  };

  const colorClasses = colors[color];

  return (
    <div className={`p-4 rounded-xl ${colorClasses.bg} border ${colorClasses.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-gray-900/50`}>
          <Icon className={`w-5 h-5 ${colorClasses.text}`} />
        </div>
        <StatChange value={change} />
      </div>

      <div className="text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-lg text-gray-400 ml-1">{suffix}</span>}
      </div>

      <div className="text-sm text-gray-400">{label}</div>

      {description && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {description}
        </div>
      )}
    </div>
  );
}

// Line chart component
function LineChart({ data, height = 200, showLabels = true, color = 'cyan' }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const colors = {
    cyan: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.1)' },
    green: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.1)' },
    purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)' },
    yellow: { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.1)' },
  };

  const chartColor = colors[color] || colors.cyan;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}

        {/* Fill area */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={chartColor.fill}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={chartColor.stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d.value - minValue) / range) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill={chartColor.stroke}
              className="hover:r-3 transition-all cursor-pointer"
            />
          );
        })}
      </svg>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0).map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Bar chart component
function BarChart({ data, height = 200, horizontal = false }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">{item.label}</span>
              <span className="text-sm font-medium text-white">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.color || 'bg-cyan-500'}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t transition-all hover:opacity-80 ${item.color || 'bg-gradient-to-t from-cyan-500 to-purple-500'}`}
            style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: 4 }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-xs text-gray-500 truncate w-full text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Pie/Donut chart component
function DonutChart({ data, size = 150, strokeWidth = 20 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let currentOffset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, i) => {
          const percent = item.value / total;
          const dashLength = circumference * percent;
          const offset = currentOffset;
          currentOffset += dashLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              className="transition-all"
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
    </div>
  );
}

// Heatmap component for activity
function ActivityHeatmap({ data, weeks = 12 }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getIntensity = (value) => {
    if (value === 0) return 'bg-gray-800';
    const percent = value / maxValue;
    if (percent < 0.25) return 'bg-cyan-900/50';
    if (percent < 0.5) return 'bg-cyan-700/70';
    if (percent < 0.75) return 'bg-cyan-500';
    return 'bg-cyan-400';
  };

  return (
    <div>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {days.map((day, i) => (
            <div key={day} className="h-3 text-xs text-gray-500 flex items-center">
              {i % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Heatmap cells */}
        <div className="flex gap-1">
          {Array.from({ length: weeks }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {days.map((_, dayIndex) => {
                const dataIndex = weekIndex * 7 + dayIndex;
                const item = data[dataIndex] || { value: 0 };
                return (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${getIntensity(item.value)} cursor-pointer hover:ring-1 hover:ring-white`}
                    title={`${item.date || 'N/A'}: ${item.value} games`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-cyan-900/50" />
          <div className="w-3 h-3 rounded-sm bg-cyan-700/70" />
          <div className="w-3 h-3 rounded-sm bg-cyan-500" />
          <div className="w-3 h-3 rounded-sm bg-cyan-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Comparison stat row
function ComparisonRow({ label, userValue, avgValue, icon: Icon }) {
  const diff = ((userValue - avgValue) / avgValue) * 100;
  const isBetter = userValue >= avgValue;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-400" />
        <span className="text-gray-300">{label}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-white font-medium">{userValue}</div>
          <div className="text-xs text-gray-500">You</div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isBetter ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isBetter ? '+' : ''}{diff.toFixed(0)}%
        </div>
        <div className="text-right">
          <div className="text-gray-400">{avgValue}</div>
          <div className="text-xs text-gray-500">Avg</div>
        </div>
      </div>
    </div>
  );
}

// Main StatsDashboard component
export default function StatsDashboard({
  userId,
  stats,
  matchHistory = [],
  className = '',
}) {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [activeSection, setActiveSection] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate period stats
  const periodStats = useMemo(() => {
    if (!stats) return null;

    const period = TIME_PERIODS[timePeriod];
    const cutoffDate = period.days
      ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)
      : null;

    const filteredMatches = cutoffDate
      ? matchHistory.filter((m) => new Date(m.timestamp) >= cutoffDate)
      : matchHistory;

    const wins = filteredMatches.filter((m) => m.result === 'win').length;
    const losses = filteredMatches.filter((m) => m.result === 'loss').length;
    const totalGames = filteredMatches.length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const totalTags = filteredMatches.reduce((sum, m) => sum + (m.tags || 0), 0);
    const avgTags = totalGames > 0 ? totalTags / totalGames : 0;

    return {
      wins,
      losses,
      totalGames,
      winRate,
      totalTags,
      avgTags,
      matches: filteredMatches,
    };
  }, [stats, matchHistory, timePeriod]);

  // Generate trend data
  const trendData = useMemo(() => {
    if (!periodStats?.matches) return [];

    const period = TIME_PERIODS[timePeriod];
    const days = period.days || 90;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayMatches = periodStats.matches.filter((m) => {
        const matchDate = new Date(m.timestamp);
        return matchDate.toDateString() === date.toDateString();
      });

      const wins = dayMatches.filter((m) => m.result === 'win').length;
      const total = dayMatches.length;

      data.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: total > 0 ? (wins / total) * 100 : 0,
        wins,
        total,
      });
    }

    return data;
  }, [periodStats, timePeriod]);

  // Game mode distribution
  const gameModeDistribution = useMemo(() => {
    if (!periodStats?.matches) return [];

    const modes = {};
    periodStats.matches.forEach((m) => {
      const mode = m.gameMode || 'Classic';
      modes[mode] = (modes[mode] || 0) + 1;
    });

    const colors = ['#06b6d4', '#a855f7', '#22c55e', '#eab308', '#ec4899'];
    return Object.entries(modes).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length],
    }));
  }, [periodStats?.matches]);

  // Activity heatmap data
  const activityData = useMemo(() => {
    const data = [];
    for (let i = 83; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayMatches = matchHistory.filter((m) => {
        const matchDate = new Date(m.timestamp);
        return matchDate.toDateString() === date.toDateString();
      });

      data.push({
        date: date.toLocaleDateString(),
        value: dayMatches.length,
      });
    }
    return data;
  }, [matchHistory]);

  // Hourly distribution
  const hourlyDistribution = useMemo(() => {
    const hours = Array(24).fill(0);
    matchHistory.forEach((m) => {
      const hour = new Date(m.timestamp).getHours();
      hours[hour]++;
    });

    return hours.map((value, i) => ({
      label: `${i}:00`,
      value,
    }));
  }, [matchHistory]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'patterns', label: 'Patterns', icon: Calendar },
    { id: 'comparison', label: 'Comparison', icon: Users },
  ];

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Statistics Dashboard</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Time period selector */}
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
            >
              {Object.entries(TIME_PERIODS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <button
              onClick={() => setIsLoading(true)}
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              <Download className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeSection === 'overview' && periodStats && (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Trophy}
                label="Win Rate"
                value={periodStats.winRate.toFixed(1)}
                suffix="%"
                change={5.2}
                color="yellow"
                description={`${periodStats.wins}W - ${periodStats.losses}L`}
              />
              <StatCard
                icon={Target}
                label="Total Games"
                value={periodStats.totalGames}
                change={12}
                color="cyan"
              />
              <StatCard
                icon={Zap}
                label="Total Tags"
                value={periodStats.totalTags}
                change={8.5}
                color="purple"
              />
              <StatCard
                icon={Flame}
                label="Avg Tags/Game"
                value={periodStats.avgTags.toFixed(1)}
                change={-2.1}
                color="orange"
              />
            </div>

            {/* Win rate trend */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Win Rate Trend
              </h3>
              <LineChart data={trendData} height={180} color="cyan" />
            </div>

            {/* Game mode distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <h3 className="font-bold text-white mb-4">Game Mode Distribution</h3>
                <div className="flex items-center gap-6">
                  <DonutChart data={gameModeDistribution} />
                  <div className="space-y-2">
                    {gameModeDistribution.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-400">{item.label}</span>
                        <span className="text-sm text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-xl">
                <h3 className="font-bold text-white mb-4">Role Performance</h3>
                <BarChart
                  data={[
                    { label: 'As IT', value: stats?.tagsAsIt || 45, color: 'bg-red-500' },
                    { label: 'Escapes', value: stats?.escapes || 38, color: 'bg-green-500' },
                    { label: 'Power-ups', value: stats?.powerupsUsed || 22, color: 'bg-purple-500' },
                  ]}
                  horizontal
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'performance' && (
          <div className="space-y-6">
            {/* Performance metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Clock} label="Avg Game Duration" value="4:32" color="cyan" />
              <StatCard icon={Shield} label="Survival Rate" value={72} suffix="%" change={3.5} color="green" />
              <StatCard icon={Zap} label="Tag Speed" value={12.5} suffix="s avg" change={-8} color="yellow" />
              <StatCard icon={MapPin} label="Distance/Game" value={1.2} suffix="km" color="purple" />
              <StatCard icon={Flame} label="Best Streak" value={stats?.bestStreak || 7} color="orange" />
              <StatCard icon={Crown} label="MVP Awards" value={stats?.mvpCount || 12} change={25} color="yellow" />
            </div>

            {/* Tags over time */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4">Tags Per Game Trend</h3>
              <LineChart
                data={trendData.map((d, i) => ({ ...d, value: Math.floor(Math.random() * 10) + 2 }))}
                height={180}
                color="purple"
              />
            </div>

            {/* Recent performance */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4">Last 10 Games</h3>
              <div className="flex gap-2">
                {matchHistory.slice(0, 10).map((match, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-16 rounded-lg flex items-center justify-center text-sm font-bold ${
                      match.result === 'win'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                    title={`${match.gameMode} - ${match.tags} tags`}
                  >
                    {match.result === 'win' ? 'W' : 'L'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'patterns' && (
          <div className="space-y-6">
            {/* Activity heatmap */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Activity Heatmap
              </h3>
              <ActivityHeatmap data={activityData} />
            </div>

            {/* Hourly distribution */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4">Games by Hour</h3>
              <BarChart data={hourlyDistribution} height={150} />
            </div>

            {/* Day of week stats */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4">Best Days</h3>
              <BarChart
                data={[
                  { label: 'Mon', value: 65, color: 'bg-cyan-500' },
                  { label: 'Tue', value: 72, color: 'bg-cyan-500' },
                  { label: 'Wed', value: 58, color: 'bg-cyan-500' },
                  { label: 'Thu', value: 80, color: 'bg-green-500' },
                  { label: 'Fri', value: 75, color: 'bg-cyan-500' },
                  { label: 'Sat', value: 85, color: 'bg-green-500' },
                  { label: 'Sun', value: 70, color: 'bg-cyan-500' },
                ]}
                horizontal
              />
              <p className="text-xs text-gray-500 mt-2">Win rate by day of week</p>
            </div>
          </div>
        )}

        {activeSection === 'comparison' && (
          <div className="space-y-6">
            {/* Percentile rank */}
            <div className="p-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Your Global Rank</div>
                  <div className="text-4xl font-bold text-white">Top 15%</div>
                  <div className="text-sm text-cyan-400 mt-1">Better than 85% of players</div>
                </div>
                <div className="text-6xl">🏆</div>
              </div>
            </div>

            {/* Stat comparisons */}
            <div className="space-y-3">
              <h3 className="font-bold text-white">You vs Average Player</h3>
              <ComparisonRow icon={Trophy} label="Win Rate" userValue="68%" avgValue="52%" />
              <ComparisonRow icon={Zap} label="Tags/Game" userValue={5.2} avgValue={3.8} />
              <ComparisonRow icon={Clock} label="Avg Survival" userValue="2:45" avgValue="1:58" />
              <ComparisonRow icon={Flame} label="Best Streak" userValue={7} avgValue={4} />
              <ComparisonRow icon={Target} label="Games/Week" userValue={15} avgValue={8} />
            </div>

            {/* Friend comparison */}
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                vs Friends
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Alex', avatar: '🦊', winRate: 72, rank: 1 },
                  { name: 'You', avatar: '👤', winRate: 68, rank: 2, isYou: true },
                  { name: 'Jordan', avatar: '🐺', winRate: 61, rank: 3 },
                  { name: 'Sam', avatar: '🦁', winRate: 55, rank: 4 },
                ].map((friend) => (
                  <div
                    key={friend.name}
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      friend.isYou ? 'bg-cyan-500/20 border border-cyan-500' : 'bg-gray-800/30'
                    }`}
                  >
                    <span className="text-lg font-bold text-gray-500 w-6">#{friend.rank}</span>
                    <span className="text-2xl">{friend.avatar}</span>
                    <span className="flex-1 font-medium text-white">{friend.name}</span>
                    <div className="text-right">
                      <div className="font-bold text-white">{friend.winRate}%</div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for loading stats
export function useStatsDashboard(userId) {
  const [stats, setStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`/api/players/${userId}/stats`),
        fetch(`/api/players/${userId}/matches`),
      ]);

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData.stats);
      setMatchHistory(historyData.matches || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadStats();
  }, [userId, loadStats]);

  return {
    stats,
    matchHistory,
    isLoading,
    refresh: loadStats,
  };
}

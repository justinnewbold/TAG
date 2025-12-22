import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Flag, Ban, Search, AlertTriangle,
  CheckCircle, XCircle, Clock, ChevronRight, Filter,
  BarChart3, TrendingUp, Activity, Eye, Trash2, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';

function AdminDashboard() {
  const { user } = useStore();
  const [view, setView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportFilter, setReportFilter] = useState('pending');

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }
    fetchData();
  }, [user, view]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (view === 'overview') {
        const data = await api.request('/admin/stats');
        setStats(data);
      } else if (view === 'users') {
        const data = await api.request('/admin/users');
        setUsers(data.users || []);
      } else if (view === 'reports') {
        const data = await api.request(`/admin/reports?status=${reportFilter}`);
        setReports(data.reports || []);
      } else if (view === 'games') {
        const data = await api.request('/admin/games');
        setGames(data.games || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId, reason) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    try {
      await api.request('/admin/ban', {
        method: 'POST',
        body: JSON.stringify({ userId, reason })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to ban user:', err);
      alert(err.message);
    }
  };

  const unbanUser = async (userId) => {
    try {
      await api.request(`/admin/unban/${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to unban user:', err);
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await api.request(`/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400/20 mx-auto mb-4" />
          <p className="text-white/40">Access Denied</p>
          <p className="text-white/20 text-sm">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Users" 
          value={stats?.totalUsers || 0}
          trend={stats?.newUsersToday ? `+${stats.newUsersToday} today` : null}
          color="neon-cyan"
        />
        <StatCard 
          icon={Activity} 
          label="Active Games" 
          value={stats?.activeGames || 0}
          trend={stats?.gamesThisHour ? `${stats.gamesThisHour} this hour` : null}
          color="neon-purple"
        />
        <StatCard 
          icon={Flag} 
          label="Pending Reports" 
          value={stats?.pendingReports || 0}
          trend={stats?.reportsToday ? `${stats.reportsToday} today` : null}
          color="yellow"
        />
        <StatCard 
          icon={Ban} 
          label="Banned Users" 
          value={stats?.bannedUsers || 0}
          color="red"
        />
      </div>

      {/* Activity Chart Placeholder */}
      <div className="bg-dark-800 rounded-xl p-6 border border-white/10">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-neon-cyan" />
          Activity Overview
        </h3>
        <div className="h-48 flex items-end justify-between gap-2">
          {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-gradient-to-t from-neon-cyan to-neon-purple rounded-t"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-white/40">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-800 rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-purple" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {(stats?.recentActivity || []).slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activity.type === 'report' ? 'bg-yellow-500/20' :
                activity.type === 'ban' ? 'bg-red-500/20' :
                'bg-neon-cyan/20'
              }`}>
                {activity.type === 'report' ? <Flag className="w-5 h-5 text-yellow-400" /> :
                 activity.type === 'ban' ? <Ban className="w-5 h-5 text-red-400" /> :
                 <Activity className="w-5 h-5 text-neon-cyan" />}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{activity.description}</p>
                <p className="text-white/40 text-xs">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder:text-white/40"
        />
      </div>

      <div className="space-y-2">
        {users
          .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(u => (
            <div key={u.id} className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-white/10">
              <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center text-2xl">
                {u.avatar || '😀'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{u.name}</p>
                  {u.role === 'admin' && (
                    <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded-full">
                      Admin
                    </span>
                  )}
                  {u.is_banned && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Banned
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40 truncate">{u.email}</p>
                <p className="text-xs text-white/20">
                  Level {u.level || 1} • {u.total_games || 0} games • Joined {formatDate(u.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {/* View profile */}}
                  className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <Eye className="w-5 h-5 text-white/60" />
                </button>
                {!u.is_banned ? (
                  <button
                    onClick={() => banUser(u.id, 'Manual ban by admin')}
                    className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Ban className="w-5 h-5 text-red-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => unbanUser(u.id)}
                    className="p-2 bg-green-500/10 rounded-lg hover:bg-green-500/20 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'reviewed', 'resolved'].map(status => (
          <button
            key={status}
            onClick={() => setReportFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              reportFilter === status
                ? 'bg-neon-cyan text-dark-900'
                : 'bg-dark-800 text-white/60 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reports.length > 0 ? (
          reports.map(report => (
            <div key={report.id} className="bg-dark-800 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        report.reason === 'cheating' ? 'bg-red-500/20 text-red-400' :
                        report.reason === 'harassment' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {report.reason}
                      </span>
                      <span className="text-xs text-white/40">{formatTimeAgo(report.created_at)}</span>
                    </div>
                    <p className="text-white">{report.details}</p>
                  </div>
                  <AlertTriangle className={`w-5 h-5 ${
                    report.reason === 'cheating' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                </div>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span>Reported: <span className="text-white">{report.reported_name}</span></span>
                  <span>By: <span className="text-white">{report.reporter_name}</span></span>
                </div>
              </div>
              {report.status === 'pending' && (
                <div className="border-t border-white/10 p-2 flex gap-2">
                  <button
                    onClick={() => resolveReport(report.id, 'dismiss')}
                    className="flex-1 py-2 flex items-center justify-center gap-2 bg-dark-700 text-white/60 rounded-lg hover:bg-dark-600"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss
                  </button>
                  <button
                    onClick={() => resolveReport(report.id, 'warn')}
                    className="flex-1 py-2 flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Warn
                  </button>
                  <button
                    onClick={() => resolveReport(report.id, 'ban')}
                    className="flex-1 py-2 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                  >
                    <Ban className="w-4 h-4" />
                    Ban
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No {reportFilter} reports</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderGames = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white">Active Games</h3>
        <button onClick={fetchData} className="p-2 bg-dark-700 rounded-lg">
          <RefreshCw className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="space-y-3">
        {games.length > 0 ? (
          games.map(game => (
            <div key={game.id} className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-white/10">
              <div className={`w-3 h-3 rounded-full ${
                game.status === 'active' ? 'bg-green-400 animate-pulse' :
                game.status === 'waiting' ? 'bg-yellow-400' : 'bg-white/20'
              }`} />
              <div className="flex-1">
                <p className="font-medium text-white">{game.name || game.code}</p>
                <p className="text-sm text-white/40">
                  {game.player_count} players • {game.mode} • {game.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600">
                  <Eye className="w-5 h-5 text-white/60" />
                </button>
                <button className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No active games</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-neon-purple" />
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-white/60 text-sm">Manage users, reports, and games</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'reports', label: 'Reports', icon: Flag },
          { id: 'games', label: 'Games', icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors whitespace-nowrap px-4 ${
                view === tab.id
                  ? 'text-neon-cyan border-b-2 border-neon-cyan'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-dark-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {view === 'overview' && renderOverview()}
            {view === 'users' && renderUsers()}
            {view === 'reports' && renderReports()}
            {view === 'games' && renderGames()}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  const colorClasses = {
    'neon-cyan': 'text-neon-cyan bg-neon-cyan/10',
    'neon-purple': 'text-neon-purple bg-neon-purple/10',
    'yellow': 'text-yellow-400 bg-yellow-400/10',
    'red': 'text-red-400 bg-red-400/10'
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-white/10">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-white/40">{label}</p>
      {trend && <p className="text-xs text-green-400 mt-1">{trend}</p>}
    </div>
  );
}

function formatTimeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default AdminDashboard;

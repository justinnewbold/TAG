/**
 * User Manager Component
 * Phase 7: Admin dashboard - User management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

function UserRow({ user, onAction }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr className="border-b border-dark-600 hover:bg-dark-700/50">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center text-lg">
            {user.avatar || '👤'}
          </div>
          <div>
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-xs text-white/50">{user.id}</p>
          </div>
        </div>
      </td>
      <td className="p-3 text-white/70">{user.email || '-'}</td>
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded text-xs ${
            user.isOnline
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {user.isOnline ? 'Online' : 'Offline'}
        </span>
      </td>
      <td className="p-3 text-white/70">{user.gamesPlayed || 0}</td>
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded text-xs ${
            user.isBanned
              ? 'bg-red-500/20 text-red-400'
              : user.isAdmin
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          {user.isBanned ? 'Banned' : user.isAdmin ? 'Admin' : 'Player'}
        </span>
      </td>
      <td className="p-3 text-white/50 text-sm">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="p-3">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
          >
            ⋮
          </button>
          {showActions && (
            <div className="absolute right-0 top-full mt-1 bg-dark-700 rounded-lg shadow-lg border border-dark-600 z-10 min-w-40">
              <button
                onClick={() => {
                  onAction('view', user);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-dark-600 rounded-t-lg"
              >
                👁️ View Profile
              </button>
              <button
                onClick={() => {
                  onAction('warn', user);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-dark-600"
              >
                ⚠️ Send Warning
              </button>
              {!user.isBanned ? (
                <button
                  onClick={() => {
                    onAction('ban', user);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-600 rounded-b-lg"
                >
                  🚫 Ban User
                </button>
              ) : (
                <button
                  onClick={() => {
                    onAction('unban', user);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-dark-600 rounded-b-lg"
                >
                  ✅ Unban User
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        filter,
      });
      const data = await api.request(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Mock data
      setUsers([
        {
          id: 'u1',
          name: 'ProPlayer',
          email: 'pro@example.com',
          avatar: '🎮',
          isOnline: true,
          gamesPlayed: 156,
          isAdmin: false,
          isBanned: false,
          createdAt: '2024-01-15',
        },
        {
          id: 'u2',
          name: 'CasualGamer',
          email: 'casual@example.com',
          avatar: '🎯',
          isOnline: false,
          gamesPlayed: 42,
          isAdmin: false,
          isBanned: false,
          createdAt: '2024-02-20',
        },
        {
          id: 'u3',
          name: 'AdminUser',
          email: 'admin@example.com',
          avatar: '👑',
          isOnline: true,
          gamesPlayed: 89,
          isAdmin: true,
          isBanned: false,
          createdAt: '2024-01-01',
        },
        {
          id: 'u4',
          name: 'BannedCheater',
          email: 'banned@example.com',
          avatar: '🚫',
          isOnline: false,
          gamesPlayed: 12,
          isAdmin: false,
          isBanned: true,
          createdAt: '2024-03-10',
        },
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAction = async (action, user) => {
    if (action === 'view') {
      setSelectedUser(user);
      return;
    }

    if (action === 'ban' || action === 'warn') {
      setActionModal({ action, user });
      return;
    }

    if (action === 'unban') {
      try {
        await api.request(`/admin/users/${user.id}/unban`, { method: 'POST' });
        loadUsers();
      } catch (error) {
        console.error('Failed to unban user:', error);
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, isBanned: false } : u))
        );
      }
    }
  };

  const executeAction = async (reason) => {
    if (!actionModal) return;

    try {
      await api.request(`/admin/users/${actionModal.user.id}/${actionModal.action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      loadUsers();
    } catch (error) {
      console.error(`Failed to ${actionModal.action} user:`, error);
      if (actionModal.action === 'ban') {
        setUsers(prev =>
          prev.map(u =>
            u.id === actionModal.user.id ? { ...u, isBanned: true } : u
          )
        );
      }
    }
    setActionModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-neon-cyan"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'online', 'banned', 'admin'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                filter === f
                  ? 'bg-neon-cyan text-dark-900'
                  : 'bg-dark-700 text-white/70 hover:bg-dark-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr className="text-left text-sm text-white/50">
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Games</th>
                <th className="p-3">Role</th>
                <th className="p-3">Joined</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-3">
                      <div className="h-12 bg-dark-700 rounded" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/50">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow key={user.id} user={user} onAction={handleAction} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-dark-600">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-dark-700 text-white disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-3 py-1 text-white/70">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-dark-700 text-white disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-md w-full border border-dark-600">
            <h3 className="text-xl font-bold text-white mb-4">
              {actionModal.action === 'ban' ? '🚫 Ban User' : '⚠️ Warn User'}
            </h3>
            <p className="text-white/70 mb-4">
              {actionModal.action === 'ban'
                ? `Are you sure you want to ban ${actionModal.user.name}?`
                : `Send a warning to ${actionModal.user.name}?`}
            </p>
            <textarea
              placeholder="Reason..."
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-neon-cyan mb-4"
              rows={3}
              id="action-reason"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = document.getElementById('action-reason').value;
                  executeAction(reason);
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  actionModal.action === 'ban'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-dark-900'
                }`}
              >
                {actionModal.action === 'ban' ? 'Ban' : 'Send Warning'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManager;

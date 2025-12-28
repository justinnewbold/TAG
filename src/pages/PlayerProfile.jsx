import React, { useState, useEffect } from 'react';
import {
  User, Trophy, Target, Clock, Medal, Zap, Shield,
  Calendar, TrendingUp, Star, ChevronRight, MapPin,
  Edit2, Camera, Share, Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

const AVATAR_OPTIONS = ['😀', '😎', '🥷', '👻', '🦊', '🐱', '🦁', '🐯', '🦖', '🤖', '👽', '🎮', '🏃', '⚡', '🔥', '💀'];

function PlayerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser } = useStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', avatar: '', bio: '' });
  const [activeTab, setActiveTab] = useState('stats');

  const isOwnProfile = !userId || userId === currentUser?.id?.toString();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const endpoint = isOwnProfile ? '/users/me/profile' : `/users/${userId}/profile`;
      const data = await api.request(endpoint);
      setProfile(data);
      if (isOwnProfile) {
        setEditData({
          name: data.name || '',
          avatar: data.avatar || '😀',
          bio: data.bio || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      await api.request('/users/me/profile', {
        method: 'PUT',
        body: JSON.stringify(editData)
      });
      setProfile({ ...profile, ...editData });
      setIsEditing(false);
      toast.success('Profile saved!');
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save profile:', err);
      toast.error(err.message || 'Failed to save profile');
    }
  };

  const shareProfile = async () => {
    const url = `${window.location.origin}/profile/${profile.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name}'s TAG Profile`,
          url: url
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const calculateLevelProgress = () => {
    if (!profile?.stats) return 0;
    const xpForCurrentLevel = profile.stats.level * 1000;
    const currentLevelXP = profile.stats.xp % xpForCurrentLevel;
    return (currentLevelXP / xpForCurrentLevel) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-neon-purple/20 to-dark-900 pt-6 pb-8 px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-white/60">
            ← Back
          </button>
          {isOwnProfile && (
            <div className="flex gap-2">
              <button onClick={shareProfile} className="p-2 bg-dark-700 rounded-lg">
                <Share className="w-5 h-5 text-white/60" />
              </button>
              <button onClick={() => navigate('/settings')} className="p-2 bg-dark-700 rounded-lg">
                <Settings className="w-5 h-5 text-white/60" />
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center text-5xl">
              {profile.avatar || '😀'}
            </div>
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-neon-cyan rounded-full flex items-center justify-center"
              >
                <Edit2 className="w-4 h-4 text-dark-900" />
              </button>
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-purple rounded-full">
              <span className="text-xs font-bold text-white">Lv.{profile.stats?.level || 1}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mt-6">{profile.name}</h1>
          {profile.clan && (
            <p className="text-neon-cyan text-sm mt-1">[{profile.clan.tag}] {profile.clan.name}</p>
          )}
          {profile.bio && (
            <p className="text-white/60 text-sm mt-2 text-center max-w-xs">{profile.bio}</p>
          )}

          {/* XP Bar */}
          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>XP Progress</span>
              <span>{profile.stats?.xp?.toLocaleString() || 0} XP</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all"
                style={{ width: `${calculateLevelProgress()}%` }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{profile.stats?.total_games || 0}</p>
              <p className="text-xs text-white/40">Games</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-cyan">{profile.stats?.total_wins || 0}</p>
              <p className="text-xs text-white/40">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-purple">{profile.stats?.total_tags || 0}</p>
              <p className="text-xs text-white/40">Tags</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        {['stats', 'achievements', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="bg-dark-800 rounded-xl p-4 border border-white/10">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neon-cyan" />
                Performance Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatItem 
                  icon={Trophy} 
                  label="Win Rate" 
                  value={`${((profile.stats?.total_wins / Math.max(profile.stats?.total_games, 1)) * 100).toFixed(1)}%`}
                  color="text-yellow-400"
                />
                <StatItem 
                  icon={Target} 
                  label="Tag Accuracy" 
                  value={`${profile.stats?.tag_accuracy || 0}%`}
                  color="text-neon-purple"
                />
                <StatItem 
                  icon={Clock} 
                  label="Avg Survival" 
                  value={formatDuration(profile.stats?.avg_survival_time || 0)}
                  color="text-green-400"
                />
                <StatItem 
                  icon={Zap} 
                  label="Best Streak" 
                  value={profile.stats?.best_win_streak || 0}
                  color="text-orange-400"
                />
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-white/10">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Medal className="w-4 h-4 text-neon-purple" />
                Rankings
              </h3>
              <div className="space-y-3">
                <RankItem label="Global Wins" rank={profile.ranks?.wins || '—'} />
                <RankItem label="Global Tags" rank={profile.ranks?.tags || '—'} />
                <RankItem label="Global XP" rank={profile.ranks?.xp || '—'} />
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-white/10">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/60" />
                Activity
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Member Since</p>
                  <p className="text-white">{formatDate(profile.created_at)}</p>
                </div>
                <div>
                  <p className="text-white/40">Last Active</p>
                  <p className="text-white">{formatDate(profile.last_active)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {(profile.achievements || []).length > 0 ? (
              profile.achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-white/10"
                >
                  <div className="w-12 h-12 bg-neon-purple/20 rounded-xl flex items-center justify-center text-2xl">
                    {achievement.icon || '🏆'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{achievement.name}</h4>
                    <p className="text-sm text-white/40">{achievement.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40">Earned</p>
                    <p className="text-sm text-neon-cyan">{formatDate(achievement.earned_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No achievements yet</p>
                <p className="text-white/20 text-sm">Play games to earn achievements!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {(profile.recentGames || []).length > 0 ? (
              profile.recentGames.map(game => (
                <div
                  key={game.id}
                  className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-white/10"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    game.result === 'win' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {game.result === 'win' ? (
                      <Trophy className="w-6 h-6 text-green-400" />
                    ) : (
                      <Target className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{game.mode_name}</h4>
                    <p className="text-sm text-white/40">{game.player_count} players</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${game.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                      {game.result === 'win' ? 'Victory' : 'Defeated'}
                    </p>
                    <p className="text-xs text-white/40">{formatDate(game.played_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No game history</p>
                <p className="text-white/20 text-sm">Play your first game!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditData({ ...editData, avatar: emoji })}
                      className={`w-12 h-12 text-2xl rounded-xl transition-all ${
                        editData.avatar === emoji
                          ? 'bg-neon-cyan/20 border-2 border-neon-cyan scale-110'
                          : 'bg-dark-700 hover:bg-dark-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white"
                  maxLength={24}
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white h-24 resize-none"
                  placeholder="Tell others about yourself..."
                  maxLength={150}
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-dark-700 text-white font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                className="flex-1 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white font-bold">{value}</p>
      </div>
    </div>
  );
}

function RankItem({ label, rank }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60">{label}</span>
      <span className="font-bold text-neon-cyan">#{rank}</span>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default PlayerProfile;

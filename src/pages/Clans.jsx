import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Crown, Plus, Search, ChevronRight, 
  Settings, LogOut, UserPlus, Trophy, Star, 
  Edit2, Check, X, Copy, Share
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';

function Clans() {
  const { user } = useStore();
  const [view, setView] = useState('browse'); // browse, my-clan, create
  const [clans, setClans] = useState([]);
  const [myClan, setMyClan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClan, setSelectedClan] = useState(null);

  // Create clan form
  const [newClan, setNewClan] = useState({
    name: '',
    tag: '',
    description: '',
    isPublic: true
  });

  useEffect(() => {
    fetchClans();
    if (user) {
      fetchMyClan();
    }
  }, [user]);

  const fetchClans = async () => {
    try {
      setLoading(true);
      const data = await api.request('/social/clans');
      setClans(data.clans || []);
    } catch (err) {
      console.error('Failed to fetch clans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClan = async () => {
    try {
      const data = await api.request('/social/clans/my');
      setMyClan(data.clan);
      if (data.clan) {
        setView('my-clan');
      }
    } catch (err) {
      // User not in a clan
      setMyClan(null);
    }
  };

  const createClan = async () => {
    try {
      const data = await api.request('/social/clans', {
        method: 'POST',
        body: JSON.stringify(newClan)
      });
      setMyClan(data.clan);
      setShowCreateModal(false);
      setView('my-clan');
    } catch (err) {
      console.error('Failed to create clan:', err);
      alert(err.message);
    }
  };

  const joinClan = async (clanId) => {
    try {
      await api.request(`/social/clans/${clanId}/join`, { method: 'POST' });
      fetchMyClan();
    } catch (err) {
      console.error('Failed to join clan:', err);
      alert(err.message);
    }
  };

  const leaveClan = async () => {
    if (!confirm('Are you sure you want to leave this clan?')) return;
    try {
      await api.request(`/social/clans/${myClan.id}/leave`, { method: 'POST' });
      setMyClan(null);
      setView('browse');
    } catch (err) {
      console.error('Failed to leave clan:', err);
    }
  };

  const copyInviteCode = () => {
    if (myClan?.invite_code) {
      navigator.clipboard.writeText(myClan.invite_code);
      alert('Invite code copied!');
    }
  };

  const filteredClans = clans.filter(clan =>
    clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clan.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBrowse = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search clans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder:text-white/40"
        />
      </div>

      {/* Create Clan Button */}
      {!myClan && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 rounded-xl text-neon-cyan hover:from-neon-cyan/30 hover:to-neon-purple/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Clan
        </button>
      )}

      {/* Clan List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredClans.length > 0 ? (
        <div className="space-y-3">
          {filteredClans.map(clan => (
            <button
              key={clan.id}
              onClick={() => setSelectedClan(clan)}
              className="w-full p-4 bg-dark-800 border border-white/10 rounded-xl hover:bg-dark-700 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-neon-purple/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-7 h-7 text-neon-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-neon-cyan/20 text-neon-cyan rounded-full">
                      [{clan.tag}]
                    </span>
                    <h3 className="font-bold text-white truncate">{clan.name}</h3>
                  </div>
                  <p className="text-sm text-white/60 mt-1">{clan.member_count || 0} members</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {clan.total_wins || 0} wins
                    </span>
                    {clan.is_public ? (
                      <span className="text-green-400">Open</span>
                    ) : (
                      <span className="text-yellow-400">Invite Only</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No clans found</p>
          <p className="text-white/20 text-sm">Be the first to create one!</p>
        </div>
      )}
    </div>
  );

  const renderMyClan = () => (
    <div className="space-y-4">
      {/* Clan Header */}
      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border border-neon-purple/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-neon-purple/30 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-neon-purple" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-neon-cyan/20 text-neon-cyan text-sm rounded-full">
                [{myClan?.tag}]
              </span>
              <h2 className="text-xl font-bold text-white">{myClan?.name}</h2>
            </div>
            <p className="text-white/60 text-sm mt-1">{myClan?.description || 'No description'}</p>
          </div>
        </div>

        {/* Clan Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{myClan?.member_count || 0}</p>
            <p className="text-xs text-white/40">Members</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-neon-cyan">{myClan?.total_wins || 0}</p>
            <p className="text-xs text-white/40">Total Wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-neon-purple">{myClan?.total_tags || 0}</p>
            <p className="text-xs text-white/40">Total Tags</p>
          </div>
        </div>

        {/* Invite Code */}
        {myClan?.invite_code && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-dark-800/50 px-4 py-2 rounded-lg">
              <p className="text-xs text-white/40">Invite Code</p>
              <p className="font-mono text-white">{myClan.invite_code}</p>
            </div>
            <button
              onClick={copyInviteCode}
              className="p-3 bg-dark-800/50 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <Copy className="w-5 h-5 text-white/60" />
            </button>
          </div>
        )}
      </div>

      {/* Member List */}
      <div className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4" />
            Members
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {(myClan?.members || []).map(member => (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center text-xl">
                {member.avatar || '😀'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white flex items-center gap-2">
                  {member.name}
                  {member.role === 'leader' && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                  {member.role === 'officer' && (
                    <Star className="w-4 h-4 text-neon-cyan" />
                  )}
                </p>
                <p className="text-xs text-white/40">Level {member.level || 1}</p>
              </div>
              <p className="text-sm text-white/60">{member.wins || 0} wins</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Button */}
      <button
        onClick={leaveClan}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Leave Clan
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2">Clans</h1>
        <p className="text-white/60 text-sm">Team up and compete together</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setView('browse')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            view === 'browse'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Browse
        </button>
        {myClan && (
          <button
            onClick={() => setView('my-clan')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              view === 'my-clan'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            My Clan
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {view === 'browse' ? renderBrowse() : renderMyClan()}
      </div>

      {/* Create Clan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Create Clan</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6 text-white/40" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Clan Name</label>
                <input
                  type="text"
                  value={newClan.name}
                  onChange={(e) => setNewClan({ ...newClan, name: e.target.value })}
                  placeholder="e.g., Shadow Runners"
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40"
                  maxLength={32}
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Clan Tag (3-5 chars)</label>
                <input
                  type="text"
                  value={newClan.tag}
                  onChange={(e) => setNewClan({ ...newClan, tag: e.target.value.toUpperCase() })}
                  placeholder="e.g., SRUN"
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40 font-mono"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Description</label>
                <textarea
                  value={newClan.description}
                  onChange={(e) => setNewClan({ ...newClan, description: e.target.value })}
                  placeholder="Tell others about your clan..."
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40 h-24 resize-none"
                  maxLength={200}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${newClan.isPublic ? 'bg-neon-cyan' : 'bg-dark-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${newClan.isPublic ? 'translate-x-6' : ''}`} />
                </div>
                <span className="text-white">Public (anyone can join)</span>
              </label>
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={createClan}
                disabled={!newClan.name || newClan.tag.length < 3}
                className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Clan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clan Details Modal */}
      {selectedClan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neon-purple/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-neon-purple" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-neon-cyan/20 text-neon-cyan text-sm rounded-full">
                      [{selectedClan.tag}]
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedClan.name}</h2>
                </div>
              </div>
              <p className="text-white/60 text-sm mt-4">
                {selectedClan.description || 'No description provided'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/10">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{selectedClan.member_count || 0}</p>
                <p className="text-xs text-white/40">Members</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neon-cyan">{selectedClan.total_wins || 0}</p>
                <p className="text-xs text-white/40">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neon-purple">{selectedClan.total_tags || 0}</p>
                <p className="text-xs text-white/40">Tags</p>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => setSelectedClan(null)}
                className="flex-1 py-3 bg-dark-700 text-white font-medium rounded-xl"
              >
                Close
              </button>
              {!myClan && selectedClan.is_public && (
                <button
                  onClick={() => {
                    joinClan(selectedClan.id);
                    setSelectedClan(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl"
                >
                  Join Clan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clans;

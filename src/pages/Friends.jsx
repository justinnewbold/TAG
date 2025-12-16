import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Search, Mail, MessageSquare, Users, Send, X, Trash2 } from 'lucide-react';
import { useStore } from '../store';

function Friends() {
  const navigate = useNavigate();
  const { friends, addFriend, removeFriend, games, user } = useStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteValue, setInviteValue] = useState('');
  const [inviteName, setInviteName] = useState('');
  
  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get friend stats
  const getFriendStats = (friendId) => {
    let gamesWithFriend = 0;
    games.filter(g => g.status === 'ended').forEach(game => {
      if (game.players?.some(p => p.id === friendId)) {
        gamesWithFriend++;
      }
    });
    return { gamesPlayed: gamesWithFriend };
  };
  
  const handleInvite = () => {
    if (!inviteValue.trim() || !inviteName.trim()) return;
    
    const isEmail = inviteValue.includes('@');
    addFriend({
      name: inviteName,
      email: isEmail ? inviteValue : null,
      phone: !isEmail ? inviteValue : null,
      status: 'invited',
    });
    
    // Open mail/sms app
    const shareText = `Hey ${inviteName}! Join me on TAG - the GPS hunt game! 🏃‍♂️\n\nDownload: https://tag.newbold.cloud`;
    
    if (isEmail) {
      const subject = encodeURIComponent('Join me on TAG! 🏃‍♂️');
      const body = encodeURIComponent(shareText);
      window.open(`mailto:${inviteValue}?subject=${subject}&body=${body}`);
    } else {
      const body = encodeURIComponent(shareText);
      window.open(`sms:${inviteValue}?body=${body}`);
    }
    
    setInviteValue('');
    setInviteName('');
    setShowInviteModal(false);
  };
  
  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-display font-bold">Friends</h1>
          <span className="text-sm text-white/50">({friends.length})</span>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary py-2 px-4 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add
        </button>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search friends..."
          className="input-field pl-12"
        />
      </div>
      
      <div className="space-y-3">
        {filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => {
            const stats = getFriendStats(friend.id);
            return (
              <div key={friend.id} className="card p-4 flex items-center gap-4">
                <div className="text-3xl">
                  {friend.avatar || '👤'}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{friend.name}</h3>
                  <p className="text-xs text-white/50">
                    {friend.email || friend.phone || 'No contact'}
                  </p>
                  {stats.gamesPlayed > 0 && (
                    <p className="text-xs text-neon-cyan mt-1">
                      {stats.gamesPlayed} games together
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFriend(friend.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">
              {searchQuery ? 'No friends found' : 'No friends yet'}
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 text-neon-cyan hover:underline text-sm"
            >
              Invite friends to play
            </button>
          </div>
        )}
      </div>
      
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="card-glow p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-neon-cyan/10 rounded-xl">
                  <UserPlus className="w-6 h-6 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl">Add Friend</h2>
                  <p className="text-sm text-white/50">Send an invite</p>
                </div>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Friend's name"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Email or Phone</label>
                <input
                  type="text"
                  value={inviteValue}
                  onChange={(e) => setInviteValue(e.target.value)}
                  placeholder="friend@email.com or +1555000000"
                  className="input-field"
                />
              </div>
              <button
                onClick={handleInvite}
                disabled={!inviteName.trim() || !inviteValue.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friends;

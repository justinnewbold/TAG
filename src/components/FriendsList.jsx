import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, X, Mail, MessageCircle, Gamepad2, 
  UserMinus, Check, Clock, Bell, ChevronRight, Star
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

function FriendsList({ onInvite, onClose }) {
  const { friends, addFriend, removeFriend, pendingInvites, user } = useStore();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);

  // Listen for friend requests
  useEffect(() => {
    const handleFriendRequest = ({ from, name }) => {
      setFriendRequests(prev => [...prev, { id: from, name, receivedAt: Date.now() }]);
    };

    const handleFriendAccepted = ({ userId, name }) => {
      // Refresh friends list
    };

    socketService.on('friend:request', handleFriendRequest);
    socketService.on('friend:accepted', handleFriendAccepted);

    return () => {
      socketService.off('friend:request', handleFriendRequest);
      socketService.off('friend:accepted', handleFriendAccepted);
    };
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // In a real app, this would search the server
      // For now, we'll simulate with dummy results
      await new Promise(resolve => setTimeout(resolve, 500));
      setSearchResults([
        { id: 'search1', name: `${query} User`, avatar: '🏃' },
        { id: 'search2', name: `${query}Player`, avatar: '🦊' },
      ]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      socketService.emit('friend:request', { to: userId });
      // Show success feedback
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      socketService.emit('friend:accept', { from: requestId });
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleDeclineRequest = (requestId) => {
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleRemoveFriend = (friendId) => {
    removeFriend(friendId);
    socketService.emit('friend:remove', { friendId });
  };

  const getOnlineStatus = (friend) => {
    // In a real app, this would check server
    return Math.random() > 0.5 ? 'online' : 'offline';
  };

  const filteredFriends = friends.filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
      <div className="w-full max-w-md bg-dark-800 rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-neon-cyan" />
            <h2 className="font-display font-bold text-lg">Friends</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'friends'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'requests'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Requests
            {friendRequests.length > 0 && (
              <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'add'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Add Friend
          </button>
        </div>

        {/* Search (for friends and add tabs) */}
        {(activeTab === 'friends' || activeTab === 'add') && (
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => activeTab === 'add' ? handleSearch(e.target.value) : setSearchQuery(e.target.value)}
                placeholder={activeTab === 'add' ? 'Search by name...' : 'Filter friends...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-cyan/50"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <>
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No friends yet</p>
                  <p className="text-xs text-white/30 mt-1">
                    Add friends to invite them to games
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 btn-primary py-2 px-4 text-sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2 inline" />
                    Add Friends
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => {
                    const status = getOnlineStatus(friend);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className="relative">
                          <span className="text-2xl">{friend.avatar || '👤'}</span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${
                              status === 'online' ? 'bg-green-500' : 'bg-white/30'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{friend.name}</p>
                          <p className={`text-xs ${status === 'online' ? 'text-green-400' : 'text-white/40'}`}>
                            {status === 'online' ? 'Online' : 'Offline'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {onInvite && (
                            <button
                              onClick={() => onInvite(friend)}
                              className="p-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30"
                              title="Invite to game"
                            >
                              <Gamepad2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg"
                            title="Remove friend"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <>
              {friendRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friendRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                    >
                      <span className="text-2xl">👤</span>
                      <div className="flex-1">
                        <p className="font-medium">{request.name}</p>
                        <p className="text-xs text-white/40">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(request.receivedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Add Friend Tab */}
          {activeTab === 'add' && (
            <>
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/50">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">
                    {searchQuery.length < 2 
                      ? 'Enter a name to search'
                      : 'No users found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => {
                    const isFriend = friends.some(f => f.id === result.id);
                    return (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                      >
                        <span className="text-2xl">{result.avatar || '👤'}</span>
                        <div className="flex-1">
                          <p className="font-medium">{result.name}</p>
                        </div>
                        {isFriend ? (
                          <span className="text-xs text-neon-cyan flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Friend
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(result.id)}
                            className="btn-primary py-2 px-4 text-sm"
                          >
                            <UserPlus className="w-4 h-4 mr-1 inline" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Add Options */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Invite via
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span className="text-sm">Email</span>
                  </button>
                  <button className="flex items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm">Message</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendsList;

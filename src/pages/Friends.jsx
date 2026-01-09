import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Search, Users, Send, X, Trash2, Gamepad2, ChevronRight, Copy, Check, Clock, RefreshCw, Loader2, UserCheck, UserX } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socket } from '../services/socket';
import BottomSheet from '../components/BottomSheet';

function Friends() {
  const navigate = useNavigate();
  const { user, currentGame } = useStore();
  
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [recentPlayers, setRecentPlayers] = useState([]);
  const [myFriendCode, setMyFriendCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'recent'
  const [swipedFriend, setSwipedFriend] = useState(null);
  
  // Load data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const [friendsRes, requestsRes, codeRes, recentRes] = await Promise.all([
        api.request('/friends'),
        api.request('/friends/requests'),
        api.request('/friends/code'),
        api.request('/friends/recent')
      ]);
      
      setFriends(friendsRes.friends || []);
      setIncomingRequests(requestsRes.incoming || []);
      setOutgoingRequests(requestsRes.outgoing || []);
      setMyFriendCode(codeRes.code || '');
      setRecentPlayers(recentRes.recentPlayers || []);
    } catch (err) {
      setError('Failed to load friends');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard?.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;
    
    setIsAdding(true);
    setAddError('');
    
    try {
      await api.request('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ code: friendCode.trim().toUpperCase() })
      });
      
      setFriendCode('');
      setShowAddSheet(false);
      loadData();
    } catch (err) {
      setAddError(err.message || 'Failed to send friend request');
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleAddFromRecent = async (userId) => {
    try {
      await api.request(`/friends/request/user/${userId}`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };
  
  const handleAcceptRequest = async (requestId) => {
    try {
      await api.request(`/friends/requests/${requestId}/accept`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };
  
  const handleDeclineRequest = async (requestId) => {
    try {
      await api.request(`/friends/requests/${requestId}/decline`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };
  
  const handleCancelRequest = async (requestId) => {
    try {
      await api.request(`/friends/requests/${requestId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };
  
  const handleRemoveFriend = async (friendId) => {
    try {
      await api.request(`/friends/${friendId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };
  
  const [inviteStatus, setInviteStatus] = useState({}); // { friendId: 'sending' | 'sent' | 'error' }

  const handleInviteToGame = (friendId, friendName) => {
    // If in a game, send invite. Otherwise go to create game
    if (currentGame) {
      setInviteStatus(prev => ({ ...prev, [friendId]: 'sending' }));

      socket.emit('game:invite:send', {
        friendId,
        gameCode: currentGame.code
      });

      // Listen for response
      const handleSent = (data) => {
        if (data.friendId === friendId) {
          setInviteStatus(prev => ({ ...prev, [friendId]: 'sent' }));
          // Reset after 3 seconds
          setTimeout(() => {
            setInviteStatus(prev => ({ ...prev, [friendId]: null }));
          }, 3000);
        }
      };

      const handleError = (data) => {
        setInviteStatus(prev => ({ ...prev, [friendId]: 'error' }));
        console.error('Invite error:', data.error);
        // Reset after 3 seconds
        setTimeout(() => {
          setInviteStatus(prev => ({ ...prev, [friendId]: null }));
        }, 3000);
      };

      socket.on('game:invite:sent', handleSent);
      socket.on('game:invite:error', handleError);

      // Cleanup listeners after a timeout
      setTimeout(() => {
        socket.off('game:invite:sent', handleSent);
        socket.off('game:invite:error', handleError);
      }, 5000);
    } else {
      navigate('/create');
    }
  };
  
  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const pendingCount = incomingRequests.length;
  
  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Friends</h1>
            <p className="text-xs text-white/50">{friends.length} friends</p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* My Friend Code Card */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 rounded-xl p-4 border border-neon-cyan/30">
          <p className="text-xs text-white/60 mb-1">Your Friend Code</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold tracking-wider flex-1">
              {myFriendCode || '--------'}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">Share this code with friends to connect</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-4 py-2 flex gap-2">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'friends' 
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
              : 'bg-white/5 text-white/60'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition relative ${
            activeTab === 'requests' 
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
              : 'bg-white/5 text-white/60'
          }`}
        >
          Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'recent' 
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
              : 'bg-white/5 text-white/60'
          }`}
        >
          Recent
        </button>
      </div>
      
      {/* Search (for friends tab) */}
      {activeTab === 'friends' && (
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 transition"
            />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-6">
            <p className="text-red-400">{error}</p>
            <button onClick={loadData} className="text-neon-cyan mt-2">Try again</button>
          </div>
        ) : activeTab === 'friends' ? (
          filteredFriends.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filteredFriends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  isSwiped={swipedFriend === friend.id}
                  onSwipeLeft={() => setSwipedFriend(friend.id)}
                  onSwipeRight={() => setSwipedFriend(null)}
                  onRemove={() => handleRemoveFriend(friend.id)}
                  onInvite={() => handleInviteToGame(friend.id, friend.name)}
                  inviteStatus={inviteStatus[friend.id]}
                  hasGame={!!currentGame}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Users}
              title={searchQuery ? 'No friends found' : 'No friends yet'}
              subtitle="Add friends with their friend code"
              action={() => setShowAddSheet(true)}
              actionLabel="Add Friend"
            />
          )
        ) : activeTab === 'requests' ? (
          <div className="px-4 space-y-4 py-2">
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">Incoming Requests</h3>
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl">{req.fromUser.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium">{req.fromUser.name}</p>
                        <p className="text-xs text-white/40">Wants to be friends</p>
                      </div>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">Sent Requests</h3>
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl">{req.toUser.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium">{req.toUser.name}</p>
                        <p className="text-xs text-white/40">Pending</p>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <EmptyState 
                icon={Clock}
                title="No pending requests"
                subtitle="Friend requests will appear here"
              />
            )}
          </div>
        ) : (
          <div className="px-4 py-2">
            {recentPlayers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-white/60 mb-2">Players you've recently played with</p>
                {recentPlayers.map((player) => {
                  const isFriend = friends.some(f => f.id === player.id);
                  const hasPendingRequest = outgoingRequests.some(r => r.toUser.id === player.id);
                  
                  return (
                    <div key={player.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-white/40">
                          Played {new Date(player.lastPlayed).toLocaleDateString()}
                        </p>
                      </div>
                      {isFriend ? (
                        <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                          Friends
                        </span>
                      ) : hasPendingRequest ? (
                        <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFromRecent(player.id)}
                          className="p-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                icon={Gamepad2}
                title="No recent players"
                subtitle="Play some games to see players here"
              />
            )}
          </div>
        )}
      </div>
      
      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <button
          onClick={() => setShowAddSheet(true)}
          className="w-full h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold active:scale-95 transition-transform"
        >
          <UserPlus className="w-6 h-6" />
          Add Friend
        </button>
      </div>
      
      {/* Add Friend Sheet */}
      <BottomSheet
        isOpen={showAddSheet}
        onClose={() => { setShowAddSheet(false); setAddError(''); setFriendCode(''); }}
        title="Add Friend"
      >
        <div className="space-y-4 pb-8">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Enter Friend Code</label>
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 transition uppercase"
              maxLength={8}
            />
          </div>
          
          {addError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {addError}
            </div>
          )}
          
          <button
            onClick={handleAddFriend}
            disabled={!friendCode.trim() || isAdding}
            className="w-full h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 transition"
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Send Friend Request
          </button>
          
          <div className="text-center">
            <p className="text-sm text-white/40">Share your code with friends:</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xl font-mono font-bold">{myFriendCode}</span>
              <button onClick={handleCopyCode} className="p-2 hover:bg-white/10 rounded-lg transition">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// Friend Card with swipe actions
function FriendCard({ friend, isSwiped, onSwipeLeft, onSwipeRight, onRemove, onInvite, inviteStatus, hasGame }) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else if (isSwiped) {
      setTranslateX(Math.min(-100 + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (translateX < -50) {
      setTranslateX(-100);
      onSwipeLeft();
    } else {
      setTranslateX(0);
      onSwipeRight();
    }
  };

  React.useEffect(() => {
    if (!isSwiped) setTranslateX(0);
  }, [isSwiped]);

  const getInviteButtonContent = () => {
    switch (inviteStatus) {
      case 'sending':
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case 'sent':
        return <Check className="w-6 h-6" />;
      case 'error':
        return <X className="w-6 h-6" />;
      default:
        return <Gamepad2 className="w-6 h-6" />;
    }
  };

  const getInviteButtonClass = () => {
    switch (inviteStatus) {
      case 'sent':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-neon-cyan';
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onInvite}
          disabled={inviteStatus === 'sending'}
          className={`w-20 ${getInviteButtonClass()} flex items-center justify-center transition-colors`}
          title={hasGame ? 'Invite to Game' : 'Create Game'}
        >
          {getInviteButtonContent()}
        </button>
        <button onClick={onRemove} className="w-20 bg-red-500 flex items-center justify-center">
          <Trash2 className="w-6 h-6" />
        </button>
      </div>

      <div
        className="relative bg-dark-800 p-4 flex items-center gap-4 transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          <span className="text-3xl">{friend.avatar}</span>
          {friend.isOnline && (
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-800" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{friend.name}</h3>
          <p className="text-xs text-white/50">
            {friend.isOnline ? (
              friend.inGame ? '🎮 In Game' : '🟢 Online'
            ) : friend.lastSeen ? (
              `Last seen ${new Date(friend.lastSeen).toLocaleDateString()}`
            ) : (
              'Offline'
            )}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/20" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-white/20" />
      </div>
      <p className="text-white/70 font-medium text-center mb-1">{title}</p>
      <p className="text-white/40 text-sm text-center mb-4">{subtitle}</p>
      {action && (
        <button onClick={action} className="text-neon-cyan font-medium">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default Friends;

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Search, Mail, MessageSquare, Users, Send, X, Trash2, Gamepad2, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import BottomSheet from '../components/BottomSheet';
import { useSwipe } from '../hooks/useGestures';

function Friends() {
  const navigate = useNavigate();
  const { friends, addFriend, removeFriend, games, user } = useStore();
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteValue, setInviteValue] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [swipedFriend, setSwipedFriend] = useState(null);
  
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
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const shareText = `Hey ${inviteName}! Join me on TAG - the GPS hunt game! 🏃‍♂️\n\nDownload: ${appUrl}`;
    
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
    setShowInviteSheet(false);
  };

  const handleSwipeLeft = (friendId) => {
    setSwipedFriend(friendId);
  };

  const handleSwipeRight = () => {
    setSwipedFriend(null);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
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
        </div>
      </div>
      
      {/* Search Bar - Sticky */}
      <div className="sticky top-[60px] z-30 bg-dark-900/95 backdrop-blur-sm px-4 py-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="input-field pl-12 py-3"
          />
        </div>
      </div>
      
      {/* Scrollable Friends List */}
      <div className="flex-1 overflow-y-auto pb-32">
        {filteredFriends.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredFriends.map((friend) => {
              const stats = getFriendStats(friend.id);
              const isSwiped = swipedFriend === friend.id;
              
              return (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  stats={stats}
                  isSwiped={isSwiped}
                  onSwipeLeft={() => handleSwipeLeft(friend.id)}
                  onSwipeRight={handleSwipeRight}
                  onRemove={() => {
                    removeFriend(friend.id);
                    setSwipedFriend(null);
                  }}
                  onInvite={() => {
                    // Navigate to game creation with this friend pre-selected
                    navigate('/create');
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/50 text-center mb-4">
              {searchQuery ? 'No friends found' : 'No friends yet'}
            </p>
            <button
              onClick={() => setShowInviteSheet(true)}
              className="text-neon-cyan font-medium"
            >
              Invite friends to play
            </button>
          </div>
        )}
        
        {/* Hint about swipe */}
        {filteredFriends.length > 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-white/30">← Swipe left on a friend for options</p>
          </div>
        )}
      </div>
      
      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <button
          onClick={() => setShowInviteSheet(true)}
          className="w-full h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold active:scale-95 transition-transform"
        >
          <UserPlus className="w-6 h-6" />
          Add Friend
        </button>
      </div>
      
      {/* Add Friend Bottom Sheet */}
      <BottomSheet
        isOpen={showInviteSheet}
        onClose={() => setShowInviteSheet(false)}
        title="Add Friend"
      >
        <div className="space-y-4 pb-8">
          <div>
            <label className="label text-sm mb-2 block">Name</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Friend's name"
              className="input-field py-4 text-lg"
              autoFocus
            />
          </div>
          <div>
            <label className="label text-sm mb-2 block">Email or Phone</label>
            <input
              type="text"
              value={inviteValue}
              onChange={(e) => setInviteValue(e.target.value)}
              placeholder="friend@email.com or +1555..."
              className="input-field py-4 text-lg"
            />
          </div>
          
          {/* Quick invite options */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                // Share via system share
                if (navigator.share) {
                  navigator.share({
                    title: 'Join me on TAG!',
                    text: 'Download TAG - the GPS hunt game!',
                    url: window.location.origin,
                  });
                }
              }}
              className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <MessageSquare className="w-6 h-6 text-neon-cyan" />
              <span className="text-sm">Share Link</span>
            </button>
            <button
              onClick={() => {
                // Copy invite link
                navigator.clipboard?.writeText(window.location.origin);
              }}
              className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <Mail className="w-6 h-6 text-neon-purple" />
              <span className="text-sm">Copy Link</span>
            </button>
          </div>
          
          <button
            onClick={handleInvite}
            disabled={!inviteName.trim() || !inviteValue.trim()}
            className="w-full h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 mt-4"
          >
            <Send className="w-6 h-6" />
            Send Invite
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// Swipeable Friend Card Component
function FriendCard({ friend, stats, isSwiped, onSwipeLeft, onSwipeRight, onRemove, onInvite }) {
  const cardRef = useRef(null);
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);
  
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Only allow left swipe (negative diff) up to -100px
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else if (isSwiped) {
      // Allow swiping back
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
  
  // Reset when swiped state changes externally
  React.useEffect(() => {
    if (!isSwiped) {
      setTranslateX(0);
    }
  }, [isSwiped]);
  
  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onInvite}
          className="w-20 bg-neon-cyan flex items-center justify-center"
        >
          <Gamepad2 className="w-6 h-6" />
        </button>
        <button
          onClick={onRemove}
          className="w-20 bg-red-500 flex items-center justify-center"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
      
      {/* Foreground card */}
      <div
        ref={cardRef}
        className="relative bg-dark-800 p-4 flex items-center gap-4 transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="text-3xl touch-target-48 flex items-center justify-center">
          {friend.avatar || '👤'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{friend.name}</h3>
          <p className="text-xs text-white/50 truncate">
            {friend.email || friend.phone || 'No contact'}
          </p>
          {stats.gamesPlayed > 0 && (
            <p className="text-xs text-neon-cyan mt-1">
              🎮 {stats.gamesPlayed} games together
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-white/20" />
      </div>
    </div>
  );
}

export default Friends;

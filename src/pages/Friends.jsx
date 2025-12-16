import React, { useState } from 'react';
import { UserPlus, X, Mail, Phone, Users, Trash2 } from 'lucide-react';
import { useStore } from '../store';

function Friends() {
  const { friends, addFriend, removeFriend } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    addFriend({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      avatar: '👤',
    });
    
    setName('');
    setEmail('');
    setPhone('');
    setShowAdd(false);
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Friends</h1>
          <p className="text-white/50 text-sm">Manage your contacts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add
        </button>
      </div>
      
      {/* Friends List */}
      {friends.length > 0 ? (
        <div className="space-y-2">
          {friends.map((friend) => (
            <div key={friend.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-xl">
                  {friend.avatar}
                </div>
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    {friend.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {friend.email}
                      </span>
                    )}
                    {friend.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {friend.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeFriend(friend.id)}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-all text-white/40 hover:text-red-400"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No friends added yet</p>
          <p className="text-sm text-white/30">Add friends to easily invite them to games</p>
        </div>
      )}
      
      {/* Add Friend Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="card-glow p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Friend</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friend's name"
                  className="input-field"
                  autoFocus
                  required
                />
              </div>
              
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@email.com"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="input-field"
                />
              </div>
              
              <button type="submit" className="btn-primary w-full">
                Add Friend
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friends;

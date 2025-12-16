import React, { useState } from 'react';
import { UserPlus, Zap } from 'lucide-react';
import { useStore } from '../store';

function SignupModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { setUser } = useStore();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setUser({
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      avatar: '😎',
      createdAt: Date.now(),
    });
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="card-glow p-6 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple mb-4">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
            TAG!
          </h1>
          <p className="text-white/60 mt-2">The GPS Hunter Game</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Your Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-field"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="label">Email (for invites)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field"
            />
          </div>
          
          <div>
            <label className="label">Phone (for SMS invites)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="input-field"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            Let's Play!
          </button>
        </form>
        
        {/* Features */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">📍</div>
              <div className="text-xs text-white/50">GPS Tracking</div>
            </div>
            <div>
              <div className="text-2xl mb-1">👥</div>
              <div className="text-xs text-white/50">Play with Friends</div>
            </div>
            <div>
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs text-white/50">Track Stats</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupModal;

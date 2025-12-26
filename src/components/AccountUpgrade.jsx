import React, { useState } from 'react';
import { Mail, Phone, Lock, Eye, EyeOff, Loader2, CheckCircle, Shield, X } from 'lucide-react';
import { supabaseAuth } from '../services/supabase';
import { api } from '../services/api';
import { useStore } from '../store';

export default function AccountUpgrade({ isOpen, onClose, onSuccess }) {
  const { user, setUser } = useStore();
  const [mode, setMode] = useState('email'); // 'email', 'phone', 'google'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);

  if (!isOpen) return null;

  const handleEmailUpgrade = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError('');

    try {
      // Link email to current account via backend
      const { user: updatedUser } = await api.request('/auth/link/email', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setUser(updatedUser);
      setSuccess('Email linked successfully! Your account is now secured.');
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to link email. It may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneUpgrade = async (e) => {
    e.preventDefault();
    
    if (!awaitingCode) {
      // Send verification code
      if (!phone) return;
      setIsLoading(true);
      setError('');

      try {
        await api.request('/auth/link/phone/send', {
          method: 'POST',
          body: JSON.stringify({ phone }),
        });
        setAwaitingCode(true);
        setSuccess('Verification code sent!');
      } catch (err) {
        setError(err.message || 'Failed to send code');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Verify code
      if (!verificationCode) return;
      setIsLoading(true);
      setError('');

      try {
        const { user: updatedUser } = await api.request('/auth/link/phone/verify', {
          method: 'POST',
          body: JSON.stringify({ phone, code: verificationCode }),
        });

        setUser(updatedUser);
        setSuccess('Phone linked successfully! Your account is now secured.');
        
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } catch (err) {
        setError(err.message || 'Invalid verification code');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleUpgrade = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (supabaseAuth.isConfigured()) {
        // This will redirect to Google
        await supabaseAuth.signInWithOAuth('google');
      } else {
        setError('Google sign-in is not available');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Secure Your Account</h2>
                <p className="text-sm text-white/60">Keep your progress safe</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 bg-indigo-500/10 border-b border-white/10">
          <p className="text-sm text-indigo-300">
            🎮 Linking your account lets you:
          </p>
          <ul className="text-sm text-white/70 mt-2 space-y-1">
            <li>• Recover your account if you lose your device</li>
            <li>• Play on multiple devices</li>
            <li>• Keep all your stats, achievements & friends</li>
          </ul>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-white/10">
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              onClick={() => { setMode('email'); setError(''); setSuccess(''); setAwaitingCode(false); }}
              className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                mode === 'email' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => { setMode('phone'); setError(''); setSuccess(''); setAwaitingCode(false); }}
              className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                mode === 'phone' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Phone
            </button>
            <button
              onClick={() => { setMode('google'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                mode === 'google' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Google
            </button>
          </div>
        </div>

        {/* Forms */}
        <div className="p-6">
          {mode === 'email' && (
            <form onSubmit={handleEmailUpgrade} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || success}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {success ? 'Linked!' : isLoading ? 'Linking...' : 'Link Email'}
              </button>
            </form>
          )}

          {mode === 'phone' && (
            <form onSubmit={handlePhoneUpgrade} className="space-y-4">
              {!awaitingCode ? (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-center text-2xl tracking-widest placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-white/40 mt-2 text-center">
                    Code sent to {phone}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (success && !awaitingCode)}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {awaitingCode ? 'Verify Code' : 'Send Code'}
              </button>
            </form>
          )}

          {mode === 'google' && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm text-center">
                Link your Google account for easy sign-in across all your devices.
              </p>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleUpgrade}
                disabled={isLoading}
                className="w-full py-3 bg-white text-gray-800 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>
          )}
        </div>

        {/* Skip option */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2 text-white/40 hover:text-white/60 transition text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

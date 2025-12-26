import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Smartphone, Check, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import { socketService } from '../services/socket';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, syncGameState } = useStore();
  
  const [mode, setMode] = useState('email'); // 'email', 'phone', or 'quick'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [avatar, setAvatar] = useState('🏃');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [providers, setProviders] = useState({});
  
  const avatars = ['🏃', '🏃‍♀️', '🏃‍♂️', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐉', '👤', '⭐'];
  
  // Handle OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    
    if (token && refreshToken) {
      api.setToken(token);
      api.setRefreshToken(refreshToken);
      handlePostLogin();
    }
  }, [searchParams]);
  
  // Fetch available auth providers
  useEffect(() => {
    api.request('/auth/providers').then(setProviders).catch(() => {});
  }, []);
  
  const handlePostLogin = async () => {
    try {
      const { user } = await api.getMe();
      setUser(user);
      socketService.connect();
      navigate('/');
    } catch (err) {
      setError('Failed to complete signup');
    }
  };
  
  const handleRequestLocation = () => {
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('granted'),
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true }
    );
  };
  
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { user, token, refreshToken } = await api.request('/auth/register/email', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, avatar }),
      });
      
      api.setToken(token);
      api.setRefreshToken(refreshToken);
      setUser(user);
      socketService.connect();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhoneRegister = async (e) => {
    e.preventDefault();
    if (!phone || !name) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.request('/auth/register/phone', {
        method: 'POST',
        body: JSON.stringify({ phone, name, avatar }),
      });
      setAwaitingCode(true);
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { user, token, refreshToken } = await api.request('/auth/verify/phone', {
        method: 'POST',
        body: JSON.stringify({ phone, code: verificationCode }),
      });
      
      api.setToken(token);
      api.setRefreshToken(refreshToken);
      setUser(user);
      socketService.connect();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuickRegister = async (e) => {
    e.preventDefault();
    if (!name) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { user, token, refreshToken } = await api.register(name, avatar);
      setUser(user);
      socketService.connect();
      navigate('/');
    } catch (err) {
      // Fallback to local-only mode
      const localUser = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        avatar,
        createdAt: Date.now(),
        isOffline: true,
      };
      setUser(localUser);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignup = async () => {
    try {
      const { url } = await api.request('/auth/google?state=' + encodeURIComponent(window.location.href));
      window.location.href = url;
    } catch (err) {
      setError('Google signup not available');
    }
  };
  
  const handleAppleSignup = async () => {
    try {
      const { url } = await api.request('/auth/apple?state=' + encodeURIComponent(window.location.href));
      window.location.href = url;
    } catch (err) {
      setError('Apple Sign Up not available');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
              TAG!
            </h1>
            <p className="text-white/60">Create your account</p>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('email'); setError(''); setAwaitingCode(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'email' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => { setMode('phone'); setError(''); setAwaitingCode(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'phone' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Phone
            </button>
            <button
              onClick={() => { setMode('quick'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'quick' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Quick Play
            </button>
          </div>
          
          {/* Register Form */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            {/* Avatar Selection */}
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">Choose Avatar</label>
              <div className="flex flex-wrap gap-2 justify-center">
                {avatars.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`text-2xl p-2 rounded-xl transition-all ${
                      avatar === a
                        ? 'bg-indigo-500/30 ring-2 ring-indigo-400 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            
            {mode === 'email' ? (
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      maxLength={30}
                      required
                    />
                  </div>
                </div>
                
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
                  <label className="block text-sm text-white/60 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      minLength={8}
                      required
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
                
                <div>
                  <label className="block text-sm text-white/60 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      required
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            ) : mode === 'phone' ? (
              <form onSubmit={awaitingCode ? handleVerifyCode : handlePhoneRegister} className="space-y-4">
                {!awaitingCode ? (
                  <>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Phone Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
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
                  </>
                ) : (
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-widest placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      maxLength={6}
                      required
                    />
                    <p className="text-sm text-white/40 mt-2 text-center">Code sent to {phone}</p>
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {awaitingCode ? 'Verify Code' : 'Send Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleQuickRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      maxLength={20}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-2">Location Access</label>
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={locationStatus === 'granted'}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                      locationStatus === 'granted'
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                        : locationStatus === 'denied'
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {locationStatus === 'granted' ? <Check className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    <span className="flex-1 text-left">
                      {locationStatus === 'pending' && 'Enable Location'}
                      {locationStatus === 'requesting' && 'Requesting...'}
                      {locationStatus === 'granted' && 'Location Enabled'}
                      {locationStatus === 'denied' && 'Location Denied - Tap to retry'}
                    </span>
                  </button>
                  <p className="text-xs text-white/40 mt-2">Required to play TAG!</p>
                </div>
                
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
                  ⚠️ Quick Play accounts can't be recovered if you lose access. Consider email signup for a permanent account.
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isLoading ? 'Starting...' : 'Start Playing'}
                </button>
              </form>
            )}
            
            {/* Divider */}
            {(providers.google || providers.apple) && (
              <>
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-white/40 text-sm">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>
                
                {/* OAuth Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {providers.google && (
                    <button
                      onClick={handleGoogleSignup}
                      className="py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                  )}
                  {providers.apple && (
                    <button
                      onClick={handleAppleSignup}
                      className="py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Apple
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Login Link */}
          <p className="text-center text-white/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

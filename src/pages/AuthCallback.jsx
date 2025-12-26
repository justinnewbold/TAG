import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabaseAuth, supabase } from '../services/supabase';
import { api } from '../services/api';
import { useStore } from '../store';
import { socketService } from '../services/socket';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser, syncGameState } = useStore();
  
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Check for error in URL
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Check for Supabase auth
      if (supabaseAuth.isConfigured()) {
        // Handle hash fragment (for implicit flow)
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Handle different auth types
        if (type === 'recovery') {
          // Password reset - redirect to reset password page
          setMessage('Redirecting to password reset...');
          setTimeout(() => navigate('/reset-password'), 1000);
          return;
        }

        if (type === 'signup' || type === 'magiclink') {
          setMessage('Email verified! Logging you in...');
        }

        // Get or exchange session
        let session;
        
        // Check for code (PKCE flow)
        const code = searchParams.get('code');
        if (code) {
          setMessage('Exchanging authorization code...');
          const { session: exchangedSession } = await supabaseAuth.exchangeCodeForSession(code);
          session = exchangedSession;
        } else {
          // Try to get existing session
          session = await supabaseAuth.getSession();
        }

        if (session?.user) {
          setMessage('Syncing with game server...');
          await syncUserWithBackend(session);
          setStatus('success');
          setMessage('Authentication successful!');
          
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
          return;
        }
      }

      // Check for legacy token callback
      const token = searchParams.get('token');
      const legacyRefreshToken = searchParams.get('refreshToken');
      
      if (token && legacyRefreshToken) {
        setMessage('Completing login...');
        api.setToken(token);
        api.setRefreshToken(legacyRefreshToken);
        
        const { user } = await api.getMe();
        setUser(user);
        socketService.connect();
        
        setStatus('success');
        setMessage('Login successful!');
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
        return;
      }

      // No auth data found
      throw new Error('No authentication data received');
      
    } catch (err) {
      console.error('Auth callback error:', err);
      setStatus('error');
      setMessage(err.message || 'Authentication failed. Please try again.');
    }
  };

  const syncUserWithBackend = async (session) => {
    const supabaseUser = session.user;
    
    const { user, token, refreshToken } = await api.request('/auth/supabase', {
      method: 'POST',
      body: JSON.stringify({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        phone: supabaseUser.phone,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Player',
        avatar: supabaseUser.user_metadata?.avatar || '😀',
        provider: supabaseUser.app_metadata?.provider || 'email',
      }),
    });
    
    api.setToken(token);
    api.setRefreshToken(refreshToken);
    setUser(user);
    socketService.connect();
    
    // Check for existing game
    try {
      const { game } = await api.getCurrentGame();
      if (game) syncGameState(game);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          )}
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold mb-2">
          {status === 'processing' && 'Please Wait'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Oops!'}
        </h1>
        <p className="text-white/60 mb-6">{message}</p>

        {/* Error Actions */}
        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-indigo-500 rounded-xl font-semibold hover:bg-indigo-600 transition"
            >
              Back to Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

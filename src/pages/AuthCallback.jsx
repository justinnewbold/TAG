import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail, Lock, Chrome, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import { socketService } from '../services/socket';

/**
 * Auth Callback Handler
 * Handles:
 * - Magic link redirects (email sign-in links)
 * - Google OAuth returns
 * - Password reset completions
 * - Account linking confirmations
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser, syncGameState } = useStore();
  
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('');
  const [authType, setAuthType] = useState(null); // 'magic_link', 'google', 'password_reset', 'account_link'

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Parse the hash fragment for Supabase auth
      const hashParams = new URLSearchParams(location.hash.slice(1));
      const queryParams = Object.fromEntries(searchParams.entries());
      
      // Combine hash and query params
      const params = {
        ...queryParams,
        access_token: hashParams.get('access_token') || queryParams.access_token,
        refresh_token: hashParams.get('refresh_token') || queryParams.refresh_token,
        type: hashParams.get('type') || queryParams.type,
        error: hashParams.get('error') || queryParams.error,
        error_description: hashParams.get('error_description') || queryParams.error_description,
      };

      // Check for error in callback
      if (params.error) {
        throw new Error(params.error_description || params.error);
      }

      // Determine auth type
      const type = params.type || (params.provider === 'google' ? 'google' : 'magic_link');
      setAuthType(type);

      // Handle password recovery - redirect to reset password page
      if (type === 'recovery') {
        setStatus('success');
        setMessage('Redirecting to password reset...');
        
        // Redirect to forgot password page with the token
        setTimeout(() => {
          navigate(`/forgot-password?type=recovery&access_token=${params.access_token}`);
        }, 1000);
        return;
      }

      // Handle email confirmation
      if (type === 'signup' || type === 'email_confirmation') {
        setStatus('success');
        setMessage('Email confirmed! Signing you in...');
        // Continue with sign in flow below
      }

      // Handle magic link sign in
      if (type === 'magiclink') {
        setAuthType('magic_link');
        setMessage('Magic link verified! Signing you in...');
      }

      // Handle Google OAuth
      if (type === 'google' || params.provider === 'google') {
        setAuthType('google');
        setMessage('Google sign in successful!');
      }

      // Handle account linking
      if (params.link === 'true') {
        setAuthType('account_link');
        setMessage('Account linked successfully!');
      }

      // Process tokens
      const token = params.access_token;
      const refreshToken = params.refresh_token;

      if (!token) {
        // Check for OAuth callback format (from Railway backend)
        if (params.token && params.refreshToken) {
          api.setToken(params.token);
          api.setRefreshToken(params.refreshToken);
        } else {
          throw new Error('No authentication tokens received');
        }
      } else {
        // Exchange Supabase tokens with our backend
        const response = await api.request('/auth/token', {
          method: 'POST',
          body: JSON.stringify({ 
            access_token: token, 
            refresh_token: refreshToken 
          }),
        });

        api.setToken(response.token);
        api.setRefreshToken(response.refreshToken);
      }

      // Get user profile
      const { user } = await api.getMe();
      setUser(user);

      // Connect socket
      socketService.connect();

      // Try to get current game
      try {
        const { game } = await api.getCurrentGame();
        if (game) syncGameState(game);
      } catch (e) {
        // No active game, that's fine
      }

      setStatus('success');
      setMessage(getSuccessMessage(authType));

      // Redirect after short delay
      setTimeout(() => {
        // Check for intended destination in state
        const from = params.state || params.redirect || '/';
        try {
          const url = new URL(from, window.location.origin);
          navigate(url.pathname);
        } catch {
          navigate('/');
        }
      }, 1500);

    } catch (err) {
      console.error('Auth callback error:', err);
      setStatus('error');
      setMessage(err.message || 'Authentication failed. Please try again.');
    }
  };

  const getSuccessMessage = (type) => {
    switch (type) {
      case 'magic_link':
        return 'Magic link verified! Welcome back.';
      case 'google':
        return 'Google sign in successful!';
      case 'account_link':
        return 'Account linked! Your progress is now secured.';
      case 'recovery':
        return 'Password reset link verified!';
      default:
        return 'Sign in successful!';
    }
  };

  const getIcon = () => {
    if (status === 'processing') {
      return <Loader2 className="w-12 h-12 animate-spin text-neon-cyan" />;
    }
    if (status === 'error') {
      return <XCircle className="w-12 h-12 text-red-400" />;
    }
    
    switch (authType) {
      case 'magic_link':
        return <Mail className="w-12 h-12 text-neon-cyan" />;
      case 'google':
        return <Chrome className="w-12 h-12 text-green-400" />;
      case 'recovery':
        return <Lock className="w-12 h-12 text-purple-400" />;
      default:
        return <CheckCircle className="w-12 h-12 text-green-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status === 'error' 
              ? 'bg-red-500/20' 
              : status === 'success' 
              ? 'bg-green-500/20' 
              : 'bg-neon-cyan/20'
          }`}>
            {getIcon()}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            {status === 'processing' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>

          {/* Message */}
          <p className={`text-center mb-6 ${
            status === 'error' ? 'text-red-400' : 'text-white/60'
          }`}>
            {message || 'Please wait...'}
          </p>

          {/* Progress indicator for processing */}
          {status === 'processing' && (
            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple animate-progress" />
            </div>
          )}

          {/* Error actions */}
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 text-white/60 hover:text-white transition"
              >
                Go Home
              </button>
            </div>
          )}

          {/* Success indicator */}
          {status === 'success' && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Redirecting...</span>
            </div>
          )}
        </div>

        {/* Help text */}
        {status === 'error' && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-400 font-medium mb-1">Having trouble?</p>
                <ul className="text-white/60 space-y-1">
                  <li>• Make sure you're using the latest link from your email</li>
                  <li>• Links expire after 1 hour</li>
                  <li>• Try requesting a new link</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS for progress animation */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); width: 100%; }
          50% { transform: translateX(0%); width: 100%; }
          100% { transform: translateX(100%); width: 100%; }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

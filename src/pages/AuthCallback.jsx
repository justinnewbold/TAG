import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail, Lock, Chrome, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import { socketService } from '../services/socket';
import { supabase, supabaseAuth } from '../services/supabase';

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
  const [message, setMessage] = useState('Verifying authentication...');
  const [authType, setAuthType] = useState(null); // 'magic_link', 'google', 'password_reset', 'account_link'

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Parse the hash fragment for Supabase auth
      const hashParams = new URLSearchParams(location.hash.slice(1));
      const queryParams = Object.fromEntries(searchParams.entries());
      
      // Check for error in callback first
      const error = hashParams.get('error') || queryParams.error;
      const errorDescription = hashParams.get('error_description') || queryParams.error_description;
      
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Get tokens from hash (Supabase OAuth/magic link format)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.type;
      const providerToken = hashParams.get('provider_token');

      console.log('Auth callback received:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        type,
        hasProviderToken: !!providerToken
      });

      // Determine auth type
      if (type === 'recovery') {
        setAuthType('recovery');
        setStatus('success');
        setMessage('Redirecting to password reset...');
        
        // For password recovery, redirect to forgot password page
        setTimeout(() => {
          navigate(`/forgot-password?type=recovery&access_token=${accessToken}`);
        }, 1000);
        return;
      }

      // Set auth type based on callback params
      if (providerToken || type === 'oauth') {
        setAuthType('google');
        setMessage('Google sign in successful!');
      } else if (type === 'magiclink') {
        setAuthType('magic_link');
        setMessage('Magic link verified!');
      } else if (type === 'signup' || type === 'email_confirmation') {
        setAuthType('email');
        setMessage('Email confirmed!');
      } else if (queryParams.link === 'true') {
        setAuthType('account_link');
        setMessage('Account linked successfully!');
      }

      // Handle tokens - use Supabase to set the session
      if (accessToken && refreshToken) {
        setMessage('Setting up your session...');
        
        // Use Supabase to set the session from the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Supabase session error:', sessionError);
          throw new Error(sessionError.message || 'Failed to establish session');
        }

        if (!sessionData.session) {
          throw new Error('Failed to create session');
        }

        console.log('Supabase session established:', sessionData.session.user?.email);
        setMessage('Connecting to game server...');

        // Now exchange Supabase session with our backend
        try {
          const response = await api.request('/auth/token', {
            method: 'POST',
            body: JSON.stringify({ 
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
            }),
          });

          if (response.token) {
            api.setToken(response.token);
            if (response.refreshToken) {
              api.setRefreshToken(response.refreshToken);
            }
          }
        } catch (backendError) {
          console.error('Backend token exchange error:', backendError);
          // Continue anyway - we have a valid Supabase session
          // The app can still work with Supabase auth
        }

      } else if (queryParams.code) {
        // Handle OAuth code flow (PKCE)
        setMessage('Exchanging authorization code...');
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryParams.code);
        
        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange code for session');
        }

        if (!data.session) {
          throw new Error('No session received from code exchange');
        }

        // Exchange with backend
        try {
          const response = await api.request('/auth/token', {
            method: 'POST',
            body: JSON.stringify({ 
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });

          if (response.token) {
            api.setToken(response.token);
            if (response.refreshToken) {
              api.setRefreshToken(response.refreshToken);
            }
          }
        } catch (backendError) {
          console.error('Backend token exchange error:', backendError);
        }

      } else {
        // No tokens in URL, check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No authentication tokens received. Please try signing in again.');
        }
        
        // We have an existing session, use it
        try {
          const response = await api.request('/auth/token', {
            method: 'POST',
            body: JSON.stringify({ 
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });

          if (response.token) {
            api.setToken(response.token);
            if (response.refreshToken) {
              api.setRefreshToken(response.refreshToken);
            }
          }
        } catch (backendError) {
          console.error('Backend token exchange error:', backendError);
        }
      }

      // Get user profile from our backend
      setMessage('Loading your profile...');
      try {
        const { user } = await api.getMe();
        setUser(user);
      } catch (profileError) {
        // If backend fails, try to get user from Supabase
        console.warn('Backend profile fetch failed, using Supabase user');
        const supabaseUser = await supabaseAuth.getUser();
        if (supabaseUser) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
            avatar: supabaseUser.user_metadata?.avatar_url,
          });
        }
      }

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
        // Check for intended destination
        const redirectTo = queryParams.redirect || queryParams.state || '/';
        try {
          const url = new URL(redirectTo, window.location.origin);
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
      case 'email':
        return 'Email confirmed! Welcome to TAG!';
      default:
        return 'Sign in successful!';
    }
  };

  const getIcon = () => {
    if (status === 'processing') {
      return <Loader2 className="w-12 h-12 animate-spin text-accent-primary" />;
    }
    if (status === 'error') {
      return <XCircle className="w-12 h-12 text-red-500" />;
    }
    
    switch (authType) {
      case 'magic_link':
        return <Mail className="w-12 h-12 text-accent-primary" />;
      case 'google':
        return <Chrome className="w-12 h-12 text-green-500" />;
      case 'recovery':
        return <Lock className="w-12 h-12 text-accent-secondary" />;
      default:
        return <CheckCircle className="w-12 h-12 text-green-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-light-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status === 'error' 
              ? 'bg-red-100' 
              : status === 'success' 
              ? 'bg-green-100' 
              : 'bg-accent-primary/10'
          }`}>
            {getIcon()}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-900">
            {status === 'processing' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>

          {/* Message */}
          <p className={`text-center mb-6 ${
            status === 'error' ? 'text-red-600' : 'text-slate-600'
          }`}>
            {message || 'Please wait...'}
          </p>

          {/* Progress indicator for processing */}
          {status === 'processing' && (
            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary animate-progress" />
            </div>
          )}

          {/* Error actions */}
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold hover:opacity-90 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 text-slate-500 hover:text-slate-700 transition"
              >
                Go Home
              </button>
            </div>
          )}

          {/* Success indicator */}
          {status === 'success' && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Redirecting...</span>
            </div>
          )}
        </div>

        {/* Help text */}
        {status === 'error' && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-700 font-medium mb-1">Having trouble?</p>
                <ul className="text-slate-600 space-y-1">
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

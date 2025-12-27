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
 * - Google OAuth returns (with hash fragment tokens)
 * - Password reset completions
 * - Account linking confirmations
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser, syncGameState } = useStore();
  
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verifying authentication...');
  const [authType, setAuthType] = useState(null);

  useEffect(() => {
    // Small delay to allow Supabase to process the URL hash
    const timer = setTimeout(() => {
      handleAuthCallback();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('Auth callback starting...');
      console.log('Location hash:', location.hash);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));

      // First, check if Supabase already detected and processed the session
      // This happens automatically when detectSessionInUrl is true
      let session = null;
      
      // Try to get the session - Supabase may have already processed the hash
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      if (sessionData?.session) {
        console.log('Found existing session from Supabase');
        session = sessionData.session;
      }

      // If no session yet, try to manually process the hash
      if (!session && location.hash) {
        console.log('Manually processing hash fragment...');
        const hashParams = new URLSearchParams(location.hash.slice(1));
        
        // Check for error first
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        if (error) {
          throw new Error(errorDescription || error);
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Hash params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        });

        // Handle password recovery redirect
        if (type === 'recovery') {
          setAuthType('recovery');
          setStatus('success');
          setMessage('Redirecting to password reset...');
          setTimeout(() => {
            navigate(`/forgot-password?type=recovery&access_token=${accessToken}`);
          }, 1000);
          return;
        }

        // Set session from tokens if available
        if (accessToken && refreshToken) {
          setMessage('Establishing session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('setSession error:', error);
            throw new Error(error.message);
          }

          if (data?.session) {
            session = data.session;
            console.log('Session established from hash tokens');
          }
        }
      }

      // Check for OAuth code (PKCE flow)
      const code = searchParams.get('code');
      if (!session && code) {
        console.log('Exchanging OAuth code...');
        setMessage('Exchanging authorization code...');
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Code exchange error:', error);
          throw new Error(error.message);
        }
        
        if (data?.session) {
          session = data.session;
          console.log('Session established from code exchange');
        }
      }

      // Final check - if still no session, we have a problem
      if (!session) {
        // One more attempt to get session (Supabase might have processed it async)
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData } = await supabase.auth.getSession();
        
        if (retryData?.session) {
          session = retryData.session;
          console.log('Session found on retry');
        } else {
          throw new Error('No authentication tokens received. Please try signing in again.');
        }
      }

      // We have a valid session!
      console.log('Session user:', session.user?.email);
      setMessage('Connecting to game server...');

      // Determine auth type for display
      const provider = session.user?.app_metadata?.provider;
      if (provider === 'google') {
        setAuthType('google');
      } else if (provider === 'email') {
        setAuthType('magic_link');
      } else {
        setAuthType('email');
      }

      // Exchange Supabase session with our backend
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
          console.log('Backend token exchange successful');
        }
      } catch (backendError) {
        console.warn('Backend token exchange failed:', backendError.message);
        // Continue anyway - we have a valid Supabase session
      }

      // Get user profile
      setMessage('Loading your profile...');
      try {
        const { user } = await api.getMe();
        setUser(user);
      } catch (profileError) {
        console.warn('Backend profile fetch failed, using Supabase user');
        const user = session.user;
        setUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'Player',
          avatar: user.user_metadata?.avatar_url,
        });
      }

      // Connect socket
      socketService.connect();

      // Try to get current game
      try {
        const { game } = await api.getCurrentGame();
        if (game) syncGameState(game);
      } catch (e) {
        // No active game
      }

      setStatus('success');
      setMessage(getSuccessMessage(authType));

      // Redirect after delay
      setTimeout(() => {
        const redirectTo = searchParams.get('redirect') || searchParams.get('state') || '/';
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
      default:
        return 'Sign in successful!';
    }
  };

  const getIcon = () => {
    if (status === 'processing') {
      return <Loader2 className="w-12 h-12 animate-spin text-sky-500" />;
    }
    if (status === 'error') {
      return <XCircle className="w-12 h-12 text-red-500" />;
    }
    
    switch (authType) {
      case 'magic_link':
        return <Mail className="w-12 h-12 text-sky-500" />;
      case 'google':
        return <Chrome className="w-12 h-12 text-emerald-500" />;
      case 'recovery':
        return <Lock className="w-12 h-12 text-violet-500" />;
      default:
        return <CheckCircle className="w-12 h-12 text-emerald-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status === 'error' 
              ? 'bg-red-50' 
              : status === 'success' 
              ? 'bg-emerald-50' 
              : 'bg-sky-50'
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
            status === 'error' ? 'text-red-600' : 'text-slate-500'
          }`}>
            {message || 'Please wait...'}
          </p>

          {/* Progress indicator */}
          {status === 'processing' && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-violet-500 animate-progress" />
            </div>
          )}

          {/* Error actions */}
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-violet-500 text-white rounded-xl font-semibold hover:opacity-90 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 text-slate-400 hover:text-slate-600 transition"
              >
                Go Home
              </button>
            </div>
          )}

          {/* Success indicator */}
          {status === 'success' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
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
                  <li>• Clear your browser cache and try again</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

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

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL params (OAuth flow)
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from provider
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Handle password reset flow
        const type = searchParams.get('type');
        if (type === 'recovery') {
          setStatus('Redirecting to password reset...');
          navigate('/reset-password');
          return;
        }

        // Handle email verification
        if (type === 'signup' || type === 'email_change') {
          setStatus('Email verified! Redirecting...');
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        // Handle OAuth code exchange (Google, etc.)
        if (code) {
          setStatus('Completing sign in...');
          
          // Exchange the code for a session using Supabase's built-in method
          // This replaces the old call to /api/auth/token which was returning 404
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            throw exchangeError;
          }

          if (data.session) {
            setStatus('Sign in successful! Redirecting...');
            setTimeout(() => navigate('/'), 1000);
            return;
          }
        }

        // Check if we already have a session (magic link flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          setStatus('Already signed in! Redirecting...');
          setTimeout(() => navigate('/'), 1000);
          return;
        }

        // No code and no session - something went wrong
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    &lt;div className="min-h-screen flex items-center justify-center bg-slate-50"&gt;
      &lt;div className="text-center p-8 max-w-md"&gt;
        {error ? (
          &lt;div className="space-y-4"&gt;
            &lt;div className="text-red-500 text-6xl"&gt;⚠️&lt;/div&gt;
            &lt;h1 className="text-2xl font-bold text-slate-900"&gt;Authentication Error&lt;/h1&gt;
            &lt;p className="text-red-600"&gt;{error}&lt;/p&gt;
            &lt;p className="text-slate-500 text-sm"&gt;Redirecting to login...&lt;/p&gt;
          &lt;/div&gt;
        ) : (
          &lt;div className="space-y-4"&gt;
            &lt;div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"&gt;&lt;/div&gt;
            &lt;h1 className="text-2xl font-bold text-slate-900"&gt;{status}&lt;/h1&gt;
            &lt;p className="text-slate-500"&gt;Please wait...&lt;/p&gt;
          &lt;/div&gt;
        )}
      &lt;/div&gt;
    &lt;/div&gt;
  );
}
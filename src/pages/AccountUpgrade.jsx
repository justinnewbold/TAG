import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { useToast } from '../components/Toast';
import { api } from '../services/api';

export default function AccountUpgrade() {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const { showToast } = useToast();
  const [step, setStep] = useState('choice'); // choice, email, google
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?upgrade=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google upgrade error:', error);
      showToast(error.message || 'Failed to upgrade with Google', 'error');
      setIsLoading(false);
    }
  };

  const handleEmailUpgrade = async (e) => {
    e.preventDefault();
    if (!email || !password || !username) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Update the anonymous user with email/password
      const { data, error } = await supabase.auth.updateUser({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Update username on backend
      await api.put('/auth/profile', { username });

      // Update local user state
      setUser({ ...user, email, username, isAnonymous: false });
      
      showToast('Account upgraded successfully! Check your email to verify.', 'success');
      navigate('/home');
    } catch (error) {
      console.error('Email upgrade error:', error);
      showToast(error.message || 'Failed to upgrade account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.isAnonymous) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Already Upgraded!</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Your account is already a full account.</p>
          <button onClick={() => navigate('/home')} className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-xl">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        {step === 'choice' && (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">⬆️</div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upgrade Your Account</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Save your progress, stats, and achievements forever!
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Benefits of Upgrading</h3>
                <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                  <li>✓ Keep all your stats and XP</li>
                  <li>✓ Save achievements permanently</li>
                  <li>✓ Add friends and join clans</li>
                  <li>✓ Compete on leaderboards</li>
                  <li>✓ Sign in on any device</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogleUpgrade}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => setStep('email')}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl"
              >
                Continue with Email
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 px-4 text-slate-500 dark:text-slate-400 font-medium"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}

        {step === 'email' && (
          <>
            <div className="text-center mb-6">
              <button onClick={() => setStep('choice')} className="text-blue-500 text-sm mb-4">← Back</button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Your Account</h1>
            </div>

            <form onSubmit={handleEmailUpgrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Your display name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                  placeholder="Min 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {isLoading ? 'Upgrading...' : 'Upgrade Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

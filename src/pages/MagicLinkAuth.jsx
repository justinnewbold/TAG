import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';

export default function MagicLinkAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useStore(state => state.setUser);
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your magic link...');
  
  useEffect(() => {
    const verifyMagicLink = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      
      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid magic link. Please request a new one.');
        return;
      }
      
      try {
        // In a production app, verify the token server-side
        // For now, we'll create the user session directly
        
        // Simulate verification delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create user from magic link
        const user = {
          id: `user_${Date.now()}`,
          email,
          name: email.split('@')[0], // Use email prefix as default name
          avatar: '🏃',
          authMethod: 'magic_link',
          createdAt: new Date().toISOString(),
          verified: true
        };
        
        // Store user
        setUser(user);
        localStorage.setItem('tag-user', JSON.stringify(user));
        
        setStatus('success');
        setMessage('Successfully signed in!');
        
        // Redirect to home after success
        setTimeout(() => {
          navigate('/home');
        }, 2000);
        
      } catch (error) {
        console.error('Magic link verification failed:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to verify magic link. Please try again.');
      }
    };
    
    verifyMagicLink();
  }, [searchParams, setUser, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-cyan-400">TAG</span>
            <span className="text-purple-500">!</span>
          </h1>
        </div>
        
        {/* Status Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 text-center">
          {status === 'verifying' && (
            <>
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                <div className="relative bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full w-full h-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifying...</h2>
              <p className="text-white/60">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-full h-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
              <p className="text-white/60 mb-4">{message}</p>
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Sparkles className="w-5 h-5" />
                <span>Redirecting to game...</span>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="relative bg-gradient-to-br from-red-500 to-rose-600 rounded-full w-full h-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
              <p className="text-white/60 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
        
        {/* Help Text */}
        <p className="text-center text-white/40 text-sm mt-6">
          Having trouble? Try requesting a new magic link.
        </p>
      </div>
    </div>
  );
}

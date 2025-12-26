import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import { socketService } from '../services/socket';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, syncGameState } = useStore();
  const [error, setError] = useState('');
  
  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const errorMsg = searchParams.get('message');
      
      if (errorMsg) {
        setError(decodeURIComponent(errorMsg));
        return;
      }
      
      if (!token || !refreshToken) {
        setError('Missing authentication tokens');
        return;
      }
      
      try {
        api.setToken(token);
        api.setRefreshToken(refreshToken);
        
        const { user } = await api.getMe();
        setUser(user);
        socketService.connect();
        
        try {
          const { game } = await api.getCurrentGame();
          if (game) syncGameState(game);
        } catch (e) {}
        
        // Redirect to original destination or home
        const state = searchParams.get('state');
        if (state) {
          try {
            const url = new URL(state);
            navigate(url.pathname);
            return;
          } catch (e) {}
        }
        navigate('/');
      } catch (err) {
        setError('Authentication failed');
      }
    };
    
    handleCallback();
  }, [searchParams]);
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-indigo-500 rounded-xl font-medium hover:bg-indigo-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
        <p className="text-white/60">Completing sign in...</p>
      </div>
    </div>
  );
}

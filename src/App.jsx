import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from './store';
import { api } from './services/api';
import { socketService } from './services/socket';

// Pages
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import ActiveGame from './pages/ActiveGame';
import Stats from './pages/Stats';
import Friends from './pages/Friends';
import Settings from './pages/Settings';
import GameHistory from './pages/GameHistory';
import Leaderboards from './pages/Leaderboards';
import Achievements from './pages/Achievements';
import NotFound from './pages/NotFound';

// Components
import Navigation from './components/Navigation';
import SignupModal from './components/SignupModal';
import AchievementToast from './components/AchievementToast';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorToast from './components/ErrorToast';
import { GameErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { user, currentGame, setUser, syncGameState } = useStore();
  const [showSignup, setShowSignup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Try to re-authenticate with existing token on app load
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = api.getToken();

      if (existingToken && !user) {
        try {
          // Try to login with existing token
          const { user: authUser } = await api.login(existingToken);
          setUser(authUser);

          // Socket connection is handled by the useEffect that watches user state
          // Try to get current game if any
          try {
            const { game } = await api.getCurrentGame();
            if (game) {
              syncGameState(game);
              // Join game room after socket connects (handled in useEffect)
            }
          } catch (e) {
            // No current game, that's ok
          }
        } catch (err) {
          // Token invalid, clear it
          if (import.meta.env.DEV) console.log('Auth token invalid, clearing');
          api.logout();
          setShowSignup(true);
        }
      } else if (!user) {
        setShowSignup(true);
      }

      setIsInitializing(false);
    };

    initAuth();
  }, []);

  // Connect socket when user is set
  useEffect(() => {
    if (user && !isInitializing) {
      socketService.connect();
      // Join game room if there's an active game
      if (currentGame?.id) {
        socketService.joinGameRoom(currentGame.id);
      }
    }
  }, [user, isInitializing, currentGame?.id]);

  // Request location permission and send updates - only when in active game to save battery
  useEffect(() => {
    // Only track location during active gameplay
    if (!user || !currentGame?.status || currentGame.status !== 'active' || !('geolocation' in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Update store
        useStore.getState().updateUserLocation(location);

        // Send to server via socket if connected
        if (socketService.isConnected()) {
          socketService.updateLocation(location);
        }
      },
      (error) => { if (import.meta.env.DEV) console.log('Location error:', error); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, currentGame?.status]);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          if (import.meta.env.DEV) console.warn('Service worker registration failed:', err);
        });
      };

      // Register immediately if already loaded, otherwise wait for load
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold mb-4">
            <span className="text-indigo-600">TAG</span>
            <span className="text-purple-500">!</span>
          </h1>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 pointer-events-none" />

      {/* Connection Status Banner */}
      {user && <ConnectionStatus />}

      {/* Toasts */}
      <AchievementToast />
      <ErrorToast />
      
      {/* Main content */}
      <main className="relative pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={user ? <CreateGame /> : <Navigate to="/" />} />
          <Route path="/join" element={user ? <JoinGame /> : <Navigate to="/" />} />
          <Route path="/lobby" element={currentGame ? <GameErrorBoundary><GameLobby /></GameErrorBoundary> : <Navigate to="/" />} />
          <Route path="/game" element={currentGame?.status === 'active' ? <GameErrorBoundary><ActiveGame /></GameErrorBoundary> : <Navigate to="/" />} />
          <Route path="/stats" element={<GameErrorBoundary><Stats /></GameErrorBoundary>} />
          <Route path="/friends" element={<GameErrorBoundary><Friends /></GameErrorBoundary>} />
          <Route path="/settings" element={<GameErrorBoundary><Settings /></GameErrorBoundary>} />
          <Route path="/history" element={<GameErrorBoundary><GameHistory /></GameErrorBoundary>} />
          <Route path="/leaderboards" element={<GameErrorBoundary><Leaderboards /></GameErrorBoundary>} />
          <Route path="/achievements" element={<GameErrorBoundary><Achievements /></GameErrorBoundary>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      {/* Navigation */}
      {user && <Navigation />}
      
      {/* Signup Modal */}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  );
}

export default App;

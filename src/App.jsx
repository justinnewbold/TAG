import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from './store';
import { api } from './services/api';
import { socketService } from './services/socket';

// Eagerly loaded pages (for fast initial render)
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Lazy loaded pages (heavy components with maps)
const CreateGame = lazy(() => import('./pages/CreateGame'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const GameLobby = lazy(() => import('./pages/GameLobby'));
const ActiveGame = lazy(() => import('./pages/ActiveGame'));
const Stats = lazy(() => import('./pages/Stats'));
const EnhancedStats = lazy(() => import('./pages/EnhancedStats'));
const Friends = lazy(() => import('./pages/Friends'));
const Settings = lazy(() => import('./pages/Settings'));
const GameHistory = lazy(() => import('./pages/GameHistory'));
const Leaderboards = lazy(() => import('./pages/Leaderboards'));
const Achievements = lazy(() => import('./pages/Achievements'));
const GlobalLeaderboard = lazy(() => import('./pages/GlobalLeaderboard'));
const Clans = lazy(() => import('./pages/Clans'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const PublicGames = lazy(() => import('./pages/PublicGames'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CustomGameModeBuilder = lazy(() => import('./pages/CustomGameModeBuilder'));

// Components
import Navigation from './components/Navigation';
import SignupModal from './components/SignupModal';
import AchievementToast from './components/AchievementToast';
import OnboardingTutorial from './components/OnboardingTutorial';
import { GameErrorBoundary } from './components/ErrorBoundary';

// Loading fallback for lazy loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const { user, currentGame, setUser, syncGameState, settings, updateSettings } = useStore();
  const [showSignup, setShowSignup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Try to re-authenticate with existing token on app load
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = api.getToken();

      if (existingToken) {
        try {
          // Always try to login/refresh with existing token to get fresh credentials
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
          // Token invalid, clear it and user state
          if (import.meta.env.DEV) console.log('Auth token invalid, clearing');
          api.logout();
          setUser(null); // Clear persisted user state too
          setShowSignup(true);
        }
      } else if (!user) {
        setShowSignup(true);
      } else {
        // User exists in state but no token - clear and show signup
        setUser(null);
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

  // Request location permission and send updates
  useEffect(() => {
    if (user && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Update store
          useStore.getState().updateUserLocation(location);

          // Send to server via socket if in active game and connected
          if (currentGame?.status === 'active' && socketService.isConnected()) {
            socketService.updateLocation(location);
          }
        },
        (error) => { if (import.meta.env.DEV) console.log('Location error:', error); },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
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
      <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold mb-4">
            <span className="text-neon-cyan">TAG</span>
            <span className="text-neon-purple">!</span>
          </h1>
          <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-neon-cyan/5 pointer-events-none" />
      
      {/* Achievement Toast */}
      <AchievementToast />
      
      {/* Main content */}
      <main className="relative pb-24">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={user ? <CreateGame /> : <Navigate to="/" />} />
            <Route path="/join" element={user ? <JoinGame /> : <Navigate to="/" />} />
            <Route path="/lobby" element={currentGame ? <GameErrorBoundary><GameLobby /></GameErrorBoundary> : <Navigate to="/" />} />
            <Route path="/game" element={currentGame?.status === 'active' ? <GameErrorBoundary><ActiveGame /></GameErrorBoundary> : <Navigate to="/" />} />
            <Route path="/stats" element={<GameErrorBoundary><Stats /></GameErrorBoundary>} />
            <Route path="/stats/enhanced" element={<GameErrorBoundary><EnhancedStats /></GameErrorBoundary>} />
            <Route path="/friends" element={<GameErrorBoundary><Friends /></GameErrorBoundary>} />
            <Route path="/settings" element={<GameErrorBoundary><Settings /></GameErrorBoundary>} />
            <Route path="/history" element={<GameErrorBoundary><GameHistory /></GameErrorBoundary>} />
            <Route path="/leaderboards" element={<GameErrorBoundary><Leaderboards /></GameErrorBoundary>} />
            <Route path="/achievements" element={<GameErrorBoundary><Achievements /></GameErrorBoundary>} />
            <Route path="/global-leaderboard" element={<GameErrorBoundary><GlobalLeaderboard /></GameErrorBoundary>} />
            <Route path="/clans" element={<GameErrorBoundary><Clans /></GameErrorBoundary>} />
            <Route path="/tournaments" element={<GameErrorBoundary><Tournaments /></GameErrorBoundary>} />
            <Route path="/public-games" element={<GameErrorBoundary><PublicGames /></GameErrorBoundary>} />
            <Route path="/profile" element={<GameErrorBoundary><PlayerProfile /></GameErrorBoundary>} />
            <Route path="/profile/:userId" element={<GameErrorBoundary><PlayerProfile /></GameErrorBoundary>} />
            <Route path="/admin" element={<GameErrorBoundary><AdminDashboard /></GameErrorBoundary>} />
            <Route path="/custom-mode" element={<GameErrorBoundary><CustomGameModeBuilder /></GameErrorBoundary>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      
      {/* Navigation */}
      {user && <Navigation />}
      
      {/* Signup Modal */}
      {showSignup && (
        <SignupModal 
          onClose={() => {
            setShowSignup(false);
            // Show onboarding after signup for new users
            if (!settings.hasSeenOnboarding) {
              setShowOnboarding(true);
            }
          }} 
        />
      )}
      
      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <OnboardingTutorial 
          onComplete={() => {
            setShowOnboarding(false);
            updateSettings({ hasSeenOnboarding: true });
          }} 
        />
      )}
    </div>
  );
}

export default App;

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// Auth pages - always accessible
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

// Components
import Navigation from './components/Navigation';
import AchievementToast from './components/AchievementToast';
import OnboardingTutorial from './components/OnboardingTutorial';
import { GameErrorBoundary } from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import ConnectionStatus from './components/ConnectionStatus';

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

// Protected Route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user } = useStore();
  const location = useLocation();
  
  if (!user) {
    // Redirect to login, saving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function App() {
  const { user, currentGame, setUser, syncGameState, settings, updateSettings } = useStore();
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

          // Try to get current game if any
          try {
            const { game } = await api.getCurrentGame();
            if (game) {
              syncGameState(game);
            }
          } catch (e) {
            // No current game, that's ok
          }
        } catch (err) {
          // Token invalid, clear it and user state
          if (import.meta.env.DEV) console.log('Auth token invalid, clearing');
          api.logout();
          setUser(null);
        }
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
    <GlobalErrorBoundary>
      <div className="min-h-screen bg-dark-900 text-white">
        {/* Connection Status Banner */}
        <ConnectionStatus />

        {/* Background gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-neon-cyan/5 pointer-events-none" />

        {/* Achievement Toast */}
        <AchievementToast />

        {/* Main content */}
        <main className="relative pb-24">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public auth routes - always accessible */}
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Protected routes - require authentication */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateGame /></ProtectedRoute>} />
            <Route path="/join" element={<ProtectedRoute><JoinGame /></ProtectedRoute>} />
            <Route path="/lobby" element={currentGame ? <ProtectedRoute><GameErrorBoundary><GameLobby /></GameErrorBoundary></ProtectedRoute> : <Navigate to="/" />} />
            <Route path="/game" element={(currentGame?.status === 'active' || currentGame?.status === 'hiding') ? <ProtectedRoute><GameErrorBoundary><ActiveGame /></GameErrorBoundary></ProtectedRoute> : <Navigate to="/" />} />
            <Route path="/stats" element={<ProtectedRoute><GameErrorBoundary><Stats /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/stats/enhanced" element={<ProtectedRoute><GameErrorBoundary><EnhancedStats /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><GameErrorBoundary><Friends /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><GameErrorBoundary><Settings /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><GameErrorBoundary><GameHistory /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/leaderboards" element={<ProtectedRoute><GameErrorBoundary><Leaderboards /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><GameErrorBoundary><Achievements /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/global-leaderboard" element={<ProtectedRoute><GameErrorBoundary><GlobalLeaderboard /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/clans" element={<ProtectedRoute><GameErrorBoundary><Clans /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/tournaments" element={<ProtectedRoute><GameErrorBoundary><Tournaments /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/public-games" element={<ProtectedRoute><GameErrorBoundary><PublicGames /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><GameErrorBoundary><PlayerProfile /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><GameErrorBoundary><PlayerProfile /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><GameErrorBoundary><AdminDashboard /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="/custom-mode" element={<ProtectedRoute><GameErrorBoundary><CustomGameModeBuilder /></GameErrorBoundary></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      
      {/* Navigation - only show when logged in */}
      {user && <Navigation />}
      
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
    </GlobalErrorBoundary>
  );
}

export default App;


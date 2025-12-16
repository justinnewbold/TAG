import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';

// Pages
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import ActiveGame from './pages/ActiveGame';
import Stats from './pages/Stats';
import Friends from './pages/Friends';
import Settings from './pages/Settings';

// Components
import Navigation from './components/Navigation';
import SignupModal from './components/SignupModal';

function App() {
  const { user, currentGame } = useStore();
  const [showSignup, setShowSignup] = useState(false);
  
  useEffect(() => {
    if (!user) {
      setShowSignup(true);
    }
  }, [user]);
  
  // Request location permission
  useEffect(() => {
    if (user && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          useStore.getState().updateUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => console.log('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user]);
  
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-neon-cyan/5 pointer-events-none" />
      
      {/* Main content */}
      <main className="relative pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={user ? <CreateGame /> : <Navigate to="/" />} />
          <Route path="/join" element={user ? <JoinGame /> : <Navigate to="/" />} />
          <Route path="/lobby" element={currentGame ? <GameLobby /> : <Navigate to="/" />} />
          <Route path="/game" element={currentGame?.status === 'active' ? <ActiveGame /> : <Navigate to="/" />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/settings" element={<Settings />} />
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

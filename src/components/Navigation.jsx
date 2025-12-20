import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, BarChart3, Settings, Trophy } from 'lucide-react';
import { useStore } from '../store';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useStore();
  
  // Haptic feedback on tab change
  const handleTabPress = (path) => {
    if ('vibrate' in navigator && settings?.vibration !== false) {
      navigator.vibrate(10);
    }
    navigate(path);
  };
  
  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/leaderboards', icon: Trophy, label: 'Ranks' },
    { path: '/friends', icon: Users, label: 'Friends' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  // Don't show during active game
  if (location.pathname === '/game' || location.pathname === '/lobby') {
    return null;
  }
  
  return (
    <nav 
      role="navigation" 
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-dark-800/95 backdrop-blur-lg border-t border-white/10 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around py-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => handleTabPress(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] rounded-2xl transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800 ${
                isActive 
                  ? 'text-neon-cyan bg-neon-cyan/10' 
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <Icon 
                className={`w-6 h-6 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]' : ''}`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'font-bold' : ''}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;

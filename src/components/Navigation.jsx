import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, BarChart3, Settings, Trophy } from 'lucide-react';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
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
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-800/95 backdrop-blur-lg border-t border-white/10 pb-safe z-40">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-neon-cyan' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-neon-cyan" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;

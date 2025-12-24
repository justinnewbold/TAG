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
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe z-40"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around py-2" role="tablist">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              role="tab"
              aria-selected={isActive}
              aria-label={`Navigate to ${label}`}
              tabIndex={0}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Settings, Gamepad2 } from 'lucide-react';
import { useStore } from '../store';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentGame } = useStore();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/friends', icon: Users, label: 'Friends' },
    { path: currentGame ? (currentGame.status === 'active' ? '/game' : '/lobby') : '/create', icon: Gamepad2, label: 'Game', highlight: true },
    { path: '/stats', icon: Trophy, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-800/90 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive ? 'active' : ''} ${item.highlight ? 'relative' : ''}`}
            >
              {item.highlight && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full -z-10 opacity-50" />
              )}
              <Icon className={`w-5 h-5 ${item.highlight ? 'text-neon-cyan' : ''}`} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;

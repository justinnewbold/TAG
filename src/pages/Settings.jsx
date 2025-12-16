import React from 'react';
import { Bell, Volume2, Vibrate, Crosshair, LogOut, Trash2 } from 'lucide-react';
import { useStore } from '../store';

function Settings() {
  const { user, settings, updateSettings, reset } = useStore();
  
  const toggleSetting = (key) => {
    updateSettings({ [key]: !settings[key] });
  };
  
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? Your data will be preserved.')) {
      useStore.setState({ user: null });
      window.location.reload();
    }
  };
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      reset();
      window.location.reload();
    }
  };
  
  const settingsItems = [
    { key: 'notifications', icon: Bell, label: 'Push Notifications', desc: 'Get notified when tagged' },
    { key: 'sound', icon: Volume2, label: 'Sound Effects', desc: 'Play sounds during game' },
    { key: 'vibration', icon: Vibrate, label: 'Vibration', desc: 'Vibrate on tag' },
    { key: 'highAccuracyGPS', icon: Crosshair, label: 'High Accuracy GPS', desc: 'Better location (uses more battery)' },
  ];
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-white/50 text-sm">Configure your experience</p>
      </div>
      
      {/* Profile */}
      {user && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-3xl">
              {user.avatar}
            </div>
            <div>
              <p className="font-bold text-lg">{user.name}</p>
              {user.email && <p className="text-sm text-white/50">{user.email}</p>}
              {user.phone && <p className="text-sm text-white/50">{user.phone}</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* Settings toggles */}
      <div className="space-y-2 mb-8">
        {settingsItems.map((item) => (
          <div key={item.key} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                <item.icon className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-white/40">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting(item.key)}
              className={`w-12 h-7 rounded-full transition-all ${
                settings[item.key] ? 'bg-neon-cyan' : 'bg-dark-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                  settings[item.key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      
      {/* Danger zone */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Account</h3>
        
        <button
          onClick={handleLogout}
          className="w-full card p-4 flex items-center gap-3 hover:bg-dark-700/50 transition-all"
        >
          <div className="p-2 rounded-lg bg-white/5">
            <LogOut className="w-5 h-5 text-white/60" />
          </div>
          <div className="text-left">
            <p className="font-medium">Log Out</p>
            <p className="text-sm text-white/40">Sign out of your account</p>
          </div>
        </button>
        
        <button
          onClick={handleReset}
          className="w-full card p-4 flex items-center gap-3 hover:bg-red-500/10 transition-all border-red-500/30"
        >
          <div className="p-2 rounded-lg bg-red-500/10">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-left">
            <p className="font-medium text-red-400">Reset All Data</p>
            <p className="text-sm text-white/40">Delete all games, stats, and friends</p>
          </div>
        </button>
      </div>
      
      {/* App info */}
      <div className="mt-8 text-center text-white/30 text-sm">
        <p>TAG! v1.0.0</p>
        <p>Made with ❤️ for hunters</p>
      </div>
    </div>
  );
}

export default Settings;

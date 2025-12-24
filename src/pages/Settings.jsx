import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, Vibrate, MapPin, Moon, LogOut, Trash2, User, Info, ChevronRight, Shield, Download } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

function Settings() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, updateUserProfile, logout, reset, clearGameHistory } = useStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Listen for PWA install prompt
  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };
  
  const handleSaveProfile = async () => {
    if (profileName.trim()) {
      updateUserProfile({ name: profileName.trim() });
      try {
        await api.updateProfile({ name: profileName.trim() });
      } catch (err) {
        console.log('Could not sync profile to server:', err);
      }
    }
    setEditingProfile(false);
  };

  const handleAvatarChange = async (avatar) => {
    updateUserProfile({ avatar });
    try {
      await api.updateProfile({ avatar });
    } catch (err) {
      console.log('Could not sync avatar to server:', err);
    }
  };
  
  const toggleSetting = (key) => {
    updateSettings({ [key]: !settings[key] });
  };
  
  const avatars = ['🏃', '🏃‍♀️', '🏃‍♂️', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐉', '👤', '⭐'];
  
  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Customize your experience</p>
      </div>

      {/* Profile Section */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
            {user?.avatar || '👤'}
          </div>
          <div className="flex-1">
            {editingProfile ? (
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="input-field py-2"
                autoFocus
              />
            ) : (
              <h2 className="font-bold text-lg text-gray-900">{user?.name || 'Guest'}</h2>
            )}
            <p className="text-sm text-gray-500">Player Profile</p>
          </div>
          <button
            onClick={() => editingProfile ? handleSaveProfile() : setEditingProfile(true)}
            className="btn-secondary py-2 px-4 text-sm"
          >
            {editingProfile ? 'Save' : 'Edit'}
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Choose Avatar</p>
          <div className="flex flex-wrap gap-2">
            {avatars.map((avatar) => (
              <button
                key={avatar}
                onClick={() => handleAvatarChange(avatar)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  user?.avatar === avatar
                    ? 'bg-indigo-100 ring-2 ring-indigo-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="card divide-y divide-gray-100 mb-6">
        <SettingToggle
          icon={Bell}
          label="Notifications"
          description="Game alerts and invites"
          value={settings.notifications}
          onChange={() => toggleSetting('notifications')}
        />
        <SettingToggle
          icon={Volume2}
          label="Sound Effects"
          description="Tag and game sounds"
          value={settings.sound}
          onChange={() => toggleSetting('sound')}
        />
        <SettingToggle
          icon={Vibrate}
          label="Vibration"
          description="Haptic feedback"
          value={settings.vibration}
          onChange={() => toggleSetting('vibration')}
        />
        <SettingToggle
          icon={MapPin}
          label="High Accuracy GPS"
          description="Better location (uses more battery)"
          value={settings.highAccuracyGPS}
          onChange={() => toggleSetting('highAccuracyGPS')}
        />
        <SettingToggle
          icon={Shield}
          label="Show Distance"
          description="Display distance to other players"
          value={settings.showDistance}
          onChange={() => toggleSetting('showDistance')}
        />
      </div>
      
      {/* Install PWA */}
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="w-full card p-4 mb-6 flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200"
        >
          <Download className="w-6 h-6 text-indigo-600" />
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">Install App</p>
            <p className="text-xs text-gray-500">Add TAG! to your home screen</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      )}

      {/* Danger Zone */}
      <div className="space-y-3">
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full card p-4 flex items-center gap-4 hover:bg-amber-50"
        >
          <Trash2 className="w-5 h-5 text-amber-500" />
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">Clear Game History</p>
            <p className="text-xs text-gray-500">Remove all past games</p>
          </div>
        </button>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full card p-4 flex items-center gap-4 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <div className="flex-1 text-left">
            <p className="font-medium text-red-500">Log Out</p>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
        </button>
      </div>

      {/* App Info */}
      <div className="mt-8 text-center text-gray-400 text-xs">
        <p>TAG! GPS Game v2.0.0</p>
        <p className="mt-1">Made with ❤️</p>
      </div>
      
      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <ConfirmModal
          title="Log Out?"
          message="You'll need to sign up again to play."
          confirmText="Log Out"
          confirmClass="bg-red-500"
          onConfirm={() => {
            socketService.disconnect();
            api.logout();
            logout();
            navigate('/');
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
      
      {/* Clear History Confirm */}
      {showClearConfirm && (
        <ConfirmModal
          title="Clear History?"
          message="This will delete all your past games. Stats will be kept."
          confirmText="Clear"
          confirmClass="bg-amber-500"
          onConfirm={() => { clearGameHistory(); setShowClearConfirm(false); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}

function SettingToggle({ icon: Icon, label, description, value, onChange }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Icon className="w-5 h-5 text-gray-500" />
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-all ${
          value ? 'bg-indigo-500' : 'bg-gray-300'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="card p-6 max-w-sm w-full animate-slide-up shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-gray-900">{title}</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className={`btn-primary flex-1 ${confirmClass}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;

import React, { useState, lazy, Suspense } from 'react';
import Avatar, { hasUrlAvatar } from '../components/Avatar';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, Vibrate, MapPin, Moon, LogOut, Trash2, User, Info, ChevronRight, Shield, Download, Accessibility, Loader2, ArrowLeft, Check } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import BottomSheet from '../components/BottomSheet';

// Lazy load accessibility settings
const AccessibilitySettings = lazy(() => import('../components/AccessibilitySettings'));

function Settings() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, updateUserProfile, logout, reset, clearGameHistory } = useStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  
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
    setShowAvatarSheet(false);
    try {
      await api.updateProfile({ avatar });
    } catch (err) {
      console.log('Could not sync avatar to server:', err);
    }
  };
  
  const toggleSetting = (key) => {
    updateSettings({ [key]: !settings[key] });
  };
  
  const avatars = ['🏃', '🏃‍♀️', '🏃‍♂️', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐉', '👤', '⭐', '🎮', '🎯', '🏆', '💎'];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Settings</h1>
            <p className="text-xs text-white/50">Customize your experience</p>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4">
        {/* Profile Card - Large touch target */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            {/* Avatar - Tappable */}
            <button
              onClick={() => setShowAvatarSheet(true)}
              className="touch-target-48 relative active:scale-95 transition-transform"
            >
              <Avatar user={user} size="xl" className="p-3 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20" />
              <span className="absolute -bottom-1 -right-1 text-xs bg-neon-purple rounded-full w-5 h-5 flex items-center justify-center">✏️</span>
            </button>
            
            <div className="flex-1 min-w-0">
              {editingProfile ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="input-field py-3 text-lg flex-1"
                    autoFocus
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="touch-target-48 w-12 h-12 bg-neon-cyan rounded-xl flex items-center justify-center"
                  >
                    <Check className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="text-left w-full active:bg-white/5 rounded-lg p-1 -m-1"
                >
                  <h2 className="font-bold text-lg truncate">{user?.name || 'Guest'}</h2>
                  <p className="text-sm text-neon-cyan">Tap to edit name</p>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Toggles - Large swipe-friendly switches */}
        <div className="card overflow-hidden">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">Quick Settings</h3>
          <div className="divide-y divide-white/5">
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
          </div>
        </div>
        
        {/* GPS & Privacy */}
        <div className="card overflow-hidden">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">Location & Privacy</h3>
          <div className="divide-y divide-white/5">
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
        </div>
      
        {/* Accessibility Settings Button - Large touch target */}
        <button
          onClick={() => setShowAccessibility(true)}
          className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
        >
          <div className="touch-target-48 flex items-center justify-center">
            <Accessibility className="w-6 h-6 text-neon-purple" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Accessibility</p>
            <p className="text-xs text-white/50">Colorblind modes, audio cues, touch targets</p>
          </div>
          <ChevronRight className="w-6 h-6 text-white/40" />
        </button>
      
        {/* Install PWA */}
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full card p-4 flex items-center gap-4 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border-neon-cyan/30 active:scale-[0.98] transition-transform"
          >
            <div className="touch-target-48 flex items-center justify-center">
              <Download className="w-6 h-6 text-neon-cyan" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Install App</p>
              <p className="text-xs text-white/50">Add TAG! to your home screen</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white/40" />
          </button>
        )}
      
        {/* Danger Zone */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-semibold text-red-400/60 uppercase tracking-wider px-1">Danger Zone</h3>
          
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="touch-target-48 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Clear Game History</p>
              <p className="text-xs text-white/50">Remove all past games</p>
            </div>
          </button>
        
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full card p-4 flex items-center gap-4 border-red-500/30 active:scale-[0.98] transition-transform"
          >
            <div className="touch-target-48 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-red-400">Log Out</p>
              <p className="text-xs text-white/50">Sign out of your account</p>
            </div>
          </button>
        </div>
      
        {/* App Info */}
        <div className="mt-6 text-center text-white/30 text-xs pb-4">
          <p>TAG! GPS Game v2.0.0</p>
          <p className="mt-1">Made with ❤️</p>
        </div>
      </div>
      
      {/* Avatar Selection Bottom Sheet */}
      <BottomSheet
        isOpen={showAvatarSheet}
        onClose={() => setShowAvatarSheet(false)}
        title="Choose Avatar"
      >
        <div className="grid grid-cols-4 gap-3 pb-8">
          {avatars.map((avatar) => (
            <button
              key={avatar}
              onClick={() => handleAvatarChange(avatar)}
              className={`touch-target-48 text-4xl p-4 rounded-xl transition-all active:scale-90 ${
                user?.avatar === avatar
                  ? 'bg-neon-cyan/20 ring-2 ring-neon-cyan scale-105'
                  : 'bg-white/5'
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </BottomSheet>
      
      {/* Logout Confirm - Bottom Sheet style */}
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
      
      {/* Accessibility Settings Modal */}
      {showAccessibility && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
          </div>
        }>
          <AccessibilitySettings 
            onClose={() => setShowAccessibility(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

function SettingToggle({ icon: Icon, label, description, value, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-4 p-4 active:bg-white/5 transition-colors"
    >
      <div className="touch-target-48 flex items-center justify-center">
        <Icon className={`w-6 h-6 ${value ? 'text-neon-cyan' : 'text-white/40'}`} />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      {/* Large toggle switch */}
      <div
        className={`w-14 h-8 rounded-full transition-all relative ${
          value ? 'bg-neon-cyan' : 'bg-white/20'
        }`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${
          value ? 'left-7' : 'left-1'
        }`} />
      </div>
    </button>
  );
}

function ConfirmModal({ title, message, confirmText, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="card-glow p-6 w-full max-w-md animate-slide-up rounded-t-3xl pb-safe">
        <h2 className="text-xl font-bold mb-2 text-center">{title}</h2>
        <p className="text-white/60 mb-6 text-center">{message}</p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm} 
            className={`touch-target-48 btn-primary w-full h-14 text-lg font-bold ${confirmClass}`}
          >
            {confirmText}
          </button>
          <button 
            onClick={onCancel} 
            className="touch-target-48 btn-secondary w-full h-14 text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;

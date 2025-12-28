import React, { useState, lazy, Suspense } from 'react';
import Avatar, { hasUrlAvatar } from '../components/Avatar';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, Vibrate, MapPin, Moon, Sun, LogOut, Trash2, User, Info, ChevronRight, Shield, Download, Accessibility, Loader2, ArrowLeft, Check, Play } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import BottomSheet from '../components/BottomSheet';
import { useSoundHaptic } from '../hooks/useSoundHaptic';

// Lazy load accessibility settings
const AccessibilitySettings = lazy(() => import('../components/AccessibilitySettings'));

function Settings() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, updateUserProfile, logout, reset, clearGameHistory } = useStore();
  const sound = useSoundHaptic();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showSoundTest, setShowSoundTest] = useState(false);
  const [testingSound, setTestingSound] = useState(null);
  
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
    if (key === 'sound' || key === 'vibration') {
      sound.playToggle();
    }
  };

  const testSoundEffect = async (type) => {
    setTestingSound(type);
    switch (type) {
      case 'tag': sound.playTagSuccess(); break;
      case 'tagged': sound.playTaggedByOther(); break;
      case 'start': sound.playGameStart(); break;
      case 'victory': sound.playVictory(); break;
      case 'defeat': sound.playDefeat(); break;
      case 'powerup': sound.playPowerupCollected(); break;
      case 'proximity': sound.playProximityWarning(); break;
      case 'achievement': sound.playAchievement(); break;
      case 'levelup': sound.playLevelUp(); break;
      case 'notification': sound.playNotification(); break;
      default: break;
    }
    setTimeout(() => setTestingSound(null), 1000);
  };

  const soundTests = [
    { id: 'tag', label: 'Tag!', icon: '🎯' },
    { id: 'tagged', label: 'Tagged', icon: '💥' },
    { id: 'start', label: 'Start', icon: '🚀' },
    { id: 'victory', label: 'Win', icon: '🏆' },
    { id: 'defeat', label: 'Lose', icon: '😢' },
    { id: 'powerup', label: 'Power', icon: '⚡' },
    { id: 'proximity', label: 'Alert', icon: '⚠️' },
    { id: 'achievement', label: 'Badge', icon: '🎖️' },
    { id: 'levelup', label: 'Level', icon: '⬆️' },
    { id: 'notification', label: 'Notify', icon: '🔔' },
  ];
  
  const avatars = ['🏃', '🏃‍♀️', '🏃‍♂️', '🦊', '🐺', '🦁', '🐯', '🦅', '🦈', '🐉', '👤', '⭐', '🎮', '🎯', '🏆', '💎'];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div
        className="sticky top-0 z-40 backdrop-blur-sm px-4 py-3"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="touch-target-48 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Customize your experience</p>
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
              <Avatar user={user} size="xl" className="p-3" style={{ background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))' }} />
              <span
                className="absolute -bottom-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-secondary)' }}
              >✏️</span>
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
                    className="touch-target-48 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                  >
                    <Check className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="text-left w-full rounded-lg p-1 -m-1"
                >
                  <h2 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Guest'}</h2>
                  <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>Tap to edit name</p>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Appearance */}
        <div className="card overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>Appearance</h3>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            <SettingToggle
              icon={settings.darkMode ? Moon : Sun}
              label="Dark Mode"
              description={settings.darkMode ? "Dark theme active" : "Light theme active"}
              value={settings.darkMode}
              onChange={() => toggleSetting('darkMode')}
            />
          </div>
        </div>

        {/* Quick Toggles - Large swipe-friendly switches */}
        <div className="card overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>Quick Settings</h3>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
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

        {/* Sound Test Section */}
        {(settings.sound || settings.vibration) && (
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowSoundTest(!showSoundTest)}
              className="w-full flex items-center gap-4 p-4 transition-colors"
            >
              <div className="touch-target-48 flex items-center justify-center">
                <Play className="w-6 h-6" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Test Sound Effects</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preview game sounds and haptics</p>
              </div>
              <ChevronRight className={`w-6 h-6 transition-transform ${showSoundTest ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {showSoundTest && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-5 gap-2">
                  {soundTests.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => testSoundEffect(id)}
                      disabled={testingSound === id}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: testingSound === id ? 'var(--glow-primary)' : 'var(--bg-tertiary)',
                        color: testingSound === id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transform: testingSound === id ? 'scale(0.95)' : 'scale(1)'
                      }}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="truncate w-full text-center">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                  Tap to preview each sound effect
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* GPS & Privacy */}
        <div className="card overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>Location & Privacy</h3>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
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
            <Accessibility className="w-6 h-6" style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Accessibility</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Colorblind modes, audio cues, touch targets</p>
          </div>
          <ChevronRight className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* Install PWA */}
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))',
              borderColor: 'var(--accent-primary)'
            }}
          >
            <div className="touch-target-48 flex items-center justify-center">
              <Download className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Install App</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Add TAG! to your home screen</p>
            </div>
            <ChevronRight className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      
        {/* Danger Zone */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--accent-danger)', opacity: 0.7 }}>Danger Zone</h3>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="touch-target-48 flex items-center justify-center">
              <Trash2 className="w-6 h-6" style={{ color: 'var(--accent-tertiary)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Clear Game History</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Remove all past games</p>
            </div>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
            style={{ borderColor: 'var(--accent-danger)', opacity: 0.3 }}
          >
            <div className="touch-target-48 flex items-center justify-center">
              <LogOut className="w-6 h-6" style={{ color: 'var(--accent-danger)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium" style={{ color: 'var(--accent-danger)' }}>Log Out</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sign out of your account</p>
            </div>
          </button>
        </div>

        {/* App Info */}
        <div className="mt-6 text-center text-xs pb-4" style={{ color: 'var(--text-muted)' }}>
          <p>TAG! GPS Game v2.1.0</p>
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
              className="touch-target-48 text-4xl p-4 rounded-xl transition-all active:scale-90"
              style={{
                backgroundColor: user?.avatar === avatar ? 'var(--glow-primary)' : 'var(--bg-tertiary)',
                boxShadow: user?.avatar === avatar ? '0 0 0 2px var(--accent-primary)' : 'none',
                transform: user?.avatar === avatar ? 'scale(1.05)' : 'scale(1)'
              }}
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
      className="w-full flex items-center gap-4 p-4 transition-colors"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div className="touch-target-48 flex items-center justify-center">
        <Icon
          className="w-6 h-6"
          style={{ color: value ? 'var(--accent-primary)' : 'var(--text-muted)' }}
        />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      {/* Large toggle switch */}
      <div
        className="w-14 h-8 rounded-full transition-all relative"
        style={{ backgroundColor: value ? 'var(--accent-primary)' : 'var(--border-color)' }}
      >
        <div
          className="absolute top-1 w-6 h-6 rounded-full shadow-lg transition-transform"
          style={{
            backgroundColor: 'var(--bg-primary)',
            left: value ? '1.75rem' : '0.25rem'
          }}
        />
      </div>
    </button>
  );
}

function ConfirmModal({ title, message, confirmText, confirmClass, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-sm flex items-end justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-color)' }}
    >
      <div className="card-glow p-6 w-full max-w-md animate-slide-up rounded-t-3xl pb-safe">
        <h2 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="mb-6 text-center" style={{ color: 'var(--text-secondary)' }}>{message}</p>
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

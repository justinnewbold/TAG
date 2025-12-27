// Sound Settings Component
// Allows users to configure sound and haptic feedback preferences

import React, { useState } from 'react';
import { useStore } from '../store';
import { useSoundHaptic } from '../hooks/useSoundHaptic';

export default function SoundSettings() {
  const { settings, updateSettings } = useStore();
  const sound = useSoundHaptic();
  const [testingSound, setTestingSound] = useState(null);

  const handleSoundToggle = () => {
    const newValue = !settings.sound;
    updateSettings({ sound: newValue });
    if (newValue) {
      sound.playToggle();
    }
  };

  const handleVibrationToggle = () => {
    const newValue = !settings.vibration;
    updateSettings({ vibration: newValue });
    if (newValue) {
      sound.playToggle();
    }
  };

  const testSound = async (type) => {
    setTestingSound(type);
    
    switch (type) {
      case 'tag':
        sound.playTagSuccess();
        break;
      case 'tagged':
        sound.playTaggedByOther();
        break;
      case 'start':
        sound.playGameStart();
        break;
      case 'victory':
        sound.playVictory();
        break;
      case 'defeat':
        sound.playDefeat();
        break;
      case 'powerup':
        sound.playPowerupCollected();
        break;
      case 'proximity':
        sound.playProximityWarning();
        break;
      case 'achievement':
        sound.playAchievement();
        break;
      case 'levelup':
        sound.playLevelUp();
        break;
      case 'notification':
        sound.playNotification();
        break;
      default:
        break;
    }
    
    setTimeout(() => setTestingSound(null), 1000);
  };

  const soundTests = [
    { id: 'tag', label: 'Tag Success', icon: '🎯' },
    { id: 'tagged', label: 'Got Tagged', icon: '💥' },
    { id: 'start', label: 'Game Start', icon: '🚀' },
    { id: 'victory', label: 'Victory', icon: '🏆' },
    { id: 'defeat', label: 'Defeat', icon: '😢' },
    { id: 'powerup', label: 'Powerup', icon: '⚡' },
    { id: 'proximity', label: 'Proximity Alert', icon: '⚠️' },
    { id: 'achievement', label: 'Achievement', icon: '🎖️' },
    { id: 'levelup', label: 'Level Up', icon: '⬆️' },
    { id: 'notification', label: 'Notification', icon: '🔔' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🔊</span>
          Sound & Haptics
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure audio and vibration feedback
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xl">{settings.sound ? '🔊' : '🔇'}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Sound Effects</p>
              <p className="text-sm text-gray-500">Game sounds and audio cues</p>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings.sound ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.sound ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Vibration Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-xl">📳</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Haptic Feedback</p>
              <p className="text-sm text-gray-500">Vibration for game events</p>
            </div>
          </div>
          <button
            onClick={handleVibrationToggle}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings.vibration ? 'bg-purple-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.vibration ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Test Sounds Section */}
        {settings.sound && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Test Sounds</p>
            <div className="grid grid-cols-2 gap-2">
              {soundTests.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => testSound(id)}
                  disabled={testingSound === id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    testingSound === id
                      ? 'bg-blue-100 text-blue-700 scale-95'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">💡 Tip:</span> Sound effects use Web Audio API 
            and work best with headphones. Haptic feedback requires a device with vibration support.
          </p>
        </div>
      </div>
    </div>
  );
}

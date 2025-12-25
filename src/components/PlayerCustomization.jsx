import React, { useState } from 'react';
import { User, Palette, Sparkles, Check, X, Crown, Star, Shield, Zap } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';

// Available avatar emojis
const AVATAR_EMOJIS = [
  '🏃', '👤', '🦊', '🐺', '🦁', '🐯', '🐻', '🐼',
  '🐨', '🐵', '🐸', '🐙', '🦈', '🦅', '🦉', '🐲',
  '👻', '🤖', '👽', '💀', '🎭', '🦸', '🦹', '🥷',
  '⚡', '🔥', '❄️', '🌟', '💎', '🎯', '🎮', '👑',
];

// Color themes
const COLOR_THEMES = [
  { id: 'cyan', name: 'Neon Cyan', primary: '#00f5ff', secondary: '#0088cc', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'purple', name: 'Neon Purple', primary: '#a855f7', secondary: '#7c3aed', gradient: 'from-purple-400 to-violet-600' },
  { id: 'green', name: 'Matrix Green', primary: '#22c55e', secondary: '#16a34a', gradient: 'from-green-400 to-emerald-600' },
  { id: 'orange', name: 'Fire Orange', primary: '#f97316', secondary: '#ea580c', gradient: 'from-orange-400 to-red-500' },
  { id: 'pink', name: 'Hot Pink', primary: '#ec4899', secondary: '#db2777', gradient: 'from-pink-400 to-rose-600' },
  { id: 'gold', name: 'Royal Gold', primary: '#fbbf24', secondary: '#d97706', gradient: 'from-yellow-400 to-amber-600' },
  { id: 'ice', name: 'Ice Blue', primary: '#67e8f9', secondary: '#06b6d4', gradient: 'from-cyan-300 to-sky-500' },
  { id: 'blood', name: 'Blood Red', primary: '#ef4444', secondary: '#dc2626', gradient: 'from-red-500 to-rose-700' },
];

// Titles/Badges (earned through achievements)
const TITLES = [
  { id: 'rookie', name: 'Rookie', icon: '🌱', requirement: null },
  { id: 'tagger', name: 'Tagger', icon: '🏃', requirement: 'tagged10' },
  { id: 'legend', name: 'Legend', icon: '👑', requirement: 'tagged50' },
  { id: 'survivor', name: 'Survivor', icon: '🛡️', requirement: 'survivor' },
  { id: 'champion', name: 'Champion', icon: '🏆', requirement: 'win5' },
  { id: 'speedster', name: 'Speedster', icon: '⚡', requirement: 'quickTag' },
  { id: 'social', name: 'Social Star', icon: '🦋', requirement: 'social' },
  { id: 'nightowl', name: 'Night Owl', icon: '🦉', requirement: 'nightOwl' },
];

export default function PlayerCustomization({ isOpen, onClose }) {
  const { user, achievements, updateUserProfile } = useStore();
  const [selectedEmoji, setSelectedEmoji] = useState(user?.avatar || '🏃');
  const [selectedColor, setSelectedColor] = useState(user?.colorTheme || 'cyan');
  const [selectedTitle, setSelectedTitle] = useState(user?.title || 'rookie');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('avatar');

  // Check if title is unlocked
  const isTitleUnlocked = (title) => {
    if (!title.requirement) return true;
    return achievements.includes(title.requirement);
  };

  // Save customization
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile({
        avatar: selectedEmoji,
        colorTheme: selectedColor,
        title: selectedTitle,
      });
      
      updateUserProfile({
        avatar: selectedEmoji,
        colorTheme: selectedColor,
        title: selectedTitle,
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save customization:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentColorTheme = COLOR_THEMES.find(c => c.id === selectedColor) || COLOR_THEMES[0];
  const currentTitle = TITLES.find(t => t.id === selectedTitle) || TITLES[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="relative p-4 border-b border-white/10">
          <button onClick={onClose} className="absolute right-4 top-4 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-white">Customize Profile</h2>
          <p className="text-sm text-white/60">Make your player unique</p>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            {/* Avatar Preview */}
            <div 
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-gradient-to-br ${currentColorTheme.gradient} shadow-lg`}
              style={{ boxShadow: `0 0 20px ${currentColorTheme.primary}40` }}
            >
              {selectedEmoji}
            </div>
            
            {/* Info Preview */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{user?.username || 'Player'}</span>
                <span className="text-lg">{currentTitle.icon}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-white/60">
                <span>{currentTitle.name}</span>
              </div>
              <div 
                className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium inline-block"
                style={{ 
                  backgroundColor: `${currentColorTheme.primary}20`,
                  color: currentColorTheme.primary,
                }}
              >
                Level {Math.floor((achievements.length || 0) / 2) + 1}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'avatar', label: 'Avatar', icon: User },
            { id: 'color', label: 'Color', icon: Palette },
            { id: 'title', label: 'Title', icon: Crown },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'text-neon-cyan border-b-2 border-neon-cyan' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[40vh]">
          {/* Avatar Selection */}
          {activeTab === 'avatar' && (
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-neon-cyan/20 border-2 border-neon-cyan scale-110'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Color Selection */}
          {activeTab === 'color' && (
            <div className="grid grid-cols-2 gap-3">
              {COLOR_THEMES.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedColor === color.id
                      ? 'bg-white/10 border-2 border-white/40'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div 
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.gradient}`}
                    style={{ boxShadow: `0 0 15px ${color.primary}60` }}
                  />
                  <span className="text-sm font-medium text-white">{color.name}</span>
                  {selectedColor === color.id && (
                    <Check className="w-4 h-4 text-neon-cyan ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Title Selection */}
          {activeTab === 'title' && (
            <div className="space-y-2">
              {TITLES.map(title => {
                const unlocked = isTitleUnlocked(title);
                return (
                  <button
                    key={title.id}
                    onClick={() => unlocked && setSelectedTitle(title.id)}
                    disabled={!unlocked}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      !unlocked
                        ? 'bg-white/5 opacity-50 cursor-not-allowed'
                        : selectedTitle === title.id
                          ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{title.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{title.name}</div>
                      {!unlocked && (
                        <div className="text-xs text-white/40">
                          🔒 Unlock with achievement
                        </div>
                      )}
                    </div>
                    {unlocked && selectedTitle === title.id && (
                      <Check className="w-5 h-5 text-neon-cyan" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

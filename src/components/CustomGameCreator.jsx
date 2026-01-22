/**
 * Custom Game Creator Component
 * Visual game builder to create custom rule sets, combine modes, and save presets
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  Sliders,
  Users,
  Clock,
  MapPin,
  Zap,
  Shield,
  Target,
  Flag,
  Crown,
  Star,
  Gift,
  Shuffle,
  Save,
  Upload,
  Download,
  Trash2,
  Copy,
  Share2,
  Play,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  Layers,
  Palette,
} from 'lucide-react';

// Game mode templates
const MODE_TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic Tag',
    description: 'Traditional tag - one IT, tag to transfer',
    icon: '🏃',
    baseSettings: {
      itCount: 1,
      tagTransfer: true,
      elimination: false,
      timeLimit: 0,
      lives: 0,
    },
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze Tag',
    description: 'Tagged players freeze until unfrozen by teammates',
    icon: '🥶',
    baseSettings: {
      itCount: 1,
      tagTransfer: false,
      freezeOnTag: true,
      unfreezeByTeammate: true,
      elimination: false,
    },
  },
  elimination: {
    id: 'elimination',
    name: 'Elimination',
    description: 'Tagged players are out - last one standing wins',
    icon: '💀',
    baseSettings: {
      itCount: 1,
      tagTransfer: true,
      elimination: true,
      respawn: false,
    },
  },
  infection: {
    id: 'infection',
    name: 'Infection',
    description: 'Tagged players join the IT team',
    icon: '🧟',
    baseSettings: {
      itCount: 1,
      tagTransfer: false,
      infection: true,
      elimination: false,
    },
  },
  manhunt: {
    id: 'manhunt',
    name: 'Manhunt',
    description: 'Hunters vs runners with safe zones',
    icon: '🎯',
    baseSettings: {
      itCount: 2,
      tagTransfer: false,
      elimination: true,
      safeZones: true,
    },
  },
  sardines: {
    id: 'sardines',
    name: 'Sardines',
    description: 'Reverse hide and seek - find and hide with the hider',
    icon: '🐟',
    baseSettings: {
      itCount: 0,
      hiderCount: 1,
      reverseSeek: true,
    },
  },
};

// Rule categories
const RULE_CATEGORIES = {
  players: { name: 'Players', icon: Users },
  timing: { name: 'Timing', icon: Clock },
  tagging: { name: 'Tagging', icon: Zap },
  zones: { name: 'Zones', icon: MapPin },
  powerups: { name: 'Power-ups', icon: Gift },
  special: { name: 'Special Rules', icon: Star },
};

// Individual rule definitions
const RULES = {
  // Player rules
  minPlayers: {
    id: 'minPlayers',
    category: 'players',
    name: 'Minimum Players',
    description: 'Minimum players to start',
    type: 'number',
    min: 2,
    max: 50,
    default: 2,
  },
  maxPlayers: {
    id: 'maxPlayers',
    category: 'players',
    name: 'Maximum Players',
    description: 'Maximum players allowed',
    type: 'number',
    min: 2,
    max: 100,
    default: 20,
  },
  itCount: {
    id: 'itCount',
    category: 'players',
    name: 'Number of ITs',
    description: 'How many players are IT',
    type: 'number',
    min: 0,
    max: 10,
    default: 1,
  },
  itSelection: {
    id: 'itSelection',
    category: 'players',
    name: 'IT Selection',
    description: 'How IT is chosen',
    type: 'select',
    options: [
      { value: 'random', label: 'Random' },
      { value: 'volunteer', label: 'Volunteer' },
      { value: 'lastTagged', label: 'Last Tagged' },
      { value: 'hostChoice', label: 'Host Choice' },
    ],
    default: 'random',
  },
  lives: {
    id: 'lives',
    category: 'players',
    name: 'Lives per Player',
    description: '0 = unlimited',
    type: 'number',
    min: 0,
    max: 10,
    default: 0,
  },

  // Timing rules
  timeLimit: {
    id: 'timeLimit',
    category: 'timing',
    name: 'Time Limit (minutes)',
    description: '0 = no limit',
    type: 'number',
    min: 0,
    max: 120,
    default: 10,
  },
  roundCount: {
    id: 'roundCount',
    category: 'timing',
    name: 'Number of Rounds',
    description: '0 = single game',
    type: 'number',
    min: 0,
    max: 10,
    default: 0,
  },
  gracePeriod: {
    id: 'gracePeriod',
    category: 'timing',
    name: 'Grace Period (seconds)',
    description: 'Time before IT can tag',
    type: 'number',
    min: 0,
    max: 60,
    default: 10,
  },
  tagCooldown: {
    id: 'tagCooldown',
    category: 'timing',
    name: 'Tag Cooldown (seconds)',
    description: 'Time after being tagged before you can be tagged again',
    type: 'number',
    min: 0,
    max: 30,
    default: 3,
  },

  // Tagging rules
  tagRadius: {
    id: 'tagRadius',
    category: 'tagging',
    name: 'Tag Radius (meters)',
    description: 'How close to tag someone',
    type: 'number',
    min: 1,
    max: 20,
    default: 5,
  },
  tagTransfer: {
    id: 'tagTransfer',
    category: 'tagging',
    name: 'Tag Transfers IT',
    description: 'Tagging makes the other person IT',
    type: 'boolean',
    default: true,
  },
  elimination: {
    id: 'elimination',
    category: 'tagging',
    name: 'Elimination Mode',
    description: 'Tagged players are eliminated',
    type: 'boolean',
    default: false,
  },
  freezeOnTag: {
    id: 'freezeOnTag',
    category: 'tagging',
    name: 'Freeze on Tag',
    description: 'Tagged players freeze in place',
    type: 'boolean',
    default: false,
  },
  unfreezeByTeammate: {
    id: 'unfreezeByTeammate',
    category: 'tagging',
    name: 'Teammate Unfreeze',
    description: 'Teammates can unfreeze frozen players',
    type: 'boolean',
    default: false,
    requires: 'freezeOnTag',
  },
  infection: {
    id: 'infection',
    category: 'tagging',
    name: 'Infection Mode',
    description: 'Tagged players become IT',
    type: 'boolean',
    default: false,
  },
  noTagbacks: {
    id: 'noTagbacks',
    category: 'tagging',
    name: 'No Tag-backs',
    description: 'Cannot immediately tag the person who tagged you',
    type: 'boolean',
    default: true,
  },

  // Zone rules
  boundaryEnabled: {
    id: 'boundaryEnabled',
    category: 'zones',
    name: 'Game Boundary',
    description: 'Limit play area',
    type: 'boolean',
    default: true,
  },
  boundaryRadius: {
    id: 'boundaryRadius',
    category: 'zones',
    name: 'Boundary Radius (meters)',
    description: 'Size of play area',
    type: 'number',
    min: 50,
    max: 5000,
    default: 500,
    requires: 'boundaryEnabled',
  },
  shrinkingBoundary: {
    id: 'shrinkingBoundary',
    category: 'zones',
    name: 'Shrinking Boundary',
    description: 'Boundary shrinks over time',
    type: 'boolean',
    default: false,
    requires: 'boundaryEnabled',
  },
  safeZones: {
    id: 'safeZones',
    category: 'zones',
    name: 'Safe Zones',
    description: 'Enable safe areas where players cannot be tagged',
    type: 'boolean',
    default: false,
  },
  safeZoneLimit: {
    id: 'safeZoneLimit',
    category: 'zones',
    name: 'Safe Zone Time Limit (seconds)',
    description: 'Max time in safe zone, 0 = unlimited',
    type: 'number',
    min: 0,
    max: 60,
    default: 10,
    requires: 'safeZones',
  },

  // Power-up rules
  powerupsEnabled: {
    id: 'powerupsEnabled',
    category: 'powerups',
    name: 'Enable Power-ups',
    description: 'Spawn collectible power-ups',
    type: 'boolean',
    default: false,
  },
  speedBoost: {
    id: 'speedBoost',
    category: 'powerups',
    name: 'Speed Boost',
    description: 'Temporary speed increase',
    type: 'boolean',
    default: true,
    requires: 'powerupsEnabled',
  },
  invisibility: {
    id: 'invisibility',
    category: 'powerups',
    name: 'Invisibility',
    description: 'Become invisible on map',
    type: 'boolean',
    default: true,
    requires: 'powerupsEnabled',
  },
  shield: {
    id: 'shield',
    category: 'powerups',
    name: 'Shield',
    description: 'Temporary immunity from tags',
    type: 'boolean',
    default: true,
    requires: 'powerupsEnabled',
  },
  radar: {
    id: 'radar',
    category: 'powerups',
    name: 'Radar',
    description: 'See all players on map briefly',
    type: 'boolean',
    default: true,
    requires: 'powerupsEnabled',
  },
  powerupSpawnRate: {
    id: 'powerupSpawnRate',
    category: 'powerups',
    name: 'Spawn Rate (seconds)',
    description: 'Time between power-up spawns',
    type: 'number',
    min: 10,
    max: 300,
    default: 60,
    requires: 'powerupsEnabled',
  },

  // Special rules
  teams: {
    id: 'teams',
    category: 'special',
    name: 'Team Mode',
    description: 'Enable teams',
    type: 'boolean',
    default: false,
  },
  teamCount: {
    id: 'teamCount',
    category: 'special',
    name: 'Number of Teams',
    description: 'How many teams',
    type: 'number',
    min: 2,
    max: 6,
    default: 2,
    requires: 'teams',
  },
  scoreToWin: {
    id: 'scoreToWin',
    category: 'special',
    name: 'Score to Win',
    description: '0 = time-based winner',
    type: 'number',
    min: 0,
    max: 100,
    default: 0,
  },
  respawn: {
    id: 'respawn',
    category: 'special',
    name: 'Respawn',
    description: 'Eliminated players respawn',
    type: 'boolean',
    default: false,
    requires: 'elimination',
  },
  respawnDelay: {
    id: 'respawnDelay',
    category: 'special',
    name: 'Respawn Delay (seconds)',
    description: 'Time before respawning',
    type: 'number',
    min: 0,
    max: 60,
    default: 10,
    requires: 'respawn',
  },
  privateGame: {
    id: 'privateGame',
    category: 'special',
    name: 'Private Game',
    description: 'Invite only',
    type: 'boolean',
    default: false,
  },
  spectators: {
    id: 'spectators',
    category: 'special',
    name: 'Allow Spectators',
    description: 'Let others watch',
    type: 'boolean',
    default: true,
  },
};

// Rule input component
function RuleInput({ rule, value, onChange, disabled }) {
  switch (rule.type) {
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(Math.max(rule.min, (value || rule.default) - 1))}
            disabled={disabled || value <= rule.min}
            className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <input
            type="number"
            value={value ?? rule.default}
            onChange={(e) => {
              const v = parseInt(e.target.value) || rule.min;
              onChange(Math.max(rule.min, Math.min(rule.max, v)));
            }}
            disabled={disabled}
            className="w-16 text-center bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm disabled:opacity-50"
          />
          <button
            onClick={() => onChange(Math.min(rule.max, (value || rule.default) + 1))}
            disabled={disabled || value >= rule.max}
            className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      );

    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          disabled={disabled}
          className={`w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-cyan-500' : 'bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
              value ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      );

    case 'select':
      return (
        <select
          value={value ?? rule.default}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm disabled:opacity-50"
        >
          {rule.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    default:
      return null;
  }
}

// Rule row component
function RuleRow({ rule, value, onChange, settings }) {
  const isDisabled = rule.requires && !settings[rule.requires];

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
        isDisabled ? 'bg-gray-800/30 opacity-50' : 'bg-gray-800/50 hover:bg-gray-800/80'
      }`}
    >
      <div className="flex-1 min-w-0 mr-4">
        <div className="font-medium text-white text-sm">{rule.name}</div>
        <div className="text-xs text-gray-400">{rule.description}</div>
      </div>
      <RuleInput
        rule={rule}
        value={value}
        onChange={onChange}
        disabled={isDisabled}
      />
    </div>
  );
}

// Preset card component
function PresetCard({ preset, isSelected, onSelect, onDelete, isCustom }) {
  return (
    <button
      onClick={() => onSelect(preset)}
      className={`relative p-4 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-cyan-500/20 border-2 border-cyan-500'
          : 'bg-gray-800/50 border border-transparent hover:border-gray-600'
      }`}
    >
      <div className="text-3xl mb-2">{preset.icon || '🎮'}</div>
      <div className="font-medium text-white">{preset.name}</div>
      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{preset.description}</div>
      {isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(preset.id);
          }}
          className="absolute top-2 right-2 p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/30 text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-cyan-400" />
        </div>
      )}
    </button>
  );
}

// Main CustomGameCreator component
export default function CustomGameCreator({
  onCreateGame,
  onSavePreset,
  savedPresets = [],
  className = '',
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [settings, setSettings] = useState({});
  const [gameName, setGameName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['players', 'timing']));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // Apply template settings
  const applyTemplate = useCallback((template) => {
    setSelectedTemplate(template.id);
    setSettings((prev) => ({
      ...prev,
      ...template.baseSettings,
    }));
  }, []);

  // Update a single setting
  const updateSetting = useCallback((ruleId, value) => {
    setSettings((prev) => ({ ...prev, [ruleId]: value }));
  }, []);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Validate settings
  const validateSettings = useCallback(() => {
    const errors = [];

    if (settings.minPlayers > settings.maxPlayers) {
      errors.push('Minimum players cannot exceed maximum players');
    }

    if (settings.itCount >= settings.minPlayers) {
      errors.push('IT count must be less than minimum players');
    }

    if (settings.elimination && settings.tagTransfer) {
      errors.push('Elimination mode is incompatible with tag transfer');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [settings]);

  // Create game
  const handleCreateGame = useCallback(() => {
    if (!validateSettings()) return;

    onCreateGame?.({
      name: gameName || 'Custom Game',
      settings,
      template: selectedTemplate,
    });
  }, [gameName, settings, selectedTemplate, validateSettings, onCreateGame]);

  // Save as preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;

    const preset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: presetDescription || 'Custom game preset',
      icon: '⚙️',
      baseSettings: { ...settings },
      isCustom: true,
    };

    onSavePreset?.(preset);
    setShowSaveDialog(false);
    setPresetName('');
    setPresetDescription('');
  }, [presetName, presetDescription, settings, onSavePreset]);

  // Delete custom preset
  const handleDeletePreset = useCallback((presetId) => {
    // Would call parent handler
    console.log('Delete preset:', presetId);
  }, []);

  // Export settings as JSON
  const exportSettings = useCallback(() => {
    const data = JSON.stringify({ settings, template: selectedTemplate }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameName || 'custom-game'}-settings.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings, selectedTemplate, gameName]);

  // Import settings from JSON
  const importSettings = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) {
          setSettings(data.settings);
        }
        if (data.template) {
          setSelectedTemplate(data.template);
        }
      } catch (err) {
        console.error('Failed to import settings:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings({});
    setSelectedTemplate(null);
    setGameName('');
  }, []);

  // Group rules by category
  const rulesByCategory = useMemo(() => {
    const grouped = {};
    Object.values(RULES).forEach((rule) => {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push(rule);
    });
    return grouped;
  }, []);

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Game Creator</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
              title="Reset"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <label className="p-2 hover:bg-white/10 rounded-lg text-gray-400 cursor-pointer" title="Import">
              <Upload className="w-5 h-5" />
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={exportSettings}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game name input */}
        <input
          type="text"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Game Name"
          className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Templates section */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Start from Template
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(MODE_TEMPLATES).map((template) => (
              <PresetCard
                key={template.id}
                preset={template}
                isSelected={selectedTemplate === template.id}
                onSelect={() => applyTemplate(template)}
              />
            ))}
          </div>
        </div>

        {/* Custom presets */}
        {savedPresets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Your Presets
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {savedPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={false}
                  onSelect={() => applyTemplate(preset)}
                  onDelete={handleDeletePreset}
                  isCustom
                />
              ))}
            </div>
          </div>
        )}

        {/* Rules by category */}
        {Object.entries(RULE_CATEGORIES).map(([categoryId, category]) => {
          const rules = rulesByCategory[categoryId] || [];
          const isExpanded = expandedCategories.has(categoryId);

          return (
            <div key={categoryId} className="border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(categoryId)}
                className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <category.icon className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium text-white">{category.name}</span>
                  <span className="text-xs text-gray-500">({rules.length} rules)</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-3 space-y-2">
                  {rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      value={settings[rule.id]}
                      onChange={(value) => updateSetting(rule.id, value)}
                      settings={settings}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Configuration Issues</span>
            </div>
            <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Preset
          </button>

          <button
            onClick={handleCreateGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Play className="w-5 h-5" />
            Create Game
          </button>
        </div>
      </div>

      {/* Save preset dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Save Preset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Preset Name</label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="My Custom Game"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Describe your game mode..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="flex-1 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing custom game settings
export function useCustomGameSettings() {
  const [savedPresets, setSavedPresets] = useState([]);

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customGamePresets');
      if (saved) {
        setSavedPresets(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  }, []);

  // Save preset
  const savePreset = useCallback((preset) => {
    setSavedPresets((prev) => {
      const next = [...prev, preset];
      localStorage.setItem('customGamePresets', JSON.stringify(next));
      return next;
    });
  }, []);

  // Delete preset
  const deletePreset = useCallback((presetId) => {
    setSavedPresets((prev) => {
      const next = prev.filter((p) => p.id !== presetId);
      localStorage.setItem('customGamePresets', JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    savedPresets,
    savePreset,
    deletePreset,
  };
}

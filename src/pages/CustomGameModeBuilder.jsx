import React, { useState } from 'react';
import { 
  Gamepad2, Plus, Trash2, Save, Copy, Play, ChevronDown,
  Clock, Target, Users, Shield, Zap, Eye, Settings, X
} from 'lucide-react';
import { useStore, GAME_MODES } from '../store';
import { useNavigate } from 'react-router-dom';

// Rule types and their configurations
const RULE_TYPES = {
  tag_immunity: {
    id: 'tag_immunity',
    name: 'Tag Immunity',
    description: 'Player who was just tagged cannot be tagged again',
    icon: Shield,
    params: [
      { id: 'duration', name: 'Duration (seconds)', type: 'number', min: 0, max: 30, default: 5 }
    ]
  },
  speed_multiplier: {
    id: 'speed_multiplier',
    name: 'Speed Modifier',
    description: 'Change movement speed for players',
    icon: Zap,
    params: [
      { id: 'itMultiplier', name: 'IT Speed Multiplier', type: 'number', min: 0.5, max: 2, step: 0.1, default: 1 },
      { id: 'runnerMultiplier', name: 'Runner Speed Multiplier', type: 'number', min: 0.5, max: 2, step: 0.1, default: 1 }
    ]
  },
  visibility: {
    id: 'visibility',
    name: 'Visibility Rules',
    description: 'Control what players can see on the map',
    icon: Eye,
    params: [
      { id: 'itVisible', name: 'IT visible to runners', type: 'boolean', default: true },
      { id: 'runnersVisibleToIt', name: 'Runners visible to IT', type: 'boolean', default: true },
      { id: 'runnersVisibleToRunners', name: 'Runners visible to each other', type: 'boolean', default: true }
    ]
  },
  win_condition: {
    id: 'win_condition',
    name: 'Win Condition',
    description: 'How the game is won',
    icon: Target,
    params: [
      { id: 'type', name: 'Win Type', type: 'select', options: [
        { value: 'last_standing', label: 'Last Runner Standing' },
        { value: 'most_tags', label: 'Most Tags' },
        { value: 'least_time_as_it', label: 'Least Time as IT' },
        { value: 'time_limit', label: 'Time Limit' }
      ], default: 'last_standing' }
    ]
  },
  team_mode: {
    id: 'team_mode',
    name: 'Team Mode',
    description: 'Split players into teams',
    icon: Users,
    params: [
      { id: 'enabled', name: 'Enable Teams', type: 'boolean', default: false },
      { id: 'teamCount', name: 'Number of Teams', type: 'number', min: 2, max: 4, default: 2 },
      { id: 'teamTagsCount', name: 'Team Tags Count (wins when tagged)', type: 'boolean', default: false }
    ]
  },
  time_limit: {
    id: 'time_limit',
    name: 'Time Limit',
    description: 'Set a maximum game duration',
    icon: Clock,
    params: [
      { id: 'minutes', name: 'Game Duration (minutes)', type: 'number', min: 1, max: 60, default: 15 },
      { id: 'overtimeEnabled', name: 'Enable Overtime', type: 'boolean', default: false }
    ]
  },
  power_ups: {
    id: 'power_ups',
    name: 'Power-ups',
    description: 'Enable in-game power-ups',
    icon: Zap,
    params: [
      { id: 'enabled', name: 'Enable Power-ups', type: 'boolean', default: true },
      { id: 'spawnRate', name: 'Spawn Rate (seconds)', type: 'number', min: 10, max: 120, default: 30 },
      { id: 'allowedTypes', name: 'Allowed Types', type: 'multiselect', options: [
        { value: 'speed_boost', label: 'Speed Boost' },
        { value: 'invisibility', label: 'Invisibility' },
        { value: 'tag_shield', label: 'Tag Shield' },
        { value: 'radar_pulse', label: 'Radar Pulse' },
        { value: 'freeze_tag', label: 'Freeze Tag' }
      ], default: ['speed_boost', 'tag_shield'] }
    ]
  }
};

function CustomGameModeBuilder() {
  const navigate = useNavigate();
  const { createGame } = useStore();
  
  const [modeName, setModeName] = useState('');
  const [modeDescription, setModeDescription] = useState('');
  const [baseMode, setBaseMode] = useState('classic');
  const [activeRules, setActiveRules] = useState([]);
  const [showRuleSelector, setShowRuleSelector] = useState(false);
  const [expandedRule, setExpandedRule] = useState(null);
  const [savedModes, setSavedModes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customGameModes') || '[]');
    } catch {
      return [];
    }
  });

  const addRule = (ruleType) => {
    const rule = RULE_TYPES[ruleType];
    if (!rule) return;

    // Initialize with default params
    const params = {};
    rule.params.forEach(p => {
      params[p.id] = p.default;
    });

    setActiveRules([...activeRules, { type: ruleType, params }]);
    setShowRuleSelector(false);
    setExpandedRule(activeRules.length);
  };

  const removeRule = (index) => {
    setActiveRules(activeRules.filter((_, i) => i !== index));
    if (expandedRule === index) setExpandedRule(null);
  };

  const updateRuleParam = (ruleIndex, paramId, value) => {
    setActiveRules(activeRules.map((rule, i) => {
      if (i === ruleIndex) {
        return { ...rule, params: { ...rule.params, [paramId]: value } };
      }
      return rule;
    }));
  };

  const saveMode = () => {
    if (!modeName.trim()) {
      alert('Please enter a mode name');
      return;
    }

    const newMode = {
      id: `custom_${Date.now()}`,
      name: modeName,
      description: modeDescription,
      baseMode,
      rules: activeRules,
      createdAt: Date.now()
    };

    const updated = [...savedModes, newMode];
    setSavedModes(updated);
    localStorage.setItem('customGameModes', JSON.stringify(updated));
    
    alert('Mode saved!');
  };

  const loadMode = (mode) => {
    setModeName(mode.name);
    setModeDescription(mode.description);
    setBaseMode(mode.baseMode);
    setActiveRules(mode.rules || []);
  };

  const deleteMode = (modeId) => {
    if (!confirm('Delete this custom mode?')) return;
    const updated = savedModes.filter(m => m.id !== modeId);
    setSavedModes(updated);
    localStorage.setItem('customGameModes', JSON.stringify(updated));
  };

  const startGame = async () => {
    if (!modeName.trim()) {
      alert('Please enter a mode name');
      return;
    }

    // Build game settings from rules
    const settings = {
      mode: baseMode,
      gameName: modeName,
      customRules: activeRules.reduce((acc, rule) => {
        acc[rule.type] = rule.params;
        return acc;
      }, {})
    };

    // Apply specific rule settings
    activeRules.forEach(rule => {
      if (rule.type === 'time_limit') {
        settings.gameDuration = rule.params.minutes * 60;
      }
      if (rule.type === 'tag_immunity') {
        settings.tagImmunityDuration = rule.params.duration * 1000;
      }
    });

    try {
      await createGame(settings);
      navigate('/lobby');
    } catch (err) {
      alert('Failed to create game: ' + err.message);
    }
  };

  const renderParamInput = (param, value, onChange) => {
    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.step || 1}
            className="w-24 p-2 bg-dark-700 border border-white/10 rounded-lg text-white text-center"
          />
        );
      
      case 'boolean':
        return (
          <button
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              value ? 'bg-neon-cyan' : 'bg-dark-600'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
              value ? 'translate-x-6' : ''
            }`} />
          </button>
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="p-2 bg-dark-700 border border-white/10 rounded-lg text-white"
          >
            {param.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-2">
            {param.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  const current = value || [];
                  const updated = current.includes(opt.value)
                    ? current.filter(v => v !== opt.value)
                    : [...current, opt.value];
                  onChange(updated);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  (value || []).includes(opt.value)
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-dark-700 text-white/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      
      default:
        return <span className="text-white/40">Unknown type</span>;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2">Custom Game Mode</h1>
        <p className="text-white/60 text-sm">Create your own rules and gameplay</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Mode Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Mode Name</label>
            <input
              type="text"
              value={modeName}
              onChange={(e) => setModeName(e.target.value)}
              placeholder="e.g., Extreme Tag"
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder:text-white/40"
              maxLength={32}
            />
          </div>
          
          <div>
            <label className="text-sm text-white/60 mb-1 block">Description</label>
            <textarea
              value={modeDescription}
              onChange={(e) => setModeDescription(e.target.value)}
              placeholder="Describe your game mode..."
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder:text-white/40 h-20 resize-none"
              maxLength={150}
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Base Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.slice(0, 4).map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setBaseMode(mode.id)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    baseMode === mode.id
                      ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                      : 'bg-dark-800 border-white/10 text-white hover:border-white/30'
                  }`}
                >
                  <p className="font-medium">{mode.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white">Game Rules</h2>
            <button
              onClick={() => setShowRuleSelector(!showRuleSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-neon-cyan/10 text-neon-cyan rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>

          {/* Rule selector dropdown */}
          {showRuleSelector && (
            <div className="mb-4 bg-dark-800 border border-white/10 rounded-xl overflow-hidden">
              {Object.values(RULE_TYPES).map(rule => {
                const Icon = rule.icon;
                const isActive = activeRules.some(r => r.type === rule.id);
                
                return (
                  <button
                    key={rule.id}
                    onClick={() => !isActive && addRule(rule.id)}
                    disabled={isActive}
                    className={`w-full flex items-center gap-3 p-4 border-b border-white/5 text-left transition-colors ${
                      isActive ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-neon-cyan" />
                    <div>
                      <p className="text-white font-medium">{rule.name}</p>
                      <p className="text-sm text-white/40">{rule.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active rules list */}
          <div className="space-y-3">
            {activeRules.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No custom rules added</p>
                <p className="text-sm">Add rules to customize your game mode</p>
              </div>
            ) : (
              activeRules.map((rule, index) => {
                const ruleType = RULE_TYPES[rule.type];
                if (!ruleType) return null;
                
                const Icon = ruleType.icon;
                const isExpanded = expandedRule === index;

                return (
                  <div key={index} className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : index)}
                      className="w-full flex items-center gap-3 p-4"
                    >
                      <Icon className="w-5 h-5 text-neon-cyan" />
                      <span className="flex-1 text-left font-medium text-white">{ruleType.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRule(index);
                        }}
                        className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-4 border-t border-white/10">
                        {ruleType.params.map(param => (
                          <div key={param.id} className="flex items-center justify-between">
                            <label className="text-white/60 text-sm">{param.name}</label>
                            {renderParamInput(
                              param, 
                              rule.params[param.id], 
                              (value) => updateRuleParam(index, param.id, value)
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Saved Modes */}
        {savedModes.length > 0 && (
          <div>
            <h2 className="font-bold text-white mb-3">Saved Modes</h2>
            <div className="space-y-2">
              {savedModes.map(mode => (
                <div 
                  key={mode.id}
                  className="flex items-center gap-3 p-3 bg-dark-800 border border-white/10 rounded-xl"
                >
                  <Gamepad2 className="w-5 h-5 text-neon-purple" />
                  <div className="flex-1">
                    <p className="font-medium text-white">{mode.name}</p>
                    <p className="text-xs text-white/40">{mode.rules?.length || 0} rules</p>
                  </div>
                  <button
                    onClick={() => loadMode(mode)}
                    className="p-2 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMode(mode.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-dark-900 via-dark-900/95 to-transparent">
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={saveMode}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-dark-700 text-white font-medium rounded-xl"
            >
              <Save className="w-5 h-5" />
              Save Mode
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl"
            >
              <Play className="w-5 h-5" />
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomGameModeBuilder;

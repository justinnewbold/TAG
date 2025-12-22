import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Clock, Target, Users, Timer, Gamepad2, MapPin, Calendar, Plus, X, Shield, Map, Crosshair, Loader2, Zap, ChevronDown, ChevronUp, Settings, MapPinned, Grip, Globe, Lock, UserCheck, Play } from 'lucide-react';
import { useStore, useSounds, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import BottomSheet from '../components/BottomSheet';

// Lazy load boundary editor
const BoundaryEditor = lazy(() => import('../components/BoundaryEditor'));

// Map click handler component
function MapClickHandler({ onLocationSelect, isSelectingZone }) {
  useMapEvents({
    click: (e) => {
      if (isSelectingZone) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Component to recenter map
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Custom marker icon
const createZoneIcon = (name) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #22c55e;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px #22c55e;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      ">
        🛡️
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #00f5ff, #a855f7);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 15px #00f5ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    ">
      📍
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function CreateGame() {
  const navigate = useNavigate();
  const { createGame, syncGameState, user } = useStore();
  const { vibrate } = useSounds();

  const [userLocation, setUserLocation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
    gameName: `${user?.name || 'Player'}'s Game`,
    gameMode: 'classic',
    gpsInterval: 5 * 60 * 1000, // 5 minutes default
    customInterval: '',
    tagRadius: 50,
    duration: null,
    maxPlayers: 10,
    noTagZones: [],
    noTagTimes: [],
    customBoundary: null, // Custom play area boundary
    // Game mode specific settings
    potatoTimer: 45000, // 45 seconds for hot potato
    hideTime: 120000, // 2 minutes for hide and seek
    // Privacy and scheduling settings
    isPublic: true, // Visible in public game list
    allowSoloPlay: true, // Allow starting with 1 player
    minPlayers: null, // null = use game mode default
    scheduledStartTime: null, // null = manual start
    requireApproval: false, // Host must approve joins
  });

  // Game presets for quick setup
  const GAME_PRESETS = [
    {
      id: 'quick',
      name: 'Quick Game',
      icon: '⚡',
      desc: 'Fast-paced, close range',
      color: 'neon-cyan',
      settings: {
        gameMode: 'classic',
        gpsInterval: 5 * 60 * 1000,
        tagRadius: 25,
        duration: 30 * 60 * 1000, // 30 minutes
        maxPlayers: 6,
      },
    },
    {
      id: 'neighborhood',
      name: 'Neighborhood',
      icon: '🏘️',
      desc: 'Play around the block',
      color: 'neon-purple',
      settings: {
        gameMode: 'classic',
        gpsInterval: 15 * 60 * 1000,
        tagRadius: 100,
        duration: 2 * 60 * 60 * 1000, // 2 hours
        maxPlayers: 10,
      },
    },
    {
      id: 'citywide',
      name: 'City-Wide',
      icon: '🌆',
      desc: 'Extended hunt across town',
      color: 'neon-orange',
      settings: {
        gameMode: 'manhunt',
        gpsInterval: 30 * 60 * 1000,
        tagRadius: 250,
        duration: 24 * 60 * 60 * 1000, // 1 day
        maxPlayers: 20,
      },
    },
    {
      id: 'custom',
      name: 'Custom',
      icon: '🎛️',
      desc: 'Configure everything',
      color: 'white',
      settings: null, // Use current settings
    },
  ];

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    vibrate([30]);
    
    if (preset.settings) {
      setSettings(prev => ({
        ...prev,
        ...preset.settings,
        gameName: prev.gameName, // Keep custom name
      }));
      setShowAdvanced(false);
    } else {
      setShowAdvanced(true);
    }
  };

  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddTime, setShowAddTime] = useState(false);
  const [showRadiusMap, setShowRadiusMap] = useState(false);
  const [isSelectingZoneLocation, setIsSelectingZoneLocation] = useState(false);
  const [selectedZoneLocation, setSelectedZoneLocation] = useState(null);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showBoundaryEditor, setShowBoundaryEditor] = useState(false);
  
  // New zone form
  const [newZone, setNewZone] = useState({ name: '', radius: 100, lat: null, lng: null });
  
  // New time form
  const [newTime, setNewTime] = useState({ name: '', startTime: '09:00', endTime: '17:00', days: [] });
  
  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          // Default to a location if GPS fails
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  }, []);
  
  // GPS interval options (in milliseconds)
  const gpsOptions = [
    { value: 5 * 60 * 1000, label: '5 min', desc: 'Fastest' },
    { value: 15 * 60 * 1000, label: '15 min', desc: 'Active' },
    { value: 30 * 60 * 1000, label: '30 min', desc: 'Standard' },
    { value: 60 * 60 * 1000, label: '1 hour', desc: 'Casual' },
    { value: 12 * 60 * 60 * 1000, label: '12 hours', desc: 'Slow' },
    { value: 24 * 60 * 60 * 1000, label: '24 hours', desc: 'Daily' },
    { value: 'custom', label: 'Custom', desc: 'Set your own' },
  ];
  
  const radiusOptions = [
    { value: 10, label: '10m', desc: 'Very close' },
    { value: 25, label: '25m', desc: 'Close' },
    { value: 50, label: '50m', desc: 'Standard' },
    { value: 100, label: '100m', desc: 'Wide' },
    { value: 250, label: '250m', desc: 'Very wide' },
    { value: 500, label: '500m', desc: 'Huge' },
    { value: 1000, label: '1km', desc: 'Massive' },
  ];
  
  const durationOptions = [
    { value: null, label: 'None', desc: 'Unlimited' },
    { value: 24 * 60 * 60 * 1000, label: '1 day', desc: 'Quick' },
    { value: 7 * 24 * 60 * 60 * 1000, label: '1 week', desc: 'Standard' },
    { value: 30 * 24 * 60 * 60 * 1000, label: '1 month', desc: 'Long' },
  ];
  
  const zoneRadiusOptions = [50, 100, 200, 500, 1000];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handleGpsSelect = (value) => {
    if (value === 'custom') {
      setShowCustomInterval(true);
      setSettings({ ...settings, gpsInterval: 'custom' });
    } else {
      setShowCustomInterval(false);
      setSettings({ ...settings, gpsInterval: value, customInterval: '' });
    }
  };
  
  const handleCustomIntervalChange = (minutes) => {
    const mins = parseInt(minutes) || 0;
    // Minimum 5 minutes
    const validMins = Math.max(5, mins);
    setSettings({ 
      ...settings, 
      customInterval: minutes,
      gpsInterval: validMins * 60 * 1000 
    });
  };
  
  const handleZoneLocationSelect = (location) => {
    setSelectedZoneLocation(location);
    setNewZone({ ...newZone, lat: location.lat, lng: location.lng });
    setIsSelectingZoneLocation(false);
  };
  
  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setSelectedZoneLocation(userLocation);
      setNewZone({ ...newZone, lat: userLocation.lat, lng: userLocation.lng });
    }
  };
  
  const handleAddZone = () => {
    if (!newZone.name.trim() || !newZone.lat || !newZone.lng) return;
    
    const zone = {
      id: Math.random().toString(36).substring(2, 9),
      name: newZone.name,
      lat: newZone.lat,
      lng: newZone.lng,
      radius: newZone.radius,
    };
    
    setSettings({
      ...settings,
      noTagZones: [...settings.noTagZones, zone],
    });
    
    setNewZone({ name: '', radius: 100, lat: null, lng: null });
    setSelectedZoneLocation(null);
    setShowAddZone(false);
  };
  
  const handleRemoveZone = (zoneId) => {
    setSettings({
      ...settings,
      noTagZones: settings.noTagZones.filter(z => z.id !== zoneId),
    });
  };
  
  const handleAddTime = () => {
    if (!newTime.name.trim()) return;
    
    const timeRule = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTime.name,
      startTime: newTime.startTime,
      endTime: newTime.endTime,
      days: newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6],
    };
    setSettings({
      ...settings,
      noTagTimes: [...settings.noTagTimes, timeRule],
    });
    setNewTime({ name: '', startTime: '09:00', endTime: '17:00', days: [] });
    setShowAddTime(false);
  };
  
  const handleRemoveTime = (timeId) => {
    setSettings({
      ...settings,
      noTagTimes: settings.noTagTimes.filter(t => t.id !== timeId),
    });
  };
  
  const toggleDay = (dayIndex) => {
    const days = newTime.days.includes(dayIndex)
      ? newTime.days.filter(d => d !== dayIndex)
      : [...newTime.days, dayIndex];
    setNewTime({ ...newTime, days });
  };
  
  const handleCreate = async () => {
    if (settings.gpsInterval === 'custom' && !settings.customInterval) {
      setError('Please enter a custom interval');
      return;
    }

    if (isCreating) return;

    setIsCreating(true);
    setError('');
    vibrate([50, 30, 100]);

    try {
      // Try to create game on server
      const { game } = await api.createGame(settings);

      // Sync game state to store
      syncGameState(game);

      // Join the socket room for this game
      socketService.joinGameRoom(game.id);

      navigate('/lobby');
    } catch (err) {
      console.error('Create game error:', err);

      // Fallback to local-only mode if server is unavailable
      const isNetworkError = 
        err.message === 'Failed to fetch' || 
        err.message.includes('NetworkError') ||
        err.message.includes('Unable to connect') ||
        err.message.includes('fetch');
        
      if (isNetworkError) {
        console.log('Server unavailable, creating local game...');
        const game = createGame(settings);
        if (game) {
          navigate('/lobby');
        } else {
          setError('Failed to create local game');
        }
      } else {
        setError(err.message || 'Failed to create game');
      }
    } finally {
      setIsCreating(false);
    }
  };
  
  const formatRadius = (meters) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  };

  // Advanced settings state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAdvancedSheet, setShowAdvancedSheet] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header - Smaller for more content space */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Create Game</h1>
            <p className="text-xs text-white/50">Set up your hunt</p>
          </div>
          {/* Quick settings toggle */}
          <button
            onClick={() => setShowAdvancedSheet(true)}
            className="touch-target-48 flex items-center justify-center bg-white/5 rounded-xl"
          >
            <Settings className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>
      
      {/* Scrollable content - ends above the fixed bottom bar */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 space-y-4">
        {/* Quick Start Presets - Large touch targets */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-neon-purple" />
            <h3 className="font-medium">Quick Start</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {GAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`touch-target-48 p-4 rounded-xl text-left transition-all ${
                  selectedPreset === preset.id
                    ? 'bg-neon-purple/20 border-2 border-neon-purple scale-[1.02]'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{preset.icon}</span>
                  <span className={`font-bold ${selectedPreset === preset.id ? 'text-neon-purple' : ''}`}>
                    {preset.name}
                  </span>
                </div>
                <p className="text-xs text-white/50 line-clamp-1">{preset.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode Selection - Larger cards */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-neon-cyan" />
            <h3 className="font-medium">Game Mode</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.values(GAME_MODES).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSettings({ ...settings, gameMode: mode.id })}
                className={`touch-target-48 p-4 rounded-xl text-left transition-all ${
                  settings.gameMode === mode.id
                    ? 'bg-neon-cyan/20 border-2 border-neon-cyan scale-[1.02]'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{mode.icon}</span>
                  <span className={`font-bold text-sm ${settings.gameMode === mode.id ? 'text-neon-cyan' : ''}`}>
                    {mode.name}
                  </span>
                </div>
                <p className="text-xs text-white/50 line-clamp-1">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Game Name - Larger input */}
        <div className="card p-4">
          <label className="label text-sm mb-2 block">Game Name</label>
          <input
            type="text"
            value={settings.gameName}
            onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
            placeholder="Enter game name"
            className="input-field text-lg py-4"
            maxLength={30}
          />
        </div>
        
        {/* Tag Radius - Big slider, thumb-friendly */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-neon-purple" />
              <h3 className="font-medium">Tag Radius</h3>
            </div>
            <span className="text-2xl font-bold text-neon-purple">{formatRadius(settings.tagRadius)}</span>
          </div>
          
          {/* Large thumb-friendly slider */}
          <div className="py-2">
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={settings.tagRadius}
              onChange={(e) => setSettings({ ...settings, tagRadius: parseInt(e.target.value) })}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple slider-thumb-large"
              style={{
                background: `linear-gradient(to right, #a855f7 ${(settings.tagRadius - 10) / 990 * 100}%, rgba(255,255,255,0.1) ${(settings.tagRadius - 10) / 990 * 100}%)`
              }}
            />
          </div>
          
          {/* Quick select chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            {[25, 50, 100, 250, 500].map((r) => (
              <button
                key={r}
                onClick={() => setSettings({ ...settings, tagRadius: r })}
                className={`touch-target-48 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  settings.tagRadius === r
                    ? 'bg-neon-purple text-white'
                    : 'bg-white/10 hover:bg-white/20 active:scale-95'
                }`}
              >
                {formatRadius(r)}
              </button>
            ))}
          </div>
        </div>
        
        {/* GPS Interval - Horizontal scroll chips */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-neon-cyan" />
            <h3 className="font-medium">GPS Updates</h3>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {gpsOptions.slice(0, 6).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGpsSelect(opt.value)}
                className={`touch-target-48 px-4 py-3 rounded-xl text-center whitespace-nowrap transition-all flex-shrink-0 ${
                  settings.gpsInterval === opt.value
                    ? 'bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95'
                }`}
              >
                <p className="font-bold">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Max Players - Large touch chips */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-medium">Max Players</h3>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[4, 6, 8, 10, 15, 20].map((num) => (
              <button
                key={num}
                onClick={() => setSettings({ ...settings, maxPlayers: num })}
                className={`touch-target-48 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all flex-shrink-0 ${
                  settings.maxPlayers === num
                    ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-400'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Spacer for floating button */}
        <div className="h-8" />
      </div>
      
      {/* Fixed Bottom Action Bar - Thumb zone */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="flex gap-3">
          {/* Advanced settings button */}
          <button
            onClick={() => setShowAdvancedSheet(true)}
            className="touch-target-48 w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <Settings className="w-6 h-6" />
          </button>
          
          {/* Main create button - Takes most space */}
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 h-14 btn-primary flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Gamepad2 className="w-6 h-6" />
                Create Game
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Settings Bottom Sheet */}
      <BottomSheet 
        isOpen={showAdvancedSheet} 
        onClose={() => setShowAdvancedSheet(false)}
        title="Advanced Settings"
      >
        <div className="space-y-4 pb-8">
          {/* Game Duration */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Timer className="w-5 h-5 text-neon-orange" />
              <h3 className="font-medium">Game Duration</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value || 'none'}
                  onClick={() => setSettings({ ...settings, duration: opt.value })}
                  className={`touch-target-48 p-4 rounded-xl text-center transition-all ${
                    settings.duration === opt.value
                      ? 'bg-neon-orange/20 border-2 border-neon-orange text-neon-orange'
                      : 'bg-white/5 border border-white/10 active:scale-95'
                  }`}
                >
                  <p className="font-bold">{opt.label}</p>
                  <p className="text-xs opacity-60">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* No-Tag Zones */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400" />
                <h3 className="font-medium">Safe Zones</h3>
              </div>
              <button
                onClick={() => setShowAddZone(true)}
                className="touch-target-48 p-2 bg-green-400/20 rounded-lg text-green-400"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            
            {settings.noTagZones.length > 0 ? (
              <div className="space-y-2">
                {settings.noTagZones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-3 bg-green-400/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-white/50">{formatRadius(zone.radius)} radius</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveZone(zone.id)} className="touch-target-48 p-2">
                      <X className="w-5 h-5 text-white/50" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-4">No safe zones added</p>
            )}
          </div>

          {/* No-Tag Times */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium">Time Restrictions</h3>
              </div>
              <button
                onClick={() => setShowAddTime(true)}
                className="touch-target-48 p-2 bg-blue-400/20 rounded-lg text-blue-400"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            
            {settings.noTagTimes.length > 0 ? (
              <div className="space-y-2">
                {settings.noTagTimes.map((time) => (
                  <div key={time.id} className="flex items-center justify-between p-3 bg-blue-400/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium">{time.name}</p>
                        <p className="text-xs text-white/50">{time.startTime} - {time.endTime}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveTime(time.id)} className="touch-target-48 p-2">
                      <X className="w-5 h-5 text-white/50" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-4">No time restrictions</p>
            )}
          </div>

          {/* Custom Boundary */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <MapPinned className="w-5 h-5 text-purple-400" />
                <h3 className="font-medium">Play Boundary</h3>
              </div>
              <button
                onClick={() => setShowBoundaryEditor(true)}
                className="touch-target-48 p-2 bg-purple-400/20 rounded-lg text-purple-400"
              >
                {settings.customBoundary ? <Settings className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </button>
            </div>
            
            {settings.customBoundary ? (
              <div className="flex items-center justify-between p-3 bg-purple-400/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <Map className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="font-medium">Boundary Set</p>
                    <p className="text-xs text-white/50">
                      {settings.customBoundary.type === 'circle' 
                        ? `Circle: ${formatRadius(settings.customBoundary.radius)}`
                        : 'Custom area'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSettings({ ...settings, customBoundary: null })} className="touch-target-48 p-2">
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-4">No boundary - unlimited area</p>
            )}
          </div>

          {/* Privacy & Access Settings */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium">Privacy & Access</h3>
            </div>
            
            <div className="space-y-3">
              {/* Public/Private Toggle */}
              <label className="flex items-center gap-3 p-3 bg-blue-400/10 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                <input
                  type="checkbox"
                  checked={settings.isPublic}
                  onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
                  className="w-5 h-5 accent-blue-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {settings.isPublic ? <Globe className="w-4 h-4 text-blue-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                    <p className="font-medium">{settings.isPublic ? 'Public Game' : 'Private Game'}</p>
                  </div>
                  <p className="text-xs text-white/50">
                    {settings.isPublic ? 'Anyone can find and join this game' : 'Only people with the code can join'}
                  </p>
                </div>
              </label>

              {/* Allow Solo Play */}
              <label className="flex items-center gap-3 p-3 bg-green-400/10 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                <input
                  type="checkbox"
                  checked={settings.allowSoloPlay}
                  onChange={(e) => setSettings({ ...settings, allowSoloPlay: e.target.checked })}
                  className="w-5 h-5 accent-green-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-green-400" />
                    <p className="font-medium">Allow Solo Play</p>
                  </div>
                  <p className="text-xs text-white/50">Start the game without waiting for other players</p>
                </div>
              </label>

              {/* Require Approval */}
              <label className="flex items-center gap-3 p-3 bg-amber-400/10 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                <input
                  type="checkbox"
                  checked={settings.requireApproval}
                  onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                  className="w-5 h-5 accent-amber-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <p className="font-medium">Require Approval</p>
                  </div>
                  <p className="text-xs text-white/50">You must approve each player before they can join</p>
                </div>
              </label>
            </div>
          </div>

          {/* Minimum Players */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="font-medium">Minimum Players to Start</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[null, 1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num ?? 'default'}
                  onClick={() => setSettings({ ...settings, minPlayers: num })}
                  className={`touch-target-48 px-4 py-2 rounded-xl transition-all ${
                    settings.minPlayers === num
                      ? 'bg-cyan-400/20 border-2 border-cyan-400 text-cyan-400'
                      : 'bg-white/5 border border-white/10 active:scale-95'
                  }`}
                >
                  {num === null ? 'Default' : num}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-2">
              {settings.minPlayers === null 
                ? `Using game mode default (${GAME_MODES[settings.gameMode]?.minPlayers || 2} players)`
                : settings.minPlayers === 1 
                  ? 'Game can start with just you!'
                  : `Need ${settings.minPlayers} players to start`}
            </p>
          </div>

          {/* Scheduled Start Time */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-pink-400" />
              <h3 className="font-medium">Schedule Start Time</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="startTime"
                  checked={settings.scheduledStartTime === null}
                  onChange={() => setSettings({ ...settings, scheduledStartTime: null })}
                  className="w-5 h-5 accent-pink-400"
                />
                <span>Start manually when ready</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="startTime"
                  checked={settings.scheduledStartTime !== null}
                  onChange={() => setSettings({ ...settings, scheduledStartTime: Date.now() + 30 * 60 * 1000 })}
                  className="w-5 h-5 accent-pink-400"
                />
                <span>Schedule for later</span>
              </label>
              {settings.scheduledStartTime !== null && (
                <input
                  type="datetime-local"
                  value={new Date(settings.scheduledStartTime).toISOString().slice(0, 16)}
                  onChange={(e) => setSettings({ ...settings, scheduledStartTime: new Date(e.target.value).getTime() })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              )}
            </div>
          </div>
        </div>
      </BottomSheet>
      {showRadiusMap && userLocation && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="p-4 bg-dark-900 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Tag Radius Preview</h3>
                <p className="text-sm text-white/50">See how far you can tag</p>
              </div>
              <button onClick={() => setShowRadiusMap(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={settings.tagRadius > 500 ? 14 : settings.tagRadius > 100 ? 16 : 17}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapController center={userLocation} zoom={settings.tagRadius > 500 ? 14 : settings.tagRadius > 100 ? 16 : 17} />
              
              {/* Tag radius circle */}
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={settings.tagRadius}
                pathOptions={{
                  color: '#a855f7',
                  fillColor: '#a855f7',
                  fillOpacity: 0.2,
                  weight: 3,
                }}
              />
              
              {/* User marker */}
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
              
              {/* No-tag zones */}
              {settings.noTagZones.map((zone) => (
                <React.Fragment key={zone.id}>
                  <Circle
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius}
                    pathOptions={{
                      color: '#22c55e',
                      fillColor: '#22c55e',
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '5, 5',
                    }}
                  />
                  <Marker position={[zone.lat, zone.lng]} icon={createZoneIcon(zone.name)} />
                </React.Fragment>
              ))}
            </MapContainer>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 right-4 card p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-neon-purple/50 border-2 border-neon-purple"></div>
                  <span className="text-sm">Tag Radius: {formatRadius(settings.tagRadius)}</span>
                </div>
                {settings.noTagZones.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500/50 border-2 border-green-500 border-dashed"></div>
                    <span className="text-sm">Safe Zones ({settings.noTagZones.length})</span>
                  </div>
                )}
              </div>
              
              {/* Radius Slider in Map View */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={settings.tagRadius}
                  onChange={(e) => setSettings({ ...settings, tagRadius: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                />
                <div className="flex justify-between text-xs text-white/40">
                  <span>10m</span>
                  <span>500m</span>
                  <span>1km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Zone Modal with Map */}
      {showAddZone && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="p-4 bg-dark-900 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Add No-Tag Zone</h3>
                <p className="text-sm text-white/50">
                  {isSelectingZoneLocation ? 'Tap the map to select location' : 'Configure your safe zone'}
                </p>
              </div>
              <button onClick={() => { setShowAddZone(false); setIsSelectingZoneLocation(false); setSelectedZoneLocation(null); }} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Map for zone selection */}
          <div className="h-64 relative">
            {userLocation && (
              <MapContainer
                center={[selectedZoneLocation?.lat || userLocation.lat, selectedZoneLocation?.lng || userLocation.lng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler onLocationSelect={handleZoneLocationSelect} isSelectingZone={isSelectingZoneLocation} />
                
                {/* User location marker */}
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
                
                {/* Selected zone preview */}
                {selectedZoneLocation && (
                  <>
                    <Circle
                      center={[selectedZoneLocation.lat, selectedZoneLocation.lng]}
                      radius={newZone.radius}
                      pathOptions={{
                        color: '#22c55e',
                        fillColor: '#22c55e',
                        fillOpacity: 0.2,
                        weight: 2,
                      }}
                    />
                    <Marker position={[selectedZoneLocation.lat, selectedZoneLocation.lng]} icon={createZoneIcon('')} />
                  </>
                )}
                
                {/* Existing zones */}
                {settings.noTagZones.map((zone) => (
                  <Circle
                    key={zone.id}
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius}
                    pathOptions={{
                      color: '#22c55e',
                      fillColor: '#22c55e',
                      fillOpacity: 0.1,
                      weight: 1,
                      dashArray: '5, 5',
                    }}
                  />
                ))}
              </MapContainer>
            )}
            
            {/* Map overlay instructions */}
            {isSelectingZoneLocation && (
              <div className="absolute top-2 left-2 right-2 bg-green-500/90 text-white text-center py-2 px-4 rounded-lg text-sm font-medium">
                Tap on the map to place your safe zone
              </div>
            )}
          </div>
          
          {/* Zone configuration form */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Location Selection Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleUseCurrentLocation}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  selectedZoneLocation && selectedZoneLocation.lat === userLocation?.lat
                    ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Crosshair className="w-4 h-4" />
                <span className="text-sm">Current Location</span>
              </button>
              <button
                onClick={() => setIsSelectingZoneLocation(!isSelectingZoneLocation)}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  isSelectingZoneLocation
                    ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Pick on Map</span>
              </button>
            </div>
            
            {selectedZoneLocation && (
              <div className="p-2 bg-green-500/10 rounded-lg text-center text-sm text-green-400">
                📍 Location selected
              </div>
            )}
            
            <div>
              <label className="label">Zone Name</label>
              <input
                type="text"
                value={newZone.name}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                placeholder="e.g., Home, Work, School"
                className="input-field"
              />
            </div>
            
            <div>
              <label className="label">Safe Radius: {formatRadius(newZone.radius)}</label>
              <input
                type="range"
                min="25"
                max="1000"
                step="25"
                value={newZone.radius}
                onChange={(e) => setNewZone({ ...newZone, radius: parseInt(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>25m</span>
                <span>500m</span>
                <span>1km</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {zoneRadiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setNewZone({ ...newZone, radius: r })}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    newZone.radius === r
                      ? 'bg-green-400/20 border border-green-400 text-green-400'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {formatRadius(r)}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleAddZone}
              disabled={!newZone.name.trim() || !selectedZoneLocation}
              className="btn-primary w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Add Safe Zone
            </button>
          </div>
        </div>
      )}
      
      {/* Add Time Modal */}
      {showAddTime && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="card-glow p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Add No-Tag Time</h3>
              <button onClick={() => setShowAddTime(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Rule Name</label>
                <input
                  type="text"
                  value={newTime.name}
                  onChange={(e) => setNewTime({ ...newTime, name: e.target.value })}
                  placeholder="e.g., Work Hours, Sleep Time"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time"
                    value={newTime.startTime}
                    onChange={(e) => setNewTime({ ...newTime, startTime: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    value={newTime.endTime}
                    onChange={(e) => setNewTime({ ...newTime, endTime: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="label">Days (leave empty for all days)</label>
                <div className="flex gap-1">
                  {daysOfWeek.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(index)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        newTime.days.includes(index)
                          ? 'bg-blue-400/20 border border-blue-400 text-blue-400'
                          : 'bg-white/5 border border-white/10 text-white/60'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddTime}
                disabled={!newTime.name.trim()}
                className="btn-primary w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Add Time Rule
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Boundary Editor Modal */}
      {showBoundaryEditor && userLocation && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        }>
          <BoundaryEditor 
            initialCenter={userLocation}
            initialBoundary={settings.customBoundary}
            onSave={(boundary) => {
              setSettings({ ...settings, customBoundary: boundary });
              setShowBoundaryEditor(false);
            }}
            onClose={() => setShowBoundaryEditor(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default CreateGame;

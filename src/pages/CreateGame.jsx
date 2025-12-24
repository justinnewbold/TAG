import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Clock, Target, Users, Timer, Gamepad2, MapPin, Calendar, Plus, X, Shield, Map, Crosshair, Loader2 } from 'lucide-react';
import { useStore, useSounds } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

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

// Limits for no-tag zones and times
const MAX_NO_TAG_ZONES = 10;
const MAX_NO_TAG_TIMES = 5;

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
  const [settings, setSettings] = useState({
    gameName: `${user?.name || 'Player'}'s Game`,
    gpsInterval: 5 * 60 * 1000, // 5 minutes default
    customInterval: '',
    tagRadius: 50,
    duration: null,
    maxPlayers: 10,
    noTagZones: [],
    noTagTimes: [],
  });

  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddTime, setShowAddTime] = useState(false);
  const [showRadiusMap, setShowRadiusMap] = useState(false);
  const [isSelectingZoneLocation, setIsSelectingZoneLocation] = useState(false);
  const [selectedZoneLocation, setSelectedZoneLocation] = useState(null);
  
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
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        const game = createGame(settings);
        if (game) {
          navigate('/lobby');
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
  
  return (
    <div className="min-h-screen p-6 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Create Game</h1>
          <p className="text-sm text-gray-500">Set up your hunt</p>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Game Name */}
        <div className="card p-4">
          <label className="label">Game Name</label>
          <input
            type="text"
            value={settings.gameName}
            onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
            placeholder="Enter game name"
            className="input-field"
            maxLength={30}
          />
        </div>
        
        {/* Tag Radius with Map */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <h3 className="font-medium text-gray-900">Tag Radius</h3>
                <p className="text-xs text-gray-500">Distance to tag someone</p>
              </div>
            </div>
            <button
              onClick={() => setShowRadiusMap(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-lg text-purple-600 text-sm hover:bg-purple-200 transition-colors"
            >
              <Map className="w-4 h-4" />
              View on Map
            </button>
          </div>

          {/* Radius Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl font-bold text-purple-600">{formatRadius(settings.tagRadius)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={settings.tagRadius}
              onChange={(e) => setSettings({ ...settings, tagRadius: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10m</span>
              <span>500m</span>
              <span>1km</span>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {radiusOptions.slice(0, 4).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings({ ...settings, tagRadius: opt.value })}
                className={`p-2 rounded-xl text-center transition-all text-sm ${
                  settings.tagRadius === opt.value
                    ? 'bg-purple-100 border-2 border-purple-500 text-purple-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* GPS Update Interval */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-medium text-gray-900">GPS Update Interval</h3>
              <p className="text-xs text-gray-500">How often locations update</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gpsOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGpsSelect(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  (settings.gpsInterval === opt.value || (opt.value === 'custom' && showCustomInterval))
                    ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>

          {showCustomInterval && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <label className="label">Custom Interval (minutes)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.customInterval}
                  onChange={(e) => handleCustomIntervalChange(e.target.value)}
                  placeholder="Enter minutes (min: 5)"
                  className="input-field flex-1"
                  min="5"
                />
                <span className="text-gray-500">min</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Minimum interval is 5 minutes</p>
            </div>
          )}
        </div>
        
        {/* Game Duration */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="font-medium text-gray-900">Game Duration</h3>
              <p className="text-xs text-gray-500">Time limit for the game</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value || 'none'}
                onClick={() => setSettings({ ...settings, duration: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.duration === opt.value
                    ? 'bg-orange-100 border-2 border-orange-500 text-orange-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Max Players */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-medium text-gray-900">Max Players</h3>
              <p className="text-xs text-gray-500">Maximum players allowed</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[2, 4, 6, 8, 10, 15, 20, 50].map((num) => (
              <button
                key={num}
                onClick={() => setSettings({ ...settings, maxPlayers: num })}
                className={`px-4 py-2 rounded-xl text-center transition-all flex-shrink-0 ${
                  settings.maxPlayers === num
                    ? 'bg-amber-100 border-2 border-amber-500 text-amber-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        
        {/* No-Tag Zones */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-medium text-gray-900">No-Tag Zones</h3>
                <p className="text-xs text-gray-500">
                  Safe areas where tagging is disabled ({settings.noTagZones.length}/{MAX_NO_TAG_ZONES})
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddZone(true)}
              disabled={settings.noTagZones.length >= MAX_NO_TAG_ZONES}
              className={`p-2 rounded-lg transition-colors ${
                settings.noTagZones.length >= MAX_NO_TAG_ZONES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              title={settings.noTagZones.length >= MAX_NO_TAG_ZONES ? `Maximum ${MAX_NO_TAG_ZONES} zones allowed` : 'Add zone'}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {settings.noTagZones.length > 0 ? (
            <div className="space-y-2">
              {settings.noTagZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{zone.name}</p>
                      <p className="text-xs text-gray-500">{formatRadius(zone.radius)} radius</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveZone(zone.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No safe zones added</p>
          )}
        </div>

        {/* No-Tag Times */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-gray-900">No-Tag Times</h3>
                <p className="text-xs text-gray-500">
                  Time periods when tagging is disabled ({settings.noTagTimes.length}/{MAX_NO_TAG_TIMES})
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTime(true)}
              disabled={settings.noTagTimes.length >= MAX_NO_TAG_TIMES}
              className={`p-2 rounded-lg transition-colors ${
                settings.noTagTimes.length >= MAX_NO_TAG_TIMES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title={settings.noTagTimes.length >= MAX_NO_TAG_TIMES ? `Maximum ${MAX_NO_TAG_TIMES} time rules allowed` : 'Add time rule'}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {settings.noTagTimes.length > 0 ? (
            <div className="space-y-2">
              {settings.noTagTimes.map((time) => (
                <div key={time.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{time.name}</p>
                      <p className="text-xs text-gray-500">
                        {time.startTime} - {time.endTime} • {time.days.length === 7 ? 'Every day' : time.days.map(d => daysOfWeek[d]).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTime(time.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No time restrictions added</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Game...
            </>
          ) : (
            <>
              <Gamepad2 className="w-5 h-5" />
              Create Game
            </>
          )}
        </button>
      </div>
      
      {/* Tag Radius Map Modal */}
      {showRadiusMap && userLocation && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Tag Radius Preview</h3>
                <p className="text-sm text-gray-500">See how far you can tag</p>
              </div>
              <button onClick={() => setShowRadiusMap(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-600" />
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
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
                  <div className="w-4 h-4 rounded-full bg-purple-200 border-2 border-purple-500"></div>
                  <span className="text-sm text-gray-700">Tag Radius: {formatRadius(settings.tagRadius)}</span>
                </div>
                {settings.noTagZones.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-200 border-2 border-green-500 border-dashed"></div>
                    <span className="text-sm text-gray-700">Safe Zones ({settings.noTagZones.length})</span>
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
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
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Add No-Tag Zone</h3>
                <p className="text-sm text-gray-500">
                  {isSelectingZoneLocation ? 'Tap the map to select location' : 'Configure your safe zone'}
                </p>
              </div>
              <button onClick={() => { setShowAddZone(false); setIsSelectingZoneLocation(false); setSelectedZoneLocation(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-600" />
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
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
              <div className="absolute top-2 left-2 right-2 bg-green-500 text-white text-center py-2 px-4 rounded-lg text-sm font-medium">
                Tap on the map to place your safe zone
              </div>
            )}
          </div>

          {/* Zone configuration form */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-white">
            {/* Location Selection Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleUseCurrentLocation}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  selectedZoneLocation && selectedZoneLocation.lat === userLocation?.lat
                    ? 'bg-green-100 border-2 border-green-500 text-green-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Crosshair className="w-4 h-4" />
                <span className="text-sm">Current Location</span>
              </button>
              <button
                onClick={() => setIsSelectingZoneLocation(!isSelectingZoneLocation)}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  isSelectingZoneLocation
                    ? 'bg-green-100 border-2 border-green-500 text-green-600'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Pick on Map</span>
              </button>
            </div>

            {selectedZoneLocation && (
              <div className="p-2 bg-green-50 rounded-lg text-center text-sm text-green-600 border border-green-200">
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
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
                      ? 'bg-green-100 border border-green-500 text-green-600'
                      : 'bg-gray-50 border border-gray-200 text-gray-600'
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
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="card p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Add No-Tag Time</h3>
              <button onClick={() => setShowAddTime(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
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
                          ? 'bg-blue-100 border border-blue-500 text-blue-600'
                          : 'bg-gray-50 border border-gray-200 text-gray-500'
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
    </div>
  );
}

export default CreateGame;

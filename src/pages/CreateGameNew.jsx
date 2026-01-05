import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents, Polygon } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, Clock, Target, Users, Timer, Gamepad2, MapPin,
  Plus, X, Shield, Map, Crosshair, Loader2, Zap, ChevronDown,
  ChevronUp, Settings, Globe, Lock, UserCheck, Play, Eye,
  Maximize2, Minimize2, Navigation, LocateFixed, Layers
} from 'lucide-react';
import { useStore, useSounds, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import BottomSheet from '../components/BottomSheet';

// Lazy load boundary editor
const BoundaryEditor = lazy(() => import('../components/BoundaryEditor'));

// Map controller for dynamic updates
function MapController({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, bounds, map]);

  return null;
}

// User location marker
const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #00f5ff;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 20px #00f5ff, 0 0 40px #00f5ff50;
      animation: pulse 2s ease-in-out infinite;
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Safe zone marker
const safeZoneIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width: 24px; height: 24px; background: #22c55e; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px;">🛡️</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function CreateGame() {
  const navigate = useNavigate();
  const { createGame, syncGameState, user } = useStore();
  const { vibrate } = useSounds();

  // Core state
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // UI state
  const [selectedPreset, setSelectedPreset] = useState('quick');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showAdvancedSheet, setShowAdvancedSheet] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Game settings
  const [settings, setSettings] = useState({
    gameName: `${user?.name || 'Player'}'s Game`,
    gameMode: 'classic',
    tagRadius: 50,
    playAreaRadius: 500, // Default play area
    duration: null,
    maxPlayers: 10,
    gpsInterval: 5 * 60 * 1000,
    noTagZones: [],
    noTagTimes: [],
    customBoundary: null,
    isPublic: true,
    allowSoloPlay: true,
    requireApproval: false,
    tagImmunityTime: 5000,
  });

  // Presets for quick setup
  const GAME_PRESETS = [
    {
      id: 'quick',
      name: 'Quick',
      icon: '⚡',
      desc: '5 min, 50m range',
      settings: { tagRadius: 50, playAreaRadius: 300, maxPlayers: 6, duration: 30 * 60 * 1000 },
    },
    {
      id: 'neighborhood',
      name: 'Block',
      icon: '🏘️',
      desc: '100m, neighborhood',
      settings: { tagRadius: 100, playAreaRadius: 1000, maxPlayers: 10, duration: 60 * 60 * 1000 },
    },
    {
      id: 'city',
      name: 'City',
      icon: '🌆',
      desc: '500m, city-wide',
      settings: { tagRadius: 500, playAreaRadius: 5000, maxPlayers: 20, duration: 24 * 60 * 60 * 1000 },
    },
    {
      id: 'global',
      name: 'Global',
      icon: '🌍',
      desc: 'Worldwide',
      settings: { tagRadius: 1000, playAreaRadius: 20015000, maxPlayers: 100, duration: 7 * 24 * 60 * 60 * 1000 },
    },
  ];

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        (err) => {
          console.error('Location error:', err);
          setLocationError('Could not get your location. Using default.');
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation not supported');
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
      setIsLocating(false);
    }
  }, []);

  // Apply preset
  const applyPreset = (presetId) => {
    const preset = GAME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setSettings(prev => ({ ...prev, ...preset.settings }));
      vibrate([30]);
    }
  };

  // Calculate appropriate zoom level for map
  const getZoomForRadius = (radius) => {
    if (radius >= 10000000) return 2;
    if (radius >= 1000000) return 4;
    if (radius >= 100000) return 6;
    if (radius >= 10000) return 9;
    if (radius >= 1000) return 12;
    if (radius >= 500) return 14;
    if (radius >= 100) return 16;
    return 17;
  };

  // Format radius for display
  const formatRadius = (meters) => {
    if (meters >= 20015000) return '🌍 Global';
    if (meters >= 1000000) return `${(meters / 1000000).toFixed(0)}K km`;
    if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
    return `${meters}m`;
  };

  // Handle game creation
  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError('');
    vibrate([50, 30, 100]);

    try {
      const gameSettings = {
        ...settings,
        // Set boundary based on play area if not custom
        customBoundary: settings.customBoundary || (userLocation ? {
          type: 'circle',
          center: userLocation,
          radius: settings.playAreaRadius,
        } : null),
      };

      const { game } = await api.createGame(gameSettings);
      syncGameState(game);
      socketService.joinGameRoom(game.id);
      navigate('/lobby');
    } catch (err) {
      console.error('Create game error:', err);

      if (err.message?.includes('fetch') || err.message?.includes('Network')) {
        const game = createGame(settings);
        if (game) {
          navigate('/lobby');
        } else {
          setError('Failed to create game');
        }
      } else {
        setError(err.message || 'Failed to create game');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Re-center map to user location
  const recenterMap = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Compact Header */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">New Game</h1>
          </div>
          <button
            onClick={() => setShowAdvancedSheet(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"
          >
            <Settings className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Live Map Preview - Central Feature */}
        <div className={`relative transition-all duration-300 ${mapExpanded ? 'flex-1' : 'h-48'}`}>
          {userLocation ? (
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={getZoomForRadius(settings.playAreaRadius)}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapController
                center={userLocation}
                zoom={getZoomForRadius(settings.playAreaRadius)}
              />

              {/* Play Area Boundary */}
              {settings.playAreaRadius < 20015000 && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={settings.playAreaRadius}
                  pathOptions={{
                    color: '#6366f1',
                    fillColor: '#6366f1',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '10, 5',
                  }}
                />
              )}

              {/* Tag Radius Preview */}
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={settings.tagRadius}
                pathOptions={{
                  color: '#a855f7',
                  fillColor: '#a855f7',
                  fillOpacity: 0.25,
                  weight: 3,
                }}
              />

              {/* User Location */}
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />

              {/* Safe Zones */}
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
                    }}
                  />
                  <Marker position={[zone.lat, zone.lng]} icon={safeZoneIcon} />
                </React.Fragment>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-dark-800">
              {isLocating ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-neon-cyan" />
                  <p className="text-sm text-white/60">Getting your location...</p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-white/40" />
                  <p className="text-sm text-white/60">{locationError || 'Location unavailable'}</p>
                </div>
              )}
            </div>
          )}

          {/* Map Controls Overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
            <button
              onClick={() => setMapExpanded(!mapExpanded)}
              className="w-10 h-10 bg-dark-900/90 backdrop-blur rounded-xl flex items-center justify-center border border-white/10"
            >
              {mapExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={recenterMap}
              disabled={isLocating}
              className="w-10 h-10 bg-dark-900/90 backdrop-blur rounded-xl flex items-center justify-center border border-white/10 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LocateFixed className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 right-3 z-[1000]">
            <div className="bg-dark-900/90 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neon-purple border border-white/50"></div>
                  <span className="text-white/70">Tag: {formatRadius(settings.tagRadius)}</span>
                </div>
                {settings.playAreaRadius < 20015000 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-dashed"></div>
                    <span className="text-white/70">Area: {formatRadius(settings.playAreaRadius)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neon-cyan border border-white/50"></div>
                  <span className="text-white/70">You</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section - Scrollable */}
        <div className={`flex-1 overflow-y-auto ${mapExpanded ? 'hidden' : ''}`}>
          <div className="p-4 space-y-4 pb-32">

            {/* Quick Presets - Large Touch Targets */}
            <div className="grid grid-cols-4 gap-2">
              {GAME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`py-3 px-2 rounded-xl text-center transition-all ${
                    selectedPreset === preset.id
                      ? 'bg-neon-purple/20 border-2 border-neon-purple'
                      : 'bg-white/5 border border-white/10 active:scale-95'
                  }`}
                >
                  <span className="text-2xl block mb-1">{preset.icon}</span>
                  <span className={`text-xs font-medium ${selectedPreset === preset.id ? 'text-neon-purple' : 'text-white/70'}`}>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Game Mode - Horizontal Scroll */}
            <section>
              <h3 className="text-sm font-medium text-white/60 mb-2 px-1">Game Mode</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                {Object.values(GAME_MODES).slice(0, 6).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSettings({ ...settings, gameMode: mode.id })}
                    className={`flex-shrink-0 w-28 p-3 rounded-xl text-center transition-all snap-start ${
                      settings.gameMode === mode.id
                        ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                        : 'bg-white/5 border border-white/10 active:scale-95'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{mode.icon}</span>
                    <span className={`text-xs font-medium line-clamp-1 ${settings.gameMode === mode.id ? 'text-neon-cyan' : ''}`}>
                      {mode.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Tag Radius - Visual Slider */}
            <section className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-neon-purple" />
                  <span className="font-medium">Tag Range</span>
                </div>
                <span className="text-xl font-bold text-neon-purple">{formatRadius(settings.tagRadius)}</span>
              </div>

              {/* Large Thumb Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={Math.log10(settings.tagRadius) / Math.log10(20015000) * 100}
                onChange={(e) => {
                  const logValue = parseFloat(e.target.value) / 100 * Math.log10(20015000);
                  setSettings({ ...settings, tagRadius: Math.max(10, Math.round(Math.pow(10, logValue))) });
                }}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #a855f7 ${Math.log10(settings.tagRadius) / Math.log10(20015000) * 100}%, rgba(255,255,255,0.1) 0%)`
                }}
              />

              {/* Quick Select Chips */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {[25, 50, 100, 250, 500, 1000].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSettings({ ...settings, tagRadius: r })}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                      settings.tagRadius === r
                        ? 'bg-neon-purple text-white'
                        : 'bg-white/10 text-white/70 active:scale-95'
                    }`}
                  >
                    {formatRadius(r)}
                  </button>
                ))}
              </div>
            </section>

            {/* Play Area */}
            <section className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-indigo-400" />
                  <span className="font-medium">Play Area</span>
                </div>
                <span className="text-xl font-bold text-indigo-400">{formatRadius(settings.playAreaRadius)}</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={Math.log10(settings.playAreaRadius) / Math.log10(20015000) * 100}
                onChange={(e) => {
                  const logValue = parseFloat(e.target.value) / 100 * Math.log10(20015000);
                  setSettings({ ...settings, playAreaRadius: Math.max(100, Math.round(Math.pow(10, logValue))) });
                }}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${Math.log10(settings.playAreaRadius) / Math.log10(20015000) * 100}%, rgba(255,255,255,0.1) 0%)`
                }}
              />

              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {[300, 500, 1000, 5000, 10000, 20015000].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSettings({ ...settings, playAreaRadius: r })}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                      settings.playAreaRadius === r
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-white/70 active:scale-95'
                    }`}
                  >
                    {r === 20015000 ? '🌍 No Limit' : formatRadius(r)}
                  </button>
                ))}
              </div>
            </section>

            {/* Players */}
            <section className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span className="font-medium">Max Players</span>
                </div>
                <span className="text-xl font-bold text-amber-400">{settings.maxPlayers}</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {[4, 6, 8, 10, 15, 20, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSettings({ ...settings, maxPlayers: num })}
                    className={`min-w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                      settings.maxPlayers === num
                        ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-400'
                        : 'bg-white/10 text-white/70 active:scale-95'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </section>

            {/* Game Name - Simplified */}
            <section className="bg-white/5 rounded-2xl p-4">
              <label className="text-sm font-medium text-white/60 mb-2 block">Game Name</label>
              <input
                type="text"
                value={settings.gameName}
                onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
                placeholder="Enter game name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan"
                maxLength={30}
              />
            </section>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdvancedSheet(true)}
            className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <Settings className="w-6 h-6" />
          </button>

          <button
            onClick={handleCreate}
            disabled={isCreating || !userLocation}
            className="flex-1 h-14 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-xl flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Create Game
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Settings Sheet */}
      <BottomSheet
        isOpen={showAdvancedSheet}
        onClose={() => setShowAdvancedSheet(false)}
        title="Settings"
      >
        <div className="space-y-4 pb-8">
          {/* Duration */}
          <section className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-orange-400" />
              <span className="font-medium">Game Duration</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: null, label: 'Unlimited' },
                { value: 30 * 60 * 1000, label: '30 min' },
                { value: 60 * 60 * 1000, label: '1 hour' },
                { value: 24 * 60 * 60 * 1000, label: '1 day' },
                { value: 7 * 24 * 60 * 60 * 1000, label: '1 week' },
              ].map((opt) => (
                <button
                  key={opt.value ?? 'none'}
                  onClick={() => setSettings({ ...settings, duration: opt.value })}
                  className={`p-3 rounded-xl text-center transition-all ${
                    settings.duration === opt.value
                      ? 'bg-orange-400/20 border-2 border-orange-400 text-orange-400'
                      : 'bg-white/5 border border-white/10 active:scale-95'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* GPS Updates */}
          <section className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">Location Updates</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { value: 5 * 60 * 1000, label: '5 min' },
                { value: 15 * 60 * 1000, label: '15 min' },
                { value: 30 * 60 * 1000, label: '30 min' },
                { value: 60 * 60 * 1000, label: '1 hour' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSettings({ ...settings, gpsInterval: opt.value })}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${
                    settings.gpsInterval === opt.value
                      ? 'bg-cyan-400/20 border-2 border-cyan-400 text-cyan-400'
                      : 'bg-white/5 border border-white/10 active:scale-95'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Privacy</span>
            </div>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPublic}
                onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
                className="w-5 h-5 accent-blue-400"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{settings.isPublic ? 'Public Game' : 'Private Game'}</p>
                <p className="text-xs text-white/50">
                  {settings.isPublic ? 'Anyone can find and join' : 'Invite only'}
                </p>
              </div>
              {settings.isPublic ? <Globe className="w-4 h-4 text-blue-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                className="w-5 h-5 accent-amber-400"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">Require Approval</p>
                <p className="text-xs text-white/50">You approve each player</p>
              </div>
              <UserCheck className="w-4 h-4 text-amber-400" />
            </label>
          </section>

          {/* Safe Zones */}
          <section className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-medium">Safe Zones</span>
              </div>
              <span className="text-sm text-white/50">{settings.noTagZones.length} zones</span>
            </div>

            {settings.noTagZones.length > 0 ? (
              <div className="space-y-2 mb-3">
                {settings.noTagZones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-3 bg-green-400/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{zone.name}</span>
                      <span className="text-xs text-white/50">{formatRadius(zone.radius)}</span>
                    </div>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        noTagZones: settings.noTagZones.filter(z => z.id !== zone.id)
                      })}
                      className="p-1"
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-3">No safe zones added</p>
            )}

            <button className="w-full p-3 bg-green-400/10 border border-green-400/30 rounded-xl text-green-400 text-sm font-medium flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Safe Zone
            </button>
          </section>
        </div>
      </BottomSheet>
    </div>
  );
}

export default CreateGame;

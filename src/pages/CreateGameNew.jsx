import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, MapPin, Loader2, Settings, Maximize2, Minimize2, LocateFixed, Target, Map
} from 'lucide-react';
import { useStore, useSounds, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import BottomSheet from '../components/BottomSheet';
import {
  QuickPresets,
  GameModeSelector,
  RadiusSlider,
  MaxPlayersSelector,
  GameNameInput,
  CreateActionBar,
  AdvancedSettingsContent,
} from '../components/create';

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
  const GAME_PRESETS = useMemo(() => [
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
  ], []);

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
  const applyPreset = useCallback((presetId) => {
    const preset = GAME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setSettings(prev => ({ ...prev, ...preset.settings }));
      vibrate([30]);
    }
  }, [GAME_PRESETS, vibrate]);

  // Calculate appropriate zoom level for map
  const getZoomForRadius = useCallback((radius) => {
    if (radius >= 10000000) return 2;
    if (radius >= 1000000) return 4;
    if (radius >= 100000) return 6;
    if (radius >= 10000) return 9;
    if (radius >= 1000) return 12;
    if (radius >= 500) return 14;
    if (radius >= 100) return 16;
    return 17;
  }, []);

  // Format radius for display
  const formatRadius = useCallback((meters) => {
    if (meters >= 20015000) return '🌍 Global';
    if (meters >= 1000000) return `${(meters / 1000000).toFixed(0)}K km`;
    if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
    return `${meters}m`;
  }, []);

  // Handle game creation
  const handleCreate = useCallback(async () => {
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
  }, [isCreating, settings, userLocation, vibrate, syncGameState, navigate, createGame]);

  // Re-center map to user location
  const recenterMap = useCallback(() => {
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
  }, []);

  // Quick radius options for sliders
  const tagRadiusOptions = useMemo(() => [
    { value: 25, label: '25m' },
    { value: 50, label: '50m' },
    { value: 100, label: '100m' },
    { value: 250, label: '250m' },
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
  ], []);

  const playAreaOptions = useMemo(() => [
    { value: 300, label: '300m' },
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
    { value: 5000, label: '5km' },
    { value: 10000, label: '10km' },
    { value: 20015000, label: '🌍 No Limit' },
  ], []);

  // Callbacks for settings updates
  const handleGameModeChange = useCallback((mode) => {
    setSettings(prev => ({ ...prev, gameMode: mode }));
  }, []);

  const handleTagRadiusChange = useCallback((value) => {
    setSettings(prev => ({ ...prev, tagRadius: value }));
  }, []);

  const handlePlayAreaChange = useCallback((value) => {
    setSettings(prev => ({ ...prev, playAreaRadius: value }));
  }, []);

  const handleMaxPlayersChange = useCallback((value) => {
    setSettings(prev => ({ ...prev, maxPlayers: value }));
  }, []);

  const handleGameNameChange = useCallback((value) => {
    setSettings(prev => ({ ...prev, gameName: value }));
  }, []);

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
            {/* Quick Presets */}
            <QuickPresets
              presets={GAME_PRESETS}
              selectedPreset={selectedPreset}
              onSelect={applyPreset}
            />

            {/* Game Mode */}
            <GameModeSelector
              modes={GAME_MODES}
              selectedMode={settings.gameMode}
              onSelect={handleGameModeChange}
            />

            {/* Tag Radius */}
            <RadiusSlider
              value={settings.tagRadius}
              onChange={handleTagRadiusChange}
              min={10}
              label="Tag Range"
              icon={Target}
              color="purple"
              quickOptions={tagRadiusOptions}
              formatRadius={formatRadius}
            />

            {/* Play Area */}
            <RadiusSlider
              value={settings.playAreaRadius}
              onChange={handlePlayAreaChange}
              min={100}
              label="Play Area"
              icon={Map}
              color="indigo"
              quickOptions={playAreaOptions}
              formatRadius={formatRadius}
            />

            {/* Max Players */}
            <MaxPlayersSelector
              value={settings.maxPlayers}
              onChange={handleMaxPlayersChange}
            />

            {/* Game Name */}
            <GameNameInput
              value={settings.gameName}
              onChange={handleGameNameChange}
            />

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
      <CreateActionBar
        isCreating={isCreating}
        isDisabled={!userLocation}
        onSettingsClick={() => setShowAdvancedSheet(true)}
        onCreate={handleCreate}
      />

      {/* Advanced Settings Sheet */}
      <BottomSheet
        isOpen={showAdvancedSheet}
        onClose={() => setShowAdvancedSheet(false)}
        title="Settings"
      >
        <AdvancedSettingsContent
          settings={settings}
          onSettingsChange={setSettings}
          formatRadius={formatRadius}
        />
      </BottomSheet>
    </div>
  );
}

export default CreateGame;

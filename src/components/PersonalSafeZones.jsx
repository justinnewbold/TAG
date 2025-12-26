import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Shield, MapPin, Plus, X, Home, Briefcase, Edit2, Check, Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '../store';

// Max zones per player
const MAX_PERSONAL_ZONES = 2;
const MAX_ZONE_RADIUS = 100; // meters
const DEFAULT_ZONE_RADIUS = 50; // meters

// Preset zone types
const ZONE_PRESETS = [
  { id: 'home', name: 'Home', icon: '🏠', emoji: Home },
  { id: 'work', name: 'Work', icon: '💼', emoji: Briefcase },
  { id: 'school', name: 'School', icon: '🏫', emoji: null },
  { id: 'custom', name: 'Custom', icon: '📍', emoji: MapPin },
];

// Create zone marker icon
const createZoneIcon = (icon, isSelected) => L.divIcon({
  className: 'personal-zone-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: ${isSelected ? '#22c55e' : '#3b82f6'};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 15px ${isSelected ? '#22c55e' : '#3b82f6'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    ">
      ${icon}
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Map click handler
function MapClickHandler({ onLocationSelect, isSelecting }) {
  useMapEvents({
    click: (e) => {
      if (isSelecting) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Map controller for centering
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 16);
    }
  }, [center, map]);
  return null;
}

export default function PersonalSafeZones({ isOpen, onClose }) {
  const { user, updateUserProfile } = useStore();
  const [zones, setZones] = useState(user?.personalSafeZones || []);
  const [isAdding, setIsAdding] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [newZone, setNewZone] = useState({
    name: '',
    type: 'home',
    lat: null,
    lng: null,
    radius: DEFAULT_ZONE_RADIUS,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState('');

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log('Location error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Load zones from user profile
  useEffect(() => {
    if (user?.personalSafeZones) {
      setZones(user.personalSafeZones);
    }
  }, [user?.personalSafeZones]);

  // Save zones to profile
  const saveZones = async (updatedZones) => {
    setZones(updatedZones);
    updateUserProfile({ personalSafeZones: updatedZones });
  };

  // Handle location selection from map
  const handleLocationSelect = (location) => {
    setNewZone(prev => ({ ...prev, ...location }));
    setIsSelecting(false);
  };

  // Use current location
  const useCurrentLocation = () => {
    if (userLocation) {
      setNewZone(prev => ({ ...prev, lat: userLocation.lat, lng: userLocation.lng }));
    }
  };

  // Add new zone
  const handleAddZone = () => {
    if (!newZone.name.trim()) {
      setError('Please enter a name for this zone');
      return;
    }
    if (!newZone.lat || !newZone.lng) {
      setError('Please select a location on the map');
      return;
    }

    const preset = ZONE_PRESETS.find(p => p.id === newZone.type);
    const zone = {
      id: Date.now().toString(),
      name: newZone.name.trim(),
      type: newZone.type,
      icon: preset?.icon || '📍',
      lat: newZone.lat,
      lng: newZone.lng,
      radius: Math.min(newZone.radius, MAX_ZONE_RADIUS),
      createdAt: Date.now(),
    };

    saveZones([...zones, zone]);
    setNewZone({ name: '', type: 'home', lat: null, lng: null, radius: DEFAULT_ZONE_RADIUS });
    setIsAdding(false);
    setError('');
  };

  // Delete zone
  const handleDeleteZone = (zoneId) => {
    saveZones(zones.filter(z => z.id !== zoneId));
  };

  // Update zone
  const handleUpdateZone = (zoneId, updates) => {
    saveZones(zones.map(z => z.id === zoneId ? { ...z, ...updates } : z));
    setEditingZone(null);
  };

  const canAddMore = zones.length < MAX_PERSONAL_ZONES;
  const mapCenter = newZone.lat && newZone.lng 
    ? { lat: newZone.lat, lng: newZone.lng }
    : userLocation || { lat: 40.7128, lng: -74.0060 };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-green-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Personal Safe Zones</h2>
                <p className="text-xs text-white/60">Set up to {MAX_PERSONAL_ZONES} zones (max {MAX_ZONE_RADIUS}m radius)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Existing Zones */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/60">Your Zones ({zones.length}/{MAX_PERSONAL_ZONES})</h3>
            </div>

            {zones.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No safe zones set up yet</p>
                <p className="text-xs mt-1">Add zones like home or work where you can't be tagged</p>
              </div>
            ) : (
              zones.map(zone => (
                <div key={zone.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-xl">
                      {zone.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{zone.name}</div>
                      <div className="text-xs text-white/40">{zone.radius}m radius</div>
                    </div>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Add Zone Button */}
            {canAddMore && !isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full p-3 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Safe Zone
              </button>
            )}

            {!canAddMore && !isAdding && (
              <p className="text-center text-sm text-white/40">
                Maximum {MAX_PERSONAL_ZONES} zones reached
              </p>
            )}
          </div>

          {/* Add Zone Form */}
          {isAdding && (
            <div className="p-4 border-t border-white/10 space-y-4">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Safe Zone
              </h3>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Zone Type */}
              <div>
                <label className="text-sm text-white/60 block mb-2">Zone Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {ZONE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setNewZone(prev => ({ 
                          ...prev, 
                          type: preset.id,
                          name: preset.id !== 'custom' ? preset.name : prev.name,
                        }));
                      }}
                      className={`p-3 rounded-xl text-center transition-all ${
                        newZone.type === preset.id
                          ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{preset.icon}</div>
                      <div className="text-xs text-white/80">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone Name */}
              <div>
                <label className="text-sm text-white/60 block mb-2">Zone Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Home"
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-neon-cyan focus:outline-none"
                />
              </div>

              {/* Zone Radius */}
              <div>
                <label className="text-sm text-white/60 block mb-2">
                  Radius: {newZone.radius}m
                </label>
                <input
                  type="range"
                  min={10}
                  max={MAX_ZONE_RADIUS}
                  step={5}
                  value={newZone.radius}
                  onChange={(e) => setNewZone(prev => ({ ...prev, radius: Number(e.target.value) }))}
                  className="w-full accent-neon-cyan"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>10m</span>
                  <span>{MAX_ZONE_RADIUS}m max</span>
                </div>
              </div>

              {/* Location Selection */}
              <div>
                <label className="text-sm text-white/60 block mb-2">Location</label>
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={useCurrentLocation}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Use Current Location
                  </button>
                  <button
                    onClick={() => setIsSelecting(!isSelecting)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                      isSelecting 
                        ? 'bg-neon-cyan text-dark-900' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                    {isSelecting ? 'Tap Map...' : 'Pick on Map'}
                  </button>
                </div>

                {/* Map Preview */}
                <div className="h-48 rounded-xl overflow-hidden border border-white/10">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={16}
                    className="w-full h-full"
                    zoomControl={false}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <MapController center={mapCenter} />
                    <MapClickHandler 
                      onLocationSelect={handleLocationSelect}
                      isSelecting={isSelecting}
                    />
                    
                    {/* Zone preview */}
                    {newZone.lat && newZone.lng && (
                      <>
                        <Circle
                          center={[newZone.lat, newZone.lng]}
                          radius={newZone.radius}
                          pathOptions={{
                            color: '#22c55e',
                            fillColor: '#22c55e',
                            fillOpacity: 0.2,
                            weight: 2,
                          }}
                        />
                        <Marker
                          position={[newZone.lat, newZone.lng]}
                          icon={createZoneIcon(ZONE_PRESETS.find(p => p.id === newZone.type)?.icon || '📍', true)}
                        />
                      </>
                    )}
                  </MapContainer>
                </div>

                {newZone.lat && newZone.lng && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Location selected
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewZone({ name: '', type: 'home', lat: null, lng: null, radius: DEFAULT_ZONE_RADIUS });
                    setError('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddZone}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-400 to-blue-500 text-dark-900 font-bold hover:opacity-90 transition-opacity"
                >
                  Save Zone
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-4 border-t border-white/10 bg-white/5">
            <p className="text-xs text-white/40 leading-relaxed">
              <strong className="text-white/60">How it works:</strong> When you join a game that allows personal safe zones, 
              you can choose to activate your zones. While inside an active zone, you cannot be tagged.
              The host decides whether to allow personal zones when creating the game.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

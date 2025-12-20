import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check, X, Maximize2, Minimize2 } from 'lucide-react';

// Custom boundary marker
const boundaryIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #f97316;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px #f97316;
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onLocationSelect, enabled }) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function BoundaryEditor({ 
  initialBoundary = null,
  userLocation,
  onSave,
  onCancel
}) {
  const [boundary, setBoundary] = useState(initialBoundary || {
    type: 'circle',
    center: userLocation || { lat: 37.7749, lng: -122.4194 },
    radius: 500, // 500m default
  });
  const [isSelectingCenter, setIsSelectingCenter] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLocationSelect = (location) => {
    if (isSelectingCenter) {
      setBoundary(prev => ({ ...prev, center: location }));
      setIsSelectingCenter(false);
    }
  };

  const handleRadiusChange = (e) => {
    const radius = parseInt(e.target.value, 10);
    setBoundary(prev => ({ ...prev, radius }));
  };

  const presetRadii = [
    { label: 'Small (250m)', value: 250 },
    { label: 'Medium (500m)', value: 500 },
    { label: 'Large (1km)', value: 1000 },
    { label: 'XL (2km)', value: 2000 },
  ];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} flex flex-col bg-dark-900`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-800/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-neon-orange" />
          <div>
            <h3 className="font-medium">Set Play Boundary</h3>
            <p className="text-xs text-white/50">
              {isSelectingCenter ? 'Tap map to set center' : 'Define your play area'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/10 rounded-lg"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white/50" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white/50" />
            )}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: isFullscreen ? '100%' : '300px' }}>
        <MapContainer
          center={[boundary.center.lat, boundary.center.lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController center={boundary.center} />
          <MapClickHandler onLocationSelect={handleLocationSelect} enabled={isSelectingCenter} />

          {/* Boundary circle */}
          <Circle
            center={[boundary.center.lat, boundary.center.lng]}
            radius={boundary.radius}
            pathOptions={{
              color: '#f97316',
              fillColor: '#f97316',
              fillOpacity: 0.1,
              weight: 3,
              dashArray: '10, 10',
            }}
          />

          {/* Center marker */}
          <Marker
            position={[boundary.center.lat, boundary.center.lng]}
            icon={boundaryIcon}
          />

          {/* User location */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `
                  <div style="
                    width: 16px;
                    height: 16px;
                    background: #00f5ff;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 10px #00f5ff;
                  "></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          )}
        </MapContainer>

        {/* Selecting indicator */}
        {isSelectingCenter && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-neon-orange/20 border border-neon-orange/30 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-neon-orange animate-bounce" />
              <span className="text-sm text-neon-orange">Tap to set boundary center</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-dark-800/90 backdrop-blur-sm border-t border-white/10 space-y-4">
        {/* Center selection */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">Boundary Center</label>
          <button
            onClick={() => setIsSelectingCenter(!isSelectingCenter)}
            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between ${
              isSelectingCenter
                ? 'border-neon-orange/50 bg-neon-orange/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-sm">
              {boundary.center.lat.toFixed(5)}, {boundary.center.lng.toFixed(5)}
            </span>
            <MapPin className={`w-4 h-4 ${isSelectingCenter ? 'text-neon-orange' : 'text-white/50'}`} />
          </button>
        </div>

        {/* Radius selection */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">
            Radius: {boundary.radius >= 1000 ? `${(boundary.radius / 1000).toFixed(1)}km` : `${boundary.radius}m`}
          </label>
          
          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {presetRadii.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setBoundary(prev => ({ ...prev, radius: preset.value }))}
                className={`px-2 py-2 text-xs rounded-lg transition-all ${
                  boundary.radius === preset.value
                    ? 'bg-neon-orange/20 border border-neon-orange/50 text-neon-orange'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {preset.label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Slider */}
          <input
            type="range"
            min="100"
            max="5000"
            step="50"
            value={boundary.radius}
            onChange={handleRadiusChange}
            className="w-full accent-neon-orange"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>100m</span>
            <span>5km</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            onClick={() => onSave(boundary)}
            className="flex-1 btn-primary"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Boundary
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoundaryEditor;

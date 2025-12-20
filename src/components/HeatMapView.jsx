import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Flame, Calendar, MapPin, X } from 'lucide-react';
import { offlineStore } from '../services/offlineStore';

// HeatLayer component for react-leaflet
function HeatLayer({ points, options = {} }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatData = points.map(p => [p.lat, p.lng, p.intensity]);

    const heat = L.heatLayer(heatData, {
      radius: options.radius || 25,
      blur: options.blur || 15,
      maxZoom: options.maxZoom || 17,
      max: options.max || 1.0,
      gradient: options.gradient || {
        0.0: '#00f5ff',
        0.25: '#a855f7',
        0.5: '#f97316',
        0.75: '#ef4444',
        1.0: '#ffffff',
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, options]);

  return null;
}

function HeatMapView({ gameId = null, onClose }) {
  const [heatData, setHeatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'week', 'month'
  const [center, setCenter] = useState({ lat: 37.7749, lng: -122.4194 });

  useEffect(() => {
    loadHeatMapData();
  }, [gameId, timeRange]);

  const loadHeatMapData = async () => {
    setLoading(true);
    try {
      let data = await offlineStore.generateHeatMapData(gameId);

      // Filter by time range
      if (timeRange !== 'all') {
        const now = Date.now();
        const cutoff = timeRange === 'week' ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000;
        const locations = await offlineStore.getLocationHistory(gameId);
        const filteredLocations = locations.filter(l => l.timestamp >= cutoff);
        
        // Regenerate heat data from filtered locations
        const gridSize = 0.0001;
        const grid = {};
        filteredLocations.forEach(loc => {
          const gridLat = Math.floor(loc.lat / gridSize) * gridSize;
          const gridLng = Math.floor(loc.lng / gridSize) * gridSize;
          const key = `${gridLat},${gridLng}`;
          if (!grid[key]) {
            grid[key] = { lat: gridLat, lng: gridLng, count: 0 };
          }
          grid[key].count++;
        });
        const cells = Object.values(grid);
        const maxCount = Math.max(...cells.map(c => c.count), 1);
        data = cells.map(cell => ({
          lat: cell.lat + gridSize / 2,
          lng: cell.lng + gridSize / 2,
          intensity: cell.count / maxCount,
        }));
      }

      setHeatData(data);

      // Calculate stats
      if (data.length > 0) {
        const avgLat = data.reduce((sum, p) => sum + p.lat, 0) / data.length;
        const avgLng = data.reduce((sum, p) => sum + p.lng, 0) / data.length;
        setCenter({ lat: avgLat, lng: avgLng });

        const hotspots = data.filter(p => p.intensity > 0.7).length;
        const totalPoints = data.length;

        setStats({
          totalPoints,
          hotspots,
          coverage: `${Math.round((data.length / 100) * 10)}%`, // Rough estimate
        });
      }
    } catch (error) {
      console.error('Failed to load heat map data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-800/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Activity Heat Map</h2>
            <p className="text-xs text-white/50">
              {stats ? `${stats.totalPoints} data points` : 'Loading...'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white/50" />
        </button>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2 p-4 bg-dark-800/50">
        {[
          { id: 'all', label: 'All Time', icon: MapPin },
          { id: 'month', label: 'This Month', icon: Calendar },
          { id: 'week', label: 'This Week', icon: Calendar },
        ].map((range) => (
          <button
            key={range.id}
            onClick={() => setTimeRange(range.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
              timeRange === range.id
                ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            <range.icon className="w-4 h-4" />
            {range.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
            <div className="text-center">
              <Flame className="w-12 h-12 text-orange-400 mx-auto animate-pulse mb-4" />
              <p className="text-white/50">Loading heat map...</p>
            </div>
          </div>
        ) : heatData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
            <div className="text-center p-8">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 mb-2">No location data yet</p>
              <p className="text-xs text-white/30">
                Play some games to see your activity heat map!
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <HeatLayer points={heatData} />
          </MapContainer>
        )}
      </div>

      {/* Stats Footer */}
      {stats && (
        <div className="p-4 bg-dark-800/90 backdrop-blur-sm border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-neon-cyan">{stats.totalPoints}</p>
              <p className="text-xs text-white/50">Locations</p>
            </div>
            <div>
              <p className="text-xl font-bold text-orange-400">{stats.hotspots}</p>
              <p className="text-xs text-white/50">Hotspots</p>
            </div>
            <div>
              <p className="text-xl font-bold text-neon-purple">{stats.coverage}</p>
              <p className="text-xs text-white/50">Coverage</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-4 bg-dark-800/50 border-t border-white/10">
        <p className="text-xs text-white/40 mb-2">Activity Intensity</p>
        <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 via-orange-500 to-red-500" />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

export default HeatMapView;

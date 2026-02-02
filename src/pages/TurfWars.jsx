import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Flag, Shield, Swords, Trophy, TrendingUp, ChevronUp, Crown } from 'lucide-react';
import { useStore } from '../store';
import { turfWarService } from '../services/turfWarService';
import { TURF_CONFIG, TURF_STATUS } from '../../shared/constants.js';

function TurfWars() {
  const navigate = useNavigate();
  const { user, userLocation } = useStore();
  const [zones, setZones] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [myZones, setMyZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('map'); // map, my-turf, leaderboard
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zoneData, leaderData] = await Promise.all([
        turfWarService.getZones(),
        turfWarService.getLeaderboard(),
      ]);
      const allZones = zoneData.zones || [];
      setZones(allZones);
      setMyZones(allZones.filter(z => z.owner_id === user?.id));
      setLeaders(leaderData.leaders || []);
    } catch (err) {
      setError('Failed to load turf data');
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!userLocation) {
      setError('Location required to capture zones');
      return;
    }
    try {
      setCapturing(true);
      setError('');
      await turfWarService.captureZone(userLocation.lat, userLocation.lng, null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCapturing(false);
    }
  };

  const handleUpgrade = async (zoneId) => {
    try {
      await turfWarService.upgradeZone(zoneId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getLevelInfo = (level) => {
    const levels = Object.values(TURF_CONFIG.ZONE_LEVELS);
    return levels[Math.min(level - 1, levels.length - 1)] || levels[0];
  };

  const getLevelColor = (level) => {
    const colors = ['green-400', 'blue-400', 'purple-400', 'amber-400'];
    return colors[Math.min(level - 1, colors.length - 1)];
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Turf <span className="text-red-400">Wars</span>
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Claim territory, dominate the map</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-bold text-sm">{myZones.length} Zones</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'map', label: 'Map', icon: MapPin },
            { id: 'my-turf', label: 'My Turf', icon: Shield },
            { id: 'leaderboard', label: 'Rankings', icon: Trophy },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><span className="text-red-300">x</span></button>
          </div>
        )}

        {/* Map View */}
        {tab === 'map' && (
          <>
            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={capturing || !userLocation}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Flag className="w-5 h-5" />
              {capturing ? 'Capturing...' : 'Capture This Zone'}
            </button>

            {!userLocation && (
              <p className="text-white/40 text-xs text-center">Enable location to capture zones</p>
            )}

            {/* Nearby Zones */}
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mt-6">All Zones</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No zones claimed yet</p>
                <p className="text-white/30 text-sm">Be the first to claim territory!</p>
              </div>
            ) : (
              zones.slice(0, 20).map(zone => {
                const levelInfo = getLevelInfo(zone.level);
                const color = getLevelColor(zone.level);
                return (
                  <div
                    key={zone.id}
                    className={`bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:border-${color}/30 transition-all`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-${color}/20 flex items-center justify-center`}>
                      <Flag className={`w-5 h-5 text-${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {levelInfo.name} <span className="text-white/40">Lv.{zone.level}</span>
                      </p>
                      <p className="text-white/40 text-xs">
                        {zone.owner_name || 'Unclaimed'} {zone.clan_name ? `[${zone.clan_name}]` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs">{zone.capture_count} captures</p>
                      <p className={`text-${color} text-xs font-medium`}>+{levelInfo.income}/hr</p>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* My Turf */}
        {tab === 'my-turf' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-800 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{myZones.length}</p>
                <p className="text-white/40 text-xs">Zones</p>
              </div>
              <div className="bg-dark-800 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {myZones.reduce((sum, z) => sum + z.level, 0)}
                </p>
                <p className="text-white/40 text-xs">Total Power</p>
              </div>
              <div className="bg-dark-800 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">
                  {myZones.reduce((sum, z) => sum + getLevelInfo(z.level).income, 0)}
                </p>
                <p className="text-white/40 text-xs">Coins/hr</p>
              </div>
            </div>

            {myZones.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No zones claimed</p>
                <button
                  onClick={() => setTab('map')}
                  className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm"
                >
                  Capture your first zone
                </button>
              </div>
            ) : (
              myZones.map(zone => {
                const levelInfo = getLevelInfo(zone.level);
                return (
                  <div key={zone.id} className="bg-dark-800 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{levelInfo.name}</h3>
                        <p className="text-white/40 text-xs">Level {zone.level}/4</p>
                      </div>
                      <span className="text-green-400 text-sm font-medium">+{levelInfo.income}/hr</span>
                    </div>
                    {zone.level < 4 && (
                      <button
                        onClick={() => handleUpgrade(zone.id)}
                        className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ChevronUp className="w-4 h-4" />
                        Upgrade to {getLevelInfo(zone.level + 1).name}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {leaders.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No clans have claimed territory yet</p>
              </div>
            ) : (
              leaders.map((clan, index) => (
                <div
                  key={clan.id}
                  className="bg-dark-800 border border-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500/30 text-amber-400' :
                    index === 1 ? 'bg-gray-400/30 text-gray-300' :
                    index === 2 ? 'bg-orange-600/30 text-orange-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {clan.name} <span className="text-white/40">[{clan.tag}]</span>
                    </p>
                    <p className="text-white/40 text-xs">{clan.zone_count} zones controlled</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-sm flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5" />
                      {clan.total_power} power
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TurfWars;

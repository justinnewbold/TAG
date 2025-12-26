import React, { useState, useEffect } from 'react';
import { 
  Clock, MapPin, Shield, Calendar, Plus, Trash2, 
  Settings, Zap, Users, Target, Bell, Map,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

// GPS Update Intervals (minimum 5 minutes)
const GPS_INTERVALS = [
  { value: 300000, label: '5 minutes', description: 'Fastest updates' },
  { value: 900000, label: '15 minutes', description: 'Balanced' },
  { value: 1800000, label: '30 minutes', description: 'Moderate' },
  { value: 3600000, label: '1 hour', description: 'Light tracking' },
  { value: 43200000, label: '12 hours', description: 'Minimal' },
  { value: 86400000, label: '24 hours', description: 'Daily only' },
  { value: 'custom', label: 'Custom', description: 'Set your own' }
];

// Days of week for scheduling
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' }
];

export default function EnhancedGameSettings({ 
  settings = {}, 
  onChange, 
  isHost = false,
  compact = false 
}) {
  const [expandedSections, setExpandedSections] = useState({
    gps: true,
    noTagZones: true,
    noTagTimes: true,
    advanced: false
  });
  
  const [customInterval, setCustomInterval] = useState(5);
  const [newZone, setNewZone] = useState({ name: '', lat: '', lng: '', radius: 100 });
  const [newTime, setNewTime] = useState({ 
    name: '', 
    startTime: '09:00', 
    endTime: '17:00', 
    days: [1, 2, 3, 4, 5] 
  });
  
  // Default settings
  const gameSettings = {
    gpsInterval: settings.gpsInterval || 300000,
    noTagZones: settings.noTagZones || [],
    noTagTimes: settings.noTagTimes || [],
    tagRadius: settings.tagRadius || 15,
    gameMode: settings.gameMode || 'classic',
    maxPlayers: settings.maxPlayers || 10,
    gameDuration: settings.gameDuration || 30,
    allowSpectators: settings.allowSpectators ?? true,
    enablePowerups: settings.enablePowerups ?? true,
    showAllPlayers: settings.showAllPlayers ?? true,
    enableProximityAlerts: settings.enableProximityAlerts ?? true,
    ...settings
  };

  const updateSetting = (key, value) => {
    if (onChange) {
      onChange({ ...gameSettings, [key]: value });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // GPS Interval handling
  const handleGpsIntervalChange = (value) => {
    if (value === 'custom') {
      updateSetting('gpsInterval', customInterval * 60000);
    } else {
      updateSetting('gpsInterval', value);
    }
  };

  const handleCustomIntervalChange = (minutes) => {
    const minMinutes = Math.max(5, minutes); // Minimum 5 minutes
    setCustomInterval(minMinutes);
    updateSetting('gpsInterval', minMinutes * 60000);
  };

  // No-Tag Zone handling
  const addNoTagZone = () => {
    if (!newZone.name || !newZone.lat || !newZone.lng) return;
    
    const zone = {
      id: Date.now(),
      name: newZone.name,
      lat: parseFloat(newZone.lat),
      lng: parseFloat(newZone.lng),
      radius: parseInt(newZone.radius) || 100,
      active: true
    };
    
    updateSetting('noTagZones', [...gameSettings.noTagZones, zone]);
    setNewZone({ name: '', lat: '', lng: '', radius: 100 });
  };

  const removeNoTagZone = (zoneId) => {
    updateSetting(
      'noTagZones', 
      gameSettings.noTagZones.filter(z => z.id !== zoneId)
    );
  };

  const toggleZoneActive = (zoneId) => {
    updateSetting(
      'noTagZones',
      gameSettings.noTagZones.map(z => 
        z.id === zoneId ? { ...z, active: !z.active } : z
      )
    );
  };

  // No-Tag Time handling
  const addNoTagTime = () => {
    if (!newTime.name || newTime.days.length === 0) return;
    
    const time = {
      id: Date.now(),
      name: newTime.name,
      startTime: newTime.startTime,
      endTime: newTime.endTime,
      days: [...newTime.days],
      active: true
    };
    
    updateSetting('noTagTimes', [...gameSettings.noTagTimes, time]);
    setNewTime({ name: '', startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5] });
  };

  const removeNoTagTime = (timeId) => {
    updateSetting(
      'noTagTimes',
      gameSettings.noTagTimes.filter(t => t.id !== timeId)
    );
  };

  const toggleTimeActive = (timeId) => {
    updateSetting(
      'noTagTimes',
      gameSettings.noTagTimes.map(t => 
        t.id === timeId ? { ...t, active: !t.active } : t
      )
    );
  };

  const toggleDay = (day) => {
    setNewTime(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  // Use current location for zone
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewZone(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          }));
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  const formatInterval = (ms) => {
    if (ms >= 86400000) return `${ms / 86400000} day(s)`;
    if (ms >= 3600000) return `${ms / 3600000} hour(s)`;
    return `${ms / 60000} minutes`;
  };

  const SectionHeader = ({ title, icon: Icon, section, badge }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-indigo-400" />
        <span className="font-medium text-white">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* GPS Update Interval Section */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <SectionHeader 
          title="GPS Update Interval" 
          icon={Clock} 
          section="gps"
          badge={formatInterval(gameSettings.gpsInterval)}
        />
        
        {expandedSections.gps && (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-300">
                Choose how often player locations update. Faster updates use more battery but provide more accurate gameplay.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GPS_INTERVALS.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => handleGpsIntervalChange(interval.value)}
                  disabled={!isHost}
                  className={`p-3 rounded-lg border transition-all ${
                    gameSettings.gpsInterval === interval.value ||
                    (interval.value === 'custom' && !GPS_INTERVALS.find(i => 
                      i.value === gameSettings.gpsInterval && i.value !== 'custom'
                    ))
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-sm">{interval.label}</div>
                  <div className="text-xs opacity-70">{interval.description}</div>
                </button>
              ))}
            </div>
            
            {/* Custom Interval Input */}
            {!GPS_INTERVALS.find(i => i.value === gameSettings.gpsInterval && i.value !== 'custom') && (
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <label className="text-sm text-gray-400">Custom interval:</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={customInterval}
                  onChange={(e) => handleCustomIntervalChange(parseInt(e.target.value) || 5)}
                  disabled={!isHost}
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-400">minutes (min 5)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* No-Tag Zones Section */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <SectionHeader 
          title="No-Tag Zones" 
          icon={Shield} 
          section="noTagZones"
          badge={gameSettings.noTagZones.length > 0 ? `${gameSettings.noTagZones.length} zones` : null}
        />
        
        {expandedSections.noTagZones && (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Info className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-purple-300">
                Define safe areas where tagging is disabled. Perfect for home, work, or other personal spaces.
              </p>
            </div>
            
            {/* Existing Zones */}
            {gameSettings.noTagZones.length > 0 && (
              <div className="space-y-2">
                {gameSettings.noTagZones.map((zone) => (
                  <div 
                    key={zone.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      zone.active 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-gray-800/50 border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${zone.active ? 'text-green-400' : 'text-gray-500'}`} />
                      <div>
                        <div className="font-medium text-white">{zone.name}</div>
                        <div className="text-xs text-gray-400">
                          {zone.radius}m radius • {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleZoneActive(zone.id)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            zone.active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {zone.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => removeNoTagZone(zone.id)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Zone */}
            {isHost && (
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Add New Zone</span>
                  <button
                    onClick={useCurrentLocation}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Use My Location
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="Zone name (e.g., Home, Work)"
                  value={newZone.name}
                  onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude"
                    value={newZone.lat}
                    onChange={(e) => setNewZone(prev => ({ ...prev, lat: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Longitude"
                    value={newZone.lng}
                    onChange={(e) => setNewZone(prev => ({ ...prev, lng: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Radius (m)"
                    value={newZone.radius}
                    onChange={(e) => setNewZone(prev => ({ ...prev, radius: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <button
                  onClick={addNoTagZone}
                  disabled={!newZone.name || !newZone.lat || !newZone.lng}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Zone
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* No-Tag Times Section */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <SectionHeader 
          title="No-Tag Times" 
          icon={Calendar} 
          section="noTagTimes"
          badge={gameSettings.noTagTimes.length > 0 ? `${gameSettings.noTagTimes.length} schedules` : null}
        />
        
        {expandedSections.noTagTimes && (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                Schedule times when tagging is disabled. Great for work hours, sleep time, or other commitments.
              </p>
            </div>
            
            {/* Existing Times */}
            {gameSettings.noTagTimes.length > 0 && (
              <div className="space-y-2">
                {gameSettings.noTagTimes.map((time) => (
                  <div 
                    key={time.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      time.active 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : 'bg-gray-800/50 border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className={`w-5 h-5 ${time.active ? 'text-amber-400' : 'text-gray-500'}`} />
                      <div>
                        <div className="font-medium text-white">{time.name}</div>
                        <div className="text-xs text-gray-400">
                          {time.startTime} - {time.endTime} • {time.days.map(d => 
                            DAYS_OF_WEEK.find(day => day.value === d)?.label
                          ).join(', ')}
                        </div>
                      </div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTimeActive(time.id)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            time.active
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {time.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => removeNoTagTime(time.id)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Time */}
            {isHost && (
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 space-y-3">
                <span className="font-medium text-white">Add New Schedule</span>
                
                <input
                  type="text"
                  placeholder="Schedule name (e.g., Work Hours, Sleep)"
                  value={newTime.name}
                  onChange={(e) => setNewTime(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={newTime.startTime}
                      onChange={(e) => setNewTime(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                    <input
                      type="time"
                      value={newTime.endTime}
                      onChange={(e) => setNewTime(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Active Days</label>
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                          newTime.days.includes(day.value)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={addNoTagTime}
                  disabled={!newTime.name || newTime.days.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Settings Section */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <SectionHeader 
          title="Advanced Settings" 
          icon={Settings} 
          section="advanced"
        />
        
        {expandedSections.advanced && (
          <div className="p-4 space-y-4">
            {/* Tag Radius */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-medium text-white">Tag Radius</div>
                  <div className="text-xs text-gray-400">Distance to tag another player</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={gameSettings.tagRadius}
                  onChange={(e) => updateSetting('tagRadius', parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-24 accent-red-500"
                />
                <span className="text-sm text-gray-400 w-12">{gameSettings.tagRadius}m</span>
              </div>
            </div>
            
            {/* Max Players */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">Max Players</div>
                  <div className="text-xs text-gray-400">Maximum players in game</div>
                </div>
              </div>
              <select
                value={gameSettings.maxPlayers}
                onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
                disabled={!isHost}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
              >
                {[5, 10, 15, 20, 25, 30, 50].map(n => (
                  <option key={n} value={n}>{n} players</option>
                ))}
              </select>
            </div>
            
            {/* Toggle Settings */}
            {[
              { key: 'allowSpectators', icon: Map, label: 'Allow Spectators', desc: 'Let others watch the game' },
              { key: 'enablePowerups', icon: Zap, label: 'Enable Powerups', desc: 'Speed boosts and abilities' },
              { key: 'showAllPlayers', icon: Users, label: 'Show All Players', desc: 'Display everyone on map' },
              { key: 'enableProximityAlerts', icon: Bell, label: 'Proximity Alerts', desc: 'Warn when players nearby' }
            ].map(({ key, icon: Icon, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-white">{label}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting(key, !gameSettings[key])}
                  disabled={!isHost}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    gameSettings[key] ? 'bg-indigo-500' : 'bg-gray-600'
                  } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    gameSettings[key] ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

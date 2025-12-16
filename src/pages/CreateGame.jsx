import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Target, Users, Timer, Gamepad2, MapPin, Calendar, Plus, X, Shield } from 'lucide-react';
import { useStore, useSounds } from '../store';

function CreateGame() {
  const navigate = useNavigate();
  const { createGame, user } = useStore();
  const { vibrate } = useSounds();
  
  const [settings, setSettings] = useState({
    gameName: `${user?.name || 'Player'}'s Game`,
    gpsInterval: 5 * 60 * 1000, // 5 minutes default
    customInterval: '',
    tagRadius: 20,
    duration: null,
    maxPlayers: 10,
    noTagZones: [],
    noTagTimes: [],
  });
  
  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddTime, setShowAddTime] = useState(false);
  
  // New zone form
  const [newZone, setNewZone] = useState({ name: '', radius: 50 });
  
  // New time form
  const [newTime, setNewTime] = useState({ name: '', startTime: '09:00', endTime: '17:00', days: [] });
  
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
    { value: 10, label: '10m', desc: 'Close' },
    { value: 20, label: '20m', desc: 'Standard' },
    { value: 50, label: '50m', desc: 'Wide' },
    { value: 100, label: '100m', desc: 'Very wide' },
    { value: 500, label: '500m', desc: 'Huge' },
  ];
  
  const durationOptions = [
    { value: null, label: 'None', desc: 'Unlimited' },
    { value: 24 * 60 * 60 * 1000, label: '1 day', desc: 'Quick' },
    { value: 7 * 24 * 60 * 60 * 1000, label: '1 week', desc: 'Standard' },
    { value: 30 * 24 * 60 * 60 * 1000, label: '1 month', desc: 'Long' },
  ];
  
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
  
  const handleAddZone = () => {
    if (!newZone.name.trim()) return;
    
    // Get current location for the zone
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const zone = {
          id: Math.random().toString(36).substring(2, 9),
          name: newZone.name,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radius: newZone.radius,
        };
        setSettings({
          ...settings,
          noTagZones: [...settings.noTagZones, zone],
        });
        setNewZone({ name: '', radius: 50 });
        setShowAddZone(false);
      },
      (error) => {
        alert('Could not get your location. Please enable GPS.');
      }
    );
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
      days: newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6], // All days if none selected
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
  
  const handleCreate = () => {
    // Validate custom interval
    if (settings.gpsInterval === 'custom' && !settings.customInterval) {
      alert('Please enter a custom interval');
      return;
    }
    
    vibrate([50, 30, 100]);
    const game = createGame(settings);
    if (game) {
      navigate('/lobby');
    }
  };
  
  const formatInterval = (ms) => {
    if (ms < 60 * 60 * 1000) return `${ms / (60 * 1000)} min`;
    if (ms < 24 * 60 * 60 * 1000) return `${ms / (60 * 60 * 1000)} hour${ms > 60 * 60 * 1000 ? 's' : ''}`;
    return `${ms / (24 * 60 * 60 * 1000)} day${ms > 24 * 60 * 60 * 1000 ? 's' : ''}`;
  };
  
  return (
    <div className="min-h-screen p-6 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Create Game</h1>
          <p className="text-sm text-white/50">Set up your hunt</p>
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
        
        {/* GPS Update Interval */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-neon-cyan" />
            <div>
              <h3 className="font-medium">GPS Update Interval</h3>
              <p className="text-xs text-white/50">How often locations update</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gpsOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGpsSelect(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  (settings.gpsInterval === opt.value || (opt.value === 'custom' && showCustomInterval))
                    ? 'bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
          
          {/* Custom Interval Input */}
          {showCustomInterval && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl">
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
                <span className="text-white/50">min</span>
              </div>
              <p className="text-xs text-white/40 mt-2">Minimum interval is 5 minutes</p>
            </div>
          )}
        </div>
        
        {/* Tag Radius */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-neon-purple" />
            <div>
              <h3 className="font-medium">Tag Radius</h3>
              <p className="text-xs text-white/50">Distance to tag someone</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {radiusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings({ ...settings, tagRadius: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.tagRadius === opt.value
                    ? 'bg-neon-purple/20 border-2 border-neon-purple text-neon-purple'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Game Duration */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="w-5 h-5 text-neon-orange" />
            <div>
              <h3 className="font-medium">Game Duration</h3>
              <p className="text-xs text-white/50">Time limit for the game</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value || 'none'}
                onClick={() => setSettings({ ...settings, duration: opt.value })}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.duration === opt.value
                    ? 'bg-neon-orange/20 border-2 border-neon-orange text-neon-orange'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-bold text-sm">{opt.label}</p>
                <p className="text-xs opacity-60">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Max Players */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium">Max Players</h3>
              <p className="text-xs text-white/50">Maximum players allowed</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[2, 4, 6, 8, 10, 15, 20, 50].map((num) => (
              <button
                key={num}
                onClick={() => setSettings({ ...settings, maxPlayers: num })}
                className={`px-4 py-2 rounded-xl text-center transition-all flex-shrink-0 ${
                  settings.maxPlayers === num
                    ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-400'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
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
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <h3 className="font-medium">No-Tag Zones</h3>
                <p className="text-xs text-white/50">Safe areas where tagging is disabled</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddZone(true)}
              className="p-2 bg-green-400/20 rounded-lg text-green-400 hover:bg-green-400/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {settings.noTagZones.length > 0 ? (
            <div className="space-y-2">
              {settings.noTagZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 bg-green-400/10 rounded-xl border border-green-400/20">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="font-medium text-sm">{zone.name}</p>
                      <p className="text-xs text-white/50">{zone.radius}m radius</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveZone(zone.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-4">No safe zones added</p>
          )}
          
          {/* Add Zone Modal */}
          {showAddZone && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="card-glow p-6 w-full max-w-md animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Add No-Tag Zone</h3>
                  <button onClick={() => setShowAddZone(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/50 mb-4">
                  Your current location will be used as the center of this zone.
                </p>
                <div className="space-y-4">
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
                    <label className="label">Safe Radius (meters)</label>
                    <div className="flex gap-2">
                      {[25, 50, 100, 200, 500].map((r) => (
                        <button
                          key={r}
                          onClick={() => setNewZone({ ...newZone, radius: r })}
                          className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                            newZone.radius === r
                              ? 'bg-green-400/20 border border-green-400 text-green-400'
                              : 'bg-white/5 border border-white/10'
                          }`}
                        >
                          {r}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddZone}
                    disabled={!newZone.name.trim()}
                    className="btn-primary w-full bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Add Zone at Current Location
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* No-Tag Times */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-medium">No-Tag Times</h3>
                <p className="text-xs text-white/50">Time periods when tagging is disabled</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTime(true)}
              className="p-2 bg-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {settings.noTagTimes.length > 0 ? (
            <div className="space-y-2">
              {settings.noTagTimes.map((time) => (
                <div key={time.id} className="flex items-center justify-between p-3 bg-blue-400/10 rounded-xl border border-blue-400/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="font-medium text-sm">{time.name}</p>
                      <p className="text-xs text-white/50">
                        {time.startTime} - {time.endTime} • {time.days.length === 7 ? 'Every day' : time.days.map(d => daysOfWeek[d]).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTime(time.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-4">No time restrictions added</p>
          )}
          
          {/* Add Time Modal */}
          {showAddTime && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="card-glow p-6 w-full max-w-md animate-slide-up">
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
        </div>
        
        {/* Create Button */}
        <button onClick={handleCreate} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
          <Gamepad2 className="w-5 h-5" />
          Create Game
        </button>
      </div>
    </div>
  );
}

export default CreateGame;

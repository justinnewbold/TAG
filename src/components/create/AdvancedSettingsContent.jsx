import React, { memo } from 'react';
import { Timer, Clock, Globe, Lock, UserCheck, Shield, MapPin, Plus, X } from 'lucide-react';

const DURATION_OPTIONS = [
  { value: null, label: 'Unlimited' },
  { value: 30 * 60 * 1000, label: '30 min' },
  { value: 60 * 60 * 1000, label: '1 hour' },
  { value: 24 * 60 * 60 * 1000, label: '1 day' },
  { value: 7 * 24 * 60 * 60 * 1000, label: '1 week' },
];

const GPS_INTERVAL_OPTIONS = [
  { value: 5 * 60 * 1000, label: '5 min' },
  { value: 15 * 60 * 1000, label: '15 min' },
  { value: 30 * 60 * 1000, label: '30 min' },
  { value: 60 * 60 * 1000, label: '1 hour' },
];

/**
 * AdvancedSettingsContent - Content for the advanced settings bottom sheet
 */
const AdvancedSettingsContent = memo(function AdvancedSettingsContent({
  settings,
  onSettingsChange,
  formatRadius,
}) {
  const updateSetting = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const removeZone = (zoneId) => {
    updateSetting('noTagZones', settings.noTagZones.filter(z => z.id !== zoneId));
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Duration */}
      <section className="bg-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-5 h-5 text-orange-400" />
          <span className="font-medium">Game Duration</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? 'none'}
              onClick={() => updateSetting('duration', opt.value)}
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
          {GPS_INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('gpsInterval', opt.value)}
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
            onChange={(e) => updateSetting('isPublic', e.target.checked)}
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
            onChange={(e) => updateSetting('requireApproval', e.target.checked)}
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
                  onClick={() => removeZone(zone.id)}
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
  );
});

export default AdvancedSettingsContent;

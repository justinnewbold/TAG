import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, MapPin, Home, Briefcase } from 'lucide-react';
import { useStore } from '../store';

/**
 * Component shown in GameLobby for players to enable/disable their personal safe zones
 * Only shown when host has enabled allowPersonalZones
 */
export default function PlayerZoneSelector({ gameSettings, onZonesChange }) {
  const { user } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedZones, setSelectedZones] = useState([]);

  const personalZones = user?.personalSafeZones || [];
  const hasZones = personalZones.length > 0;

  // Toggle zone selection
  const toggleZone = (zoneId) => {
    const newSelection = selectedZones.includes(zoneId)
      ? selectedZones.filter(id => id !== zoneId)
      : [...selectedZones, zoneId];
    
    setSelectedZones(newSelection);
    
    // Pass selected zones to parent
    const activeZones = personalZones.filter(z => newSelection.includes(z.id));
    onZonesChange?.(activeZones);
  };

  // Get icon for zone type
  const getZoneIcon = (type) => {
    switch (type) {
      case 'home': return '🏠';
      case 'work': return '💼';
      case 'school': return '🏫';
      default: return '📍';
    }
  };

  if (!gameSettings?.allowPersonalZones) {
    return null;
  }

  return (
    <div className="rounded-xl bg-green-500/10 border border-green-500/30 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Personal Safe Zones</div>
            <div className="text-xs text-white/50">
              {hasZones 
                ? `${selectedZones.length} of ${personalZones.length} zones active`
                : 'No zones set up'
              }
            </div>
          </div>
        </div>
        {hasZones && (
          isExpanded 
            ? <ChevronUp className="w-5 h-5 text-white/40" />
            : <ChevronDown className="w-5 h-5 text-white/40" />
        )}
      </button>

      {/* Expanded Zone List */}
      {isExpanded && hasZones && (
        <div className="px-3 pb-3 space-y-2">
          {personalZones.map(zone => {
            const isSelected = selectedZones.includes(zone.id);
            return (
              <button
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'bg-green-500/20 border border-green-500/40'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                  isSelected ? 'bg-green-500' : 'bg-white/10 border border-white/20'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-dark-900" />}
                </div>

                {/* Zone Icon */}
                <div className="text-xl">{zone.icon || getZoneIcon(zone.type)}</div>

                {/* Zone Info */}
                <div className="flex-1 text-left">
                  <div className={`text-sm font-medium ${isSelected ? 'text-green-400' : 'text-white'}`}>
                    {zone.name}
                  </div>
                  <div className="text-xs text-white/40">{zone.radius}m radius</div>
                </div>

                {/* Status */}
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No zones message */}
      {isExpanded && !hasZones && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-sm text-white/60">You haven't set up any personal safe zones</p>
            <p className="text-xs text-white/40 mt-1">
              Go to Settings → Personal Safe Zones to add them
            </p>
          </div>
        </div>
      )}

      {/* Info footer */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <p className="text-xs text-white/30">
            Active zones protect you from being tagged while inside them
          </p>
        </div>
      )}
    </div>
  );
}

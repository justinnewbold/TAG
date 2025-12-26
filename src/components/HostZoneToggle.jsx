import React from 'react';
import { Shield, Users, Info } from 'lucide-react';

/**
 * Toggle for hosts in CreateGame to allow/disallow personal safe zones
 */
export default function HostZoneToggle({ enabled, onChange }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      {/* Toggle Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            enabled 
              ? 'bg-gradient-to-br from-green-400/20 to-blue-500/20' 
              : 'bg-white/10'
          }`}>
            <Shield className={`w-5 h-5 ${enabled ? 'text-green-400' : 'text-white/40'}`} />
          </div>
          <div>
            <div className="font-medium text-white">Personal Safe Zones</div>
            <div className="text-xs text-white/50">Players can use their home/work zones</div>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={() => onChange(!enabled)}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${
            enabled ? 'left-7' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Info when enabled */}
      {enabled && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <div className="text-xs text-white/70">
              <p className="mb-1">
                <strong className="text-green-400">How it works:</strong>
              </p>
              <ul className="space-y-1 text-white/60">
                <li>• Each player can set up to 2 personal zones (max 100m radius)</li>
                <li>• Players choose which zones to activate when joining</li>
                <li>• They can't be tagged while inside their active zones</li>
                <li>• Zone locations are visible to all players on the map</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

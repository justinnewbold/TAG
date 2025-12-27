import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bluetooth, BluetoothOff, BluetoothSearching, Signal, 
  AlertCircle, CheckCircle, Info, Settings, Wifi,
  ChevronDown, ChevronUp, Smartphone, Users
} from 'lucide-react';

// Bluetooth Proximity Detection System
export default function BluetoothProximity({ 
  game, 
  userId, 
  onPlayerInRange,
  onPlayerOutOfRange,
  enabled = false 
}) {
  const [btState, setBtState] = useState('unavailable'); // unavailable, disabled, scanning, connected
  const [nearbyPlayers, setNearbyPlayers] = useState(new Map());
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const scanIntervalRef = useRef(null);

  const settings = game?.settings || {};
  const bluetoothRange = settings.bluetoothRange || 5; // meters
  const bluetoothTagMode = settings.bluetoothTagMode || 'hybrid'; // 'bluetooth-only', 'hybrid', 'confirmation'

  // Check if Bluetooth is supported
  useEffect(() => {
    const checkSupport = async () => {
      if ('bluetooth' in navigator) {
        setIsSupported(true);
        setBtState('disabled');
      } else {
        setIsSupported(false);
        setBtState('unavailable');
      }
    };
    checkSupport();
  }, []);

  // Convert RSSI to approximate distance
  const rssiToDistance = useCallback((rssi) => {
    // Using log-distance path loss model
    // Reference RSSI at 1 meter (calibration value, typically -59 to -65 dBm)
    const txPower = -59;
    const n = 2.0; // Path loss exponent (2 for free space, higher for obstacles)
    
    if (rssi === 0) return Infinity;
    const ratio = rssi / txPower;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    }
    return Math.pow(10, (txPower - rssi) / (10 * n));
  }, []);

  // Start BLE scanning
  const startScanning = useCallback(async () => {
    if (!isSupported || !enabled) return;

    try {
      setBtState('scanning');
      
      // Request Bluetooth device with specific service UUID for the game
      const gameServiceUUID = '12345678-1234-5678-1234-567812345678'; // Custom UUID for TAG!
      
      // In a real implementation, we'd use the Web Bluetooth API
      // This is a simplified version showing the concept
      
      // For actual BLE advertising/scanning, you'd need:
      // 1. navigator.bluetooth.requestDevice() for initial pairing
      // 2. Or use the Bluetooth Scanning API (experimental)
      
      // Simulated scanning for demo purposes
      console.log('BLE scanning started for game:', game?.id);
      
      // In production, this would scan for nearby devices broadcasting the game UUID
      scanIntervalRef.current = setInterval(() => {
        // Simulate finding nearby players
        // In reality, this would come from BLE scan results
        const mockScanResult = simulateBLEScan(game?.players, userId);
        
        mockScanResult.forEach((player) => {
          const distance = rssiToDistance(player.rssi);
          const isInRange = distance <= bluetoothRange;
          
          setNearbyPlayers(prev => {
            const updated = new Map(prev);
            updated.set(player.id, {
              ...player,
              distance,
              isInRange,
              lastSeen: Date.now(),
            });
            return updated;
          });
          
          if (isInRange && onPlayerInRange) {
            onPlayerInRange({ playerId: player.id, distance, rssi: player.rssi });
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('BLE scan error:', error);
      setBtState('disabled');
    }
  }, [isSupported, enabled, game?.id, game?.players, userId, bluetoothRange, rssiToDistance, onPlayerInRange]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setBtState('disabled');
    setNearbyPlayers(new Map());
  }, []);

  // Simulate BLE scan results (for demo - replace with real BLE in production)
  const simulateBLEScan = (players, currentUserId) => {
    if (!players) return [];
    
    return players
      .filter(p => p.id !== currentUserId && p.isOnline !== false)
      .map(player => ({
        id: player.id,
        name: player.name,
        rssi: -50 - Math.random() * 40, // Simulated RSSI between -50 and -90
      }));
  };

  // Clean up stale players
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setNearbyPlayers(prev => {
        const updated = new Map();
        prev.forEach((player, id) => {
          if (now - player.lastSeen < 5000) { // 5 second timeout
            updated.set(id, player);
          } else if (onPlayerOutOfRange) {
            onPlayerOutOfRange({ playerId: id });
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, [onPlayerOutOfRange]);

  // Start/stop scanning based on enabled state
  useEffect(() => {
    if (enabled && game?.status === 'active') {
      startScanning();
    } else {
      stopScanning();
    }
    
    return () => stopScanning();
  }, [enabled, game?.status, startScanning, stopScanning]);

  // Get signal strength indicator
  const getSignalStrength = (rssi) => {
    if (rssi > -50) return { level: 4, color: 'text-green-400' };
    if (rssi > -60) return { level: 3, color: 'text-green-400' };
    if (rssi > -70) return { level: 2, color: 'text-yellow-400' };
    if (rssi > -80) return { level: 1, color: 'text-orange-400' };
    return { level: 0, color: 'text-red-400' };
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-36 left-4 right-4 z-40">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-800 p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {btState === 'scanning' ? (
              <BluetoothSearching className="w-5 h-5 text-blue-400 animate-pulse" />
            ) : btState === 'unavailable' ? (
              <BluetoothOff className="w-5 h-5 text-red-400" />
            ) : (
              <Bluetooth className="w-5 h-5 text-blue-400" />
            )}
            <div>
              <div className="text-sm font-medium text-white">Bluetooth Proximity</div>
              <div className="text-xs text-gray-400">
                {btState === 'scanning' ? 'Scanning for players...' : 
                 btState === 'unavailable' ? 'Not supported' : 'Disabled'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{nearbyPlayers.size} nearby</span>
            <div className={`w-2 h-2 rounded-full ${
              btState === 'scanning' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
            }`} />
          </div>
        </div>

        {/* Nearby Players */}
        {nearbyPlayers.size > 0 && (
          <div className="space-y-2">
            {Array.from(nearbyPlayers.values()).map((player) => {
              const signal = getSignalStrength(player.rssi);
              return (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    player.isInRange 
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : 'bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white">{player.name}</span>
                    {player.isInRange && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded">
                        IN RANGE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      ~{player.distance.toFixed(1)}m
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div 
                          key={bar}
                          className={`w-1 rounded-full ${
                            bar <= signal.level ? signal.color : 'bg-gray-600'
                          }`}
                          style={{ height: `${bar * 3 + 4}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No players nearby */}
        {btState === 'scanning' && nearbyPlayers.size === 0 && (
          <div className="text-center py-4">
            <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No players in Bluetooth range</p>
          </div>
        )}

        {/* Not supported warning */}
        {!isSupported && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              Bluetooth proximity requires a compatible browser and device. Try using Chrome on a mobile device.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings component for Bluetooth mode
export function BluetoothSettings({ settings = {}, onChange, isHost = false }) {
  const [expanded, setExpanded] = useState(false);

  const btSettings = {
    enableBluetooth: settings.enableBluetooth ?? false,
    bluetoothRange: settings.bluetoothRange || 5,
    bluetoothTagMode: settings.bluetoothTagMode || 'hybrid',
    requireBluetoothForTag: settings.requireBluetoothForTag ?? false,
    ...settings,
  };

  const updateSetting = (key, value) => {
    if (onChange) onChange({ ...btSettings, [key]: value });
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${btSettings.enableBluetooth ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
            <Bluetooth className={`w-5 h-5 ${btSettings.enableBluetooth ? 'text-blue-400' : 'text-gray-400'}`} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">Bluetooth Proximity</div>
            <div className="text-sm text-gray-400">
              {btSettings.enableBluetooth ? `${btSettings.bluetoothRange}m range` : 'GPS only'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); isHost && updateSetting('enableBluetooth', !btSettings.enableBluetooth); }}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${btSettings.enableBluetooth ? 'bg-blue-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${btSettings.enableBluetooth ? 'left-7' : 'left-1'}`} />
          </button>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && btSettings.enableBluetooth && (
        <div className="p-4 border-t border-gray-800 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Bluetooth provides more accurate proximity detection for close-range tags, especially indoors where GPS may be unreliable.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Tag Range</div>
                <div className="text-xs text-gray-400">How close to tag via Bluetooth</div>
              </div>
              <select value={btSettings.bluetoothRange} onChange={(e) => updateSetting('bluetoothRange', parseInt(e.target.value))}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value={2}>2m (Very Close)</option>
                <option value={5}>5m (Close)</option>
                <option value={10}>10m (Medium)</option>
                <option value={15}>15m (Far)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <div className="font-medium text-white text-sm">Tag Mode</div>
                <div className="text-xs text-gray-400">How Bluetooth affects tagging</div>
              </div>
              <select value={btSettings.bluetoothTagMode} onChange={(e) => updateSetting('bluetoothTagMode', e.target.value)}
                disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="hybrid">Hybrid (GPS + BT)</option>
                <option value="confirmation">BT Confirms GPS</option>
                <option value="bluetooth-only">Bluetooth Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Signal className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-white text-sm">Require Bluetooth</div>
                  <div className="text-xs text-gray-400">Must be in BT range to tag</div>
                </div>
              </div>
              <button onClick={() => isHost && updateSetting('requireBluetoothForTag', !btSettings.requireBluetoothForTag)}
                disabled={!isHost}
                className={`relative w-12 h-6 rounded-full transition-colors ${btSettings.requireBluetoothForTag ? 'bg-blue-500' : 'bg-gray-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${btSettings.requireBluetoothForTag ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using Bluetooth proximity in game
export function useBluetoothProximity(game, userId) {
  const [nearbyPlayers, setNearbyPlayers] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  const isPlayerInBluetoothRange = useCallback((playerId) => {
    return nearbyPlayers.some(p => p.id === playerId && p.isInRange);
  }, [nearbyPlayers]);
  
  const getPlayerDistance = useCallback((playerId) => {
    const player = nearbyPlayers.find(p => p.id === playerId);
    return player?.distance ?? Infinity;
  }, [nearbyPlayers]);
  
  return {
    nearbyPlayers,
    isScanning,
    isPlayerInBluetoothRange,
    getPlayerDistance,
  };
}

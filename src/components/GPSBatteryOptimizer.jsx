import React, { useState, useEffect } from 'react';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Zap, Clock, Info } from 'lucide-react';
import { formatGpsInterval } from '../utils/gameUtils';

const BATTERY_IMPACT = {
  300000: { level: 'high', drain: '~15%/hr', icon: BatteryLow, color: 'red' },
  900000: { level: 'medium', drain: '~8%/hr', icon: BatteryMedium, color: 'amber' },
  1800000: { level: 'low', drain: '~5%/hr', icon: BatteryMedium, color: 'yellow' },
  3600000: { level: 'minimal', drain: '~3%/hr', icon: BatteryFull, color: 'green' },
  43200000: { level: 'very low', drain: '~1%/hr', icon: BatteryFull, color: 'green' },
  86400000: { level: 'negligible', drain: '<1%/hr', icon: BatteryFull, color: 'green' }
};

export default function GPSBatteryOptimizer({ 
  currentInterval, 
  onIntervalChange,
  showRecommendation = true,
  compact = false 
}) {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    // Check battery API support
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }
  }, []);

  useEffect(() => {
    if (batteryLevel === null) return;
    
    // Smart recommendations based on battery level
    if (isCharging) {
      setRecommendation({
        interval: 300000,
        reason: 'You\'re charging - use fastest updates!'
      });
    } else if (batteryLevel < 20) {
      setRecommendation({
        interval: 3600000,
        reason: 'Low battery - switch to hourly updates to conserve power'
      });
    } else if (batteryLevel < 50) {
      setRecommendation({
        interval: 1800000,
        reason: 'Moderate battery - 30-minute updates recommended'
      });
    } else {
      setRecommendation(null);
    }
  }, [batteryLevel, isCharging]);

  const getBatteryInfo = (interval) => {
    // Find closest interval
    const intervals = Object.keys(BATTERY_IMPACT).map(Number).sort((a, b) => a - b);
    const closest = intervals.find(i => i >= interval) || intervals[intervals.length - 1];
    return BATTERY_IMPACT[closest] || BATTERY_IMPACT[300000];
  };

  const currentBatteryInfo = getBatteryInfo(currentInterval);
  const BatteryIcon = currentBatteryInfo.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${currentBatteryInfo.color}-500/10 border border-${currentBatteryInfo.color}-500/30`}>
        <BatteryIcon className={`w-4 h-4 text-${currentBatteryInfo.color}-400`} />
        <span className={`text-sm text-${currentBatteryInfo.color}-400`}>
          {currentBatteryInfo.drain}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${currentBatteryInfo.color}-500/20`}>
            <BatteryIcon className={`w-5 h-5 text-${currentBatteryInfo.color}-400`} />
          </div>
          <div>
            <h4 className="font-medium text-white">Battery Impact</h4>
            <p className="text-sm text-gray-400">GPS update: {formatGpsInterval(currentInterval)}</p>
          </div>
        </div>
        
        {batteryLevel !== null && (
          <div className="flex items-center gap-2">
            {isCharging && <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />}
            <span className={`text-lg font-bold ${
              batteryLevel < 20 ? 'text-red-400' : 
              batteryLevel < 50 ? 'text-amber-400' : 
              'text-green-400'
            }`}>
              {batteryLevel}%
            </span>
          </div>
        )}
      </div>

      {/* Battery Impact Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Estimated drain</span>
          <span className={`font-medium text-${currentBatteryInfo.color}-400`}>
            {currentBatteryInfo.drain}
          </span>
        </div>
        
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              currentBatteryInfo.level === 'high' ? 'w-full bg-red-500' :
              currentBatteryInfo.level === 'medium' ? 'w-3/4 bg-amber-500' :
              currentBatteryInfo.level === 'low' ? 'w-1/2 bg-yellow-500' :
              'w-1/4 bg-green-500'
            }`}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low impact</span>
          <span>High impact</span>
        </div>
      </div>

      {/* Smart Recommendation */}
      {showRecommendation && recommendation && currentInterval !== recommendation.interval && (
        <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-indigo-300">{recommendation.reason}</p>
            <button
              onClick={() => onIntervalChange && onIntervalChange(recommendation.interval)}
              className="mt-2 px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Switch to {formatGpsInterval(recommendation.interval)}
            </button>
          </div>
        </div>
      )}

      {/* Quick Interval Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { interval: 300000, label: '5min', desc: 'Best accuracy' },
          { interval: 900000, label: '15min', desc: 'Balanced' },
          { interval: 3600000, label: '1hr', desc: 'Battery saver' }
        ].map(({ interval, label, desc }) => {
          const info = getBatteryInfo(interval);
          return (
            <button
              key={interval}
              onClick={() => onIntervalChange && onIntervalChange(interval)}
              className={`p-3 rounded-lg border transition-all ${
                currentInterval === interval
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <div className="text-xs opacity-70">{desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

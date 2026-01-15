import React, { useEffect, useState } from 'react';
import { Cloud, Sun, Moon, Droplets, Wind, Snowflake, CloudLightning, Eye } from 'lucide-react';
import { weatherService } from '../services/weatherService';

/**
 * WeatherDisplay Component
 *
 * Shows current weather conditions and their effects on gameplay.
 * Weather dynamically affects radar range, XP, and power-up spawns.
 */
export default function WeatherDisplay({ location, compact = false, showEffects = true }) {
  const [weather, setWeather] = useState(null);
  const [effects, setEffects] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) return;

    const initWeather = async () => {
      setLoading(true);
      await weatherService.init(location);
      setWeather(weatherService.getWeatherSummary());
      setEffects(weatherService.getCurrentEffects());
      setLoading(false);
    };

    initWeather();

    // Subscribe to weather changes
    const handleWeatherChange = () => {
      setWeather(weatherService.getWeatherSummary());
      setEffects(weatherService.getCurrentEffects());
    };

    weatherService.on('weatherChanged', handleWeatherChange);

    return () => {
      weatherService.off('weatherChanged', handleWeatherChange);
    };
  }, [location]);

  if (loading) {
    return (
      <div className="bg-gray-800/80 rounded-lg p-3 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-24" />
      </div>
    );
  }

  if (!weather) return null;

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-400" />;
      case 'rain':
      case 'drizzle':
        return <Droplets className="w-5 h-5 text-blue-400" />;
      case 'thunderstorm':
        return <CloudLightning className="w-5 h-5 text-purple-400" />;
      case 'snow':
        return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case 'fog':
        return <Eye className="w-5 h-5 text-gray-500" />;
      case 'wind':
        return <Wind className="w-5 h-5 text-teal-400" />;
      default:
        return <Sun className="w-5 h-5 text-yellow-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/80 rounded-lg">
        <span className="text-lg">{weather.icon}</span>
        <span className="text-xs text-gray-300">{weather.condition}</span>
        {effects?.xpMultiplier > 1 && (
          <span className="text-xs text-green-400">
            +{Math.round((effects.xpMultiplier - 1) * 100)}% XP
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/90 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className="text-sm font-medium text-gray-200">
              {weather.icon} {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
            </div>
            <div className="text-xs text-gray-500">{weather.description}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-lg">{weather.timeIcon}</span>
            <span className="text-xs text-gray-400">{weather.timeOfDay || 'Day'}</span>
          </div>
          {weather.temperature !== undefined && (
            <div className="text-xs text-gray-500">{Math.round(weather.temperature)}°C</div>
          )}
        </div>
      </div>

      {/* Active bonuses */}
      {showEffects && weather.bonuses.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {weather.bonuses.map((bonus, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-2 py-1.5 bg-gray-700/50 rounded"
            >
              <div className="flex items-center gap-2">
                <span>{bonus.icon}</span>
                <span className="text-xs text-gray-300">{bonus.label}</span>
              </div>
              <span className="text-xs text-gray-500">{bonus.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Effects grid */}
      {showEffects && effects && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-gray-500 mb-1">Radar Range</div>
            <div
              className={`font-medium ${
                effects.radarRangeMultiplier < 1 ? 'text-green-400' : 'text-gray-300'
              }`}
            >
              {effects.radarRangeMultiplier < 1
                ? `${Math.round((1 - effects.radarRangeMultiplier) * 100)}% reduced`
                : 'Normal'}
            </div>
          </div>

          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-gray-500 mb-1">XP Bonus</div>
            <div
              className={`font-medium ${
                effects.xpMultiplier > 1 ? 'text-amber-400' : 'text-gray-300'
              }`}
            >
              {effects.xpMultiplier > 1
                ? `+${Math.round((effects.xpMultiplier - 1) * 100)}%`
                : 'None'}
            </div>
          </div>

          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-gray-500 mb-1">Visibility</div>
            <div className="font-medium text-gray-300">{weather.visibility}</div>
          </div>

          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-gray-500 mb-1">Power-ups</div>
            <div
              className={`font-medium ${
                effects.powerupSpawnMultiplier > 1 ? 'text-purple-400' : 'text-gray-300'
              }`}
            >
              {effects.powerupSpawnMultiplier > 1
                ? `+${Math.round((effects.powerupSpawnMultiplier - 1) * 100)}%`
                : 'Normal'}
            </div>
          </div>
        </div>
      )}

      {/* Weekend indicator */}
      {weather.isWeekend && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-center">
          <span className="text-xs text-purple-400">🎉 Weekend Bonus Active!</span>
        </div>
      )}
    </div>
  );
}

/**
 * WeatherBadge - Minimal weather indicator
 */
export function WeatherBadge({ location }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!location) return;

    weatherService.init(location).then(() => {
      setWeather(weatherService.getWeatherSummary());
    });
  }, [location]);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1 text-xs">
      <span>{weather.icon}</span>
      <span className="text-gray-400">{weather.timeIcon}</span>
    </div>
  );
}

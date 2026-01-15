/**
 * Weather-Reactive Gameplay Service
 *
 * Pull real weather data and affect gameplay:
 * - Rain: Radar range reduced (harder to track)
 * - Night: Everyone's update interval slows (creepier)
 * - Sunny Weekend: Double XP, power-ups spawn faster
 *
 * No player action needed - game adapts to real world.
 */

class WeatherService {
  constructor() {
    // Current weather state
    this.currentWeather = null;
    this.lastUpdate = null;

    // Configuration
    this.config = {
      // How often to update weather (ms)
      updateInterval: 600000, // 10 minutes

      // Weather effects on gameplay
      effects: {
        clear: {
          name: 'Clear',
          icon: '☀️',
          description: 'Perfect conditions',
          radarRangeMultiplier: 1.0,
          gpsIntervalMultiplier: 1.0,
          xpMultiplier: 1.0,
          powerupSpawnMultiplier: 1.0,
          visibility: 1.0,
        },
        clouds: {
          name: 'Cloudy',
          icon: '☁️',
          description: 'Light cover',
          radarRangeMultiplier: 0.95,
          gpsIntervalMultiplier: 1.0,
          xpMultiplier: 1.0,
          powerupSpawnMultiplier: 1.0,
          visibility: 0.95,
        },
        rain: {
          name: 'Rainy',
          icon: '🌧️',
          description: 'Radar disrupted - harder to track players',
          radarRangeMultiplier: 0.7, // 30% reduced radar
          gpsIntervalMultiplier: 1.2, // Slower updates
          xpMultiplier: 1.2, // Bonus for playing in rain
          powerupSpawnMultiplier: 1.3, // More power-ups
          visibility: 0.7,
        },
        drizzle: {
          name: 'Drizzle',
          icon: '🌦️',
          description: 'Light rain - slight radar interference',
          radarRangeMultiplier: 0.85,
          gpsIntervalMultiplier: 1.1,
          xpMultiplier: 1.1,
          powerupSpawnMultiplier: 1.1,
          visibility: 0.85,
        },
        thunderstorm: {
          name: 'Storm',
          icon: '⛈️',
          description: 'Heavy interference - chaos mode!',
          radarRangeMultiplier: 0.5, // 50% reduced radar
          gpsIntervalMultiplier: 1.5, // Much slower updates
          xpMultiplier: 1.5, // Big bonus for storm play
          powerupSpawnMultiplier: 2.0, // Double power-ups
          visibility: 0.5,
        },
        snow: {
          name: 'Snowy',
          icon: '❄️',
          description: 'Movement tracked by footprints',
          radarRangeMultiplier: 0.8,
          gpsIntervalMultiplier: 1.3,
          xpMultiplier: 1.3,
          powerupSpawnMultiplier: 1.2,
          visibility: 0.75,
          special: 'footprints', // Leave visible trail
        },
        fog: {
          name: 'Foggy',
          icon: '🌫️',
          description: 'Low visibility - rely on proximity alerts',
          radarRangeMultiplier: 0.4, // Severely reduced
          gpsIntervalMultiplier: 1.4,
          xpMultiplier: 1.4,
          powerupSpawnMultiplier: 1.5,
          visibility: 0.4,
        },
        wind: {
          name: 'Windy',
          icon: '💨',
          description: 'Power-ups drift on the map',
          radarRangeMultiplier: 1.0,
          gpsIntervalMultiplier: 1.0,
          xpMultiplier: 1.1,
          powerupSpawnMultiplier: 1.2,
          visibility: 0.9,
          special: 'drifting_powerups',
        },
      },

      // Time-of-day effects
      timeEffects: {
        night: {
          name: 'Night Mode',
          icon: '🌙',
          description: 'Darkness falls - reduced visibility',
          radarRangeMultiplier: 0.8,
          gpsIntervalMultiplier: 1.3,
          xpMultiplier: 1.25,
          visibility: 0.6,
          startHour: 21, // 9 PM
          endHour: 6, // 6 AM
        },
        golden: {
          name: 'Golden Hour',
          icon: '🌅',
          description: 'Perfect lighting - bonus XP',
          radarRangeMultiplier: 1.0,
          gpsIntervalMultiplier: 1.0,
          xpMultiplier: 1.5,
          visibility: 1.0,
          startHour: 17,
          endHour: 19,
        },
        dawn: {
          name: 'Early Bird',
          icon: '🌄',
          description: 'Dawn patrol - extra power-ups',
          radarRangeMultiplier: 0.9,
          gpsIntervalMultiplier: 1.1,
          xpMultiplier: 1.3,
          powerupSpawnMultiplier: 1.5,
          visibility: 0.8,
          startHour: 5,
          endHour: 7,
        },
      },

      // Weekend bonuses
      weekendBonus: {
        xpMultiplier: 1.5,
        powerupSpawnMultiplier: 1.3,
        enabled: true,
      },
    };

    // Event listeners
    this.listeners = new Map();

    // Weather update interval
    this.updateIntervalId = null;
  }

  /**
   * Initialize weather tracking for a location
   */
  async init(location) {
    await this.updateWeather(location);
    this.startAutoUpdate(location);
  }

  /**
   * Fetch and update current weather
   */
  async updateWeather(location) {
    if (!location?.lat || !location?.lng) return;

    try {
      // Use Open-Meteo API (free, no key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();
      const weatherCode = data.current?.weather_code || 0;

      // Map weather codes to our conditions
      const condition = this.mapWeatherCode(weatherCode);
      const oldWeather = this.currentWeather;

      this.currentWeather = {
        condition,
        effects: this.config.effects[condition] || this.config.effects.clear,
        temperature: data.current?.temperature_2m,
        windSpeed: data.current?.wind_speed_10m,
        precipitation: data.current?.precipitation,
        timestamp: Date.now(),
        location,
      };

      this.lastUpdate = Date.now();

      // Emit change event if weather changed
      if (oldWeather?.condition !== condition) {
        this.emit('weatherChanged', {
          oldWeather: oldWeather?.condition,
          newWeather: condition,
          effects: this.currentWeather.effects,
        });
      }

      return this.currentWeather;
    } catch (error) {
      console.warn('Weather update failed:', error.message);
      // Use clear weather as fallback
      this.currentWeather = {
        condition: 'clear',
        effects: this.config.effects.clear,
        timestamp: Date.now(),
        isFallback: true,
      };
      return this.currentWeather;
    }
  }

  /**
   * Map Open-Meteo weather codes to our conditions
   */
  mapWeatherCode(code) {
    // WMO Weather interpretation codes
    // https://open-meteo.com/en/docs
    if (code === 0) return 'clear';
    if (code >= 1 && code <= 3) return 'clouds';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code >= 56 && code <= 57) return 'drizzle'; // Freezing drizzle
    if (code >= 61 && code <= 65) return 'rain';
    if (code >= 66 && code <= 67) return 'rain'; // Freezing rain
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain'; // Rain showers
    if (code >= 85 && code <= 86) return 'snow'; // Snow showers
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'clear';
  }

  /**
   * Start automatic weather updates
   */
  startAutoUpdate(location) {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }

    this.updateIntervalId = setInterval(
      () => this.updateWeather(location),
      this.config.updateInterval
    );
  }

  /**
   * Stop automatic updates
   */
  stopAutoUpdate() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Get current combined effects (weather + time + weekend)
   */
  getCurrentEffects() {
    const baseEffects = this.currentWeather?.effects || this.config.effects.clear;
    const timeEffects = this.getTimeOfDayEffects();
    const isWeekend = this.isWeekend();

    // Combine multipliers
    let combined = {
      weather: this.currentWeather?.condition || 'clear',
      weatherIcon: baseEffects.icon,
      weatherDescription: baseEffects.description,
      timeOfDay: timeEffects?.name || 'Day',
      timeIcon: timeEffects?.icon || '☀️',
      isWeekend,

      // Combined multipliers
      radarRangeMultiplier:
        baseEffects.radarRangeMultiplier * (timeEffects?.radarRangeMultiplier || 1),
      gpsIntervalMultiplier:
        baseEffects.gpsIntervalMultiplier * (timeEffects?.gpsIntervalMultiplier || 1),
      xpMultiplier:
        baseEffects.xpMultiplier *
        (timeEffects?.xpMultiplier || 1) *
        (isWeekend ? this.config.weekendBonus.xpMultiplier : 1),
      powerupSpawnMultiplier:
        (baseEffects.powerupSpawnMultiplier || 1) *
        (timeEffects?.powerupSpawnMultiplier || 1) *
        (isWeekend ? this.config.weekendBonus.powerupSpawnMultiplier : 1),
      visibility:
        baseEffects.visibility * (timeEffects?.visibility || 1),

      // Special effects
      special: baseEffects.special || null,
    };

    return combined;
  }

  /**
   * Get time-of-day effects
   */
  getTimeOfDayEffects() {
    const hour = new Date().getHours();

    for (const [, effect] of Object.entries(this.config.timeEffects)) {
      if (effect.startHour <= effect.endHour) {
        // Normal range (e.g., 17-19)
        if (hour >= effect.startHour && hour < effect.endHour) {
          return effect;
        }
      } else {
        // Overnight range (e.g., 21-6)
        if (hour >= effect.startHour || hour < effect.endHour) {
          return effect;
        }
      }
    }

    return null; // Regular daytime
  }

  /**
   * Check if it's a weekend
   */
  isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get visibility description
   */
  getVisibilityDescription() {
    const effects = this.getCurrentEffects();
    const visibility = effects.visibility;

    if (visibility >= 0.9) return 'Excellent';
    if (visibility >= 0.7) return 'Good';
    if (visibility >= 0.5) return 'Reduced';
    if (visibility >= 0.3) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get active bonuses as array (for UI display)
   */
  getActiveBonuses() {
    const effects = this.getCurrentEffects();
    const bonuses = [];

    if (effects.xpMultiplier > 1) {
      bonuses.push({
        type: 'xp',
        icon: '⭐',
        label: `${Math.round((effects.xpMultiplier - 1) * 100)}% XP Bonus`,
        source:
          effects.isWeekend && effects.xpMultiplier > 1.3 ? 'Weekend + Weather' : 'Weather',
      });
    }

    if (effects.powerupSpawnMultiplier > 1) {
      bonuses.push({
        type: 'powerup',
        icon: '🎁',
        label: 'Extra Power-ups',
        source: effects.weather,
      });
    }

    if (effects.radarRangeMultiplier < 1) {
      bonuses.push({
        type: 'stealth',
        icon: '👻',
        label: 'Reduced Tracking',
        source: effects.weather,
      });
    }

    if (effects.timeOfDay === 'Night Mode') {
      bonuses.push({
        type: 'night',
        icon: '🌙',
        label: 'Night Mode Active',
        source: 'Time',
      });
    }

    return bonuses;
  }

  /**
   * Get weather summary for UI
   */
  getWeatherSummary() {
    const effects = this.getCurrentEffects();

    return {
      condition: effects.weather,
      icon: effects.weatherIcon,
      description: effects.weatherDescription,
      timeOfDay: effects.timeOfDay,
      timeIcon: effects.timeIcon,
      isWeekend: effects.isWeekend,
      visibility: this.getVisibilityDescription(),
      bonuses: this.getActiveBonuses(),
      temperature: this.currentWeather?.temperature,
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Apply weather effects to a value
   */
  applyWeatherToRadarRange(baseRange) {
    const effects = this.getCurrentEffects();
    return Math.round(baseRange * effects.radarRangeMultiplier);
  }

  applyWeatherToGPSInterval(baseInterval) {
    const effects = this.getCurrentEffects();
    return Math.round(baseInterval * effects.gpsIntervalMultiplier);
  }

  applyWeatherToXP(baseXP) {
    const effects = this.getCurrentEffects();
    return Math.round(baseXP * effects.xpMultiplier);
  }

  /**
   * Event handling
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  /**
   * Destroy service
   */
  destroy() {
    this.stopAutoUpdate();
    this.currentWeather = null;
    this.listeners.clear();
  }
}

export const weatherService = new WeatherService();
export default weatherService;

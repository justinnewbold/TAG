// Weather Service - Fetches weather data for game location
// Integrates with OpenWeatherMap API (free tier)

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

class WeatherService {
  constructor() {
    this.cache = new Map(); // locationKey -> { data, timestamp }
  }

  get isConfigured() {
    return !!OPENWEATHER_API_KEY;
  }

  getCacheKey(lat, lng) {
    // Round to 2 decimal places for caching
    return `${lat.toFixed(2)},${lng.toFixed(2)}`;
  }

  async getWeather(lat, lng) {
    if (!this.isConfigured) {
      return this.getDefaultWeather();
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      if (!response.ok) {
        console.error('Weather API error:', response.status);
        return this.getDefaultWeather();
      }

      const data = await response.json();
      const weather = this.parseWeatherData(data);
      
      this.cache.set(cacheKey, { data: weather, timestamp: Date.now() });
      return weather;
    } catch (error) {
      console.error('Weather fetch error:', error);
      return this.getDefaultWeather();
    }
  }

  parseWeatherData(data) {
    const main = data.weather?.[0]?.main?.toLowerCase() || 'clear';
    const description = data.weather?.[0]?.description || '';
    const temp = data.main?.temp || 20;
    const humidity = data.main?.humidity || 50;
    const windSpeed = data.wind?.speed || 0;
    const visibility = data.visibility || 10000;
    const clouds = data.clouds?.all || 0;
    const isNight = this.isNightTime(data.sys?.sunrise, data.sys?.sunset);

    return {
      condition: this.mapCondition(main),
      description,
      temperature: Math.round(temp),
      humidity,
      windSpeed: Math.round(windSpeed * 3.6), // m/s to km/h
      visibility: Math.round(visibility / 1000), // meters to km
      cloudCover: clouds,
      isNight,
      // Game modifiers based on weather
      modifiers: this.calculateModifiers(main, visibility, windSpeed, isNight)
    };
  }

  mapCondition(main) {
    const conditionMap = {
      'clear': 'clear',
      'clouds': 'cloudy',
      'rain': 'rain',
      'drizzle': 'rain',
      'thunderstorm': 'storm',
      'snow': 'snow',
      'mist': 'fog',
      'fog': 'fog',
      'haze': 'fog',
      'smoke': 'fog',
      'dust': 'dust',
      'sand': 'dust',
      'ash': 'dust',
      'squall': 'storm',
      'tornado': 'storm'
    };
    return conditionMap[main] || 'clear';
  }

  isNightTime(sunrise, sunset) {
    if (!sunrise || !sunset) {
      // Default: night between 8pm and 6am
      const hour = new Date().getHours();
      return hour >= 20 || hour < 6;
    }
    
    const now = Math.floor(Date.now() / 1000);
    return now < sunrise || now > sunset;
  }

  calculateModifiers(condition, visibility, windSpeed, isNight) {
    const modifiers = {
      // Visibility affects how far you can see other players on map
      mapVisibilityRange: 1.0,
      // Speed modifier for movement detection sensitivity
      speedSensitivity: 1.0,
      // Tag radius modifier
      tagRadiusMultiplier: 1.0,
      // XP bonus for playing in adverse conditions
      xpMultiplier: 1.0,
      // Special effects
      effects: []
    };

    // Visibility-based modifiers
    if (visibility < 1) {
      modifiers.mapVisibilityRange = 0.3;
      modifiers.effects.push('dense_fog');
      modifiers.xpMultiplier = 1.5;
    } else if (visibility < 5) {
      modifiers.mapVisibilityRange = 0.6;
      modifiers.effects.push('reduced_visibility');
      modifiers.xpMultiplier = 1.2;
    }

    // Weather condition modifiers
    switch (condition) {
      case 'rain':
      case 'drizzle':
        modifiers.speedSensitivity = 0.9;
        modifiers.effects.push('rain');
        modifiers.xpMultiplier *= 1.1;
        break;
      case 'thunderstorm':
        modifiers.mapVisibilityRange *= 0.7;
        modifiers.speedSensitivity = 0.8;
        modifiers.effects.push('storm', 'lightning');
        modifiers.xpMultiplier *= 1.3;
        break;
      case 'snow':
        modifiers.speedSensitivity = 0.85;
        modifiers.tagRadiusMultiplier = 1.1; // Easier to slip
        modifiers.effects.push('snow');
        modifiers.xpMultiplier *= 1.25;
        break;
      case 'fog':
      case 'mist':
        modifiers.mapVisibilityRange = 0.5;
        modifiers.effects.push('fog');
        modifiers.xpMultiplier *= 1.15;
        break;
    }

    // Night modifiers
    if (isNight) {
      modifiers.mapVisibilityRange *= 0.8;
      modifiers.effects.push('night');
      modifiers.xpMultiplier *= 1.1;
    }

    // Wind affects outdoor gameplay
    if (windSpeed > 50) {
      modifiers.effects.push('high_wind');
      modifiers.xpMultiplier *= 1.2;
    }

    return modifiers;
  }

  getDefaultWeather() {
    const isNight = this.isNightTime();
    return {
      condition: 'clear',
      description: 'Clear sky',
      temperature: 20,
      humidity: 50,
      windSpeed: 10,
      visibility: 10,
      cloudCover: 0,
      isNight,
      modifiers: {
        mapVisibilityRange: isNight ? 0.8 : 1.0,
        speedSensitivity: 1.0,
        tagRadiusMultiplier: 1.0,
        xpMultiplier: isNight ? 1.1 : 1.0,
        effects: isNight ? ['night'] : []
      }
    };
  }

  // Clear old cache entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION_MS * 2) {
        this.cache.delete(key);
      }
    }
  }
}

export const weatherService = new WeatherService();

// Cleanup cache every 30 minutes
setInterval(() => weatherService.cleanup(), 30 * 60 * 1000);

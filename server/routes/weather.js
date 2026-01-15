// Weather Routes - Game weather integration
import express from 'express';
import { weatherService } from '../services/weather.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get weather for location
router.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordinates out of bounds' });
    }

    const weather = await weatherService.getWeather(latitude, longitude);
    res.json({ weather });
  } catch (error) {
    logger.error('Weather error:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Get current day/night status
router.get('/daynight', (req, res) => {
  try {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isDusk = hour >= 18 && hour < 20;
    const isDawn = hour >= 6 && hour < 8;
    
    res.json({
      isNight,
      isDusk,
      isDawn,
      hour,
      period: isNight ? 'night' : isDusk ? 'dusk' : isDawn ? 'dawn' : 'day',
      modifiers: {
        xpMultiplier: isNight ? 1.1 : 1.0,
        mapVisibilityRange: isNight ? 0.8 : isDusk || isDawn ? 0.9 : 1.0,
        effects: isNight ? ['night'] : isDusk ? ['dusk'] : isDawn ? ['dawn'] : []
      }
    });
  } catch (error) {
    logger.error('Day/night error:', error);
    res.status(500).json({ error: 'Failed to get day/night status' });
  }
});

// Check if weather service is configured
router.get('/status', (req, res) => {
  res.json({
    configured: weatherService.isConfigured,
    message: weatherService.isConfigured 
      ? 'Weather service active' 
      : 'Weather API key not configured - using defaults'
  });
});

export { router as weatherRouter };

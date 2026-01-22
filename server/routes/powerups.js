import express from 'express';
import { powerupService, POWERUPS } from '../services/powerups.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get available power-ups
router.get('/list', (req, res) => {
  const powerups = Object.values(POWERUPS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    duration: p.duration,
    cooldown: p.cooldown
  }));
  
  res.json({ powerups });
});

// Get player's inventory and cooldowns
router.get('/inventory', (req, res) => {
  const inventory = powerupService.getInventory(req.user.id);
  const cooldowns = powerupService.getCooldowns(req.user.id);
  const activeEffects = powerupService.getActiveEffects(req.user.id);
  
  res.json({ inventory, cooldowns, activeEffects });
});

// Activate a power-up
router.post('/activate', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');
    const { powerupId } = req.body;
    
    if (!powerupId) {
      return res.status(400).json({ error: 'Power-up ID required' });
    }
    
    // Get player's current game for context
    const game = await gameManager.getPlayerGame(req.user.id);
    
    const result = powerupService.activatePowerup(req.user.id, powerupId, game || {});
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Notify game about power-up activation
    if (game) {
      io.to(`game:${game.id}`).emit('powerup:activated', {
        playerId: req.user.id,
        playerName: req.user.name,
        powerupId,
        effects: result.effects,
        duration: result.duration
      });
      
      // Handle specific power-up effects
      if (result.effects.freezeTarget === 'it') {
        // Find and freeze the IT player
        const itPlayer = game.players?.find(p => p.isIt);
        if (itPlayer) {
          powerupService.freezePlayer(itPlayer.id, POWERUPS[powerupId].duration);
          io.to(`game:${game.id}`).emit('player:frozen', {
            playerId: itPlayer.id,
            duration: POWERUPS[powerupId].duration,
            frozenBy: req.user.id
          });
        }
      }
      
      if (result.effects.revealAll) {
        io.to(`game:${game.id}`).emit('radar:pulse', {
          activatedBy: req.user.id,
          duration: result.duration
        });
      }
    }
    
    res.json({
      success: true,
      powerupId,
      effects: result.effects,
      duration: result.duration,
      expiresAt: result.expiresAt,
      inventory: powerupService.getInventory(req.user.id),
      cooldowns: powerupService.getCooldowns(req.user.id)
    });
  } catch (error) {
    logger.error('Activate power-up error:', error);
    res.status(500).json({ error: 'Failed to activate power-up' });
  }
});

// Grant power-up (for testing or rewards)
router.post('/grant', async (req, res) => {
  try {
    const { powerupId, reason } = req.body;
    
    if (!powerupId) {
      return res.status(400).json({ error: 'Power-up ID required' });
    }
    
    const result = powerupService.grantPowerup(req.user.id, powerupId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      powerupId,
      count: result.count,
      inventory: result.inventory,
      reason
    });
  } catch (error) {
    logger.error('Grant power-up error:', error);
    res.status(500).json({ error: 'Failed to grant power-up' });
  }
});

// Get active effects for current player
router.get('/effects', (req, res) => {
  const effects = powerupService.getActiveEffects(req.user.id);
  res.json({ effects });
});

// Check if player can be tagged (internal validation)
router.get('/can-be-tagged/:playerId', (req, res) => {
  const canBeTagged = powerupService.canBeTagged(req.params.playerId);
  const isFrozen = powerupService.isFrozen(req.params.playerId);
  
  res.json({ canBeTagged, isFrozen });
});

// Check player visibility
router.get('/visibility/:playerId', (req, res) => {
  const isVisible = powerupService.isPlayerVisible(req.params.playerId);
  res.json({ isVisible });
});

export { router as powerupRouter };

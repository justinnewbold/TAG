/**
 * Game Modes Routes
 * Handles different game mode configurations and rules
 */

import express from 'express';

const router = express.Router();

// Game mode definitions
const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Tag',
    description: 'Traditional tag - one player is IT and tries to tag others',
    icon: '🏃',
    minPlayers: 2,
    maxPlayers: 20,
    defaultDuration: 600000,
    rules: {
      oneHunter: true,
      tagTransfersIt: true,
      respawns: false,
      teams: false,
    },
    settings: {},
  },
  infection: {
    id: 'infection',
    name: 'Infection',
    description: 'Tagged players become infected and join the hunters. Last survivor wins!',
    icon: '🧟',
    minPlayers: 4,
    maxPlayers: 50,
    defaultDuration: 900000,
    rules: {
      oneHunter: false,
      tagConverts: true,
      respawns: false,
      teams: false,
      winCondition: 'last_survivor',
    },
    settings: {
      initialInfected: 1,
      infectedSpeedBoost: 1.0,
      survivorRevealInterval: 120000,
      survivorRevealThreshold: 3,
    },
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    description: 'Each player is assigned one target. Eliminate your target to get their target!',
    icon: '🎯',
    minPlayers: 4,
    maxPlayers: 30,
    defaultDuration: 1800000,
    rules: {
      oneHunter: false,
      assignedTargets: true,
      respawns: false,
      teams: false,
      winCondition: 'last_standing',
    },
    settings: {
      targetChain: true,
      revealDistance: 100,
      eliminationPoints: 100,
      survivalBonus: 10,
      wrongTargetPenalty: -50,
    },
  },
  kingOfTheHill: {
    id: 'kingOfTheHill',
    name: 'King of the Hill',
    description: 'Capture and hold control points to earn points. Highest score wins!',
    icon: '👑',
    minPlayers: 4,
    maxPlayers: 40,
    defaultDuration: 900000,
    rules: {
      oneHunter: false,
      pointCapture: true,
      respawns: true,
      teams: true,
      winCondition: 'highest_score',
    },
    settings: {
      capturePoints: 3,
      captureTime: 10000,
      pointsPerSecond: 1,
      contestedMultiplier: 0,
      respawnTime: 15000,
      tagCooldown: 5000,
    },
  },
  hideAndSeek: {
    id: 'hideAndSeek',
    name: 'Hide & Seek',
    description: 'Hiders get time to hide, then seekers hunt them down!',
    icon: '🙈',
    minPlayers: 3,
    maxPlayers: 20,
    defaultDuration: 600000,
    rules: {
      oneHunter: false,
      hidingPhase: true,
      respawns: false,
      teams: false,
      winCondition: 'last_survivor_or_time',
    },
    settings: {
      hidingTime: 60000,
      seekerCount: 1,
      seekerSpeedBoost: 1.2,
      hiderFreeze: false,
      proximityPing: true,
      pingRadius: 30,
      pingInterval: 30000,
    },
  },
  teamTag: {
    id: 'teamTag',
    name: 'Team Tag',
    description: 'Two teams compete - tag opponents to score points!',
    icon: '⚔️',
    minPlayers: 4,
    maxPlayers: 40,
    defaultDuration: 600000,
    rules: {
      oneHunter: false,
      teamBased: true,
      respawns: true,
      teams: true,
      winCondition: 'highest_team_score',
    },
    settings: {
      teamCount: 2,
      tagPoints: 10,
      respawnTime: 10000,
      friendlyFire: false,
      tagCooldown: 3000,
    },
  },
  freezeTag: {
    id: 'freezeTag',
    name: 'Freeze Tag',
    description: 'Tagged players freeze in place. Teammates can unfreeze you!',
    icon: '🥶',
    minPlayers: 4,
    maxPlayers: 30,
    defaultDuration: 600000,
    rules: {
      oneHunter: true,
      freezeOnTag: true,
      canUnfreeze: true,
      respawns: false,
      teams: false,
      winCondition: 'all_frozen_or_time',
    },
    settings: {
      unfreezeTime: 3000,
      unfreezeRadius: 5,
      autoUnfreezeTime: 0,
      freezerSpeedBoost: 1.1,
    },
  },
  globalBattleRoyale: {
    id: 'globalBattleRoyale',
    name: 'Global Battle Royale',
    description: 'Massive scale game spanning cities or the entire globe!',
    icon: '🌍',
    minPlayers: 10,
    maxPlayers: 1000,
    defaultDuration: 3600000,
    rules: {
      oneHunter: false,
      shrinkingZone: true,
      respawns: false,
      teams: false,
      winCondition: 'last_survivor',
    },
    settings: {
      startingRadius: 20015000,
      minimumRadius: 1000,
      shrinkInterval: 3600000,
      phaseCount: 10,
      finalZoneSelectionMethod: 'random_land',
    },
  },
};

// Get all game modes
router.get('/', async (req, res) => {
  try {
    const modes = Object.values(GAME_MODES);
    res.json({ modes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific game mode
router.get('/:modeId', async (req, res) => {
  try {
    const { modeId } = req.params;
    const mode = GAME_MODES[modeId];

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    res.json(mode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate game mode settings
router.post('/:modeId/validate', async (req, res) => {
  try {
    const { modeId } = req.params;
    const { settings, playerCount } = req.body;

    const mode = GAME_MODES[modeId];

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    const errors = [];

    // Validate player count
    if (playerCount < mode.minPlayers) {
      errors.push(`Minimum ${mode.minPlayers} players required`);
    }
    if (playerCount > mode.maxPlayers) {
      errors.push(`Maximum ${mode.maxPlayers} players allowed`);
    }

    // Mode-specific validations
    if (modeId === 'infection' && settings?.initialInfected >= playerCount) {
      errors.push('Initial infected must be less than player count');
    }

    if (modeId === 'hideAndSeek' && settings?.seekerCount >= playerCount) {
      errors.push('Seeker count must be less than player count');
    }

    if (modeId === 'kingOfTheHill' && settings?.capturePoints < 1) {
      errors.push('At least 1 capture point required');
    }

    res.json({
      valid: errors.length === 0,
      errors,
      mode,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get mode rules explanation
router.get('/:modeId/rules', async (req, res) => {
  try {
    const { modeId } = req.params;
    const mode = GAME_MODES[modeId];

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    const rulesExplanation = generateRulesExplanation(mode);

    res.json({
      mode: mode.name,
      rules: rulesExplanation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Generate human-readable rules
function generateRulesExplanation(mode) {
  const rules = [];

  rules.push(`**${mode.name}** - ${mode.description}`);
  rules.push('');
  rules.push('**Basic Rules:**');

  if (mode.rules.oneHunter) {
    rules.push('- One player starts as the hunter');
  }

  if (mode.rules.tagTransfersIt) {
    rules.push('- When tagged, you become the hunter');
  }

  if (mode.rules.tagConverts) {
    rules.push('- Tagged players join the hunter team');
  }

  if (mode.rules.assignedTargets) {
    rules.push('- Each player has one assigned target');
    rules.push('- Eliminating your target gives you their target');
  }

  if (mode.rules.freezeOnTag) {
    rules.push('- Tagged players freeze in place');
    if (mode.rules.canUnfreeze) {
      rules.push('- Other runners can unfreeze frozen players');
    }
  }

  if (mode.rules.pointCapture) {
    rules.push('- Capture control points to earn points');
    rules.push('- Hold points to accumulate score');
  }

  if (mode.rules.teams) {
    rules.push('- Players are divided into teams');
  }

  if (mode.rules.respawns) {
    rules.push('- Players respawn after being tagged');
  }

  if (mode.rules.hidingPhase) {
    rules.push('- Hiders get time to hide before seekers begin');
  }

  if (mode.rules.shrinkingZone) {
    rules.push('- Play area shrinks over time');
  }

  rules.push('');
  rules.push('**Win Condition:**');

  switch (mode.rules.winCondition) {
    case 'last_survivor':
      rules.push('- Last player standing wins');
      break;
    case 'last_standing':
      rules.push('- Last player alive wins');
      break;
    case 'highest_score':
      rules.push('- Highest score when time runs out wins');
      break;
    case 'highest_team_score':
      rules.push('- Team with highest score wins');
      break;
    case 'all_frozen_or_time':
      rules.push('- Freezer wins if all runners are frozen');
      rules.push('- Runners win if time runs out');
      break;
    case 'last_survivor_or_time':
      rules.push('- Seekers win if all hiders are found');
      rules.push('- Remaining hiders win when time runs out');
      break;
    default:
      rules.push('- Game ends when time runs out');
  }

  return rules;
}

export { router as gameModesRouter };
export default router;

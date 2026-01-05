/**
 * Game Mode Service
 * Handles logic for different game mode variants
 */

// Game Mode Definitions
export const GAME_MODES = {
  // Classic Tag - Standard mode
  classic: {
    id: 'classic',
    name: 'Classic Tag',
    description: 'Traditional tag - one player is IT and tries to tag others',
    icon: '🏃',
    minPlayers: 2,
    maxPlayers: 20,
    defaultDuration: 600000, // 10 minutes
    rules: {
      oneHunter: true,
      tagTransfersIt: true,
      respawns: false,
      teams: false,
    },
  },

  // Infection Mode - Tagged players become hunters
  infection: {
    id: 'infection',
    name: 'Infection',
    description: 'Tagged players become infected and join the hunters. Last survivor wins!',
    icon: '🧟',
    minPlayers: 4,
    maxPlayers: 50,
    defaultDuration: 900000, // 15 minutes
    rules: {
      oneHunter: false,
      tagTransfersIt: false,
      tagConverts: true, // Tagged players become hunters
      respawns: false,
      teams: false,
      winCondition: 'last_survivor',
    },
    settings: {
      initialInfected: 1, // Number of starting hunters
      infectedSpeedBoost: 1.0, // No speed boost
      survivorRevealInterval: 120000, // Reveal survivors every 2 min when few left
      survivorRevealThreshold: 3, // Start revealing when 3 or fewer survivors
    },
  },

  // Assassin Mode - Each player has one target
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    description: 'Each player is assigned one target. Eliminate your target to get their target!',
    icon: '🎯',
    minPlayers: 4,
    maxPlayers: 30,
    defaultDuration: 1800000, // 30 minutes
    rules: {
      oneHunter: false,
      tagTransfersIt: false,
      assignedTargets: true,
      respawns: false,
      teams: false,
      winCondition: 'last_standing',
    },
    settings: {
      targetChain: true, // Circular target assignment
      revealDistance: 100, // Show target direction when within 100m
      eliminationPoints: 100,
      survivalBonus: 10, // Points per minute survived
      wrongTargetPenalty: -50, // Penalty for tagging wrong person
    },
  },

  // King of the Hill - Control POIs for points
  kingOfTheHill: {
    id: 'kingOfTheHill',
    name: 'King of the Hill',
    description: 'Capture and hold control points to earn points. Highest score wins!',
    icon: '👑',
    minPlayers: 4,
    maxPlayers: 40,
    defaultDuration: 900000, // 15 minutes
    rules: {
      oneHunter: false,
      tagTransfersIt: false,
      pointCapture: true,
      respawns: true,
      teams: true,
      winCondition: 'highest_score',
    },
    settings: {
      capturePoints: 3, // Number of hills
      captureTime: 10000, // 10 seconds to capture
      pointsPerSecond: 1, // Points while holding
      contestedMultiplier: 0, // No points while contested
      respawnTime: 15000, // 15 second respawn
      tagCooldown: 5000, // Can't be tagged for 5s after respawn
    },
  },

  // Hide and Seek - Hiders get head start
  hideAndSeek: {
    id: 'hideAndSeek',
    name: 'Hide & Seek',
    description: 'Hiders get time to hide, then seekers hunt them down!',
    icon: '🙈',
    minPlayers: 3,
    maxPlayers: 20,
    defaultDuration: 600000, // 10 minutes
    rules: {
      oneHunter: false,
      tagTransfersIt: false,
      hidingPhase: true,
      respawns: false,
      teams: false,
      winCondition: 'last_survivor_or_time',
    },
    settings: {
      hidingTime: 60000, // 1 minute to hide
      seekerCount: 1, // Number of seekers
      seekerSpeedBoost: 1.2, // 20% faster
      hiderFreeze: false, // Hiders can move during seek phase
      proximityPing: true, // Seekers get ping when near hiders
      pingRadius: 30, // Ping within 30m
      pingInterval: 30000, // Ping every 30 seconds
    },
  },

  // Team Tag - Teams compete
  teamTag: {
    id: 'teamTag',
    name: 'Team Tag',
    description: 'Two teams compete - tag opponents to score points!',
    icon: '⚔️',
    minPlayers: 4,
    maxPlayers: 40,
    defaultDuration: 600000, // 10 minutes
    rules: {
      oneHunter: false,
      tagTransfersIt: false,
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

  // Freeze Tag - Tagged players freeze until unfrozen
  freezeTag: {
    id: 'freezeTag',
    name: 'Freeze Tag',
    description: 'Tagged players freeze in place. Teammates can unfreeze you!',
    icon: '🥶',
    minPlayers: 4,
    maxPlayers: 30,
    defaultDuration: 600000, // 10 minutes
    rules: {
      oneHunter: true,
      tagTransfersIt: false,
      freezeOnTag: true,
      canUnfreeze: true,
      respawns: false,
      teams: false,
      winCondition: 'all_frozen_or_time',
    },
    settings: {
      unfreezeTime: 3000, // 3 seconds to unfreeze
      unfreezeRadius: 5, // Must be within 5m
      autoUnfreezeTime: 0, // 0 = never auto unfreeze
      freezerSpeedBoost: 1.1,
    },
  },
};

// Game state management for different modes
class GameModeService {
  constructor() {
    this.activeGames = new Map();
  }

  /**
   * Initialize a game with specific mode settings
   */
  initializeGame(gameId, modeId, customSettings = {}) {
    const mode = GAME_MODES[modeId];
    if (!mode) {
      throw new Error(`Unknown game mode: ${modeId}`);
    }

    const gameState = {
      gameId,
      mode: modeId,
      settings: { ...mode.settings, ...customSettings },
      rules: { ...mode.rules },
      phase: 'waiting', // waiting, hiding, active, ended
      players: new Map(),
      teams: mode.rules.teams ? new Map() : null,
      scores: new Map(),
      hills: mode.rules.pointCapture ? this.initializeHills(customSettings.capturePoints || mode.settings.capturePoints) : null,
      targetAssignments: null, // For assassin mode
      startTime: null,
      phaseEndTime: null,
      events: [],
    };

    this.activeGames.set(gameId, gameState);
    return gameState;
  }

  /**
   * Initialize capture points for King of the Hill
   */
  initializeHills(count) {
    const hills = [];
    for (let i = 0; i < count; i++) {
      hills.push({
        id: `hill_${i}`,
        name: `Point ${String.fromCharCode(65 + i)}`, // A, B, C...
        controlledBy: null,
        contestedBy: [],
        captureProgress: 0,
        position: null, // Set by game host
      });
    }
    return hills;
  }

  /**
   * Add player to game
   */
  addPlayer(gameId, player) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    const playerState = {
      id: player.id,
      name: player.name,
      role: 'runner', // Default role
      isAlive: true,
      isFrozen: false,
      score: 0,
      tags: 0,
      deaths: 0,
      target: null, // For assassin mode
      team: null,
      lastTagTime: 0,
      respawnTime: null,
    };

    game.players.set(player.id, playerState);
    game.scores.set(player.id, 0);

    return playerState;
  }

  /**
   * Start the game
   */
  startGame(gameId, players) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    game.startTime = Date.now();

    // Mode-specific initialization
    switch (game.mode) {
      case 'infection':
        this.initializeInfection(game, players);
        break;
      case 'assassin':
        this.initializeAssassin(game, players);
        break;
      case 'hideAndSeek':
        this.initializeHideAndSeek(game, players);
        break;
      case 'kingOfTheHill':
        this.initializeKingOfTheHill(game, players);
        break;
      case 'teamTag':
        this.initializeTeamTag(game, players);
        break;
      case 'freezeTag':
        this.initializeFreezeTag(game, players);
        break;
      default:
        // Classic mode - random IT
        this.initializeClassic(game, players);
    }

    return game;
  }

  /**
   * Initialize Classic Tag
   */
  initializeClassic(game, players) {
    game.phase = 'active';
    const playerIds = Array.from(players.keys());
    const itIndex = Math.floor(Math.random() * playerIds.length);

    playerIds.forEach((id, index) => {
      const player = game.players.get(id);
      if (player) {
        player.role = index === itIndex ? 'hunter' : 'runner';
      }
    });
  }

  /**
   * Initialize Infection mode
   */
  initializeInfection(game, players) {
    game.phase = 'active';
    const playerIds = Array.from(players.keys());
    const initialInfected = game.settings.initialInfected || 1;

    // Shuffle and pick initial infected
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    shuffled.forEach((id, index) => {
      const player = game.players.get(id);
      if (player) {
        player.role = index < initialInfected ? 'infected' : 'survivor';
        player.isAlive = true;
      }
    });
  }

  /**
   * Initialize Assassin mode
   */
  initializeAssassin(game, players) {
    game.phase = 'active';
    const playerIds = Array.from(players.keys());

    // Create circular target chain
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    game.targetAssignments = new Map();

    shuffled.forEach((id, index) => {
      const targetIndex = (index + 1) % shuffled.length;
      game.targetAssignments.set(id, shuffled[targetIndex]);

      const player = game.players.get(id);
      if (player) {
        player.role = 'assassin';
        player.target = shuffled[targetIndex];
      }
    });
  }

  /**
   * Initialize Hide and Seek
   */
  initializeHideAndSeek(game, players) {
    game.phase = 'hiding';
    game.phaseEndTime = Date.now() + game.settings.hidingTime;

    const playerIds = Array.from(players.keys());
    const seekerCount = game.settings.seekerCount || 1;
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    shuffled.forEach((id, index) => {
      const player = game.players.get(id);
      if (player) {
        player.role = index < seekerCount ? 'seeker' : 'hider';
        // Seekers are "blind" during hiding phase
        if (player.role === 'seeker') {
          player.canSee = false;
        }
      }
    });

    // Schedule phase transition
    setTimeout(() => {
      this.startSeekingPhase(game.gameId);
    }, game.settings.hidingTime);
  }

  /**
   * Start seeking phase for Hide and Seek
   */
  startSeekingPhase(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.phase !== 'hiding') return;

    game.phase = 'active';
    game.players.forEach(player => {
      if (player.role === 'seeker') {
        player.canSee = true;
      }
    });

    this.addEvent(game, {
      type: 'phase_change',
      phase: 'seeking',
      message: 'Seekers are now hunting!',
    });
  }

  /**
   * Initialize King of the Hill
   */
  initializeKingOfTheHill(game, players) {
    game.phase = 'active';
    const playerIds = Array.from(players.keys());

    // Assign to teams
    const teamCount = game.settings.teamCount || 2;
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    game.teams = new Map();
    for (let i = 0; i < teamCount; i++) {
      game.teams.set(`team_${i}`, {
        id: `team_${i}`,
        name: `Team ${i + 1}`,
        color: ['#FF4444', '#4444FF', '#44FF44', '#FFFF44'][i],
        score: 0,
        members: [],
      });
    }

    shuffled.forEach((id, index) => {
      const teamId = `team_${index % teamCount}`;
      const player = game.players.get(id);
      if (player) {
        player.team = teamId;
        player.role = 'player';
        game.teams.get(teamId).members.push(id);
      }
    });
  }

  /**
   * Initialize Team Tag
   */
  initializeTeamTag(game, players) {
    this.initializeKingOfTheHill(game, players); // Same team setup
  }

  /**
   * Initialize Freeze Tag
   */
  initializeFreezeTag(game, players) {
    game.phase = 'active';
    const playerIds = Array.from(players.keys());
    const itIndex = Math.floor(Math.random() * playerIds.length);

    playerIds.forEach((id, index) => {
      const player = game.players.get(id);
      if (player) {
        player.role = index === itIndex ? 'freezer' : 'runner';
        player.isFrozen = false;
      }
    });
  }

  /**
   * Process a tag event
   */
  processTag(gameId, taggerId, targetId, location) {
    const game = this.activeGames.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };

    const tagger = game.players.get(taggerId);
    const target = game.players.get(targetId);

    if (!tagger || !target) {
      return { success: false, error: 'Player not found' };
    }

    // Check if tag is valid based on game mode
    const result = this.validateTag(game, tagger, target);
    if (!result.valid) {
      return { success: false, error: result.reason };
    }

    // Process tag based on mode
    switch (game.mode) {
      case 'classic':
        return this.processClassicTag(game, tagger, target);
      case 'infection':
        return this.processInfectionTag(game, tagger, target);
      case 'assassin':
        return this.processAssassinTag(game, tagger, target);
      case 'freezeTag':
        return this.processFreezeTag(game, tagger, target);
      case 'kingOfTheHill':
      case 'teamTag':
        return this.processTeamTag(game, tagger, target);
      case 'hideAndSeek':
        return this.processHideAndSeekTag(game, tagger, target);
      default:
        return this.processClassicTag(game, tagger, target);
    }
  }

  /**
   * Validate if a tag is allowed
   */
  validateTag(game, tagger, target) {
    // Can't tag yourself
    if (tagger.id === target.id) {
      return { valid: false, reason: 'Cannot tag yourself' };
    }

    // Target must be alive
    if (!target.isAlive) {
      return { valid: false, reason: 'Target is eliminated' };
    }

    // Check tag cooldown
    const now = Date.now();
    if (target.lastTagTime && now - target.lastTagTime < (game.settings.tagCooldown || 3000)) {
      return { valid: false, reason: 'Target has tag immunity' };
    }

    // Mode-specific validation
    switch (game.mode) {
      case 'assassin':
        // Can only tag your assigned target
        if (tagger.target !== target.id) {
          return { valid: false, reason: 'Not your target', penalty: true };
        }
        break;
      case 'teamTag':
      case 'kingOfTheHill':
        // Can't tag teammates
        if (tagger.team === target.team) {
          return { valid: false, reason: 'Cannot tag teammate' };
        }
        break;
      case 'infection':
        // Only infected can tag
        if (tagger.role !== 'infected') {
          return { valid: false, reason: 'Only infected can tag' };
        }
        break;
      case 'freezeTag':
        // Only freezer can tag, and can't tag frozen players
        if (tagger.role !== 'freezer') {
          return { valid: false, reason: 'Only freezer can tag' };
        }
        if (target.isFrozen) {
          return { valid: false, reason: 'Target is already frozen' };
        }
        break;
      case 'hideAndSeek':
        if (game.phase === 'hiding') {
          return { valid: false, reason: 'Still in hiding phase' };
        }
        if (tagger.role !== 'seeker') {
          return { valid: false, reason: 'Only seekers can tag' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Process Classic Tag
   */
  processClassicTag(game, tagger, target) {
    // Transfer IT status
    tagger.role = 'runner';
    target.role = 'hunter';
    target.lastTagTime = Date.now();
    tagger.tags++;

    this.addEvent(game, {
      type: 'tag',
      tagger: tagger.id,
      target: target.id,
      message: `${tagger.name} tagged ${target.name}!`,
    });

    return {
      success: true,
      type: 'transfer',
      newIt: target.id,
    };
  }

  /**
   * Process Infection Tag
   */
  processInfectionTag(game, tagger, target) {
    // Convert target to infected
    target.role = 'infected';
    target.lastTagTime = Date.now();
    tagger.tags++;

    this.addEvent(game, {
      type: 'infection',
      tagger: tagger.id,
      target: target.id,
      message: `${target.name} has been infected!`,
    });

    // Check win condition
    const survivors = Array.from(game.players.values()).filter(p => p.role === 'survivor');
    if (survivors.length === 0) {
      return {
        success: true,
        type: 'infection',
        gameOver: true,
        winner: 'infected',
      };
    }

    return {
      success: true,
      type: 'infection',
      survivorsLeft: survivors.length,
    };
  }

  /**
   * Process Assassin Tag
   */
  processAssassinTag(game, tagger, target) {
    // Eliminate target
    target.isAlive = false;
    tagger.tags++;
    tagger.score += game.settings.eliminationPoints;

    // Inherit target's target
    const newTarget = game.targetAssignments.get(target.id);
    game.targetAssignments.set(tagger.id, newTarget);
    tagger.target = newTarget;

    this.addEvent(game, {
      type: 'elimination',
      tagger: tagger.id,
      target: target.id,
      newTarget: newTarget,
      message: `${tagger.name} eliminated ${target.name}!`,
    });

    // Check win condition
    const alive = Array.from(game.players.values()).filter(p => p.isAlive);
    if (alive.length === 1) {
      return {
        success: true,
        type: 'elimination',
        gameOver: true,
        winner: alive[0].id,
      };
    }

    return {
      success: true,
      type: 'elimination',
      newTarget: newTarget,
      playersRemaining: alive.length,
    };
  }

  /**
   * Process Freeze Tag
   */
  processFreezeTag(game, tagger, target) {
    target.isFrozen = true;
    target.frozenAt = Date.now();
    tagger.tags++;

    this.addEvent(game, {
      type: 'freeze',
      tagger: tagger.id,
      target: target.id,
      message: `${target.name} has been frozen!`,
    });

    // Check if all runners are frozen
    const unfrozen = Array.from(game.players.values())
      .filter(p => p.role === 'runner' && !p.isFrozen);

    if (unfrozen.length === 0) {
      return {
        success: true,
        type: 'freeze',
        gameOver: true,
        winner: 'freezer',
      };
    }

    return {
      success: true,
      type: 'freeze',
      unfrozenLeft: unfrozen.length,
    };
  }

  /**
   * Unfreeze a player (Freeze Tag)
   */
  unfreezePlayer(gameId, unfreezerId, frozenId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.mode !== 'freezeTag') return { success: false };

    const unfreezer = game.players.get(unfreezerId);
    const frozen = game.players.get(frozenId);

    if (!unfreezer || !frozen) return { success: false, error: 'Player not found' };
    if (!frozen.isFrozen) return { success: false, error: 'Player is not frozen' };
    if (unfreezer.role !== 'runner') return { success: false, error: 'Only runners can unfreeze' };
    if (unfreezer.isFrozen) return { success: false, error: 'Cannot unfreeze while frozen' };

    frozen.isFrozen = false;
    frozen.frozenAt = null;

    this.addEvent(game, {
      type: 'unfreeze',
      unfreezer: unfreezerId,
      target: frozenId,
      message: `${unfreezer.name} unfroze ${frozen.name}!`,
    });

    return { success: true, type: 'unfreeze' };
  }

  /**
   * Process Team Tag
   */
  processTeamTag(game, tagger, target) {
    target.lastTagTime = Date.now();
    target.deaths++;
    tagger.tags++;

    const points = game.settings.tagPoints || 10;
    tagger.score += points;

    const team = game.teams.get(tagger.team);
    if (team) {
      team.score += points;
    }

    // Handle respawn
    if (game.rules.respawns) {
      target.respawnTime = Date.now() + (game.settings.respawnTime || 10000);
    }

    this.addEvent(game, {
      type: 'team_tag',
      tagger: tagger.id,
      target: target.id,
      points: points,
      message: `${tagger.name} tagged ${target.name} for ${points} points!`,
    });

    return {
      success: true,
      type: 'team_tag',
      points: points,
      teamScore: team?.score,
    };
  }

  /**
   * Process Hide and Seek Tag
   */
  processHideAndSeekTag(game, tagger, target) {
    target.isAlive = false;
    tagger.tags++;

    this.addEvent(game, {
      type: 'found',
      seeker: tagger.id,
      hider: target.id,
      message: `${tagger.name} found ${target.name}!`,
    });

    // Check if all hiders found
    const hidersLeft = Array.from(game.players.values())
      .filter(p => p.role === 'hider' && p.isAlive);

    if (hidersLeft.length === 0) {
      return {
        success: true,
        type: 'found',
        gameOver: true,
        winner: 'seekers',
      };
    }

    return {
      success: true,
      type: 'found',
      hidersLeft: hidersLeft.length,
    };
  }

  /**
   * Update hill control (King of the Hill)
   */
  updateHillControl(gameId, hillId, playersInRange) {
    const game = this.activeGames.get(gameId);
    if (!game || !game.hills) return null;

    const hill = game.hills.find(h => h.id === hillId);
    if (!hill) return null;

    // Determine which teams have players in range
    const teamsInRange = new Map();
    playersInRange.forEach(playerId => {
      const player = game.players.get(playerId);
      if (player && player.team) {
        if (!teamsInRange.has(player.team)) {
          teamsInRange.set(player.team, []);
        }
        teamsInRange.get(player.team).push(playerId);
      }
    });

    // Update hill state
    if (teamsInRange.size === 0) {
      // No one on hill - slowly decay
      hill.captureProgress = Math.max(0, hill.captureProgress - 1);
      if (hill.captureProgress === 0) {
        hill.controlledBy = null;
      }
    } else if (teamsInRange.size === 1) {
      // One team on hill - capture/maintain
      const [[teamId, players]] = teamsInRange;

      if (hill.controlledBy === teamId) {
        // Maintaining control - award points
        const team = game.teams.get(teamId);
        if (team) {
          team.score += game.settings.pointsPerSecond || 1;
        }
      } else {
        // Capturing
        hill.captureProgress += players.length;
        hill.contestedBy = [];

        if (hill.captureProgress >= 100) {
          hill.controlledBy = teamId;
          hill.captureProgress = 100;

          this.addEvent(game, {
            type: 'hill_captured',
            hill: hillId,
            team: teamId,
            message: `${game.teams.get(teamId)?.name} captured ${hill.name}!`,
          });
        }
      }
    } else {
      // Contested - no progress
      hill.contestedBy = Array.from(teamsInRange.keys());
    }

    return hill;
  }

  /**
   * Add event to game log
   */
  addEvent(game, event) {
    event.timestamp = Date.now();
    game.events.push(event);

    // Keep only last 100 events
    if (game.events.length > 100) {
      game.events.shift();
    }
  }

  /**
   * Get game state
   */
  getGameState(gameId) {
    return this.activeGames.get(gameId);
  }

  /**
   * Get leaderboard for current game
   */
  getLeaderboard(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return [];

    const players = Array.from(game.players.values());

    // Sort by score/tags depending on mode
    return players.sort((a, b) => {
      if (game.rules.teams) {
        return b.score - a.score;
      }
      return b.tags - a.tags;
    }).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      tags: p.tags,
      deaths: p.deaths,
      team: p.team,
      isAlive: p.isAlive,
    }));
  }

  /**
   * End game and determine winner
   */
  endGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    game.phase = 'ended';

    let winner;
    switch (game.mode) {
      case 'infection':
        const survivors = Array.from(game.players.values()).filter(p => p.role === 'survivor');
        winner = survivors.length > 0 ? { type: 'survivors', players: survivors } : { type: 'infected' };
        break;
      case 'assassin':
        const alive = Array.from(game.players.values()).filter(p => p.isAlive);
        winner = alive.length === 1 ? alive[0] : this.getLeaderboard(gameId)[0];
        break;
      case 'kingOfTheHill':
      case 'teamTag':
        const teams = Array.from(game.teams.values()).sort((a, b) => b.score - a.score);
        winner = teams[0];
        break;
      default:
        winner = this.getLeaderboard(gameId)[0];
    }

    this.addEvent(game, {
      type: 'game_end',
      winner,
      message: 'Game Over!',
    });

    return { game, winner };
  }

  /**
   * Clean up game
   */
  removeGame(gameId) {
    this.activeGames.delete(gameId);
  }
}

export const gameModeService = new GameModeService();
export default gameModeService;

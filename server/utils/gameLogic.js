/**
 * Game Logic Utilities
 * Phase 1: Host transfer, winner determination, simultaneous tag handling
 */

import { generateId } from '../../shared/utils.js';

/**
 * Transfer host when current host disconnects
 * @param {Object} game - Current game state
 * @param {string} disconnectedHostId - ID of the disconnected host
 * @returns {Object} Updated game with new host
 */
export function transferHost(game, disconnectedHostId) {
  if (game.host !== disconnectedHostId) {
    return { game, transferred: false, newHost: null };
  }

  // Find eligible players (online and not the disconnected host)
  const eligiblePlayers = game.players.filter(p =>
    p.id !== disconnectedHostId &&
    p.isOnline !== false &&
    !p.isEliminated
  );

  if (eligiblePlayers.length === 0) {
    // No eligible players, game should end
    return { game, transferred: false, newHost: null, shouldEnd: true };
  }

  // Select new host (prefer longest-joined player)
  const sortedByJoinTime = [...eligiblePlayers].sort((a, b) =>
    (a.joinedAt || 0) - (b.joinedAt || 0)
  );
  const newHost = sortedByJoinTime[0];

  const updatedGame = {
    ...game,
    host: newHost.id,
    hostName: newHost.name,
  };

  return {
    game: updatedGame,
    transferred: true,
    newHost: {
      id: newHost.id,
      name: newHost.name,
    },
  };
}

/**
 * Determine winner based on game mode
 * @param {Object} game - Current game state
 * @returns {Object} Winner info { winnerId, winnerName, reason, stats }
 */
export function determineWinner(game) {
  const gameMode = game.gameMode || game.settings?.gameMode || 'classic';
  const activePlayers = game.players.filter(p => !p.isEliminated);

  switch (gameMode) {
    case 'classic':
    case 'manhunt':
      return determineClassicWinner(game);

    case 'freezeTag':
      return determineFreezeTagWinner(game);

    case 'infection':
      return determineInfectionWinner(game);

    case 'teamTag':
      return determineTeamTagWinner(game);

    case 'hotPotato':
      return determineHotPotatoWinner(game);

    case 'hideAndSeek':
      return determineHideAndSeekWinner(game);

    case 'assassin':
      return determineAssassinWinner(game);

    case 'battleRoyale':
      return determineBattleRoyaleWinner(game);

    case 'kingOfTheHill':
      return determineKingOfTheHillWinner(game);

    default:
      return determineClassicWinner(game);
  }
}

function determineClassicWinner(game) {
  const now = Date.now();
  const startTime = game.startedAt || now;

  // Calculate survival times for each player
  const playerStats = game.players.map(p => {
    let survivalTime;
    if (p.isIt) {
      // Currently IT - survival time is until they became IT
      survivalTime = p.becameItAt ? p.becameItAt - startTime : 0;
    } else if (p.becameItAt) {
      // Was IT at some point - survival time is until they became IT
      survivalTime = p.becameItAt - startTime;
    } else {
      // Never was IT - survived the whole game
      survivalTime = now - startTime;
    }
    return {
      ...p,
      finalSurvivalTime: Math.max(0, survivalTime),
    };
  });

  // Winner is non-IT player with longest survival
  const winner = playerStats
    .filter(p => !p.isIt)
    .sort((a, b) => b.finalSurvivalTime - a.finalSurvivalTime)[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Longest survival time',
    stats: playerStats,
  };
}

function determineFreezeTagWinner(game) {
  const frozenPlayers = game.players.filter(p => p.isFrozen);
  const activePlayers = game.players.filter(p => !p.isFrozen && !p.isIt);

  // IT wins if all non-IT players are frozen
  if (activePlayers.length === 0) {
    const itPlayer = game.players.find(p => p.isIt);
    return {
      winnerId: itPlayer?.id,
      winnerName: itPlayer?.name,
      reason: 'Froze all players',
      team: 'it',
    };
  }

  // Runners win if time runs out or game ends
  const winner = activePlayers.sort((a, b) =>
    (b.survivalTime || 0) - (a.survivalTime || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Survived the freeze',
    team: 'runners',
  };
}

function determineInfectionWinner(game) {
  const survivors = game.players.filter(p => !p.isIt);

  // If only infected remain, first infected wins
  if (survivors.length === 0) {
    const firstInfected = game.players
      .filter(p => p.isIt)
      .sort((a, b) => (a.becameItAt || 0) - (b.becameItAt || 0))[0];
    return {
      winnerId: firstInfected?.id,
      winnerName: firstInfected?.name,
      reason: 'Patient zero - infected everyone',
      team: 'infected',
    };
  }

  // Last survivor wins
  if (survivors.length === 1) {
    return {
      winnerId: survivors[0].id,
      winnerName: survivors[0].name,
      reason: 'Last survivor',
      team: 'survivors',
    };
  }

  // Multiple survivors - longest survival wins
  const winner = survivors.sort((a, b) =>
    (b.survivalTime || 0) - (a.survivalTime || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Longest survival',
    team: 'survivors',
  };
}

function determineTeamTagWinner(game) {
  const redTeam = game.players.filter(p => p.team === 'red' && !p.isEliminated);
  const blueTeam = game.players.filter(p => p.team === 'blue' && !p.isEliminated);

  if (redTeam.length === 0) {
    return {
      winnerId: blueTeam[0]?.id,
      winnerName: 'Blue Team',
      reason: 'Eliminated all red team players',
      team: 'blue',
    };
  }

  if (blueTeam.length === 0) {
    return {
      winnerId: redTeam[0]?.id,
      winnerName: 'Red Team',
      reason: 'Eliminated all blue team players',
      team: 'red',
    };
  }

  // Calculate team scores based on total tags
  const redScore = redTeam.reduce((sum, p) => sum + (p.tagCount || 0), 0);
  const blueScore = blueTeam.reduce((sum, p) => sum + (p.tagCount || 0), 0);

  const winningTeam = redScore > blueScore ? 'red' : 'blue';
  return {
    winnerId: null,
    winnerName: `${winningTeam.charAt(0).toUpperCase() + winningTeam.slice(1)} Team`,
    reason: `Higher score (${Math.max(redScore, blueScore)}-${Math.min(redScore, blueScore)})`,
    team: winningTeam,
  };
}

function determineHotPotatoWinner(game) {
  const activePlayers = game.players.filter(p => !p.isEliminated);

  if (activePlayers.length === 1) {
    return {
      winnerId: activePlayers[0].id,
      winnerName: activePlayers[0].name,
      reason: 'Last player standing',
    };
  }

  // Multiple players left - winner is one with most passes
  const winner = activePlayers.sort((a, b) =>
    (b.tagCount || 0) - (a.tagCount || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Most successful passes',
  };
}

function determineHideAndSeekWinner(game) {
  const hiders = game.players.filter(p => !p.isIt && !p.isEliminated);
  const seeker = game.players.find(p => p.isIt);

  // If seeker found everyone
  if (hiders.length === 0) {
    return {
      winnerId: seeker?.id,
      winnerName: seeker?.name,
      reason: 'Found all hiders',
      role: 'seeker',
    };
  }

  // If time ran out, hiders win (longest survival)
  const winner = hiders.sort((a, b) =>
    (b.survivalTime || 0) - (a.survivalTime || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Best hider',
    role: 'hider',
  };
}

function determineAssassinWinner(game) {
  const activePlayers = game.players.filter(p => !p.isEliminated);

  if (activePlayers.length === 1) {
    return {
      winnerId: activePlayers[0].id,
      winnerName: activePlayers[0].name,
      reason: 'Last assassin standing',
      kills: activePlayers[0].tagCount || 0,
    };
  }

  // Multiple players - highest kill count wins
  const winner = activePlayers.sort((a, b) =>
    (b.tagCount || 0) - (a.tagCount || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Most eliminations',
    kills: winner?.tagCount || 0,
  };
}

function determineBattleRoyaleWinner(game) {
  const activePlayers = game.players.filter(p => !p.isEliminated);

  if (activePlayers.length === 1) {
    return {
      winnerId: activePlayers[0].id,
      winnerName: activePlayers[0].name,
      reason: 'Last player standing',
    };
  }

  // Multiple players - longest survival wins
  const winner = activePlayers.sort((a, b) =>
    (b.survivalTime || 0) - (a.survivalTime || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Longest survival in the zone',
  };
}

function determineKingOfTheHillWinner(game) {
  // Winner is player with most hill control time
  const winner = game.players.sort((a, b) =>
    (b.hillTime || 0) - (a.hillTime || 0)
  )[0];

  return {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'Most time controlling the hill',
    hillTime: winner?.hillTime || 0,
  };
}

/**
 * Handle simultaneous tags with server-side validation
 * Uses timestamp to determine which tag happened first
 * @param {Array} tagAttempts - Array of { taggerId, taggedId, timestamp, location }
 * @param {Object} game - Current game state
 * @returns {Object} The valid tag to process
 */
export function resolveSimultaneousTags(tagAttempts, game) {
  if (tagAttempts.length === 0) return null;
  if (tagAttempts.length === 1) return tagAttempts[0];

  // Sort by timestamp (earliest first)
  const sortedAttempts = [...tagAttempts].sort((a, b) =>
    (a.timestamp || 0) - (b.timestamp || 0)
  );

  // Validate each attempt in order
  for (const attempt of sortedAttempts) {
    const tagger = game.players.find(p => p.id === attempt.taggerId);
    const tagged = game.players.find(p => p.id === attempt.taggedId);

    // Validate the tag is still possible
    if (tagger && tagged && !tagged.isEliminated && !tagged.isFrozen) {
      // Check if tagger is allowed to tag (based on game mode)
      const gameMode = game.gameMode || 'classic';

      if (gameMode === 'classic' || gameMode === 'manhunt' || gameMode === 'hideAndSeek') {
        if (tagger.isIt) {
          return attempt;
        }
      } else if (gameMode === 'infection') {
        if (tagger.isIt) {
          return attempt;
        }
      } else if (gameMode === 'teamTag') {
        if (tagger.team !== tagged.team && !tagger.isEliminated) {
          return attempt;
        }
      } else if (gameMode === 'assassin') {
        if (tagger.targetId === tagged.id) {
          return attempt;
        }
      } else {
        // Default: first valid attempt
        return attempt;
      }
    }
  }

  return null;
}

/**
 * Check if game should end based on current state
 * @param {Object} game - Current game state
 * @returns {Object} { shouldEnd: boolean, reason: string }
 */
export function shouldGameEnd(game) {
  const gameMode = game.gameMode || game.settings?.gameMode || 'classic';
  const activePlayers = game.players.filter(p =>
    !p.isEliminated && p.isOnline !== false
  );

  // Check duration limit
  if (game.settings?.duration && game.startedAt) {
    const elapsed = Date.now() - game.startedAt;
    if (elapsed >= game.settings.duration) {
      return { shouldEnd: true, reason: 'Time limit reached' };
    }
  }

  // Not enough players
  if (activePlayers.length < 2) {
    return { shouldEnd: true, reason: 'Not enough players remaining' };
  }

  // Mode-specific end conditions
  switch (gameMode) {
    case 'infection': {
      const survivors = game.players.filter(p => !p.isIt && !p.isEliminated);
      if (survivors.length === 0) {
        return { shouldEnd: true, reason: 'All players infected' };
      }
      break;
    }

    case 'freezeTag': {
      const unfrozen = game.players.filter(p => !p.isIt && !p.isFrozen && !p.isEliminated);
      if (unfrozen.length === 0) {
        return { shouldEnd: true, reason: 'All players frozen' };
      }
      break;
    }

    case 'teamTag': {
      const redAlive = game.players.filter(p => p.team === 'red' && !p.isEliminated);
      const blueAlive = game.players.filter(p => p.team === 'blue' && !p.isEliminated);
      if (redAlive.length === 0 || blueAlive.length === 0) {
        return { shouldEnd: true, reason: 'One team eliminated' };
      }
      break;
    }

    case 'assassin':
    case 'battleRoyale':
    case 'hotPotato': {
      const alive = game.players.filter(p => !p.isEliminated);
      if (alive.length === 1) {
        return { shouldEnd: true, reason: 'One player remaining' };
      }
      break;
    }

    case 'kingOfTheHill': {
      const settings = game.settings || {};
      const winScore = settings.winScore || 300; // seconds
      const winner = game.players.find(p => (p.hillTime || 0) >= winScore * 1000);
      if (winner) {
        return { shouldEnd: true, reason: `${winner.name} controlled the hill long enough` };
      }
      break;
    }
  }

  return { shouldEnd: false };
}

/**
 * Generate a tag record
 */
export function createTagRecord(taggerId, taggedId, game, location = null) {
  const now = Date.now();
  const tagger = game.players.find(p => p.id === taggerId);
  const tagTime = tagger?.becameItAt ? now - tagger.becameItAt : null;

  return {
    id: generateId(),
    taggerId,
    taggedId,
    timestamp: now,
    tagTime,
    location: location ? { lat: location.lat, lng: location.lng } : null,
  };
}

export default {
  transferHost,
  determineWinner,
  resolveSimultaneousTags,
  shouldGameEnd,
  createTagRecord,
};

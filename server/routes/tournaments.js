/**
 * Tournament System Routes
 * Brackets, registration, matchmaking, prizes
 */

import express from 'express';

const router = express.Router();

// Tournament storage (in production, use database)
const tournaments = new Map();

// Tournament types
const TOURNAMENT_TYPES = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  BATTLE_ROYALE: 'battle_royale',
};

// Tournament status
const STATUS = {
  DRAFT: 'draft',
  REGISTRATION: 'registration',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Create tournament
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      gameMode,
      minPlayers,
      maxPlayers,
      entryFee,
      prizePool,
      startTime,
      registrationEnd,
      settings,
    } = req.body;

    const tournament = {
      id: `tourn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || '',
      type: type || TOURNAMENT_TYPES.SINGLE_ELIMINATION,
      gameMode: gameMode || 'classic',
      status: STATUS.DRAFT,
      minPlayers: minPlayers || 4,
      maxPlayers: maxPlayers || 32,
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      startTime,
      registrationEnd,
      participants: [],
      waitlist: [],
      rounds: [],
      matches: [],
      settings: settings || {},
      createdBy: req.user?.id,
      createdAt: Date.now(),
    };

    tournaments.set(tournament.id, tournament);

    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, gameMode, featured } = req.query;

    let results = Array.from(tournaments.values());

    if (status) {
      results = results.filter(t => t.status === status);
    }

    if (gameMode) {
      results = results.filter(t => t.gameMode === gameMode);
    }

    if (featured) {
      results = results.filter(t => t.featured);
    }

    // Sort by start time
    results.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    res.json({
      tournaments: results,
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tournament by ID
router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open registration
router.post('/:tournamentId/open-registration', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== STATUS.DRAFT) {
      return res.status(400).json({ error: 'Tournament is not in draft status' });
    }

    tournament.status = STATUS.REGISTRATION;
    tournament.registrationOpenedAt = Date.now();

    res.json({ success: true, tournament });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register for tournament
router.post('/:tournamentId/register', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { playerId, playerName, playerAvatar } = req.body;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== STATUS.REGISTRATION) {
      return res.status(400).json({ error: 'Registration is not open' });
    }

    // Check if already registered
    if (tournament.participants.some(p => p.id === playerId)) {
      return res.status(400).json({ error: 'Already registered' });
    }

    const participant = {
      id: playerId,
      name: playerName,
      avatar: playerAvatar,
      seed: null,
      registeredAt: Date.now(),
      checkedIn: false,
      eliminated: false,
      stats: { wins: 0, losses: 0, tags: 0 },
    };

    if (tournament.participants.length < tournament.maxPlayers) {
      tournament.participants.push(participant);
      res.json({
        success: true,
        position: tournament.participants.length,
        waitlist: false,
      });
    } else {
      tournament.waitlist.push(participant);
      res.json({
        success: true,
        position: tournament.waitlist.length,
        waitlist: true,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unregister from tournament
router.delete('/:tournamentId/register/:playerId', async (req, res) => {
  try {
    const { tournamentId, playerId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== STATUS.REGISTRATION) {
      return res.status(400).json({ error: 'Cannot unregister after registration closes' });
    }

    const index = tournament.participants.findIndex(p => p.id === playerId);

    if (index === -1) {
      const waitlistIndex = tournament.waitlist.findIndex(p => p.id === playerId);
      if (waitlistIndex > -1) {
        tournament.waitlist.splice(waitlistIndex, 1);
        return res.json({ success: true, refund: tournament.entryFee });
      }
      return res.status(404).json({ error: 'Not registered' });
    }

    tournament.participants.splice(index, 1);

    // Promote from waitlist
    if (tournament.waitlist.length > 0) {
      const promoted = tournament.waitlist.shift();
      tournament.participants.push(promoted);
    }

    res.json({ success: true, refund: tournament.entryFee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check in to tournament
router.post('/:tournamentId/checkin/:playerId', async (req, res) => {
  try {
    const { tournamentId, playerId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participant = tournament.participants.find(p => p.id === playerId);

    if (!participant) {
      return res.status(404).json({ error: 'Not registered' });
    }

    participant.checkedIn = true;
    participant.checkedInAt = Date.now();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start tournament
router.post('/:tournamentId/start', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Filter to checked-in players
    tournament.participants = tournament.participants.filter(p => p.checkedIn);

    if (tournament.participants.length < tournament.minPlayers) {
      return res.status(400).json({ error: 'Not enough players checked in' });
    }

    // Seed players
    tournament.participants = seedPlayers(tournament.participants);

    // Generate bracket
    generateBracket(tournament);

    tournament.status = STATUS.IN_PROGRESS;
    tournament.startedAt = Date.now();

    res.json({ success: true, tournament });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bracket
router.get('/:tournamentId/bracket', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      rounds: tournament.rounds,
      matches: tournament.matches,
      currentRound: tournament.currentRound || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report match result
router.post('/:tournamentId/match/:matchId/result', async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { winnerId, loserId, score1, score2 } = req.body;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const match = tournament.matches.find(m => m.id === matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Update match
    match.winner = winnerId;
    match.loser = loserId;
    match.score1 = score1;
    match.score2 = score2;
    match.status = 'completed';
    match.completedAt = Date.now();

    // Update player stats
    const winner = tournament.participants.find(p => p.id === winnerId);
    const loser = tournament.participants.find(p => p.id === loserId);

    if (winner) winner.stats.wins++;
    if (loser) {
      loser.stats.losses++;
      if (tournament.type === TOURNAMENT_TYPES.SINGLE_ELIMINATION) {
        loser.eliminated = true;
      }
    }

    // Advance winner
    if (match.nextMatchId) {
      const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        if (!nextMatch.player1) {
          nextMatch.player1 = winnerId;
          nextMatch.player1Name = winner?.name;
        } else if (!nextMatch.player2) {
          nextMatch.player2 = winnerId;
          nextMatch.player2Name = winner?.name;
        }

        if (nextMatch.player1 && nextMatch.player2) {
          nextMatch.status = 'ready';
        }
      }
    }

    // Check tournament completion
    checkTournamentCompletion(tournament);

    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get standings
router.get('/:tournamentId/standings', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const standings = [...tournament.participants].sort((a, b) => {
      if (!a.eliminated && b.eliminated) return -1;
      if (a.eliminated && !b.eliminated) return 1;
      return b.stats.wins - a.stats.wins;
    });

    res.json({
      standings: standings.map((p, index) => ({
        rank: index + 1,
        ...p,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player's matches
router.get('/:tournamentId/player/:playerId/matches', async (req, res) => {
  try {
    const { tournamentId, playerId } = req.params;

    const tournament = tournaments.get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const matches = tournament.matches.filter(m =>
      m.player1 === playerId || m.player2 === playerId
    );

    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Seed players
function seedPlayers(participants) {
  // Sort by rating/random
  const seeded = [...participants].sort(() => Math.random() - 0.5);
  seeded.forEach((p, index) => {
    p.seed = index + 1;
  });
  return seeded;
}

// Helper: Generate bracket
function generateBracket(tournament) {
  const players = tournament.participants;
  const numPlayers = players.length;
  const numRounds = Math.ceil(Math.log2(numPlayers));
  const bracketSize = Math.pow(2, numRounds);

  tournament.rounds = [];
  tournament.matches = [];
  tournament.currentRound = 1;

  let matchId = 0;

  // First round
  const firstRoundMatches = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1Index = i;
    const p2Index = bracketSize - 1 - i;

    const player1 = players[p1Index] || null;
    const player2 = players[p2Index] || null;

    const match = {
      id: `match_${matchId++}`,
      round: 1,
      position: i,
      player1: player1?.id || null,
      player2: player2?.id || null,
      player1Name: player1?.name || 'BYE',
      player2Name: player2?.name || 'BYE',
      winner: null,
      loser: null,
      score1: 0,
      score2: 0,
      status: (!player1 || !player2) ? 'bye' : 'pending',
      nextMatchId: null,
    };

    // Handle byes
    if (!player1 && player2) {
      match.winner = player2.id;
    } else if (player1 && !player2) {
      match.winner = player1.id;
    }

    firstRoundMatches.push(match);
    tournament.matches.push(match);
  }

  tournament.rounds.push({
    number: 1,
    name: numRounds === 1 ? 'Final' : `Round of ${bracketSize}`,
    matches: firstRoundMatches.map(m => m.id),
  });

  // Subsequent rounds
  let previousMatches = firstRoundMatches;

  for (let round = 2; round <= numRounds; round++) {
    const roundMatches = [];

    for (let i = 0; i < previousMatches.length / 2; i++) {
      const match = {
        id: `match_${matchId++}`,
        round,
        position: i,
        player1: null,
        player2: null,
        player1Name: 'TBD',
        player2Name: 'TBD',
        winner: null,
        loser: null,
        score1: 0,
        score2: 0,
        status: 'pending',
        previousMatchIds: [
          previousMatches[i * 2].id,
          previousMatches[i * 2 + 1].id,
        ],
        nextMatchId: null,
      };

      previousMatches[i * 2].nextMatchId = match.id;
      previousMatches[i * 2 + 1].nextMatchId = match.id;

      roundMatches.push(match);
      tournament.matches.push(match);
    }

    let roundName;
    if (round === numRounds) roundName = 'Final';
    else if (round === numRounds - 1) roundName = 'Semi-Finals';
    else if (round === numRounds - 2) roundName = 'Quarter-Finals';
    else roundName = `Round ${round}`;

    tournament.rounds.push({
      number: round,
      name: roundName,
      matches: roundMatches.map(m => m.id),
    });

    previousMatches = roundMatches;
  }

  // Propagate byes
  for (const match of tournament.matches) {
    if (match.status === 'bye' && match.winner && match.nextMatchId) {
      const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        const winner = tournament.participants.find(p => p.id === match.winner);
        if (!nextMatch.player1) {
          nextMatch.player1 = match.winner;
          nextMatch.player1Name = winner?.name || 'TBD';
        } else if (!nextMatch.player2) {
          nextMatch.player2 = match.winner;
          nextMatch.player2Name = winner?.name || 'TBD';
        }

        if (nextMatch.player1 && nextMatch.player2) {
          nextMatch.status = 'ready';
        }
      }
    }
  }
}

// Helper: Check tournament completion
function checkTournamentCompletion(tournament) {
  const pendingMatches = tournament.matches.filter(m =>
    m.status === 'pending' || m.status === 'ready'
  );

  if (pendingMatches.length === 0) {
    tournament.status = STATUS.COMPLETED;
    tournament.completedAt = Date.now();

    // Determine winner
    const finalMatch = tournament.matches.find(m =>
      m.round === tournament.rounds.length && m.status === 'completed'
    );

    if (finalMatch) {
      tournament.winner = finalMatch.winner;
      const winnerPlayer = tournament.participants.find(p => p.id === finalMatch.winner);
      tournament.winnerName = winnerPlayer?.name;
    }
  }
}

export { router as tournamentRouter };
export default router;

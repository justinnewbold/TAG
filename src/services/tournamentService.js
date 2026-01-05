/**
 * Tournament Service
 * Handles tournament creation, brackets, matchmaking, and prizes
 */

// Tournament Types
export const TOURNAMENT_TYPES = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  SWISS: 'swiss',
  BATTLE_ROYALE: 'battle_royale',
};

// Tournament Status
export const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  REGISTRATION: 'registration',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Match Status
export const MATCH_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BYE: 'bye',
  FORFEIT: 'forfeit',
};

class TournamentService {
  constructor() {
    this.tournaments = new Map();
    this.playerTournaments = new Map(); // playerId -> Set of tournamentIds
    this.listeners = new Map();
  }

  /**
   * Create a new tournament
   */
  createTournament(options) {
    const tournament = {
      id: `tourn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: options.name,
      description: options.description || '',
      type: options.type || TOURNAMENT_TYPES.SINGLE_ELIMINATION,
      gameMode: options.gameMode || 'classic',
      status: TOURNAMENT_STATUS.DRAFT,

      // Scheduling
      registrationStart: options.registrationStart || Date.now(),
      registrationEnd: options.registrationEnd,
      startTime: options.startTime,
      endTime: null,

      // Participants
      minPlayers: options.minPlayers || 4,
      maxPlayers: options.maxPlayers || 32,
      participants: [],
      waitlist: [],

      // Entry
      entryFee: options.entryFee || 0,
      entryFeeType: options.entryFeeType || 'coins', // coins, tickets, free

      // Prizes
      prizePool: options.prizePool || 0,
      prizeDistribution: options.prizeDistribution || [
        { place: 1, percentage: 50 },
        { place: 2, percentage: 30 },
        { place: 3, percentage: 20 },
      ],
      specialPrizes: options.specialPrizes || [],

      // Brackets
      rounds: [],
      currentRound: 0,
      matches: [],

      // Settings
      settings: {
        matchDuration: options.matchDuration || 300000, // 5 minutes
        matchesPerRound: options.matchesPerRound || 1, // Best of X
        playersPerMatch: options.playersPerMatch || 2,
        allowSpectators: options.allowSpectators !== false,
        ...options.settings,
      },

      // Metadata
      createdBy: options.createdBy,
      createdAt: Date.now(),
      featured: options.featured || false,
      tags: options.tags || [],
    };

    this.tournaments.set(tournament.id, tournament);
    return tournament;
  }

  /**
   * Open registration for a tournament
   */
  openRegistration(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    if (tournament.status !== TOURNAMENT_STATUS.DRAFT) {
      return { success: false, error: 'Tournament is not in draft status' };
    }

    tournament.status = TOURNAMENT_STATUS.REGISTRATION;
    this.emit('registration_opened', { tournament });

    return { success: true, tournament };
  }

  /**
   * Register player for tournament
   */
  registerPlayer(tournamentId, player, paymentConfirmed = false) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
      return { success: false, error: 'Registration is not open' };
    }

    // Check if already registered
    if (tournament.participants.some(p => p.id === player.id)) {
      return { success: false, error: 'Already registered' };
    }

    // Check entry fee
    if (tournament.entryFee > 0 && !paymentConfirmed) {
      return { success: false, error: 'Entry fee required', entryFee: tournament.entryFee };
    }

    const participant = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      seed: null,
      registeredAt: Date.now(),
      checkedIn: false,
      eliminated: false,
      placement: null,
      stats: {
        wins: 0,
        losses: 0,
        tags: 0,
        survivalTime: 0,
      },
    };

    // Add to participants or waitlist
    if (tournament.participants.length < tournament.maxPlayers) {
      tournament.participants.push(participant);

      // Track player's tournaments
      if (!this.playerTournaments.has(player.id)) {
        this.playerTournaments.set(player.id, new Set());
      }
      this.playerTournaments.get(player.id).add(tournamentId);

      this.emit('player_registered', { tournament, participant });

      return { success: true, position: tournament.participants.length, waitlist: false };
    } else {
      tournament.waitlist.push(participant);
      return { success: true, position: tournament.waitlist.length, waitlist: true };
    }
  }

  /**
   * Unregister player from tournament
   */
  unregisterPlayer(tournamentId, playerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
      return { success: false, error: 'Cannot unregister after registration closes' };
    }

    const index = tournament.participants.findIndex(p => p.id === playerId);
    if (index === -1) {
      // Check waitlist
      const waitlistIndex = tournament.waitlist.findIndex(p => p.id === playerId);
      if (waitlistIndex > -1) {
        tournament.waitlist.splice(waitlistIndex, 1);
        return { success: true, refund: tournament.entryFee };
      }
      return { success: false, error: 'Not registered' };
    }

    tournament.participants.splice(index, 1);

    // Move someone from waitlist
    if (tournament.waitlist.length > 0) {
      const promoted = tournament.waitlist.shift();
      tournament.participants.push(promoted);
      this.emit('player_promoted', { tournament, player: promoted });
    }

    // Remove from player tracking
    this.playerTournaments.get(playerId)?.delete(tournamentId);

    return { success: true, refund: tournament.entryFee };
  }

  /**
   * Check in player (before tournament starts)
   */
  checkInPlayer(tournamentId, playerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    const participant = tournament.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Not registered' };

    participant.checkedIn = true;
    return { success: true };
  }

  /**
   * Start tournament
   */
  startTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Filter out players who didn't check in
    tournament.participants = tournament.participants.filter(p => p.checkedIn);

    if (tournament.participants.length < tournament.minPlayers) {
      return { success: false, error: 'Not enough players checked in' };
    }

    // Seed players
    this.seedPlayers(tournament);

    // Generate bracket
    switch (tournament.type) {
      case TOURNAMENT_TYPES.SINGLE_ELIMINATION:
        this.generateSingleEliminationBracket(tournament);
        break;
      case TOURNAMENT_TYPES.DOUBLE_ELIMINATION:
        this.generateDoubleEliminationBracket(tournament);
        break;
      case TOURNAMENT_TYPES.ROUND_ROBIN:
        this.generateRoundRobinSchedule(tournament);
        break;
      case TOURNAMENT_TYPES.SWISS:
        this.generateSwissRound(tournament);
        break;
      case TOURNAMENT_TYPES.BATTLE_ROYALE:
        this.generateBattleRoyaleRounds(tournament);
        break;
    }

    tournament.status = TOURNAMENT_STATUS.IN_PROGRESS;
    tournament.currentRound = 1;

    this.emit('tournament_started', { tournament });

    return { success: true, tournament };
  }

  /**
   * Seed players (by rating, random, or registration order)
   */
  seedPlayers(tournament, method = 'rating') {
    let seeded;

    switch (method) {
      case 'rating':
        // Sort by rating (assuming players have rating property)
        seeded = [...tournament.participants].sort((a, b) =>
          (b.rating || 1000) - (a.rating || 1000)
        );
        break;
      case 'random':
        seeded = [...tournament.participants].sort(() => Math.random() - 0.5);
        break;
      default:
        seeded = [...tournament.participants]; // Registration order
    }

    seeded.forEach((p, index) => {
      p.seed = index + 1;
    });

    tournament.participants = seeded;
  }

  /**
   * Generate single elimination bracket
   */
  generateSingleEliminationBracket(tournament) {
    const players = tournament.participants;
    const numPlayers = players.length;

    // Calculate number of rounds needed
    const numRounds = Math.ceil(Math.log2(numPlayers));
    const bracketSize = Math.pow(2, numRounds);

    // Calculate byes needed
    const numByes = bracketSize - numPlayers;

    tournament.rounds = [];
    tournament.matches = [];

    // Create first round matches
    const firstRoundMatches = [];
    let matchId = 0;

    // Seeding: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 pattern
    for (let i = 0; i < bracketSize / 2; i++) {
      const player1Index = i;
      const player2Index = bracketSize - 1 - i;

      const player1 = players[player1Index] || null;
      const player2 = players[player2Index] || null;

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
        status: (!player1 || !player2) ? MATCH_STATUS.BYE : MATCH_STATUS.PENDING,
        gameId: null,
        scheduledTime: null,
        completedTime: null,
        nextMatchId: null,
      };

      // Handle byes
      if (!player1 && player2) {
        match.winner = player2.id;
        match.status = MATCH_STATUS.BYE;
      } else if (player1 && !player2) {
        match.winner = player1.id;
        match.status = MATCH_STATUS.BYE;
      }

      firstRoundMatches.push(match);
      tournament.matches.push(match);
    }

    tournament.rounds.push({
      number: 1,
      name: numRounds === 1 ? 'Final' : `Round of ${bracketSize}`,
      matches: firstRoundMatches.map(m => m.id),
    });

    // Generate subsequent rounds
    let previousRoundMatches = firstRoundMatches;

    for (let round = 2; round <= numRounds; round++) {
      const roundMatches = [];

      for (let i = 0; i < previousRoundMatches.length / 2; i++) {
        const match = {
          id: `match_${matchId++}`,
          round,
          position: i,
          player1: null, // To be determined
          player2: null,
          player1Name: 'TBD',
          player2Name: 'TBD',
          winner: null,
          loser: null,
          score1: 0,
          score2: 0,
          status: MATCH_STATUS.PENDING,
          gameId: null,
          scheduledTime: null,
          completedTime: null,
          nextMatchId: null,
          previousMatchIds: [
            previousRoundMatches[i * 2].id,
            previousRoundMatches[i * 2 + 1].id,
          ],
        };

        // Link previous matches to this one
        previousRoundMatches[i * 2].nextMatchId = match.id;
        previousRoundMatches[i * 2 + 1].nextMatchId = match.id;

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

      previousRoundMatches = roundMatches;
    }

    // Propagate byes
    this.propagateByes(tournament);
  }

  /**
   * Generate double elimination bracket
   */
  generateDoubleEliminationBracket(tournament) {
    // First generate winners bracket like single elimination
    this.generateSingleEliminationBracket(tournament);

    // Add losers bracket
    const numRounds = tournament.rounds.length;
    let matchId = tournament.matches.length;

    // Losers bracket has (numRounds - 1) * 2 rounds
    // For simplicity, we'll generate the structure
    tournament.losersRounds = [];
    tournament.losersBracket = true;

    for (let i = 0; i < (numRounds - 1) * 2; i++) {
      tournament.losersRounds.push({
        number: i + 1,
        name: `Losers Round ${i + 1}`,
        matches: [],
      });
    }

    // Grand finals (winner of winners vs winner of losers)
    const grandFinals = {
      id: `match_${matchId++}`,
      round: 'grand_finals',
      position: 0,
      player1: null,
      player2: null,
      player1Name: 'Winners Bracket',
      player2Name: 'Losers Bracket',
      winner: null,
      loser: null,
      score1: 0,
      score2: 0,
      status: MATCH_STATUS.PENDING,
      isGrandFinals: true,
      requiresReset: false, // If losers bracket winner wins, bracket reset needed
    };

    tournament.matches.push(grandFinals);
    tournament.grandFinalsId = grandFinals.id;
  }

  /**
   * Generate round robin schedule
   */
  generateRoundRobinSchedule(tournament) {
    const players = tournament.participants;
    const n = players.length;

    // If odd number of players, add a BYE
    const participants = n % 2 === 0 ? [...players] : [...players, null];
    const numParticipants = participants.length;
    const numRounds = numParticipants - 1;

    tournament.rounds = [];
    tournament.matches = [];
    let matchId = 0;

    for (let round = 0; round < numRounds; round++) {
      const roundMatches = [];

      for (let i = 0; i < numParticipants / 2; i++) {
        const home = (round + i) % (numParticipants - 1);
        let away = (numParticipants - 1 - i + round) % (numParticipants - 1);

        if (i === 0) {
          away = numParticipants - 1;
        }

        const player1 = participants[home];
        const player2 = participants[away];

        if (!player1 || !player2) continue; // Skip BYE matches

        const match = {
          id: `match_${matchId++}`,
          round: round + 1,
          position: i,
          player1: player1.id,
          player2: player2.id,
          player1Name: player1.name,
          player2Name: player2.name,
          winner: null,
          loser: null,
          score1: 0,
          score2: 0,
          status: MATCH_STATUS.PENDING,
        };

        roundMatches.push(match);
        tournament.matches.push(match);
      }

      tournament.rounds.push({
        number: round + 1,
        name: `Round ${round + 1}`,
        matches: roundMatches.map(m => m.id),
      });
    }
  }

  /**
   * Generate Swiss round
   */
  generateSwissRound(tournament) {
    const players = tournament.participants;

    // Sort by current points/performance
    const standings = [...players].sort((a, b) => {
      const scoreA = a.stats.wins * 3 + a.stats.draws;
      const scoreB = b.stats.wins * 3 + b.stats.draws;
      return scoreB - scoreA;
    });

    // Pair players with similar scores who haven't played each other
    const matches = [];
    const paired = new Set();
    let matchId = tournament.matches.length;

    for (let i = 0; i < standings.length; i++) {
      if (paired.has(standings[i].id)) continue;

      for (let j = i + 1; j < standings.length; j++) {
        if (paired.has(standings[j].id)) continue;

        // Check if they've already played
        const alreadyPlayed = tournament.matches.some(m =>
          (m.player1 === standings[i].id && m.player2 === standings[j].id) ||
          (m.player2 === standings[i].id && m.player1 === standings[j].id)
        );

        if (!alreadyPlayed) {
          const match = {
            id: `match_${matchId++}`,
            round: tournament.currentRound + 1,
            position: matches.length,
            player1: standings[i].id,
            player2: standings[j].id,
            player1Name: standings[i].name,
            player2Name: standings[j].name,
            winner: null,
            score1: 0,
            score2: 0,
            status: MATCH_STATUS.PENDING,
          };

          matches.push(match);
          paired.add(standings[i].id);
          paired.add(standings[j].id);
          break;
        }
      }
    }

    matches.forEach(m => tournament.matches.push(m));

    tournament.rounds.push({
      number: tournament.currentRound + 1,
      name: `Swiss Round ${tournament.currentRound + 1}`,
      matches: matches.map(m => m.id),
    });
  }

  /**
   * Generate Battle Royale rounds
   */
  generateBattleRoyaleRounds(tournament) {
    const players = tournament.participants;
    const playersPerMatch = tournament.settings.playersPerMatch || 10;
    const numRounds = Math.ceil(Math.log(players.length) / Math.log(playersPerMatch));

    tournament.rounds = [];
    tournament.matches = [];
    let matchId = 0;

    // First round - split into groups
    const firstRoundMatches = [];
    const numMatches = Math.ceil(players.length / playersPerMatch);

    for (let i = 0; i < numMatches; i++) {
      const matchPlayers = players.slice(i * playersPerMatch, (i + 1) * playersPerMatch);

      const match = {
        id: `match_${matchId++}`,
        round: 1,
        position: i,
        players: matchPlayers.map(p => ({
          id: p.id,
          name: p.name,
          placement: null,
          eliminated: false,
        })),
        placements: [],
        qualifyCount: Math.ceil(matchPlayers.length / 2), // Top half qualifies
        status: MATCH_STATUS.PENDING,
        isBattleRoyale: true,
      };

      firstRoundMatches.push(match);
      tournament.matches.push(match);
    }

    tournament.rounds.push({
      number: 1,
      name: 'Qualifying Round',
      matches: firstRoundMatches.map(m => m.id),
    });

    // Subsequent rounds will be generated as players qualify
  }

  /**
   * Propagate bye winners to next rounds
   */
  propagateByes(tournament) {
    for (const match of tournament.matches) {
      if (match.status === MATCH_STATUS.BYE && match.winner && match.nextMatchId) {
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

          // Check if next match is ready
          if (nextMatch.player1 && nextMatch.player2) {
            nextMatch.status = MATCH_STATUS.READY;
          }
        }
      }
    }
  }

  /**
   * Report match result
   */
  reportMatchResult(tournamentId, matchId, result) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    // Update match
    match.winner = result.winnerId;
    match.loser = result.loserId;
    match.score1 = result.score1;
    match.score2 = result.score2;
    match.status = MATCH_STATUS.COMPLETED;
    match.completedTime = Date.now();

    // Update player stats
    const winner = tournament.participants.find(p => p.id === result.winnerId);
    const loser = tournament.participants.find(p => p.id === result.loserId);

    if (winner) {
      winner.stats.wins++;
      winner.stats.tags += result.winnerTags || 0;
    }

    if (loser) {
      loser.stats.losses++;
      loser.eliminated = tournament.type === TOURNAMENT_TYPES.SINGLE_ELIMINATION;
      loser.stats.tags += result.loserTags || 0;
    }

    // Advance winner to next match
    if (match.nextMatchId) {
      const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        if (!nextMatch.player1) {
          nextMatch.player1 = result.winnerId;
          nextMatch.player1Name = winner?.name || 'TBD';
        } else if (!nextMatch.player2) {
          nextMatch.player2 = result.winnerId;
          nextMatch.player2Name = winner?.name || 'TBD';
        }

        // Check if next match is ready
        if (nextMatch.player1 && nextMatch.player2) {
          nextMatch.status = MATCH_STATUS.READY;
          this.emit('match_ready', { tournament, match: nextMatch });
        }
      }
    }

    this.emit('match_completed', { tournament, match, winner, loser });

    // Check if tournament is complete
    this.checkTournamentCompletion(tournament);

    return { success: true, match };
  }

  /**
   * Report Battle Royale match result
   */
  reportBattleRoyaleResult(tournamentId, matchId, placements) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match || !match.isBattleRoyale) return { success: false, error: 'Match not found' };

    match.placements = placements;
    match.status = MATCH_STATUS.COMPLETED;
    match.completedTime = Date.now();

    // Update player stats and mark qualifiers
    const qualifiers = [];
    placements.forEach((placement, index) => {
      const player = tournament.participants.find(p => p.id === placement.playerId);
      if (player) {
        if (index < match.qualifyCount) {
          qualifiers.push(player);
        } else {
          player.eliminated = true;
          player.placement = tournament.participants.length - index;
        }
      }
    });

    this.emit('match_completed', { tournament, match, qualifiers });
    this.checkTournamentCompletion(tournament);

    return { success: true, qualifiers };
  }

  /**
   * Check if tournament is complete
   */
  checkTournamentCompletion(tournament) {
    const allMatches = tournament.matches;
    const pendingMatches = allMatches.filter(m =>
      m.status === MATCH_STATUS.PENDING || m.status === MATCH_STATUS.READY
    );

    if (pendingMatches.length === 0) {
      this.completeTournament(tournament);
    } else {
      // Check if current round is complete
      const currentRound = tournament.rounds[tournament.currentRound - 1];
      if (currentRound) {
        const roundMatches = currentRound.matches.map(id =>
          tournament.matches.find(m => m.id === id)
        );
        const roundComplete = roundMatches.every(m =>
          m.status === MATCH_STATUS.COMPLETED || m.status === MATCH_STATUS.BYE
        );

        if (roundComplete && tournament.currentRound < tournament.rounds.length) {
          tournament.currentRound++;
          this.emit('round_complete', { tournament, roundNumber: tournament.currentRound - 1 });
        }
      }
    }
  }

  /**
   * Complete tournament and distribute prizes
   */
  completeTournament(tournament) {
    tournament.status = TOURNAMENT_STATUS.COMPLETED;
    tournament.endTime = Date.now();

    // Determine final placements
    const standings = this.getFinalStandings(tournament);

    // Calculate prizes
    const prizes = this.calculatePrizes(tournament, standings);

    this.emit('tournament_completed', {
      tournament,
      standings,
      prizes,
    });

    return { standings, prizes };
  }

  /**
   * Get final standings
   */
  getFinalStandings(tournament) {
    const standings = [...tournament.participants];

    switch (tournament.type) {
      case TOURNAMENT_TYPES.SINGLE_ELIMINATION:
      case TOURNAMENT_TYPES.DOUBLE_ELIMINATION:
        // Order by elimination round (later = better)
        return standings.sort((a, b) => {
          if (!a.eliminated && b.eliminated) return -1;
          if (a.eliminated && !b.eliminated) return 1;
          return b.stats.wins - a.stats.wins;
        });

      case TOURNAMENT_TYPES.ROUND_ROBIN:
      case TOURNAMENT_TYPES.SWISS:
        // Order by points
        return standings.sort((a, b) => {
          const pointsA = a.stats.wins * 3;
          const pointsB = b.stats.wins * 3;
          if (pointsA !== pointsB) return pointsB - pointsA;
          return b.stats.tags - a.stats.tags; // Tiebreaker
        });

      case TOURNAMENT_TYPES.BATTLE_ROYALE:
        // Order by placement
        return standings.sort((a, b) => (a.placement || 999) - (b.placement || 999));

      default:
        return standings;
    }
  }

  /**
   * Calculate prize distribution
   */
  calculatePrizes(tournament, standings) {
    const prizes = [];
    const totalPool = tournament.prizePool;

    tournament.prizeDistribution.forEach(dist => {
      const player = standings[dist.place - 1];
      if (player) {
        prizes.push({
          place: dist.place,
          playerId: player.id,
          playerName: player.name,
          amount: Math.floor(totalPool * dist.percentage / 100),
          type: tournament.entryFeeType,
        });
      }
    });

    // Add special prizes
    tournament.specialPrizes.forEach(special => {
      const winner = this.determineSpecialPrizeWinner(tournament, standings, special);
      if (winner) {
        prizes.push({
          type: 'special',
          name: special.name,
          playerId: winner.id,
          playerName: winner.name,
          reward: special.reward,
        });
      }
    });

    return prizes;
  }

  /**
   * Determine special prize winner
   */
  determineSpecialPrizeWinner(tournament, standings, special) {
    switch (special.criteria) {
      case 'most_tags':
        return standings.reduce((max, p) =>
          p.stats.tags > (max?.stats.tags || 0) ? p : max, null);
      case 'longest_survival':
        return standings.reduce((max, p) =>
          p.stats.survivalTime > (max?.stats.survivalTime || 0) ? p : max, null);
      case 'underdog': // Lowest seed to reach semis or better
        return standings.filter(p => !p.eliminated || p.stats.wins >= 2)
          .reduce((max, p) => (p.seed > (max?.seed || 0)) ? p : max, null);
      default:
        return null;
    }
  }

  /**
   * Get tournament by ID
   */
  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId);
  }

  /**
   * Get all active tournaments
   */
  getActiveTournaments() {
    return Array.from(this.tournaments.values())
      .filter(t => [TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.IN_PROGRESS].includes(t.status));
  }

  /**
   * Get player's tournaments
   */
  getPlayerTournaments(playerId) {
    const tournamentIds = this.playerTournaments.get(playerId) || new Set();
    return Array.from(tournamentIds)
      .map(id => this.tournaments.get(id))
      .filter(Boolean);
  }

  /**
   * Get upcoming matches for a player
   */
  getPlayerMatches(tournamentId, playerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return [];

    return tournament.matches.filter(m =>
      (m.player1 === playerId || m.player2 === playerId) &&
      m.status !== MATCH_STATUS.COMPLETED
    );
  }

  // Event emitter
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }
}

export const tournamentService = new TournamentService();
export default tournamentService;

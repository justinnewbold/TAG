/**
 * TAG! AI Service
 * Provides AI-powered features using Claude/OpenAI
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fallback to basic generation if no API key
const hasAI = !!process.env.ANTHROPIC_API_KEY;

/**
 * Generate a fun, engaging game recap
 */
export async function generateGameRecap(gameData) {
  const {
    duration,
    gameMode,
    players,
    tags,
    winner,
    mvp,
    totalDistance,
    closeCalls,
  } = gameData;

  // Build context
  const context = `
Game Mode: ${gameMode}
Duration: ${Math.round(duration / 60000)} minutes
Players: ${players.map(p => `${p.name} (${p.tagCount || 0} tags)`).join(', ')}
Total Tags: ${tags?.length || 0}
Winner: ${winner?.name || 'None'}
MVP: ${mvp?.name || 'None'}
Close Calls: ${closeCalls || 0}
Total Distance Run: ${totalDistance ? (totalDistance / 1000).toFixed(1) + 'km' : 'Unknown'}
  `.trim();

  if (!hasAI) {
    return generateBasicRecap(gameData);
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are an enthusiastic sports commentator for a real-world GPS tag game called TAG!

Generate a fun, energetic 2-3 sentence game recap based on this data:
${context}

Be playful, use emojis, highlight exciting moments. Keep it brief but exciting!
Examples of tone: "What a GAME! 🔥" or "Nobody saw that coming! 😱"

Respond with just the recap, no preamble.`
      }],
    });

    return message.content[0].text;
  } catch (error) {
    console.error('AI recap generation failed:', error);
    return generateBasicRecap(gameData);
  }
}

/**
 * Basic recap without AI
 */
function generateBasicRecap(gameData) {
  const duration = Math.round((gameData.duration || 0) / 60000);
  const totalTags = gameData.tags?.length || 0;
  const winner = gameData.winner?.name || 'Everyone';
  
  const exclamations = ['What a game! 🔥', 'Epic match! 🏃', 'Incredible! ⚡', 'That was intense! 💪'];
  const exclaim = exclamations[Math.floor(Math.random() * exclamations.length)];
  
  return `${exclaim} ${duration} minutes of action with ${totalTags} tags! ${winner} takes the victory! 🏆`;
}

/**
 * Generate contextual trash talk / quick chat messages
 */
export async function generateTrashTalk(context) {
  const {
    playerRole,      // 'it' or 'runner'
    gameState,       // 'winning', 'losing', 'close', 'just_tagged', 'just_escaped'
    nearbyPlayers,   // number of players nearby
    timeAsIt,        // how long they've been IT
    streak,          // current tag streak
  } = context;

  // Pre-built options for instant response (no API needed)
  const options = getTrashTalkOptions(context);
  
  if (!hasAI) {
    return {
      messages: options.slice(0, 5),
      generated: false
    };
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You're generating fun, safe trash talk for a GPS tag game.

Context:
- Player is: ${playerRole === 'it' ? 'IT (the chaser)' : 'a Runner (being chased)'}
- Game state: ${gameState}
- Nearby players: ${nearbyPlayers || 0}
${timeAsIt ? `- Been IT for: ${Math.round(timeAsIt / 1000)}s` : ''}
${streak ? `- Current streak: ${streak} tags` : ''}

Generate 5 short, playful trash talk messages (max 50 chars each).
Keep it fun and family-friendly. Use emojis!
Format: one message per line, no numbers or bullets.`
      }],
    });

    const aiMessages = message.content[0].text
      .split('\n')
      .map(m => m.trim())
      .filter(m => m && m.length <= 60);

    return {
      messages: [...aiMessages.slice(0, 3), ...options.slice(0, 2)],
      generated: true
    };
  } catch (error) {
    console.error('AI trash talk generation failed:', error);
    return {
      messages: options.slice(0, 5),
      generated: false
    };
  }
}

/**
 * Pre-built trash talk options
 */
function getTrashTalkOptions(context) {
  const { playerRole, gameState } = context;
  
  if (playerRole === 'it') {
    const itMessages = {
      default: [
        "I'm coming for you! 👀",
        "You can run but you can't hide! 🏃",
        "Tag time! ⚡",
        "Ready or not! 😈",
        "No escape! 🎯",
      ],
      winning: [
        "Too easy! 💪",
        "Who's next? 👀",
        "Can't stop won't stop! 🔥",
        "I'm on fire! 🔥🔥",
        "Unstoppable! ⚡",
      ],
      close: [
        "So close! 😤",
        "I almost had you! 👀",
        "Next time! 🎯",
        "You got lucky! 🍀",
        "That was TOO close! 😅",
      ],
      just_tagged: [
        "GOTCHA! 🎯",
        "TAG! You're it! ✋",
        "Too slow! 😎",
        "Caught you! 🏆",
        "BOOM! Tagged! 💥",
      ],
    };
    return itMessages[gameState] || itMessages.default;
  } else {
    const runnerMessages = {
      default: [
        "Can't catch me! 😎",
        "Too fast for you! 🏃💨",
        "Come and get me! 👋",
        "I'm over here! 📍",
        "Catch me if you can! 😏",
      ],
      winning: [
        "Is that all you got? 😂",
        "I could do this all day! 💪",
        "You'll never catch me! 🦸",
        "Living rent free! 🏠",
        "Survival expert! 🎖️",
      ],
      close: [
        "Phew! That was close! 😅",
        "Nice try! 😏",
        "Gotta be faster! 🏃",
        "Almost! 😂",
        "Not today! ✋",
      ],
      just_escaped: [
        "ESCAPED! 🏃💨",
        "See ya! 👋",
        "Too quick! ⚡",
        "Later! 😎",
        "Bye bye! 👋😂",
      ],
    };
    return runnerMessages[gameState] || runnerMessages.default;
  }
}

/**
 * Analyze movement for anti-cheat detection
 */
export function analyzeMovement(locationHistory) {
  if (!locationHistory || locationHistory.length < 2) {
    return { valid: true, warnings: [] };
  }

  const warnings = [];
  const HUMAN_MAX_SPEED = 12; // m/s (~43 km/h, Olympic sprinter max)
  const TELEPORT_THRESHOLD = 100; // meters
  const MIN_TIME_BETWEEN = 500; // ms

  let suspiciousCount = 0;
  let maxSpeed = 0;

  for (let i = 1; i < locationHistory.length; i++) {
    const prev = locationHistory[i - 1];
    const curr = locationHistory[i];
    
    const timeDiff = curr.timestamp - prev.timestamp;
    if (timeDiff < MIN_TIME_BETWEEN) continue;

    const distance = calculateDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude
    );
    
    const speed = distance / (timeDiff / 1000); // m/s

    if (speed > maxSpeed) maxSpeed = speed;

    // Check for teleportation
    if (distance > TELEPORT_THRESHOLD && timeDiff < 5000) {
      suspiciousCount++;
      warnings.push({
        type: 'teleport',
        severity: 'high',
        message: `Moved ${Math.round(distance)}m in ${(timeDiff/1000).toFixed(1)}s`,
        timestamp: curr.timestamp,
      });
    }
    // Check for impossible speed
    else if (speed > HUMAN_MAX_SPEED) {
      suspiciousCount++;
      warnings.push({
        type: 'speed',
        severity: speed > HUMAN_MAX_SPEED * 2 ? 'high' : 'medium',
        message: `Speed: ${(speed * 3.6).toFixed(1)} km/h`,
        timestamp: curr.timestamp,
      });
    }
  }

  // Determine validity
  const highSeverityCount = warnings.filter(w => w.severity === 'high').length;
  const valid = highSeverityCount < 3 && suspiciousCount < 5;

  return {
    valid,
    suspiciousCount,
    maxSpeed: maxSpeed * 3.6, // km/h
    warnings: warnings.slice(-10), // Last 10 warnings
    recommendation: !valid ? 'flag_for_review' : 
                    suspiciousCount > 2 ? 'monitor' : 'clean',
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Generate real-time commentary for game events
 */
export async function generateCommentary(event) {
  const { type, data } = event;

  // Quick commentary without AI for real-time performance
  const quickComments = {
    'tag': [
      `🎯 TAG! ${data.tagger} got ${data.tagged}!`,
      `💥 BOOM! ${data.tagged} is now IT!`,
      `⚡ What a tag by ${data.tagger}!`,
    ],
    'close_call': [
      `😱 SO CLOSE! ${data.runner} escaped by just ${data.distance}m!`,
      `👀 That was INCHES! ${data.it} almost had them!`,
      `🏃 Narrow escape for ${data.runner}!`,
    ],
    'power_up': [
      `✨ ${data.player} grabbed ${data.powerUp}!`,
      `🎁 Power-up acquired! ${data.player} gets ${data.powerUp}!`,
    ],
    'streak': [
      `🔥 ${data.player} is ON FIRE! ${data.count} tags in a row!`,
      `💪 Unstoppable! ${data.player} with ${data.count} consecutive tags!`,
    ],
    'long_it': [
      `⏰ ${data.player} has been IT for ${data.minutes} minutes!`,
      `😅 Someone help ${data.player}! They've been IT forever!`,
    ],
  };

  const options = quickComments[type] || [`🎮 ${type}: ${JSON.stringify(data)}`];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Calculate player skill rating for matchmaking
 */
export function calculateSkillRating(playerStats) {
  const {
    gamesPlayed = 0,
    wins = 0,
    totalTags = 0,
    timesTagged = 0,
    avgSurvivalTime = 0,
    avgTagTime = 0,
  } = playerStats;

  if (gamesPlayed < 3) {
    return { rating: 1000, confidence: 'low', tier: 'unranked' };
  }

  // Base rating
  let rating = 1000;

  // Win rate factor (up to +300)
  const winRate = wins / gamesPlayed;
  rating += winRate * 300;

  // Tag efficiency (up to +200)
  const tagRatio = totalTags / Math.max(timesTagged, 1);
  rating += Math.min(tagRatio * 50, 200);

  // Survival skill (up to +200)
  if (avgSurvivalTime > 0) {
    rating += Math.min(avgSurvivalTime / 60, 200); // 1 point per second survived, max 200
  }

  // IT efficiency (up to +100)
  if (avgTagTime > 0 && avgTagTime < 120) {
    rating += (120 - avgTagTime); // Faster tags = higher rating
  }

  // Experience factor
  const expBonus = Math.min(gamesPlayed * 2, 100);
  rating += expBonus;

  // Determine tier
  const tier = 
    rating >= 1800 ? 'legend' :
    rating >= 1500 ? 'diamond' :
    rating >= 1300 ? 'gold' :
    rating >= 1100 ? 'silver' :
    'bronze';

  return {
    rating: Math.round(rating),
    confidence: gamesPlayed >= 10 ? 'high' : gamesPlayed >= 5 ? 'medium' : 'low',
    tier,
    breakdown: {
      base: 1000,
      winRate: Math.round(winRate * 300),
      tagEfficiency: Math.round(Math.min(tagRatio * 50, 200)),
      survival: Math.round(Math.min(avgSurvivalTime / 60, 200)),
      itSkill: avgTagTime > 0 ? Math.round(Math.max(120 - avgTagTime, 0)) : 0,
      experience: expBonus,
    }
  };
}

/**
 * Generate personalized strategy tips
 */
export async function generateStrategyTips(playerStats, recentGames) {
  const tips = [];
  
  const { 
    avgSurvivalTime = 0, 
    avgTagTime = 0,
    totalTags = 0,
    timesTagged = 0,
    gamesPlayed = 0,
  } = playerStats;

  // Analyze weaknesses and generate tips
  if (avgSurvivalTime < 60 && timesTagged > totalTags) {
    tips.push({
      category: 'survival',
      tip: "Try zigzagging more! Running in straight lines makes you predictable.",
      priority: 'high',
    });
  }

  if (avgTagTime > 120) {
    tips.push({
      category: 'chasing',
      tip: "As IT, try cutting off escape routes instead of chasing directly.",
      priority: 'high',
    });
  }

  if (totalTags / Math.max(gamesPlayed, 1) < 1) {
    tips.push({
      category: 'tagging',
      tip: "Focus on players who seem distracted or are near boundaries.",
      priority: 'medium',
    });
  }

  // Add general tips
  tips.push({
    category: 'general',
    tip: "Use power-ups strategically - save Speed Boost for emergencies!",
    priority: 'low',
  });

  tips.push({
    category: 'general', 
    tip: "Stay aware of safe zones - they can save you in clutch moments!",
    priority: 'low',
  });

  return tips.slice(0, 3); // Return top 3 tips
}

export default {
  generateGameRecap,
  generateTrashTalk,
  analyzeMovement,
  generateCommentary,
  calculateSkillRating,
  generateStrategyTips,
};

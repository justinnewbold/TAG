// Friends Database - Add to server/db/friends.js
import { db } from './index.js';

const usePostgres = !!process.env.DATABASE_URL;

// Initialize friends schema
export async function initFriendsSchema() {
  if (usePostgres) {
    await db.query(`
      -- Friend codes table
      CREATE TABLE IF NOT EXISTS friend_codes (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code TEXT UNIQUE NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);
      
      -- Friend requests table
      CREATE TABLE IF NOT EXISTS friend_requests (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        responded_at BIGINT,
        UNIQUE(from_user_id, to_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
      
      -- Friendships table (bidirectional)
      CREATE TABLE IF NOT EXISTS friendships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, friend_id)
      );
      CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
      
      -- User online status
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen BIGINT NOT NULL,
        current_game_id TEXT
      );
    `);
    console.log('Friends schema initialized');
  }
}

export const friendsDb = {
  // Friend Codes
  async getFriendCode(userId) {
    if (usePostgres) {
      const result = await db.query('SELECT code FROM friend_codes WHERE user_id = $1', [userId]);
      return result.rows[0]?.code || null;
    }
    return null;
  },
  
  async setFriendCode(userId, code) {
    const now = Date.now();
    if (usePostgres) {
      await db.query(`
        INSERT INTO friend_codes (user_id, code, created_at, updated_at)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (user_id) DO UPDATE SET code = $2, updated_at = $3
      `, [userId, code, now]);
    }
  },
  
  async getUserByFriendCode(code) {
    if (usePostgres) {
      const result = await db.query('SELECT user_id FROM friend_codes WHERE code = $1', [code]);
      return result.rows[0]?.user_id || null;
    }
    return null;
  },
  
  // Friend Requests
  async createRequest(fromUserId, toUserId) {
    const id = `fr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    if (usePostgres) {
      await db.query(`
        INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at)
        VALUES ($1, $2, $3, 'pending', $4)
      `, [id, fromUserId, toUserId, now]);
    }
    
    return id;
  },
  
  async getRequest(requestId) {
    if (usePostgres) {
      const result = await db.query('SELECT * FROM friend_requests WHERE id = $1', [requestId]);
      return result.rows[0] || null;
    }
    return null;
  },
  
  async getPendingRequest(fromUserId, toUserId) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM friend_requests 
        WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
      `, [fromUserId, toUserId]);
      return result.rows[0] || null;
    }
    return null;
  },
  
  async getIncomingRequests(userId) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT fr.*, u.name as from_name, u.avatar as from_avatar
        FROM friend_requests fr
        JOIN users u ON fr.from_user_id = u.id
        WHERE fr.to_user_id = $1 AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `, [userId]);
      return result.rows.map(r => ({
        id: r.id,
        fromUser: { id: r.from_user_id, name: r.from_name, avatar: r.from_avatar },
        createdAt: parseInt(r.created_at)
      }));
    }
    return [];
  },
  
  async getOutgoingRequests(userId) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT fr.*, u.name as to_name, u.avatar as to_avatar
        FROM friend_requests fr
        JOIN users u ON fr.to_user_id = u.id
        WHERE fr.from_user_id = $1 AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `, [userId]);
      return result.rows.map(r => ({
        id: r.id,
        toUser: { id: r.to_user_id, name: r.to_name, avatar: r.to_avatar },
        createdAt: parseInt(r.created_at)
      }));
    }
    return [];
  },
  
  async acceptRequest(requestId) {
    const now = Date.now();
    
    if (usePostgres) {
      // Get the request
      const request = await this.getRequest(requestId);
      if (!request) return;
      
      // Update request status
      await db.query(`
        UPDATE friend_requests SET status = 'accepted', responded_at = $1 WHERE id = $2
      `, [now, requestId]);
      
      // Create bidirectional friendship
      await db.query(`
        INSERT INTO friendships (user_id, friend_id, created_at)
        VALUES ($1, $2, $3), ($2, $1, $3)
        ON CONFLICT DO NOTHING
      `, [request.from_user_id, request.to_user_id, now]);
    }
  },
  
  async deleteRequest(requestId) {
    if (usePostgres) {
      await db.query('DELETE FROM friend_requests WHERE id = $1', [requestId]);
    }
  },
  
  // Friendships
  async areFriends(userId1, userId2) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2
      `, [userId1, userId2]);
      return result.rows.length > 0;
    }
    return false;
  },
  
  async getFriends(userId) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT u.id, u.name, u.avatar, f.created_at as friends_since,
               p.is_online, p.last_seen, p.current_game_id
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        LEFT JOIN user_presence p ON u.id = p.user_id
        WHERE f.user_id = $1
        ORDER BY p.is_online DESC, u.name ASC
      `, [userId]);
      
      return result.rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        friendsSince: parseInt(r.friends_since),
        isOnline: r.is_online || false,
        lastSeen: r.last_seen ? parseInt(r.last_seen) : null,
        inGame: !!r.current_game_id
      }));
    }
    return [];
  },
  
  async removeFriend(userId, friendId) {
    if (usePostgres) {
      await db.query(`
        DELETE FROM friendships WHERE 
        (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `, [userId, friendId]);
    }
  },
  
  async getFriendsWithOnlineStatus(userId) {
    return this.getFriends(userId);
  },
  
  // User Presence
  async updatePresence(userId, isOnline, gameId = null) {
    const now = Date.now();
    if (usePostgres) {
      await db.query(`
        INSERT INTO user_presence (user_id, is_online, last_seen, current_game_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET 
          is_online = $2, last_seen = $3, current_game_id = $4
      `, [userId, isOnline, now, gameId]);
    }
  },
  
  // Search and Recent Players
  async searchUsers(query, excludeUserId) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT id, name, avatar FROM users 
        WHERE LOWER(name) LIKE $1 AND id != $2
        LIMIT 20
      `, [`%${query.toLowerCase()}%`, excludeUserId]);
      return result.rows;
    }
    return [];
  },
  
  async getRecentPlayers(userId, limit = 20) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT DISTINCT u.id, u.name, u.avatar, MAX(gp2.joined_at) as last_played
        FROM game_players gp1
        JOIN game_players gp2 ON gp1.game_id = gp2.game_id AND gp1.user_id != gp2.user_id
        JOIN users u ON gp2.user_id = u.id
        WHERE gp1.user_id = $1 AND gp2.user_id != $1
        GROUP BY u.id, u.name, u.avatar
        ORDER BY last_played DESC
        LIMIT $2
      `, [userId, limit]);
      
      return result.rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        lastPlayed: parseInt(r.last_played)
      }));
    }
    return [];
  }
};

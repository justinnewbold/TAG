// Authentication database operations
// Handles verification codes, refresh tokens, and extended user auth fields

import { db, userDb } from './index.js';
import { v4 as uuidv4 } from 'uuid';

const usePostgres = !!process.env.DATABASE_URL;

// Initialize auth tables (run on import)
async function initAuthTables() {
  if (usePostgres) {
    await db.query(`
      -- Add auth columns to users table if not exists
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'anonymous';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        -- Role column for RBAC (user, moderator, admin)
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
      EXCEPTION WHEN others THEN NULL;
      END $$;

      -- Create unique indexes if not exists
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id_unique ON users(apple_id) WHERE apple_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_id_unique ON users(supabase_id) WHERE supabase_id IS NOT NULL;

      -- Verification codes table
      CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        code TEXT NOT NULL,
        target TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );

      -- Refresh tokens table
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        last_used_at BIGINT
      );

      CREATE INDEX IF NOT EXISTS idx_verification_codes_target ON verification_codes(target);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);
  } else {
    // SQLite
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        code TEXT NOT NULL,
        target TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_verification_codes_target ON verification_codes(target);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);

    // Add columns if they don't exist (SQLite doesn't have IF NOT EXISTS for columns)
    const columns = ['email', 'email_verified', 'phone', 'phone_verified', 'password_hash', 'google_id', 'apple_id', 'supabase_id', 'auth_provider', 'avatar_url', 'role'];
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const existingColumns = tableInfo.map(c => c.name);

    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        try {
          const type = col.includes('verified') ? 'INTEGER DEFAULT 0' :
                       col === 'role' ? "TEXT DEFAULT 'user'" : 'TEXT';
          db.exec(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
        } catch (e) {
          // Column might already exist
        }
      }
    }
  }
  console.log('Auth tables initialized');
}

// Run initialization
await initAuthTables();

// Auth database operations
export const authDb = {
  // Verification codes
  async createVerificationCode(userId, type, code, target, expiresInMinutes = 10) {
    const id = uuidv4();
    const now = Date.now();
    const expiresAt = now + (expiresInMinutes * 60 * 1000);

    if (usePostgres) {
      await db.query(`
        INSERT INTO verification_codes (id, user_id, type, code, target, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, userId, type, code, target, expiresAt, now]);
    } else {
      db.prepare(`
        INSERT INTO verification_codes (id, user_id, type, code, target, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, type, code, target, expiresAt, now);
    }

    return { id, code, expiresAt };
  },

  async verifyCode(target, code, type) {
    let row;
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM verification_codes
        WHERE target = $1 AND code = $2 AND type = $3 AND used = FALSE AND expires_at > $4
        ORDER BY created_at DESC LIMIT 1
      `, [target, code, type, Date.now()]);
      row = result.rows[0];
      if (row) {
        await db.query(`UPDATE verification_codes SET used = TRUE WHERE id = $1`, [row.id]);
      }
    } else {
      row = db.prepare(`
        SELECT * FROM verification_codes
        WHERE target = ? AND code = ? AND type = ? AND used = 0 AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(target, code, type, Date.now());
      if (row) {
        db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(row.id);
      }
    }
    return row;
  },

  // Refresh tokens
  async createRefreshToken(userId, tokenHash, deviceInfo, ipAddress) {
    const id = uuidv4();
    const now = Date.now();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    if (usePostgres) {
      await db.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, userId, tokenHash, deviceInfo, ipAddress, expiresAt, now]);
    } else {
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, tokenHash, deviceInfo, ipAddress, expiresAt, now);
    }

    return { id, expiresAt };
  },

  async getRefreshToken(tokenHash) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > $2
      `, [tokenHash, Date.now()]);
      return result.rows[0];
    } else {
      return db.prepare(`
        SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?
      `).get(tokenHash, Date.now());
    }
  },

  async updateRefreshTokenUsage(tokenId) {
    const now = Date.now();
    if (usePostgres) {
      await db.query(`UPDATE refresh_tokens SET last_used_at = $1 WHERE id = $2`, [now, tokenId]);
    } else {
      db.prepare(`UPDATE refresh_tokens SET last_used_at = ? WHERE id = ?`).run(now, tokenId);
    }
  },

  async revokeRefreshToken(tokenHash) {
    if (usePostgres) {
      await db.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
    } else {
      db.prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(tokenHash);
    }
  },

  async revokeAllUserTokens(userId) {
    if (usePostgres) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    } else {
      db.prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`).run(userId);
    }
  },

  // User auth operations
  async emailExists(email) {
    if (usePostgres) {
      const result = await db.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
      return result.rows.length > 0;
    } else {
      const row = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
      return !!row;
    }
  },

  async phoneExists(phone) {
    if (usePostgres) {
      const result = await db.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
      return result.rows.length > 0;
    } else {
      const row = db.prepare(`SELECT id FROM users WHERE phone = ?`).get(phone);
      return !!row;
    }
  },

  async getUserByEmail(email) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
      return result.rows[0];
    } else {
      return db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
    }
  },

  async getUserByPhone(phone) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE phone = $1`, [phone]);
      return result.rows[0];
    } else {
      return db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
    }
  },

  async getUserByGoogleId(googleId) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE google_id = $1`, [googleId]);
      return result.rows[0];
    } else {
      return db.prepare(`SELECT * FROM users WHERE google_id = ?`).get(googleId);
    }
  },

  async getUserByAppleId(appleId) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE apple_id = $1`, [appleId]);
      return result.rows[0];
    } else {
      return db.prepare(`SELECT * FROM users WHERE apple_id = ?`).get(appleId);
    }
  },

  async getUserBySupabaseId(supabaseId) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE supabase_id = $1`, [supabaseId]);
      return result.rows[0];
    } else {
      return db.prepare(`SELECT * FROM users WHERE supabase_id = ?`).get(supabaseId);
    }
  },

  async updateUserAuth(userId, updates) {
    const now = Date.now();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updates.email !== undefined) {
      fields.push(usePostgres ? `email = $${paramIndex++}` : 'email = ?');
      values.push(updates.email);
    }
    if (updates.emailVerified !== undefined) {
      fields.push(usePostgres ? `email_verified = $${paramIndex++}` : 'email_verified = ?');
      values.push(usePostgres ? updates.emailVerified : (updates.emailVerified ? 1 : 0));
    }
    if (updates.phone !== undefined) {
      fields.push(usePostgres ? `phone = $${paramIndex++}` : 'phone = ?');
      values.push(updates.phone);
    }
    if (updates.phoneVerified !== undefined) {
      fields.push(usePostgres ? `phone_verified = $${paramIndex++}` : 'phone_verified = ?');
      values.push(usePostgres ? updates.phoneVerified : (updates.phoneVerified ? 1 : 0));
    }
    if (updates.passwordHash !== undefined) {
      fields.push(usePostgres ? `password_hash = $${paramIndex++}` : 'password_hash = ?');
      values.push(updates.passwordHash);
    }
    if (updates.googleId !== undefined) {
      fields.push(usePostgres ? `google_id = $${paramIndex++}` : 'google_id = ?');
      values.push(updates.googleId);
    }
    if (updates.appleId !== undefined) {
      fields.push(usePostgres ? `apple_id = $${paramIndex++}` : 'apple_id = ?');
      values.push(updates.appleId);
    }
    if (updates.supabaseId !== undefined) {
      fields.push(usePostgres ? `supabase_id = $${paramIndex++}` : 'supabase_id = ?');
      values.push(updates.supabaseId);
    }
    if (updates.authProvider !== undefined) {
      fields.push(usePostgres ? `auth_provider = $${paramIndex++}` : 'auth_provider = ?');
      values.push(updates.authProvider);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(usePostgres ? `avatar_url = $${paramIndex++}` : 'avatar_url = ?');
      values.push(updates.avatarUrl);
    }
    if (updates.name !== undefined) {
      fields.push(usePostgres ? `name = $${paramIndex++}` : 'name = ?');
      values.push(updates.name);
    }
    if (updates.avatar !== undefined) {
      fields.push(usePostgres ? `avatar = $${paramIndex++}` : 'avatar = ?');
      values.push(updates.avatar);
    }

    fields.push(usePostgres ? `updated_at = $${paramIndex++}` : 'updated_at = ?');
    values.push(now);
    values.push(userId);

    if (fields.length === 1) return; // Only updated_at

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ${usePostgres ? `$${paramIndex}` : '?'}`;

    if (usePostgres) {
      await db.query(query, values);
    } else {
      db.prepare(query).run(...values);
    }

    return userDb.getById(userId);
  },

  async createUserWithAuth(userData) {
    const id = userData.id || uuidv4();
    const now = Date.now();

    if (usePostgres) {
      await db.query(`
        INSERT INTO users (id, name, avatar, avatar_url, email, email_verified, phone, phone_verified, password_hash, google_id, apple_id, supabase_id, auth_provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      `, [
        id,
        userData.name,
        userData.avatar || '😀',
        userData.avatarUrl || null,
        userData.email || null,
        userData.emailVerified || false,
        userData.phone || null,
        userData.phoneVerified || false,
        userData.passwordHash || null,
        userData.googleId || null,
        userData.appleId || null,
        userData.supabaseId || null,
        userData.authProvider || 'anonymous',
        now
      ]);
      await db.query(`INSERT INTO user_stats (user_id) VALUES ($1)`, [id]);
    } else {
      db.prepare(`
        INSERT INTO users (id, name, avatar, avatar_url, email, email_verified, phone, phone_verified, password_hash, google_id, apple_id, supabase_id, auth_provider, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userData.name,
        userData.avatar || '😀',
        userData.avatarUrl || null,
        userData.email || null,
        userData.emailVerified ? 1 : 0,
        userData.phone || null,
        userData.phoneVerified ? 1 : 0,
        userData.passwordHash || null,
        userData.googleId || null,
        userData.appleId || null,
        userData.supabaseId || null,
        userData.authProvider || 'anonymous',
        now,
        now
      );
      db.prepare(`INSERT INTO user_stats (user_id) VALUES (?)`).run(id);
    }

    return userDb.getById(id);
  },

  // ============ ROLE MANAGEMENT (RBAC) ============

  // Get user's role
  async getUserRole(userId) {
    if (usePostgres) {
      const result = await db.query(`SELECT role FROM users WHERE id = $1`, [userId]);
      return result.rows[0]?.role || 'user';
    } else {
      const row = db.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);
      return row?.role || 'user';
    }
  },

  // Set user's role (admin only operation)
  async setUserRole(userId, role) {
    const validRoles = ['user', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    if (usePostgres) {
      await db.query(`UPDATE users SET role = $1, updated_at = $2 WHERE id = $3`, [role, Date.now(), userId]);
    } else {
      db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).run(role, Date.now(), userId);
    }
  },

  // Check if user has required role (checks hierarchy: admin > moderator > user)
  async hasRole(userId, requiredRole) {
    const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
    const userRole = await this.getUserRole(userId);
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  },

  // Check if user is admin
  async isAdmin(userId) {
    return this.hasRole(userId, 'admin');
  },

  // Check if user is at least moderator
  async isModerator(userId) {
    return this.hasRole(userId, 'moderator');
  },

  // Get all admins (for system notifications, etc.)
  async getAdmins() {
    if (usePostgres) {
      const result = await db.query(`SELECT id, name, email FROM users WHERE role = 'admin'`);
      return result.rows;
    } else {
      return db.prepare(`SELECT id, name, email FROM users WHERE role = 'admin'`).all();
    }
  },

  // Get all users with roles (for admin panel)
  async getUsersWithRoles(limit = 100, offset = 0) {
    if (usePostgres) {
      const result = await db.query(`
        SELECT id, name, avatar, email, role, created_at
        FROM users
        ORDER BY
          CASE role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT id, name, avatar, email, role, created_at
        FROM users
        ORDER BY
          CASE role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }
  },
};

// Generate 6-digit verification code
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

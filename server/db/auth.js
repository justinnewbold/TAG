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
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'anonymous';
      EXCEPTION WHEN others THEN NULL;
      END $$;

      -- Create unique indexes if not exists
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id_unique ON users(apple_id) WHERE apple_id IS NOT NULL;

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
    const columns = ['email', 'email_verified', 'phone', 'phone_verified', 'password_hash', 'google_id', 'apple_id', 'auth_provider'];
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const existingColumns = tableInfo.map(c => c.name);

    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        try {
          const type = col.includes('verified') ? 'INTEGER DEFAULT 0' : 'TEXT';
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
    return row || null;
  },

  // Refresh tokens
  async createRefreshToken(userId, tokenHash, deviceInfo, ipAddress, expiresInDays = 30) {
    const id = uuidv4();
    const now = Date.now();
    const expiresAt = now + (expiresInDays * 24 * 60 * 60 * 1000);

    if (usePostgres) {
      await db.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, created_at, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      `, [id, userId, tokenHash, deviceInfo, ipAddress, expiresAt, now]);
    } else {
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, tokenHash, deviceInfo, ipAddress, expiresAt, now, now);
    }

    return { id, expiresAt };
  },

  async validateRefreshToken(userId, tokenHash) {
    let row;
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > $3
      `, [userId, tokenHash, Date.now()]);
      row = result.rows[0];
      if (row) {
        await db.query(`UPDATE refresh_tokens SET last_used_at = $1 WHERE id = $2`, [Date.now(), row.id]);
      }
    } else {
      row = db.prepare(`
        SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > ?
      `).get(userId, tokenHash, Date.now());
      if (row) {
        db.prepare(`UPDATE refresh_tokens SET last_used_at = ? WHERE id = ?`).run(Date.now(), row.id);
      }
    }
    return row || null;
  },

  async revokeRefreshToken(tokenId) {
    if (usePostgres) {
      await db.query(`DELETE FROM refresh_tokens WHERE id = $1`, [tokenId]);
    } else {
      db.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(tokenId);
    }
  },

  async revokeAllUserTokens(userId) {
    if (usePostgres) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    } else {
      db.prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`).run(userId);
    }
  },

  // Cleanup
  async cleanupExpired() {
    const now = Date.now();
    if (usePostgres) {
      await db.query(`DELETE FROM verification_codes WHERE expires_at < $1`, [now]);
      await db.query(`DELETE FROM refresh_tokens WHERE expires_at < $1`, [now]);
    } else {
      db.prepare(`DELETE FROM verification_codes WHERE expires_at < ?`).run(now);
      db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < ?`).run(now);
    }
  },

  // Extended user queries
  async getUserByEmail(email) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
      return result.rows[0] || null;
    } else {
      return db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email) || null;
    }
  },

  async getUserByPhone(phone) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE phone = $1`, [phone]);
      return result.rows[0] || null;
    } else {
      return db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone) || null;
    }
  },

  async getUserByGoogleId(googleId) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE google_id = $1`, [googleId]);
      return result.rows[0] || null;
    } else {
      return db.prepare(`SELECT * FROM users WHERE google_id = ?`).get(googleId) || null;
    }
  },

  async getUserByAppleId(appleId) {
    if (usePostgres) {
      const result = await db.query(`SELECT * FROM users WHERE apple_id = $1`, [appleId]);
      return result.rows[0] || null;
    } else {
      return db.prepare(`SELECT * FROM users WHERE apple_id = ?`).get(appleId) || null;
    }
  },

  async emailExists(email) {
    if (usePostgres) {
      const result = await db.query(`SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
      return result.rows.length > 0;
    } else {
      return !!db.prepare(`SELECT 1 FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
    }
  },

  async phoneExists(phone) {
    if (usePostgres) {
      const result = await db.query(`SELECT 1 FROM users WHERE phone = $1`, [phone]);
      return result.rows.length > 0;
    } else {
      return !!db.prepare(`SELECT 1 FROM users WHERE phone = ?`).get(phone);
    }
  },

  // Update user auth fields
  async updateUserAuth(userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.email !== undefined) { fields.push(usePostgres ? `email = $${idx++}` : 'email = ?'); values.push(updates.email); }
    if (updates.emailVerified !== undefined) { fields.push(usePostgres ? `email_verified = $${idx++}` : 'email_verified = ?'); values.push(usePostgres ? updates.emailVerified : (updates.emailVerified ? 1 : 0)); }
    if (updates.phone !== undefined) { fields.push(usePostgres ? `phone = $${idx++}` : 'phone = ?'); values.push(updates.phone); }
    if (updates.phoneVerified !== undefined) { fields.push(usePostgres ? `phone_verified = $${idx++}` : 'phone_verified = ?'); values.push(usePostgres ? updates.phoneVerified : (updates.phoneVerified ? 1 : 0)); }
    if (updates.passwordHash !== undefined) { fields.push(usePostgres ? `password_hash = $${idx++}` : 'password_hash = ?'); values.push(updates.passwordHash); }
    if (updates.googleId !== undefined) { fields.push(usePostgres ? `google_id = $${idx++}` : 'google_id = ?'); values.push(updates.googleId); }
    if (updates.appleId !== undefined) { fields.push(usePostgres ? `apple_id = $${idx++}` : 'apple_id = ?'); values.push(updates.appleId); }
    if (updates.authProvider !== undefined) { fields.push(usePostgres ? `auth_provider = $${idx++}` : 'auth_provider = ?'); values.push(updates.authProvider); }

    fields.push(usePostgres ? `updated_at = $${idx++}` : 'updated_at = ?');
    values.push(Date.now());
    values.push(userId);

    if (fields.length === 0) return;

    if (usePostgres) {
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    } else {
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return userDb.getById(userId);
  },

  // Create user with auth fields
  async createUserWithAuth(userData) {
    const id = userData.id || uuidv4();
    const now = Date.now();

    if (usePostgres) {
      await db.query(`
        INSERT INTO users (id, name, avatar, email, email_verified, phone, phone_verified, password_hash, google_id, apple_id, auth_provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      `, [
        id,
        userData.name,
        userData.avatar || '😀',
        userData.email || null,
        userData.emailVerified || false,
        userData.phone || null,
        userData.phoneVerified || false,
        userData.passwordHash || null,
        userData.googleId || null,
        userData.appleId || null,
        userData.authProvider || 'anonymous',
        now
      ]);
      await db.query(`INSERT INTO user_stats (user_id) VALUES ($1)`, [id]);
    } else {
      db.prepare(`
        INSERT INTO users (id, name, avatar, email, email_verified, phone, phone_verified, password_hash, google_id, apple_id, auth_provider, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userData.name,
        userData.avatar || '😀',
        userData.email || null,
        userData.emailVerified ? 1 : 0,
        userData.phone || null,
        userData.phoneVerified ? 1 : 0,
        userData.passwordHash || null,
        userData.googleId || null,
        userData.appleId || null,
        userData.authProvider || 'anonymous',
        now,
        now
      );
      db.prepare(`INSERT INTO user_stats (user_id) VALUES (?)`).run(id);
    }

    return userDb.getById(id);
  },
};

// Generate random verification code
export function generateVerificationCode(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

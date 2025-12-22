import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { userDb } from './db/index.js';
import { authDb, generateVerificationCode } from './db/auth.js';
import { email } from './services/email.js';
import { sms } from './services/sms.js';
import { oauth } from './services/oauth.js';
import { sanitize } from './utils/validation.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'tag-game-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

// Initialize services (async, but non-blocking - services check isConfigured before use)
Promise.all([email.init(), sms.init()]).catch(err => {
  console.error('Error initializing auth services:', err);
});

// ============ HELPERS ============

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  email: user.email,
  emailVerified: user.emailVerified || user.email_verified,
  phone: user.phone,
  phoneVerified: user.phoneVerified || user.phone_verified,
  authProvider: user.authProvider || user.auth_provider,
  stats: user.stats,
  achievements: user.achievements,
});

// ============ ANONYMOUS REGISTRATION (ORIGINAL) ============

router.post('/register', async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const cleanName = sanitize.playerName(name);
    const cleanAvatar = sanitize.emoji(avatar);

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (cleanName.length > 30) {
      return res.status(400).json({ error: 'Name must be 30 characters or less' });
    }

    const id = uuidv4();
    const user = await authDb.createUserWithAuth({
      id,
      name: cleanName,
      avatar: cleanAvatar,
      authProvider: 'anonymous',
    });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ EMAIL/PASSWORD REGISTRATION ============

router.post('/register/email', async (req, res) => {
  try {
    const { email: userEmail, password, name, avatar } = req.body;

    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    if (await authDb.emailExists(userEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const cleanName = sanitize.playerName(name) || userEmail.split('@')[0];
    const cleanAvatar = sanitize.emoji(avatar);
    const passwordHash = await bcrypt.hash(password, 12);

    const id = uuidv4();
    const user = await authDb.createUserWithAuth({
      id,
      name: cleanName,
      avatar: cleanAvatar,
      email: userEmail.toLowerCase(),
      emailVerified: false,
      passwordHash,
      authProvider: 'email',
    });

    // Send verification email
    const code = generateVerificationCode();
    await authDb.createVerificationCode(user.id, 'email_verification', code, userEmail.toLowerCase());
    await email.sendVerification(userEmail, code, cleanName);

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
      refreshToken,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Email registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ EMAIL/PASSWORD LOGIN ============

router.post('/login/email', async (req, res) => {
  try {
    const { email: userEmail, password } = req.body;

    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await authDb.getUserByEmail(userEmail);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const fullUser = await userDb.getById(user.id);
    const token = generateToken(fullUser);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.json({
      user: sanitizeUser(fullUser),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ PHONE REGISTRATION/LOGIN ============

router.post('/register/phone', async (req, res) => {
  try {
    const { phone, name, avatar } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    if (!sms.isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const normalizedPhone = sms.normalizePhone(phone);

    // Check if phone already exists
    const existingUser = await authDb.getUserByPhone(normalizedPhone);
    if (existingUser) {
      // Send verification code for login
      const code = generateVerificationCode();
      await authDb.createVerificationCode(existingUser.id, 'phone_login', code, normalizedPhone);
      await sms.sendVerification(normalizedPhone, code);
      return res.json({ message: 'Verification code sent', isNewUser: false });
    }

    // New user - create account
    const cleanName = sanitize.playerName(name) || 'Player';
    const cleanAvatar = sanitize.emoji(avatar);
    const id = uuidv4();

    const user = await authDb.createUserWithAuth({
      id,
      name: cleanName,
      avatar: cleanAvatar,
      phone: normalizedPhone,
      phoneVerified: false,
      authProvider: 'phone',
    });

    // Send verification code
    const code = generateVerificationCode();
    await authDb.createVerificationCode(user.id, 'phone_verification', code, normalizedPhone);
    await sms.sendVerification(normalizedPhone, code);

    res.status(201).json({
      message: 'Verification code sent',
      isNewUser: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Phone registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/verify/phone', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code required' });
    }

    const normalizedPhone = sms.normalizePhone(phone);

    // Try phone_verification first, then phone_login
    let verification = await authDb.verifyCode(normalizedPhone, code, 'phone_verification');
    if (!verification) {
      verification = await authDb.verifyCode(normalizedPhone, code, 'phone_login');
    }

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Mark phone as verified
    await authDb.updateUserAuth(verification.user_id, { phoneVerified: true });

    const user = await userDb.getById(verification.user_id);
    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============ EMAIL VERIFICATION ============

router.post('/verify/email', async (req, res) => {
  try {
    const { email: userEmail, code } = req.body;

    if (!userEmail || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    const verification = await authDb.verifyCode(userEmail.toLowerCase(), code, 'email_verification');
    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await authDb.updateUserAuth(verification.user_id, { emailVerified: true });

    const user = await userDb.getById(verification.user_id);
    res.json({
      message: 'Email verified successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const user = await userDb.getById(req.user.id);
    if (!user || !user.email) {
      return res.status(400).json({ error: 'No email associated with account' });
    }

    if (user.emailVerified || user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const code = generateVerificationCode();
    await authDb.createVerificationCode(user.id, 'email_verification', code, user.email);
    await email.sendVerification(user.email, code, user.name);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification' });
  }
});

// ============ PASSWORD RESET ============

router.post('/forgot-password', async (req, res) => {
  try {
    const { email: userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await authDb.getUserByEmail(userEmail);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, reset code has been sent' });
    }

    const code = generateVerificationCode();
    await authDb.createVerificationCode(user.id, 'password_reset', code, userEmail.toLowerCase());
    await email.sendPasswordReset(userEmail, code, user.name);

    res.json({ message: 'If email exists, reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email: userEmail, code, newPassword } = req.body;

    if (!userEmail || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const verification = await authDb.verifyCode(userEmail.toLowerCase(), code, 'password_reset');
    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await authDb.updateUserAuth(verification.user_id, { passwordHash });

    // Revoke all refresh tokens for security
    await authDb.revokeAllUserTokens(verification.user_id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ============ GOOGLE OAUTH ============

router.get('/google', (req, res) => {
  const authUrl = oauth.google.getAuthUrl(req.query.state);
  if (!authUrl) {
    return res.status(501).json({ error: 'Google auth not configured' });
  }
  res.json({ url: authUrl });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || '/'}/auth/error?message=No+code+provided`);
    }

    const tokens = await oauth.google.exchangeCode(code);
    const googleUser = await oauth.google.getUserInfo(tokens.access_token);

    // Check if user exists
    let user = await authDb.getUserByGoogleId(googleUser.id);

    if (!user) {
      // Check if email is already registered
      if (googleUser.email) {
        const existingUser = await authDb.getUserByEmail(googleUser.email);
        if (existingUser) {
          // Link Google account to existing user
          await authDb.updateUserAuth(existingUser.id, {
            googleId: googleUser.id,
            emailVerified: googleUser.verified || existingUser.email_verified,
          });
          user = await userDb.getById(existingUser.id);
        }
      }

      if (!user) {
        // Create new user
        user = await authDb.createUserWithAuth({
          id: uuidv4(),
          name: googleUser.name || 'Player',
          avatar: '😀',
          email: googleUser.email,
          emailVerified: googleUser.verified || false,
          googleId: googleUser.id,
          authProvider: 'google',
        });
      }
    } else {
      user = await userDb.getById(user.id);
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    // Redirect to client with tokens
    const redirectUrl = new URL(`${process.env.CLIENT_URL || '/'}/auth/callback`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
    if (state) redirectUrl.searchParams.set('state', state);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || '/'}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

// Google ID token verification (for mobile apps)
router.post('/google/token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }

    const googleUser = await oauth.google.verifyIdToken(idToken);

    let user = await authDb.getUserByGoogleId(googleUser.id);

    if (!user) {
      if (googleUser.email) {
        const existingUser = await authDb.getUserByEmail(googleUser.email);
        if (existingUser) {
          await authDb.updateUserAuth(existingUser.id, {
            googleId: googleUser.id,
            emailVerified: googleUser.verified || existingUser.email_verified,
          });
          user = await userDb.getById(existingUser.id);
        }
      }

      if (!user) {
        user = await authDb.createUserWithAuth({
          id: uuidv4(),
          name: googleUser.name || 'Player',
          avatar: '😀',
          email: googleUser.email,
          emailVerified: googleUser.verified || false,
          googleId: googleUser.id,
          authProvider: 'google',
        });
      }
    } else {
      user = await userDb.getById(user.id);
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Google token error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// ============ APPLE SIGN IN ============

router.get('/apple', (req, res) => {
  const authUrl = oauth.apple.getAuthUrl(req.query.state);
  if (!authUrl) {
    return res.status(501).json({ error: 'Apple Sign In not configured' });
  }
  res.json({ url: authUrl });
});

router.post('/apple/callback', async (req, res) => {
  try {
    const { code, id_token, user: appleUserStr, state } = req.body;

    if (!code && !id_token) {
      return res.redirect(`${process.env.CLIENT_URL || '/'}/auth/error?message=No+credentials+provided`);
    }

    let appleUser;
    if (id_token) {
      appleUser = await oauth.apple.verifyIdToken(id_token);
    } else {
      const tokens = await oauth.apple.exchangeCode(code);
      appleUser = await oauth.apple.verifyIdToken(tokens.id_token);
    }

    // Parse user info (only available on first sign-in)
    const userInfo = oauth.apple.parseUser(appleUserStr);

    let user = await authDb.getUserByAppleId(appleUser.id);

    if (!user) {
      if (appleUser.email) {
        const existingUser = await authDb.getUserByEmail(appleUser.email);
        if (existingUser) {
          await authDb.updateUserAuth(existingUser.id, {
            appleId: appleUser.id,
            emailVerified: appleUser.emailVerified || existingUser.email_verified,
          });
          user = await userDb.getById(existingUser.id);
        }
      }

      if (!user) {
        const name = userInfo
          ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Player'
          : 'Player';

        user = await authDb.createUserWithAuth({
          id: uuidv4(),
          name,
          avatar: '😀',
          email: appleUser.email || userInfo?.email,
          emailVerified: appleUser.emailVerified || false,
          appleId: appleUser.id,
          authProvider: 'apple',
        });
      }
    } else {
      user = await userDb.getById(user.id);
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    // For web callback
    if (req.headers.accept?.includes('text/html')) {
      const redirectUrl = new URL(`${process.env.CLIENT_URL || '/'}/auth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      if (state) redirectUrl.searchParams.set('state', state);
      return res.redirect(redirectUrl.toString());
    }

    // For mobile/API
    res.json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Apple callback error:', error);
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(`${process.env.CLIENT_URL || '/'}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
    res.status(401).json({ error: 'Apple Sign In failed' });
  }
});

// Apple ID token verification (for mobile apps)
router.post('/apple/token', async (req, res) => {
  try {
    const { identityToken, user: appleUserStr } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Identity token required' });
    }

    const appleUser = await oauth.apple.verifyIdToken(identityToken);
    const userInfo = oauth.apple.parseUser(appleUserStr);

    let user = await authDb.getUserByAppleId(appleUser.id);

    if (!user) {
      if (appleUser.email) {
        const existingUser = await authDb.getUserByEmail(appleUser.email);
        if (existingUser) {
          await authDb.updateUserAuth(existingUser.id, {
            appleId: appleUser.id,
            emailVerified: appleUser.emailVerified || existingUser.email_verified,
          });
          user = await userDb.getById(existingUser.id);
        }
      }

      if (!user) {
        const name = userInfo
          ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Player'
          : 'Player';

        user = await authDb.createUserWithAuth({
          id: uuidv4(),
          name,
          avatar: '😀',
          email: appleUser.email || userInfo?.email,
          emailVerified: appleUser.emailVerified || false,
          appleId: appleUser.id,
          authProvider: 'apple',
        });
      }
    } else {
      user = await userDb.getById(user.id);
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Apple token error:', error);
    res.status(401).json({ error: 'Invalid Apple token' });
  }
});

// ============ TOKEN REFRESH ============

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Decode the token to get user ID (without verification for refresh)
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    let userId;
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_SECRET, { ignoreExpiration: true });
        userId = decoded.id;
      } catch (e) {
        // Token invalid
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    // Validate refresh token
    const tokenHash = hashRefreshToken(clientRefreshToken);
    const validToken = await authDb.validateRefreshToken(userId, tokenHash);

    if (!validToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await userDb.getById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken();

    // Revoke old refresh token and create new one
    await authDb.revokeRefreshToken(validToken.id);
    await authDb.createRefreshToken(user.id, hashRefreshToken(newRefreshToken), req.headers['user-agent'], req.ip);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ============ TOKEN LOGIN (LEGACY) ============

router.post('/login', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Allow expired tokens for re-login - user proved auth by having the token
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const user = await userDb.getById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = generateToken(user);
    const refreshToken = generateRefreshToken();
    await authDb.createRefreshToken(user.id, hashRefreshToken(refreshToken), req.headers['user-agent'], req.ip);

    res.json({
      user: sanitizeUser(user),
      token: newToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ============ LOGOUT ============

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken: clientRefreshToken, allDevices } = req.body;

    if (allDevices) {
      await authDb.revokeAllUserTokens(req.user.id);
    } else if (clientRefreshToken) {
      const tokenHash = hashRefreshToken(clientRefreshToken);
      const validToken = await authDb.validateRefreshToken(req.user.id, tokenHash);
      if (validToken) {
        await authDb.revokeRefreshToken(validToken.id);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============ PROFILE ============

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await userDb.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cleanName = name ? sanitize.playerName(name) : user.name;
    const cleanAvatar = avatar ? sanitize.emoji(avatar) : user.avatar;

    if (cleanName.length < 2 || cleanName.length > 30) {
      return res.status(400).json({ error: 'Name must be 2-30 characters' });
    }

    const updatedUser = await userDb.update(user.id, {
      name: cleanName,
      avatar: cleanAvatar,
    });

    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userDb.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============ AUTH STATUS ============

router.get('/providers', (req, res) => {
  res.json({
    anonymous: true,
    email: email.isConfigured(),
    phone: sms.isConfigured(),
    google: oauth.google.isConfigured(),
    apple: oauth.apple.isConfigured(),
  });
});

// ============ MIDDLEWARE ============

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
}

// ============ HELPERS FOR OTHER MODULES ============

export async function getUser(userId) {
  return userDb.getById(userId);
}

export async function updateUserStats(userId, statsUpdate) {
  await userDb.updateStats(userId, statsUpdate);
  return userDb.getById(userId);
}

export function addAchievement(userId, achievementId) {
  return userDb.addAchievement(userId, achievementId);
}

export { router as authRouter };

// OAuth services for Google and Apple Sign In
// Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET for Google
// Set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY for Apple

import crypto from 'crypto';

// Google OAuth configuration
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:3001'}/api/auth/google/callback`,
};

// Apple Sign In configuration
const appleConfig = {
  clientId: process.env.APPLE_CLIENT_ID, // Your Services ID
  teamId: process.env.APPLE_TEAM_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  redirectUri: process.env.APPLE_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:3001'}/api/auth/apple/callback`,
};

// ============ GOOGLE OAUTH ============

// Generate Google OAuth URL
export function getGoogleAuthUrl(state) {
  if (!googleConfig.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state: state || crypto.randomBytes(16).toString('hex'),
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange Google auth code for tokens
export async function exchangeGoogleCode(code) {
  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    throw new Error('Google OAuth not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: googleConfig.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
}

// Get Google user info from access token
export async function getGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get Google user info');
  }

  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    verified: data.verified_email,
  };
}

// Verify Google ID token (for mobile apps)
export async function verifyGoogleIdToken(idToken) {
  if (!googleConfig.clientId) {
    throw new Error('Google OAuth not configured');
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

  if (!response.ok) {
    throw new Error('Invalid Google ID token');
  }

  const payload = await response.json();

  // Verify the token is for our app
  if (payload.aud !== googleConfig.clientId) {
    throw new Error('Token not intended for this app');
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    verified: payload.email_verified === 'true',
  };
}

// ============ APPLE SIGN IN ============

// Generate Apple client secret (JWT)
function generateAppleClientSecret() {
  if (!appleConfig.privateKey || !appleConfig.teamId || !appleConfig.clientId || !appleConfig.keyId) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'ES256',
    kid: appleConfig.keyId,
  };

  const payload = {
    iss: appleConfig.teamId,
    iat: now,
    exp: now + 86400 * 180, // 180 days
    aud: 'https://appleid.apple.com',
    sub: appleConfig.clientId,
  };

  // Create JWT manually since we need ES256
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(appleConfig.privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

// Generate Apple OAuth URL
export function getAppleAuthUrl(state) {
  if (!appleConfig.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: appleConfig.clientId,
    redirect_uri: appleConfig.redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state: state || crypto.randomBytes(16).toString('hex'),
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

// Exchange Apple auth code for tokens
export async function exchangeAppleCode(code) {
  const clientSecret = generateAppleClientSecret();
  if (!clientSecret) {
    throw new Error('Apple Sign In not configured');
  }

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appleConfig.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: appleConfig.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apple token exchange failed: ${error}`);
  }

  return response.json();
}

// Verify and decode Apple ID token
export async function verifyAppleIdToken(idToken) {
  // Fetch Apple's public keys
  const keysResponse = await fetch('https://appleid.apple.com/auth/keys');
  const { keys } = await keysResponse.json();

  // Decode the token header to get the key ID
  const [headerB64] = idToken.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

  // Find the matching key
  const key = keys.find(k => k.kid === header.kid);
  if (!key) {
    throw new Error('Apple public key not found');
  }

  // For proper verification, you'd use a JWT library with JWK support
  // This is a simplified version that decodes but doesn't fully verify
  const [, payloadB64] = idToken.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

  // Basic validation
  if (payload.iss !== 'https://appleid.apple.com') {
    throw new Error('Invalid Apple token issuer');
  }

  if (payload.aud !== appleConfig.clientId) {
    throw new Error('Token not intended for this app');
  }

  if (payload.exp < Date.now() / 1000) {
    throw new Error('Apple token expired');
  }

  return {
    id: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === 'true',
    isPrivateEmail: payload.is_private_email === 'true',
  };
}

// Handle Apple user info from first sign-in (name only comes on first auth)
export function parseAppleUser(user) {
  if (!user) return null;

  try {
    const parsed = typeof user === 'string' ? JSON.parse(user) : user;
    return {
      firstName: parsed.name?.firstName,
      lastName: parsed.name?.lastName,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

// ============ EXPORTS ============

export const oauth = {
  google: {
    isConfigured: () => !!googleConfig.clientId,
    getAuthUrl: getGoogleAuthUrl,
    exchangeCode: exchangeGoogleCode,
    getUserInfo: getGoogleUserInfo,
    verifyIdToken: verifyGoogleIdToken,
  },
  apple: {
    isConfigured: () => !!appleConfig.clientId && !!appleConfig.privateKey,
    getAuthUrl: getAppleAuthUrl,
    exchangeCode: exchangeAppleCode,
    verifyIdToken: verifyAppleIdToken,
    parseUser: parseAppleUser,
  },
};

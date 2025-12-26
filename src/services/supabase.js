// Supabase client for authentication
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status (only in development)
if (import.meta.env.DEV) {
  console.log('Supabase URL configured:', !!supabaseUrl);
  console.log('Supabase Anon Key configured:', !!supabaseAnonKey);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'tag-supabase-auth',
        flowType: 'pkce', // Use PKCE for better security
      },
    })
  : null;

// Helper to format Supabase errors for users
const formatAuthError = (error) => {
  if (!error) return 'An unknown error occurred';
  
  const errorMessages = {
    'Invalid login credentials': 'Email or password is incorrect',
    'Email not confirmed': 'Please check your email to verify your account',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters',
    'Unable to validate email address: invalid format': 'Please enter a valid email address',
    'Signups not allowed for this instance': 'New registrations are currently disabled',
    'Email rate limit exceeded': 'Too many attempts. Please try again later',
    'Phone number is invalid': 'Please enter a valid phone number with country code (e.g., +1234567890)',
    'For security purposes, you can only request this after': 'Please wait before requesting another code',
    'Token has expired or is invalid': 'Your session has expired. Please sign in again',
    'User not found': 'No account found with this email',
    'otp_disabled': 'Phone authentication is not enabled. Please use email or social login.',
    'sms_send_failed': 'Failed to send SMS. Please check your phone number and try again.',
  };
  
  // Check for known error patterns
  for (const [pattern, message] of Object.entries(errorMessages)) {
    if (error.message?.includes(pattern) || error.code === pattern) {
      return message;
    }
  }
  
  // Return original message or generic error
  return error.message || 'Authentication failed. Please try again.';
};

// Auth helper functions
export const supabaseAuth = {
  // Check if Supabase is configured
  isConfigured: () => supabase !== null,

  // Get current session
  getSession: async () => {
    if (!supabase) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  },

  // Get current user
  getUser: async () => {
    if (!supabase) return null;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  // Sign up with email/password
  signUpWithEmail: async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    // Check if email confirmation is required
    if (data.user && !data.session) {
      return { 
        ...data, 
        confirmationRequired: true,
        message: 'Please check your email to confirm your account' 
      };
    }
    
    return data;
  },

  // Sign in with email/password
  signInWithEmail: async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Sign in with magic link (passwordless)
  signInWithMagicLink: async (email) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Sign in with phone (OTP) - with better error handling
  signInWithPhone: async (phone) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Validate phone format
    const cleanPhone = phone.replace(/\s/g, '').replace(/[()-]/g, '');
    if (!cleanPhone.startsWith('+')) {
      throw new Error('Phone number must include country code (e.g., +1 for US)');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: {
          shouldCreateUser: true,
        },
      });
      
      if (error) {
        // Check for specific phone auth errors
        if (error.message?.includes('otp_disabled') || error.status === 500) {
          throw new Error('Phone authentication is not enabled. Please use email or Quick Play instead.');
        }
        throw new Error(formatAuthError(error));
      }
      
      return data;
    } catch (err) {
      // Handle network/server errors
      if (err.message?.includes('fetch') || err.status === 500) {
        throw new Error('Phone authentication is not available. Please use email or Quick Play instead.');
      }
      throw err;
    }
  },

  // Verify phone OTP
  verifyPhoneOtp: async (phone, token) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const cleanPhone = phone.replace(/\s/g, '').replace(/[()-]/g, '');
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token,
      type: 'sms',
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Sign in with OAuth (Google, Apple, etc.)
  signInWithOAuth: async (provider) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Sign out
  signOut: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    // Clear local storage
    localStorage.removeItem('tag-supabase-auth');
  },

  // Reset password
  resetPassword: async (email) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password?mode=reset`,
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Update password
  updatePassword: async (newPassword) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Update user metadata
  updateUser: async (updates) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.updateUser(updates);
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },

  // Listen for auth state changes
  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },

  // Exchange code for session (OAuth callback)
  exchangeCodeForSession: async (code) => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      throw new Error(formatAuthError(error));
    }
    
    return data;
  },
  
  // Set session from URL (for magic links and password reset)
  setSessionFromUrl: async () => {
    if (!supabase) return null;
    
    // Get hash params
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    if (accessToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) throw error;
        
        return { session: data.session, type };
      } catch (error) {
        console.error('Set session error:', error);
        throw new Error(formatAuthError(error));
      }
    }
    
    return null;
  },
};

export default supabase;

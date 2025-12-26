import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

/**
 * Enhanced Forgot Password Page
 * Uses Supabase's built-in password reset with Resend emails
 * Handles both sending reset email and setting new password
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if we're in reset mode (came from email link)
  const isResetMode = searchParams.get('type') === 'recovery';
  const accessToken = searchParams.get('access_token');
  
  const [step, setStep] = useState(isResetMode ? 'newPassword' : 'email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Handle countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check password strength as user types
  useEffect(() => {
    setPasswordStrength({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  // If we have a recovery token in URL, validate it
  useEffect(() => {
    if (isResetMode && accessToken) {
      // Store the access token for the password update request
      sessionStorage.setItem('reset_token', accessToken);
    }
  }, [isResetMode, accessToken]);

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ 
          email,
          redirectTo: `${window.location.origin}/forgot-password`
        }),
      });
      
      setEmailSent(true);
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate password
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const strengthPassed = Object.values(passwordStrength).filter(Boolean).length;
    if (strengthPassed < 3) {
      setError('Password is too weak. Please use a stronger password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = sessionStorage.getItem('reset_token') || accessToken;
      
      await api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ 
          password: newPassword,
          accessToken: token 
        }),
      });
      
      sessionStorage.removeItem('reset_token');
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success State
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
          <p className="text-white/60 mb-8">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link to="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {step === 'newPassword' ? 'Create New Password' : 'Reset Password'}
            </h1>
            <p className="text-white/60">
              {step === 'newPassword' 
                ? 'Choose a strong password for your account'
                : "Enter your email and we'll send you a reset link"
              }
            </p>
          </div>
          
          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            {/* Email Step - Send Reset Email */}
            {step === 'email' && !emailSent && (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Email Sent Confirmation */}
            {step === 'email' && emailSent && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
                <p className="text-white/60 text-sm mb-6">
                  We've sent a password reset link to <span className="text-white">{email}</span>
                </p>
                
                <div className="space-y-3">
                  <p className="text-white/40 text-xs">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setError('');
                    }}
                    disabled={countdown > 0}
                    className="text-indigo-400 hover:text-indigo-300 text-sm disabled:text-white/30 disabled:cursor-not-allowed transition"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Send another link'}
                  </button>
                </div>
              </div>
            )}
            
            {/* New Password Step */}
            {step === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      minLength={8}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => {
                        const strength = Object.values(passwordStrength).filter(Boolean).length;
                        const active = i < strength;
                        let color = 'bg-white/10';
                        if (active) {
                          if (strength <= 2) color = 'bg-red-500';
                          else if (strength <= 3) color = 'bg-yellow-500';
                          else color = 'bg-green-500';
                        }
                        return (
                          <div 
                            key={i} 
                            className={`h-1 flex-1 rounded-full transition-colors ${color}`}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <StrengthItem check={passwordStrength.length} label="8+ characters" />
                      <StrengthItem check={passwordStrength.uppercase} label="Uppercase" />
                      <StrengthItem check={passwordStrength.lowercase} label="Lowercase" />
                      <StrengthItem check={passwordStrength.number} label="Number" />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm text-white/60 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-white/5 border rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none transition ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-500/50 focus:border-red-500'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-green-500/50 focus:border-green-500'
                          : 'border-white/10 focus:border-indigo-500'
                      }`}
                      required
                    />
                    {confirmPassword && confirmPassword === newPassword && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-white/40 text-sm mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Password strength check item
function StrengthItem({ check, label }) {
  return (
    <div className={`flex items-center gap-1 ${check ? 'text-green-400' : 'text-white/30'}`}>
      {check ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
      {label}
    </div>
  );
}

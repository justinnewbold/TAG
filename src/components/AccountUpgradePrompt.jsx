import React, { useState, useEffect } from 'react';
import { 
  Shield, Mail, Phone, Chrome, X, Check, Loader2, 
  Lock, AlertCircle, Sparkles, Gift, Trophy
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';

/**
 * Account Upgrade Prompt - Shows after first game win for anonymous users
 * Allows linking email/phone/Google to preserve progress
 */
export default function AccountUpgradePrompt({ onClose, trigger = 'manual' }) {
  const { user, updateUserProfile } = useStore();
  const [step, setStep] = useState('intro'); // 'intro', 'email', 'phone', 'verify', 'success'
  const [method, setMethod] = useState(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Handle resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendEmailCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.request('/auth/link/email/send', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMethod('email');
      setStep('verify');
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.request('/auth/link/phone/send', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone }),
      });
      setMethod('phone');
      setStep('verify');
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = method === 'email' 
        ? '/auth/link/email/verify' 
        : '/auth/link/phone/verify';
      
      const { user: updatedUser } = await api.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({ 
          code: verificationCode,
          ...(method === 'email' ? { email } : { phone: phone.replace(/\D/g, '') })
        }),
      });

      updateUserProfile(updatedUser);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    setIsLoading(true);
    try {
      // Redirect to Google OAuth with link intent
      const { url } = await api.request('/auth/google/link');
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to connect Google');
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setError('');

    try {
      const endpoint = method === 'email' 
        ? '/auth/link/email/send' 
        : '/auth/link/phone/send';
      
      await api.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(method === 'email' ? { email } : { phone: phone.replace(/\D/g, '') }),
      });
      
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Intro Screen - Why secure your account?
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            {/* Header with confetti effect for win trigger */}
            <div className="relative p-6 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
              {trigger === 'win' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <Sparkles 
                      key={i} 
                      className="absolute w-4 h-4 text-neon-cyan animate-pulse"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              )}
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>

              {trigger === 'win' ? (
                <>
                  <h2 className="text-2xl font-display font-bold text-center mb-1">
                    🎉 First Win!
                  </h2>
                  <p className="text-center text-neon-cyan">
                    Secure your account to keep your progress
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-display font-bold text-center mb-1">
                    Secure Your Account
                  </h2>
                  <p className="text-center text-white/60">
                    Link an email or phone to protect your progress
                  </p>
                </>
              )}
            </div>

            {/* Benefits */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <BenefitItem 
                  icon={Trophy} 
                  color="text-yellow-400"
                  title="Keep Your Stats"
                  description="All your achievements, XP, and game history"
                />
                <BenefitItem 
                  icon={Gift} 
                  color="text-neon-purple"
                  title="Cross-Device Access"
                  description="Play on any device, anywhere"
                />
                <BenefitItem 
                  icon={Lock} 
                  color="text-neon-cyan"
                  title="Account Recovery"
                  description="Reset your password if needed"
                />
              </div>

              {/* Link Options */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => setStep('email')}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <Mail className="w-5 h-5 text-neon-cyan" />
                  Link Email Address
                </button>

                <button
                  onClick={() => setStep('phone')}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <Phone className="w-5 h-5 text-neon-purple" />
                  Link Phone Number
                </button>

                <button
                  onClick={handleGoogleLink}
                  disabled={isLoading}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Chrome className="w-5 h-5 text-green-400" />
                  )}
                  Continue with Google
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email Input Screen
  if (step === 'email') {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="p-6">
              <button
                onClick={() => setStep('intro')}
                className="mb-4 text-white/40 hover:text-white text-sm flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="w-12 h-12 bg-neon-cyan/20 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-neon-cyan" />
              </div>

              <h2 className="text-xl font-bold mb-2">Link Your Email</h2>
              <p className="text-white/60 text-sm mb-6">
                We'll send a verification code to confirm it's you
              </p>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan transition"
                  autoFocus
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSendEmailCode}
                  disabled={isLoading || !email}
                  className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Verification Code
                      <Mail className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phone Input Screen
  if (step === 'phone') {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="p-6">
              <button
                onClick={() => setStep('intro')}
                className="mb-4 text-white/40 hover:text-white text-sm flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="w-12 h-12 bg-neon-purple/20 rounded-xl flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-neon-purple" />
              </div>

              <h2 className="text-xl font-bold mb-2">Link Your Phone</h2>
              <p className="text-white/60 text-sm mb-6">
                We'll send a verification code via SMS
              </p>

              <div className="space-y-4">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-white/30 focus:outline-none focus:border-neon-purple transition"
                  autoFocus
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSendPhoneCode}
                  disabled={isLoading || phone.replace(/\D/g, '').length < 10}
                  className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Verification Code
                      <Phone className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification Code Screen
  if (step === 'verify') {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="p-6">
              <button
                onClick={() => setStep(method)}
                className="mb-4 text-white/40 hover:text-white text-sm flex items-center gap-1"
              >
                ← Back
              </button>

              <div className={`w-12 h-12 ${method === 'email' ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'} rounded-xl flex items-center justify-center mb-4`}>
                {method === 'email' ? (
                  <Mail className="w-6 h-6 text-neon-cyan" />
                ) : (
                  <Phone className="w-6 h-6 text-neon-purple" />
                )}
              </div>

              <h2 className="text-xl font-bold mb-2">Enter Verification Code</h2>
              <p className="text-white/60 text-sm mb-6">
                We sent a 6-digit code to {method === 'email' ? email : phone}
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-neon-cyan transition font-mono"
                  autoFocus
                  inputMode="numeric"
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleVerifyCode}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Link Account
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || isLoading}
                  className="w-full py-3 text-white/40 hover:text-white/60 text-sm transition-colors disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 
                    ? `Resend code in ${resendTimer}s` 
                    : "Didn't receive code? Resend"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-400" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Account Secured! 🎉</h2>
              <p className="text-white/60 mb-8">
                Your progress is now protected. You can sign in on any device.
              </p>

              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl font-semibold hover:opacity-90 transition"
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Benefit Item Component
function BenefitItem({ icon: Icon, color, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-white/40 text-xs">{description}</p>
      </div>
    </div>
  );
}

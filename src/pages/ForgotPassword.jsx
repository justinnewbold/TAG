import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { supabaseAuth } from '../services/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      if (supabaseAuth.isConfigured()) {
        await supabaseAuth.resetPassword(email);
        setSuccess(true);
      } else {
        setError('Password reset is not available. Please contact support.');
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Reset Password
            </h1>
            <p className="text-white/60">
              {success 
                ? "Check your email for the reset link" 
                : "Enter your email to receive a password reset link"}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Email Sent!</h2>
                <p className="text-white/60 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Check your inbox and follow the link to reset your password.
                </p>
                <p className="text-sm text-white/40 mb-6">
                  Didn't receive it? Check your spam folder or try again.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="text-indigo-400 hover:text-indigo-300 transition"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Back to login */}
          <p className="text-center text-white/60 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

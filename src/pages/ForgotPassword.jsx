import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Lock, Check } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email', 'code', 'newPassword', 'success'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep('code');
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code) return;
    setStep('newPassword');
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
          <p className="text-white/60 mb-8">Your password has been successfully reset.</p>
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
      <header className="p-4">
        <Link to="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-white/60">
              {step === 'email' && "Enter your email to receive a reset code"}
              {step === 'code' && "Enter the code sent to your email"}
              {step === 'newPassword' && "Create a new password"}
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      required
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Send Reset Code
                </button>
              </form>
            )}
            
            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-widest placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-white/40 mt-2 text-center">Code sent to {email}</p>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading || code.length < 6}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  Continue
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full py-2 text-white/60 hover:text-white transition"
                >
                  Didn't receive code? Try again
                </button>
              </form>
            )}
            
            {step === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition"
                      required
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

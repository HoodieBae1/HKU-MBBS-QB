import React, { useState } from 'react';
import { supabase } from './supabase';
import { Loader2, Lock, Mail, Key, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

const Auth = () => {
  const [authMode, setAuthMode] = useState('magic'); // 'magic' or 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // --- HANDLERS ---

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Check your email for the magic login link!' });
    }
    setLoading(false);
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: 'Invalid login credentials.' });
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address above first.' });
      return;
    }
    setLoading(true);
    
    // This sends an email. When clicked, it logs the user in and triggers the PASSWORD_RECOVERY event
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password setup link sent! Check your email.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-teal-700 p-6 text-center">
          <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6 text-teal-100" />
          </div>
          <h1 className="text-2xl font-bold text-white">MBBS Question Bank</h1>
          <p className="text-teal-100 text-sm opacity-90">Secure Access Portal</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => { setAuthMode('magic'); setMessage(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${authMode === 'magic' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Mail className="w-4 h-4" /> Magic Link
          </button>
          <button 
            onClick={() => { setAuthMode('password'); setMessage(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${authMode === 'password' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Key className="w-4 h-4" /> Password
          </button>
        </div>

        <div className="p-8">
          
          {/* COMMON EMAIL INPUT (Used for Magic, Login, and Reset) */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
            <input
              type="email"
              placeholder="doctor@hku.hk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
              required
            />
          </div>

          {/* MAGIC LINK MODE */}
          {authMode === 'magic' && (
            <form onSubmit={handleMagicLink} className="animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="text-xs text-gray-500 mb-4">We'll send a secure login link to your email. No password needed.</p>
              <button
                disabled={loading}
                className="w-full py-3 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Send Magic Link <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* PASSWORD MODE */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordSignIn} className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Password</label>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="w-full py-3 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mb-4"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign In'}
              </button>

              <div className="text-center border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-2">First time using a password? Or forgot it?</p>
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="text-sm text-teal-600 hover:text-teal-800 font-bold hover:underline"
                >
                  Send Set/Reset Password Link
                </button>
              </div>
            </form>
          )}

          {/* Status Messages */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200 ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
              <div className={`mt-0.5 p-1 rounded-full ${message.type === 'error' ? 'bg-red-200' : 'bg-green-200'}`}>
                {message.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
              </div>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
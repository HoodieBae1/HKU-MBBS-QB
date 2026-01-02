import React, { useState } from 'react';
import { supabase } from './supabase';
import { Loader2, Lock, Mail, Key, ArrowRight, RefreshCw, AlertCircle, UserPlus } from 'lucide-react';

const Auth = ({ onSuccess }) => { // <--- Added onSuccess prop to close modal
  const [authMode, setAuthMode] = useState('magic'); // 'magic', 'login', 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ 
      email, options: { emailRedirectTo: window.location.origin }
    });
    if (error) setMessage({ type: 'error', text: error.message });
    else setMessage({ type: 'success', text: 'Check your email for the login link!' });
    setLoading(false);
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage({ type: 'error', text: 'Invalid login credentials.' });
    else if (onSuccess) onSuccess(); // Close modal
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        setMessage({ type: 'error', text: error.message });
    } else if (data.user && !data.session) {
        setMessage({ type: 'success', text: 'Registration successful! Check email to confirm.' });
    } else {
        if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) { setMessage({ type: 'error', text: 'Enter email first.' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) setMessage({ type: 'error', text: error.message });
    else setMessage({ type: 'success', text: 'Reset link sent!' });
    setLoading(false);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-teal-700 p-6 text-center">
        <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Lock className="w-6 h-6 text-teal-100" />
        </div>
        <h1 className="text-2xl font-bold text-white">MBBS Finals</h1>
        <p className="text-teal-100 text-sm opacity-90">Question Bank Access</p>
      </div>

      <div className="flex border-b border-gray-100">
        <button onClick={() => { setAuthMode('magic'); setMessage(null); }} className={`flex-1 py-3 text-xs font-bold ${authMode === 'magic' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50' : 'text-gray-400'}`}>Magic Link</button>
        <button onClick={() => { setAuthMode('login'); setMessage(null); }} className={`flex-1 py-3 text-xs font-bold ${authMode === 'login' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50' : 'text-gray-400'}`}>Login</button>
        <button onClick={() => { setAuthMode('signup'); setMessage(null); }} className={`flex-1 py-3 text-xs font-bold ${authMode === 'signup' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50' : 'text-gray-400'}`}>Sign Up</button>
      </div>

      <div className="p-8">
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
          <input type="email" placeholder="doctor@hku.hk" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
        </div>

        {authMode === 'magic' && (
          <form onSubmit={handleMagicLink}>
            <p className="text-xs text-gray-500 mb-4">We'll send a secure login link. No password needed.</p>
            <button disabled={loading} className="w-full py-3 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 disabled:opacity-50">{loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Send Link'}</button>
          </form>
        )}

        {(authMode === 'login' || authMode === 'signup') && (
          <form onSubmit={authMode === 'login' ? handlePasswordSignIn : handleSignUp}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
            </div>
            <button disabled={loading} className="w-full py-3 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
            {authMode === 'login' && <div className="text-center mt-4"><button type="button" onClick={handleResetPassword} className="text-xs text-teal-600 font-bold hover:underline">Forgot Password?</button></div>}
          </form>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-green-50 text-green-800 border-green-100'}`}>
            <div className={`mt-0.5 p-1 rounded-full ${message.type === 'error' ? 'bg-red-200' : 'bg-green-200'}`}>{message.type === 'error' ? <AlertCircle className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}</div>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
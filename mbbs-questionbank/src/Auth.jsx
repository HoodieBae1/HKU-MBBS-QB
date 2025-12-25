import React, { useState } from 'react';
import { supabase } from './supabase';
import { Loader2, Lock } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // We'll use Magic Link (Passwordless) for simplicity
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-teal-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MBBS Question Bank</h1>
          <p className="text-gray-500 text-sm">Sign in to track your progress</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="doctor@hku.hk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50 flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded text-center text-sm ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
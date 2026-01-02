import React from 'react';
import { Lock, Zap, X, Wallet, ArrowRight, Sparkles, Database } from 'lucide-react';

const LimitModal = ({ isOpen, onClose, type, requiredAmount, currentBalance }) => {
  if (!isOpen) return null;

  const isTrial = type === 'TRIAL_LIMIT';
  const isStorage = type === 'STORAGE_LIMIT';

  // Determine Colors & Icons
  let bgClass = '';
  let icon = null;
  let title = '';
  let subtitle = '';

  if (isTrial) {
      bgClass = 'bg-gradient-to-br from-indigo-600 to-violet-600';
      icon = <Lock className="w-8 h-8 text-white" />;
      title = 'Unlock Full Access';
      subtitle = 'Free Trial Limit Reached';
  } else if (isStorage) {
      bgClass = 'bg-gradient-to-br from-orange-500 to-red-500';
      icon = <Database className="w-8 h-8 text-white" />;
      title = 'Storage Full';
      subtitle = 'Database Limit Exceeded';
  } else {
      bgClass = 'bg-gradient-to-br from-rose-500 to-orange-500';
      icon = <Wallet className="w-8 h-8 text-white" />;
      title = 'Insufficient Credits';
      subtitle = 'Wallet Balance Low';
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header Graphic */}
        <div className={`p-6 text-center relative overflow-hidden ${bgClass}`}>
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-30 pattern-grid-lg"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner ring-1 ring-white/40">
              {icon}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-indigo-100 text-sm mt-1 font-medium opacity-90">{subtitle}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {isTrial && (
            <div className="space-y-4">
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                You have used your <span className="font-bold text-indigo-600">2 free AI consultations</span>. 
                Upgrade to the Standard Plan to unlock unlimited questions and AI credits.
              </p>
              {/* Feature List ... */}
            </div>
          )}

          {isStorage && (
             <div className="space-y-4">
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                   You have exceeded your storage limit. 
                   <br/>
                   <span className="font-bold text-orange-600">Trial Limit: 50 KB</span>
                </p>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-800">
                    <p className="font-bold mb-1">Why is this happening?</p>
                    <p>You may have uploaded large images. Trial accounts are limited to text notes. Please upgrade for 50MB storage.</p>
                </div>
             </div>
          )}

          {!isTrial && !isStorage && (
            <div className="space-y-4">
              {/* NEW MESSAGE FOR NEGATIVE BALANCE */}
              <div className="text-center">
                  <p className="text-rose-600 font-bold text-lg mb-2">
                      Wallet Suspended
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Your wallet has a negative balance of <span className="font-mono font-bold text-rose-700">${currentBalance}</span>.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Please clear your outstanding balance and top up to resume using Professor AI.
                  </p>
              </div>
            </div>
          )}
          {/* Footer Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <button 
                onClick={() => alert("Please contact administrator.")}
                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                    isTrial || isStorage ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                }`}
            >
              {isTrial || isStorage ? 'Get Full Access' : 'Top Up Wallet'} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 font-medium py-2">
                Maybe Later
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LimitModal;
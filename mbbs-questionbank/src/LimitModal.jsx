import React from 'react';
import { Lock, Wallet, ArrowRight, Database, Check, Clock, AlertTriangle } from 'lucide-react';

const LimitModal = ({ isOpen, onClose, type, requiredAmount, currentBalance }) => {
  if (!isOpen) return null;

  const isLowBalance = type === 'LOW_BALANCE';
  
  // Logic: Trial Limit and Storage Limit both trigger the "Upgrade Plan" view.
  // Low Balance triggers the "Top Up" view.
  const isSalesPitch = type === 'TRIAL_LIMIT' || type === 'STORAGE_LIMIT';

  // --- CONFIG FOR SALES PITCH ---
  const FEATURES = [
    { text: "Full Database Access (10,000+ Questions since 1994)", bold: true },
    { text: "Upgraded Storage: 50MB (vs 50KB Free)", sub: "Store ~10k notes & 30 images" },
    { text: "$100 HKD AI Credits Included", sub: "Hassle-free advanced AI verification" },
    { text: "Live Progress & Accuracy Stats", sub: "By specialty and topic" },
    { text: "Advanced Filtering", sub: "Filter by specialty and subtopic" },
    { text: "Notes Panel Access", sub: "View notes alongside Q&A" }
  ];

  // Determine Header Colors
  let bgClass = '';
  let icon = null;
  let title = '';
  let subtitle = '';

  if (type === 'TRIAL_LIMIT') {
      bgClass = 'bg-gradient-to-br from-indigo-600 to-violet-600';
      icon = <Lock className="w-8 h-8 text-white" />;
      title = 'Unlock Full Access';
      subtitle = 'Free Trial Limit Reached';
  } else if (type === 'STORAGE_LIMIT') {
      bgClass = 'bg-gradient-to-br from-orange-500 to-red-500';
      icon = <Database className="w-8 h-8 text-white" />;
      title = 'Storage Full';
      subtitle = '50KB Trial Limit Exceeded';
  } else {
      bgClass = 'bg-gradient-to-br from-rose-500 to-orange-500';
      icon = <Wallet className="w-8 h-8 text-white" />;
      title = 'Insufficient Credits';
      subtitle = 'Wallet Balance Low';
  }

  const handleContactAdmin = () => {
      // Replace with your actual contact logic or Stripe link
      window.location.href = "mailto:admin@hkupastpapers.com?subject=Upgrade%20to%20Full%20Access";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header Graphic */}
        <div className={`p-6 text-center relative overflow-hidden ${bgClass}`}>
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-30 pattern-grid-lg"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner ring-1 ring-white/40">
              {icon}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-white/80 text-sm mt-1 font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          
          {/* --- VIEW 1: SALES PITCH (Trial / Storage) --- */}
          {isSalesPitch && (
            <div className="space-y-5">
              
              {/* Pricing Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                 <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subscription (Valid till Apr 1)</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-3xl font-bold text-slate-800">$699</span>
                            <span className="text-sm font-bold text-slate-400 line-through decoration-slate-400">$899</span>
                            <span className="text-sm font-bold text-slate-600">HKD</span>
                        </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded w-fit">
                    <Clock className="w-3 h-3" />
                    Early Bird Special (Ends Jan 7, 2026)
                 </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">What's Included</p>
                  <ul className="space-y-2.5">
                      {FEATURES.map((feat, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                              <div className="mt-0.5 min-w-[18px] h-[18px] bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                              </div>
                              <div className="leading-tight">
                                <span className={feat.bold ? "font-bold text-indigo-900" : ""}>{feat.text}</span>
                                {feat.sub && <p className="text-[10px] text-slate-400 mt-0.5">{feat.sub}</p>}
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>

              {/* Call to Action */}
              <button 
                onClick={handleContactAdmin}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                Upgrade Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* --- VIEW 2: LOW BALANCE (Already Paid) --- */}
          {isLowBalance && (
            <div className="space-y-6">
              <div className="text-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <div className="flex justify-center mb-2"><AlertTriangle className="w-8 h-8 text-rose-500" /></div>
                  <p className="text-rose-700 font-bold text-lg mb-1">Wallet Suspended</p>
                  <p className="text-slate-600 text-sm">
                    Your account has a negative balance of <span className="font-mono font-bold text-rose-600">${currentBalance}</span>.
                  </p>
              </div>
              
              <div className="text-sm text-slate-500 leading-relaxed text-center">
                 To continue using Professor AI features, please clear your outstanding balance and top up your wallet.
              </div>

              <button 
                onClick={handleContactAdmin}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                Top Up Wallet <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={onClose} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 mt-4 uppercase tracking-wide">
              Maybe Later
          </button>

        </div>
      </div>
    </div>
  );
};

export default LimitModal;
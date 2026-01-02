import React from 'react';
import { Crown, Heart, X, CheckCircle2, ArrowRight, Share2 } from 'lucide-react';

const LegacyUserModal = ({ isOpen, onClose, userProfile }) => {
  if (!isOpen) return null;

  // Extract First Name
  const firstName = userProfile?.display_name?.split(' ')[0] || 'Friend';

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-purple-200 relative">
        
        {/* Confetti / Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
            <div className="absolute w-full h-full opacity-20 pattern-grid-lg"></div>
        </div>

        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center mt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <Crown className="w-10 h-10 text-purple-900" />
            </div>
        </div>

        <div className="text-center px-6 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-slate-800">Welcome Back, {firstName}!</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 uppercase tracking-wide flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Friends of Fiona
                </span>
            </div>
            
            <div className="text-left space-y-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p>
                    To keep this project running and ensure I have enough time to update the app before your exams, I have opened signups to the public.
                </p>
                <p>
                    <strong>The public will be charged a subscription fee:</strong><br/>
                    <span className="text-slate-500 line-through">$899</span> <span className="text-emerald-600 font-bold">$599 HKD</span> (Early Bird Special).
                </p>
                <p>
                    Please help share the link to your HKU Med groups to help keep the project alive! 🙏
                </p>
            </div>
        </div>

        <div className="px-6 py-2">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2">Your "Friends" Benefits</p>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2.5 text-sm text-purple-900">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span><strong>Full Access</strong> until your exams finish.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-purple-900">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span><strong>Pay-As-You-Use:</strong> No subscription fee. You only pay for the AI credits you actually consume.</span>
                    </li>
                </ul>
            </div>
        </div>

        <div className="p-6 pt-4 flex gap-3">
            <button 
                onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    alert("Link copied to clipboard!");
                }}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
                <Share2 className="w-4 h-4" /> Share Link
            </button>
            <button 
                onClick={onClose}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                Let's Study <ArrowRight className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default LegacyUserModal;
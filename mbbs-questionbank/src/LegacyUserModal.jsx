import React from 'react';
import { Crown, Heart, CheckCircle2, ArrowRight, Share2, Sparkles } from 'lucide-react';

const LegacyUserModal = ({ isOpen, onClose, userProfile }) => {
  if (!isOpen) return null;

  const firstName = userProfile?.display_name?.split(' ')[0] || 'Friend';

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-purple-200 relative">
        
        {/* --- VISUALS (Old Layout) --- */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
            <div className="absolute w-full h-full opacity-20 pattern-grid-lg"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center mt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <Crown className="w-10 h-10 text-purple-900" />
            </div>
        </div>

        <div className="text-center px-6 pt-4 pb-2">
            <h2 className="text-2xl font-bold text-slate-800 mt-5">Welcome Back, {firstName}!</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 uppercase tracking-wide flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Friend of Fiona
                </span>
            </div>
            
            {/* --- NEW TEXT --- */}
            <div className="text-left text-sm text-slate-600 leading-relaxed space-y-3">
                <p>
                    To keep this project running and ensure I have time to update the app before your exams, <strong>I have opened signups to the public.</strong>
                </p>
                <p>
                    The public price is <span className="line-through text-slate-400">$899</span> <span className="text-emerald-600 font-bold">$599 HKD</span> (Early Bird until Jan 7).
                </p>
                <p>
                    <strong>I need a small favor:</strong> If this app helped you, please share the link with your HKU Med groups. It helps keep the project alive! 🙏
                </p>
            </div>
        </div>

        {/* --- BENEFITS BOX (Old Layout) --- */}
        <div className="px-6 py-4">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Your "Legacy Friend" Status
                </p>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2.5 text-sm text-purple-900">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span><strong>Full Access</strong> until your exams finish.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-purple-900">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span><strong>No Subscription:</strong> You save $899. Just Pay-As-You-Use for AI credits.</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* --- ACTION BUTTONS --- */}
        <div className="p-6 pt-0 flex flex-col gap-3">
            <button 
                onClick={() => {
                    const text = `Found this AI question bank for our finals. Has all the questions from goddisk and AI explanations for the answers. It's on early bird sale ($599 vs $899) till Jan 7, so grab it now if you need it. https://hku-mbbs-qb.vercel.app/`;
                    navigator.clipboard.writeText(text);
                }}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <Share2 className="w-5 h-5" /> Copy Link to Share
            </button>
            
            <button 
                onClick={onClose}
                className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
            >
                Let's Study <ArrowRight className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default LegacyUserModal;
import React from 'react';
import { Rocket, Check, X, Calendar } from 'lucide-react';

const ReleaseNotesModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header with cool gradient */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white relative overflow-hidden">
          <Rocket className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start">
               <div>
                 <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-2 border border-white/20">
                    <span>New Update</span>
                    <span>v{data.version}</span>
                 </div>
                 <h2 className="text-2xl font-bold">{data.title}</h2>
               </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-teal-100 text-xs font-mono">
               <Calendar className="w-3 h-3" />
               {data.date}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
           <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">What's New</h3>
           <ul className="space-y-3">
              {data.changes && data.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                      <div className="mt-1 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-teal-600" />
                      </div>
                      <span>{change}</span>
                  </li>
              ))}
           </ul>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2"
          >
            Let's Go
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReleaseNotesModal;
import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle2 } from 'lucide-react';

const COMMON_REASONS = [
  "Missing Image",
  "Wrong Answer Key",
  "Typo / Grammar",
  "Question Unclear",
  "Formatting Issue",
  "Others"
];

const ReportModal = ({ isOpen, onClose, onSubmit, isSubmitting, questionId, isAlreadyReported }) => {
  const [reason, setReason] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Combine tag and text if both exist, or use whichever is available
    let finalReason = reason;
    if (selectedTag) {
        finalReason = reason ? `[${selectedTag}] ${reason}` : selectedTag;
    }

    if (!finalReason.trim()) return;
    onSubmit(finalReason);
    
    // Reset form after a brief delay so animation can finish if needed, or immediately
    setReason('');
    setSelectedTag(null);
  };

  const handleTagClick = (tag) => {
    if (selectedTag === tag) {
        setSelectedTag(null);
    } else {
        setSelectedTag(tag);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Report Issue</h2>
              <p className="text-xs text-red-700 font-mono mt-0.5">ID: {questionId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-red-400 hover:text-red-700 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {isAlreadyReported && (
             <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800 flex items-start gap-2">
                <div className="mt-0.5 min-w-[16px]"><CheckCircle2 className="w-4 h-4" /></div>
                <p>
                  <strong>Note:</strong> This question has already been flagged by the community. 
                  You can still submit a report if you have additional details to add.
                </p>
             </div>
          )}

          <label className="block text-sm font-bold text-gray-700 mb-2">
            What's wrong with this question?
          </label>
          
          {/* Quick Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {COMMON_REASONS.map((tag) => (
                <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        selectedTag === tag 
                        ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                    }`}
                >
                    {tag}
                </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide specific details (e.g. 'The correct answer should be A because...')"
            className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none bg-slate-50"
          />
          <p className="text-right text-xs text-gray-400 mt-2">
             {(reason.length > 0 || selectedTag) ? 'Ready to submit' : 'Please select a tag or write a description'}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={(!reason.trim() && !selectedTag) || isSubmitting}
            className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // ⚠️ Make sure this path is correct
import { AlertTriangle, X, Loader2, CheckCircle2, FileText, ExternalLink, History, Clock, Ban, Check } from 'lucide-react';

const COMMON_REASONS = [
  "Missing Image",
  "Wrong Answer Key",
  "Typo / Grammar",
  "Question Unclear",
  "Formatting Issue",
  "Others"
];

// 🔴 TODO: Double check this is your correct GitHub Pages URL
const PDF_BASE_URL = "https://hoodiebae1.github.io/mbbs-source-files";

const ReportModal = ({ isOpen, onClose, onSubmit, isSubmitting, questionId, sourceFile }) => {
  const [reason, setReason] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  
  // --- New State for History ---
  const [reportHistory, setReportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Fetch History when Modal Opens ---
  useEffect(() => {
    if (isOpen && questionId) {
        fetchReportHistory();
    } else {
        // Reset state when closed
        setReportHistory([]);
        setReason('');
        setSelectedTag(null);
    }
  }, [isOpen, questionId]);

  const fetchReportHistory = async () => {
      setLoadingHistory(true);
      try {
          const { data, error } = await supabase
            .from('question_reports')
            .select('id, reason, status, created_at') // We intentionally DO NOT select user_id for anonymity
            .eq('question_id', questionId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setReportHistory(data || []);
      } catch (err) {
          console.error("Failed to load report history:", err);
      } finally {
          setLoadingHistory(false);
      }
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    // 🔒 Enforcement: Tag is mandatory
    if (!selectedTag) return;

    let finalReason = reason.trim();
    // Format: "[Tag] User's explanation"
    finalReason = finalReason ? `[${selectedTag}] ${finalReason}` : selectedTag;

    onSubmit(finalReason);
    
    // We don't close immediately here (usually parent handles it), 
    // but we can refresh the history list optimistically if needed.
    // For now, we rely on parent to close or refresh.
  };

  const handleTagClick = (tag) => {
    if (selectedTag === tag) {
        setSelectedTag(null);
    } else {
        setSelectedTag(tag);
    }
  };

  // --- Helper to generate the URL ---
  const getPdfUrl = (rawPath, id) => {
    if (!rawPath) return null;
    try {
        const cleanPath = rawPath.replace(/\\/g, '/').trim();
        const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
        return `${PDF_BASE_URL}/${encodedPath}`;
    } catch (error) {
        console.error(`Error parsing path for ID ${id}`, error);
        return null;
    }
  };

  const pdfUrl = getPdfUrl(sourceFile, questionId);

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
        case 'resolved':
            return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200"><Check className="w-3 h-3"/> Resolved</span>;
        case 'unresolvable':
            return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 decoration-gray-400 line-through"><Ban className="w-3 h-3"/> Unresolvable</span>;
        default: // 'new' or others
            return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200"><Clock className="w-3 h-3"/> Pending</span>;
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
          
          {/* --- Source File Link --- */}
          {pdfUrl && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded mt-0.5">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-blue-900">Verify with Source</h3>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                Please check the original PDF. Since I am not a medical student, 
                                I rely on your specific instructions to fix parsing errors.
                            </p>
                        </div>
                    </div>
                    <a 
                        href={pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded shadow-sm transition-colors whitespace-nowrap"
                    >
                        Open PDF <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <div className="mt-2 text-[10px] text-blue-500 text-right">
                   *Use Ctrl+F to search for the question text inside the PDF
                </div>
            </div>
          )}

          {/* --- REPORT HISTORY SECTION (NEW) --- */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <History className="w-3 h-3" /> Previous Reports
            </h3>
            
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden max-h-40 overflow-y-auto">
                {loadingHistory ? (
                    <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                ) : reportHistory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 italic">
                        No previous reports for this question.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reportHistory.map((rep) => (
                            <div key={rep.id} className="p-3 hover:bg-white transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(rep.status)}
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(rep.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                    {rep.reason}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* --- INPUT FORM --- */}
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Reason for report <span className="text-red-500">*</span>
          </label>
          
          {/* Quick Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {COMMON_REASONS.map((tag) => (
                <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        selectedTag === tag 
                        ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105 ring-2 ring-red-100' 
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
            placeholder="Please provide specific details. E.g., 'Answer should be B. It is now marked as D', or 'Change question text to: A man with ...'."
            className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none bg-slate-50"
          />
          <p className={`text-right text-xs mt-2 transition-colors ${selectedTag ? 'text-green-600 font-medium' : 'text-red-400'}`}>
             {selectedTag ? 'Ready to submit' : 'Please select a reason above'}
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
            // 🔒 Button is disabled if no tag is selected
            disabled={!selectedTag || isSubmitting}
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
import React, { useState } from 'react';
import { X, Copy, Check, FileJson, Download, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from './supabase';

const DataExportModal = ({ 
    isOpen, 
    onClose, 
    questions, 
    userProgress, 
    onDownloadJson,
    userId // Required
}) => {
  const [copyStatus, setCopyStatus] = useState('idle');

  if (!isOpen) return null;

  // --- UPDATED LOGGING FUNCTION ---
  const logExportAction = async (type, count) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('export_logs')
        .insert({
          user_id: userId,
          export_type: type,            // Now writing to the new column
          record_count: count,
          user_agent: navigator.userAgent // Keeping user_agent clean
        });

      if (error) console.error("Failed to log export:", error);
    } catch (err) {
      console.error("Logging error:", err);
    }
  };

  // --- LOGIC: PROCESS FLAGGED QUESTIONS FOR GOOGLE DOCS ---
  const handleCopyFlagged = async () => {
    setCopyStatus('loading');

    try {
      // 1. Filter Questions
      const flaggedQuestions = questions.filter(q => {
        const progress = userProgress[String(q.unique_id)];
        return progress && progress.is_flagged === true; 
      });

      if (flaggedQuestions.length === 0) {
        alert("No flagged questions found.");
        setCopyStatus('idle');
        return;
      }

      // 2. Sort: MCQ First, then by Date
      flaggedQuestions.sort((a, b) => {
        const progA = userProgress[String(a.unique_id)];
        const progB = userProgress[String(b.unique_id)];
        if (a.type !== b.type) return a.type === 'MCQ' ? -1 : 1;
        const dateA = new Date(progA.updated_at || progA.created_at || 0).getTime();
        const dateB = new Date(progB.updated_at || progB.created_at || 0).getTime();
        return dateB - dateA;
      });

      // 3. Construct HTML
      let htmlContent = `
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h1 style="color: #0f766e; border-bottom: 3px solid #0f766e; padding-bottom: 10px;">Flagged Questions Export</h1>
          <p style="color: #666; margin-bottom: 30px;">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Total Questions:</strong> ${flaggedQuestions.length}
          </p>
      `;

      flaggedQuestions.forEach((q, index) => {
        const progress = userProgress[String(q.unique_id)];
        
        htmlContent += `
          <div style="margin-bottom: 40px; border: 1px solid #e5e7eb; padding: 25px; border-radius: 8px; background-color: #ffffff;">
            
            <!-- META -->
            <div style="font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 5px;">
              ${q.type} • ${q.topic} / ${q.subtopic} • QUID: ${q.unique_id}
            </div>

            <!-- QUESTION -->
            <h3 style="margin-top: 0; color: #111;">Q${index + 1}.</h3>
            <div style="font-size: 14px; margin-bottom: 20px;">${q.question}</div>
        `;

        // --- MCQ CHOICES ---
        if (q.type === 'MCQ' && q.options) {
          htmlContent += `<ol type="A" style="margin-left: 20px; padding-left: 20px; margin-bottom: 20px;">`;
          q.options.forEach((opt, i) => {
            const isCorrect = i === q.correctAnswerIndex;
            const isSelected = progress.selected_option === i;
            let style = "color: #374151;";
            let label = "";

            if (isCorrect) {
                style = "font-weight: bold; color: #047857;";
                if (isSelected) {
                    label = " <span style='background-color: #d1fae5; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; border: 1px solid #10b981;'>✓ You selected this</span>";
                } else {
                    label = " <span style='font-size: 11px; color: #059669; margin-left: 5px;'>(Official Answer)</span>";
                }
            } else if (isSelected) {
                style = "font-weight: bold; color: #b91c1c;";
                label = " <span style='background-color: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; border: 1px solid #ef4444;'>✗ You selected this</span>";
            }
            htmlContent += `<li style="margin-bottom: 8px; ${style}">${opt}${label}</li>`;
          });
          htmlContent += `</ol>`;
        }

        // --- USER RESPONSE ---
        if (progress.user_response) {
            htmlContent += `
              <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <strong style="color: #1e40af; display: block; margin-bottom: 5px;">My Response:</strong>
                <div style="font-style: italic; color: #1e3a8a;">${progress.user_response}</div>
              </div>
            `;
        }

        // --- OFFICIAL ANSWER ---
        if (q.official_answer) {
            htmlContent += `
              <div style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <strong style="color: #065f46; display: block; margin-bottom: 5px;">Official Answer:</strong>
                <div style="color: #064e3b;">${q.official_answer}</div>
              </div>
            `;
        }

        // --- NOTES ---
        if (progress.notes) {
          htmlContent += `
            <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <strong style="color: #92400e; display: block; margin-bottom: 5px;">My Notes:</strong>
              <div style="color: #78350f;">${progress.notes}</div>
            </div>
          `;
        }

        htmlContent += `</div><br/>`;
      });

      htmlContent += `</body></html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const plainText = new Blob(["Please paste into a Rich Text Editor (Word/Google Docs)."], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': plainText });

      await navigator.clipboard.write([item]);

      // --- LOGGING ---
      await logExportAction('HTML_COPY', flaggedQuestions.length);
      
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 4000);

    } catch (err) {
      console.error("Export failed:", err);
      setCopyStatus('error');
    }
  };

  // --- LOGIC: RAW JSON BACKUP ---
  const handleJSONClick = async () => {
      // --- LOGGING ---
      await logExportAction('JSON_BACKUP', Object.keys(userProgress).length);

      if (onDownloadJson) {
          onDownloadJson();
      } else {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userProgress));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", "mbbs_progress_backup.json");
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
      }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-800">Download Data</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Option 1: Flagged Questions */}
          <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4">
             <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Copy Flagged for Google Docs</h4>
                    <p className="text-xs text-indigo-700/70 mt-1 leading-relaxed">
                        Compiles flagged items into a formatted list. Includes your <strong>selected choice</strong>, correct answers, and notes.
                    </p>
                </div>
             </div>
             
             <button 
                onClick={handleCopyFlagged}
                disabled={copyStatus === 'loading'}
                className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${copyStatus === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
             >
                {copyStatus === 'loading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating HTML...</>
                ) : copyStatus === 'success' ? (
                    <><Check className="w-4 h-4" /> Copied! Ready to Paste.</>
                ) : copyStatus === 'error' ? (
                    <><AlertCircle className="w-4 h-4" /> Error Copying</>
                ) : (
                    <><Copy className="w-4 h-4" /> Copy to Clipboard</>
                )}
             </button>
             {copyStatus === 'success' && (
                <p className="text-[10px] text-green-600 font-bold text-center mt-2 animate-pulse">
                    Open Google Docs or Word and press Ctrl+V / Cmd+V
                </p>
             )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Option 2: Raw JSON */}
          <button 
             onClick={handleJSONClick}
             className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-xl group transition-all"
          >
             <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-gray-200 transition-colors">
                    <FileJson className="w-5 h-5" />
                </div>
                <div className="text-left">
                    <h4 className="font-bold text-gray-700 text-sm">Download Raw JSON Backup</h4>
                    <p className="text-xs text-gray-400">Complete backup of all progress data.</p>
                </div>
             </div>
             <Download className="w-4 h-4 text-gray-300 group-hover:text-gray-600" />
          </button>

        </div>
      </div>
    </div>
  );
};

export default DataExportModal;
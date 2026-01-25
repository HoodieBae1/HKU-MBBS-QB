import React, { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, FileJson, Download, FileText, AlertCircle, Loader2, ChevronDown, Flag, StickyNote } from 'lucide-react';
import { supabase } from './supabase';

const DataExportModal = ({ 
    isOpen, 
    onClose, 
    questions, 
    userProgress, 
    onDownloadJson,
    userId 
}) => {
  const [copyStatus, setCopyStatus] = useState('idle');
  
  // --- NEW: Export Mode State (Flagged vs Notes) ---
  const [exportMode, setExportMode] = useState('flagged'); // 'flagged' | 'notes'

  // --- Filter States for Export ---
  const [exportTopic, setExportTopic] = useState('All');
  const [exportSubtopic, setExportSubtopic] = useState('All');

  // Helper: Check if a question meets the current export mode criteria
  const meetsCriteria = (progress, mode) => {
      if (!progress) return false;
      if (mode === 'flagged') return progress.is_flagged === true;
      if (mode === 'notes') return progress.notes && progress.notes.trim().length > 0;
      return false;
  };

  // Reset filters when mode changes
  useEffect(() => {
      setExportTopic('All');
      setExportSubtopic('All');
  }, [exportMode]);

  // --- 1. DERIVE AVAILABLE TOPICS ---
  const availableTopics = useMemo(() => {
    // Find questions matching the current mode (Flagged or Has Notes)
    const matchingQuestions = questions.filter(q => {
        const progress = userProgress[String(q.unique_id)];
        return meetsCriteria(progress, exportMode);
    });
    
    const topics = [...new Set(matchingQuestions.map(q => q.topic))];
    return ['All', ...topics.sort()];
  }, [questions, userProgress, exportMode]);

  // --- 2. DERIVE AVAILABLE SUBTOPICS ---
  const availableSubtopics = useMemo(() => {
    if (exportTopic === 'All') return ['All'];

    const matchingInTopic = questions.filter(q => {
        const progress = userProgress[String(q.unique_id)];
        return meetsCriteria(progress, exportMode) && q.topic === exportTopic;
    });

    const subtopics = [...new Set(matchingInTopic.map(q => q.subtopic))];
    return ['All', ...subtopics.sort()];
  }, [questions, userProgress, exportTopic, exportMode]);

  // --- 3. CALCULATE MATCHING COUNT ---
  const filteredCount = useMemo(() => {
    return questions.filter(q => {
        const progress = userProgress[String(q.unique_id)];
        const matchesCriteria = meetsCriteria(progress, exportMode);
        const matchesTopic = exportTopic === 'All' || q.topic === exportTopic;
        const matchesSubtopic = exportSubtopic === 'All' || q.subtopic === exportSubtopic;
        return matchesCriteria && matchesTopic && matchesSubtopic;
    }).length;
  }, [questions, userProgress, exportTopic, exportSubtopic, exportMode]);

  if (!isOpen) return null;

  const handleTopicChange = (e) => {
    setExportTopic(e.target.value);
    setExportSubtopic('All');
  };

  const logExportAction = async (type, count) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('export_logs')
        .insert({
          user_id: userId,
          export_type: type,
          record_count: count,
          user_agent: navigator.userAgent
        });
      if (error) console.error("Failed to log export:", error);
    } catch (err) {
      console.error("Logging error:", err);
    }
  };

  const handleCopyFormatted = async () => {
    setCopyStatus('loading');

    try {
      // 1. Filter Questions
      const matchingQuestions = questions.filter(q => {
        const progress = userProgress[String(q.unique_id)];
        const matchesCriteria = meetsCriteria(progress, exportMode);
        const matchesTopic = exportTopic === 'All' || q.topic === exportTopic;
        const matchesSubtopic = exportSubtopic === 'All' || q.subtopic === exportSubtopic;
        return matchesCriteria && matchesTopic && matchesSubtopic; 
      });

      if (matchingQuestions.length === 0) {
        alert("No questions match your selection.");
        setCopyStatus('idle');
        return;
      }

      // 2. Sort: MCQ First, then by Date
      matchingQuestions.sort((a, b) => {
        const progA = userProgress[String(a.unique_id)];
        const progB = userProgress[String(b.unique_id)];
        if (a.type !== b.type) return a.type === 'MCQ' ? -1 : 1;
        const dateA = new Date(progA.updated_at || progA.created_at || 0).getTime();
        const dateB = new Date(progB.updated_at || progB.created_at || 0).getTime();
        return dateB - dateA;
      });

      const title = exportMode === 'flagged' ? 'Flagged Questions Export' : 'My Notes Export';
      const color = exportMode === 'flagged' ? '#0f766e' : '#ea580c'; // Teal vs Orange

      // 3. Construct HTML
      let htmlContent = `
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h1 style="color: ${color}; border-bottom: 3px solid ${color}; padding-bottom: 10px;">${title}</h1>
          <p style="color: #666; margin-bottom: 30px;">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Total Questions:</strong> ${matchingQuestions.length}<br/>
            <strong>Filter:</strong> ${exportTopic} ${exportSubtopic !== 'All' ? `/ ${exportSubtopic}` : ''}
          </p>
      `;

      matchingQuestions.forEach((q, index) => {
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
      await logExportAction(exportMode === 'flagged' ? 'HTML_COPY_FLAGGED' : 'HTML_COPY_NOTES', matchingQuestions.length);
      
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 4000);

    } catch (err) {
      console.error("Export failed:", err);
      setCopyStatus('error');
    }
  };

  const handleJSONClick = async () => {
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
          
          {/* Option 1: Formatted Copy (Tabs for Flagged/Notes) */}
          <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl overflow-hidden">
             
             {/* Tabs */}
             <div className="flex border-b border-indigo-100">
                <button 
                  onClick={() => setExportMode('flagged')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors
                    ${exportMode === 'flagged' ? 'bg-white text-indigo-600' : 'bg-indigo-50/50 text-gray-500 hover:bg-indigo-50'}`}
                >
                  <Flag className="w-4 h-4" /> Flagged
                </button>
                <button 
                  onClick={() => setExportMode('notes')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors border-l border-indigo-100
                    ${exportMode === 'notes' ? 'bg-white text-indigo-600' : 'bg-indigo-50/50 text-gray-500 hover:bg-indigo-50'}`}
                >
                  <StickyNote className="w-4 h-4" /> With Notes
                </button>
             </div>

             <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-indigo-900 text-sm">
                            {exportMode === 'flagged' ? 'Copy Flagged for Google Docs' : 'Copy Notes for Google Docs'}
                        </h4>
                        <p className="text-xs text-indigo-700/70 mt-1 leading-relaxed">
                            {exportMode === 'flagged' 
                                ? "Compiles flagged items into a formatted list. Includes your selection, correct answers, and notes."
                                : "Compiles all questions where you've added personal notes or comments."}
                        </p>
                    </div>
                </div>

                {/* --- FILTERS --- */}
                {availableTopics.length > 1 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="relative">
                            <select 
                                value={exportTopic}
                                onChange={handleTopicChange}
                                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 text-xs py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
                            >
                                {availableTopics.map(topic => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="relative">
                            <select 
                                value={exportSubtopic}
                                onChange={(e) => setExportSubtopic(e.target.value)}
                                disabled={exportTopic === 'All'}
                                className={`w-full appearance-none border text-gray-700 text-xs py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:border-indigo-500 font-medium
                                    ${exportTopic === 'All' ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:bg-white'}`}
                            >
                                {availableSubtopics.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={handleCopyFormatted}
                    disabled={copyStatus === 'loading' || filteredCount === 0}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 
                    ${copyStatus === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : 
                        filteredCount === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 
                        'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                    {copyStatus === 'loading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : copyStatus === 'success' ? (
                        <><Check className="w-4 h-4" /> Copied! Ready to Paste.</>
                    ) : copyStatus === 'error' ? (
                        <><AlertCircle className="w-4 h-4" /> Error Copying</>
                    ) : (
                        <><Copy className="w-4 h-4" /> Copy {filteredCount} {exportMode === 'flagged' ? 'Flagged' : 'Note'} Item{filteredCount !== 1 ? 's' : ''}</>
                    )}
                </button>
                {copyStatus === 'success' && (
                    <p className="text-[10px] text-green-600 font-bold text-center mt-2 animate-pulse">
                        Open Google Docs or Word and press Ctrl+V / Cmd+V
                    </p>
                )}
             </div>
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
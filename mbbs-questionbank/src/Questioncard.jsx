import React, { useState, useEffect } from 'react'; 
import { ChevronDown, ChevronUp, CheckCircle2, Bot, BrainCircuit, CheckSquare, Square, StickyNote, Flag, Sparkles, Loader2, AlertCircle, Award } from 'lucide-react';
import { supabase } from './supabase'; 
import ReactMarkdown from 'react-markdown'; 
import RichTextEditor from './RichTextEditor'; 

const QuestionCard = ({ data, index, isCompleted, isFlagged, hasNotes, existingResponse, score, maxScore, onToggleComplete, onToggleFlag, onReviewNotes, initialSelection }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  
  // 1. Initialize State
  const [saqInput, setSaqInput] = useState('');
  const [userHasEdited, setUserHasEdited] = useState(false);

  // AI Analysis State
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const isMCQ = data.type === 'MCQ';

  // --- SYNC WITH DB ---
  useEffect(() => {
    // MCQ Selection Sync
    if (initialSelection !== undefined && initialSelection !== null) {
      setSelectedOption(initialSelection);
      setIsRevealed(true);
    } else if (!isCompleted) {
      setSelectedOption(null);
      setIsRevealed(false);
      setAnalysisData(null); 
      setAnalysisError(null);
    }
    
    // --- DATABASE SYNC LOGIC ---
    // If the user hasn't touched the keyboard yet, keep the text box in sync with the DB.
    // This ensures that when the data loads from Supabase, the box fills up automatically.
    if (!userHasEdited) {
        setSaqInput(existingResponse || '');
    }
  }, [initialSelection, isCompleted, existingResponse, userHasEdited]);

  // --- HANDLERS ---

  // Handle Input Changes from Editor
  const handleSaqChange = (val) => {
    // Only mark as edited if the content is actually different to prevent 
    // initial render loops from libraries like Quill
    setSaqInput(val);
    setUserHasEdited(true);
  };

  // Helper to determine which data to send up
  const getCurrentAnswerData = () => {
      // THE FIX:
      // If user has edited, send their draft.
      // If NOT, send 'existingResponse' (the DB prop) directly. 
      // This bypasses any stale local state issues.
      return userHasEdited ? saqInput : (existingResponse || '');
  };

  const handleMCQSelect = (idx) => {
    if (selectedOption !== null) return; 
    setSelectedOption(idx);
    setIsRevealed(true); 
    onToggleComplete(idx, getCurrentAnswerData());
  };

  const handleMarkDoneClick = () => {
    onToggleComplete(selectedOption, getCurrentAnswerData());
  };

  const handleNotesClick = () => {
    onReviewNotes(getCurrentAnswerData());
  };
  
  // --- AI FUNCTION ---
  const handleRequestAI = async () => {
    if (analysisData) return; 

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Please refresh the page, you appear to be logged out.");

      const response = await fetch('https://qzoreybelgjynenkwobi.supabase.co/functions/v1/gemini-tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          question_id: data.unique_id, 
          question: data.question,
          official_answer: data.official_answer,
          options: data.options,
          type: data.type
        })
      });

      const responseData = await response.json();

      if (!response.ok) throw new Error(responseData.error || "Server error");

      setAnalysisData(responseData.analysis); 
        
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || "Unable to reach the AI Professor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getOptionStyle = (idx) => {
    if (selectedOption === null) return 'hover:bg-slate-50 cursor-pointer border-gray-200';
    if (idx === data.correctAnswerIndex) return 'bg-emerald-100 border-emerald-500 text-emerald-800 font-medium';
    if (idx === selectedOption) return 'bg-red-50 border-red-300 text-red-700'; 
    return 'opacity-50 border-gray-100'; 
  };

  const displayMaxScore = maxScore || (isMCQ ? 1 : '-');

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${isCompleted ? 'bg-green-50/50 border-green-200 opacity-75' : 'bg-white border-gray-200'} ${isFlagged ? 'ring-2 ring-orange-300 ring-offset-2' : ''}`}>
       
       <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
         <div className="flex gap-2 text-xs font-semibold">
          <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded border border-teal-200">
            {data.topic}
          </span>
          <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded border border-slate-300 truncate max-w-[150px] md:max-w-none">
            {data.subtopic}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          
          {isCompleted && (score !== undefined && score !== null) && (
              <div className={`flex items-center gap-1 px-2 py-1 border rounded text-xs font-bold font-mono mr-1 ${
                  score === displayMaxScore 
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
                  {score} / {displayMaxScore}
              </div>
          )}

          <button
            onClick={onToggleFlag}
            className={`flex items-center justify-center p-1.5 rounded transition-colors ${
              isFlagged 
                ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            }`}
          >
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleNotesClick}
            className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${
                hasNotes 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200' 
                : 'bg-white text-gray-500 border border-gray-200 hover:text-teal-600 hover:border-teal-300'
            }`}
          >
            <StickyNote className={`w-4 h-4 ${hasNotes ? 'fill-yellow-500 text-yellow-600' : ''}`} />
            {hasNotes ? 'View Notes' : 'Notes'}
          </button>

          <button 
            onClick={handleMarkDoneClick}
            className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${
              isCompleted 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-gray-400 border border-gray-200 hover:text-teal-600 hover:border-teal-300'
            }`}
          >
            {isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {isCompleted ? 'Done' : 'Mark Done'}
          </button>
          
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            {data.id}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg text-gray-800 font-medium leading-relaxed whitespace-pre-line mb-6">
          <span className="font-bold text-gray-400 mr-2">Q{index + 1}.</span>
          {data.question}
        </h3>

        {isMCQ && data.options && (
          <div className="flex flex-col gap-3">
            {data.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(i)}
                disabled={selectedOption !== null}
                className={`w-full text-left px-4 py-3 border rounded-lg transition-all duration-200 ${getOptionStyle(i)}`}
              >
                <span className="mr-3 font-mono text-xs uppercase text-gray-500">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {!isMCQ && (
            <div className="mb-4">
                {isCompleted && (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        Your Response
                    </div>
                )}
                
                {/* Updated SAQ Input using RichTextEditor */}
                <div className={`${isCompleted ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
                    <RichTextEditor 
                        value={saqInput}
                        onChange={handleSaqChange} 
                        placeholder="Type your answer here before checking solutions..."
                        readOnly={isCompleted} 
                    />
                </div>
            </div>
        )}

        {isRevealed && (
          <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4" />
                Goddisk Answer
              </div>
              <p className="text-emerald-900 whitespace-pre-line leading-relaxed">
                {data.official_answer}
              </p>
            </div>

            {data.ai_answer && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 relative overflow-hidden">
                <BrainCircuit className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-100/50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm uppercase tracking-wide">
                    <Bot className="w-4 h-4" />
                    AI Summary
                  </div>
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 border ${data.ai_answer.agreement === 'Agree' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {data.ai_answer.agreement}
                    </span>
                    <p className="text-indigo-900 leading-relaxed italic text-sm">"{data.ai_answer.explanation}"</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-violet-100 rounded-lg overflow-hidden bg-white shadow-sm">
                
                {analysisData && (
                  <div className="p-5 bg-gradient-to-br from-white to-violet-50/30">
                     <div className="flex items-center gap-2 mb-3 pb-3 border-b border-violet-100">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span className="font-bold text-sm text-violet-900 uppercase tracking-wide">AI Professor's Detailed Analysis</span>
                     </div>
                     
                     <div className="text-slate-700 font-serif text-sm leading-relaxed">
                       <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold text-violet-900 mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold text-violet-800 mt-4 mb-2 uppercase tracking-wide" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold text-violet-700 mt-3 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-violet-950" {...props} />,
                          }}
                       >
                         {analysisData}
                       </ReactMarkdown>
                     </div>

                  </div>
                )}

                {!analysisData && !isAnalyzing && (
                  <button 
                    onClick={handleRequestAI}
                    className="w-full p-4 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center justify-center gap-2 group text-violet-700 font-medium"
                  >
                    <div className="p-1 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                    </div>
                    Detailed Explanation (Using Gemini 2.5 Flash)
                  </button>
                )}

                {isAnalyzing && (
                  <div className="p-8 flex flex-col items-center justify-center text-center bg-violet-50/50">
                    <Loader2 className="w-6 h-6 text-violet-600 animate-spin mb-2" />
                    <p className="text-xs text-violet-600 font-bold uppercase tracking-wider animate-pulse">Consulting Professor AI...</p>
                  </div>
                )}

                {analysisError && (
                  <div className="p-3 bg-red-50 flex items-center justify-between text-xs text-red-600">
                    <div className="flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" />
                       <span>{analysisError}</span>
                    </div>
                    <button onClick={() => setAnalysisError(null)} className="underline hover:text-red-800">Dismiss</button>
                  </div>
                )}
            </div>

          </div>
        )}
      </div>

      {!isMCQ && (
        <button 
          onClick={() => setIsRevealed(!isRevealed)}
          className="w-full py-3 bg-gray-50 border-t border-gray-100 text-sm font-semibold text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          {isRevealed ? <><span className="mr-1">Hide Solutions</span> <ChevronUp className="w-4 h-4"/></> : <><span className="mr-1">Show Solutions</span> <ChevronDown className="w-4 h-4"/></>}
        </button>
      )}
    </div>
  );
};

export default QuestionCard;
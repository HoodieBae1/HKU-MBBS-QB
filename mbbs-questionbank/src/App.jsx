import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, Loader2, ArrowUpDown, LogOut, Search, X, ChevronDown, ChevronUp, SlidersHorizontal, GitCommit, Trophy, BarChart3, PieChart, StickyNote, Users, MessageCircleWarning, KeyRound, Download, Zap, ZapOff } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { supabase } from './supabase';
import QuestionCard from './QuestionCard';
import CompletionModal from './CompletionModal';
import Auth from './Auth';
import VersionHistory from './VersionHistory';
import UpdateManager from './UpdateManager';
import AdminDashboard from './AdminDashboard';
import UserStats from './UserStats';
import NotesPanel from './NotesPanel';
import ProgressPanel from './ProgressPanel';
import RecruiterDashboard from './RecruiterDashboard';
import FeedbackModal from './FeedbackModal';
import QuotaDisplay from './QuotaDisplay';
import ReleaseNotesModal from './ReleaseNotesModal';
import AIUsageDisplay from './AIUsageDisplay'; 
import { APP_VERSION } from './appVersion';

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

const App = () => {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- UI STATE PERSISTENCE ---
  const [viewState, setViewState] = useState({}); 
  const [aiState, setAiState] = useState({}); 
  
  // --- NEW: AI ENABLED TOGGLE ---
  const [aiEnabled, setAiEnabled] = useStickyState(true, 'app_ai_enabled');
  // ------------------------------

  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showRecruiterDash, setShowRecruiterDash] = useState(false);
  
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseNoteData, setReleaseNoteData] = useState(null);
  
  const [showUserStats, setShowUserStats] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [modalViewMode, setModalViewMode] = useState('FULL'); 

  const [filtersOpen, setFiltersOpen] = useStickyState(true, 'app_filtersOpen');
  
  const [searchInput, setSearchInput] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTopic, setSelectedTopic] = useStickyState('All', 'app_selectedTopic');
  const [selectedSubtopic, setSelectedSubtopic] = useStickyState('All', 'app_selectedSubtopic');
  const [selectedType, setSelectedType] = useStickyState('All', 'app_selectedType');
  const [sortOrder, setSortOrder] = useStickyState('Newest', 'app_sortOrder');
  
  const initialScrollIndex = useMemo(() => {
    const saved = window.localStorage.getItem('app_scrollIndex');
    return saved ? parseInt(saved, 10) : 0;
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [pendingMCQSelection, setPendingMCQSelection] = useState(null);
  const [modalInitialData, setModalInitialData] = useState(null); 

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300); 

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) {
        fetchUserProgress(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setShowPasswordResetModal(true);
      if(session) {
        fetchUserProgress(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setUserProgress({});
        setIsAdmin(false);
        setIsRecruiter(false);
      }
    });

    fetch('/questions.json')
      .then(res => res.json())
      .then(data => {
        const cleanData = Array.isArray(data) ? data.map(q => ({
          ...q,
          unique_id: q.unique_id !== undefined ? q.unique_id : `missing-${Math.random()}`,
          id: q.id || `No ID`, 
          topic: q.topic?.trim() || 'Uncategorized', 
          subtopic: q.subtopic?.trim() || 'General', 
          type: q.type || 'SAQ',
          options: Array.isArray(q.options) ? q.options : [],
          randomSeed: Math.random() 
        })) : [];
        setQuestions(cleanData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load questions.json");
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    const checkVersion = async () => {
      const lastSeenVersion = localStorage.getItem('app_last_seen_version');
      if (lastSeenVersion !== APP_VERSION) {
        try {
          const res = await fetch(`/version.json?t=${new Date().getTime()}`);
          const data = await res.json();
          const currentNotes = data.history.find(h => h.version === APP_VERSION);
          if (currentNotes) {
            setReleaseNoteData(currentNotes);
            setShowReleaseModal(true);
          }
        } catch (e) {
          console.error("Failed to fetch release notes", e);
        }
      }
    };
    checkVersion();
  }, []);

  const handleCloseReleaseNotes = () => {
    localStorage.setItem('app_last_seen_version', APP_VERSION);
    setShowReleaseModal(false);
  };

  const fetchUserProgress = async (userId) => {
    const { data: progressData, error } = await supabase
      .from('user_progress')
      .select('id, question_id, notes, user_response, score, max_score, selected_option, is_flagged, created_at')
      .eq('user_id', userId);

    if (!error) {
      const progressMap = {};
      progressData.forEach(row => { progressMap[String(row.question_id)] = row; });
      setUserProgress(progressMap);
    }

    const { data: logData } = await supabase
        .from('ai_usage_logs')
        .select('question_id, model')
        .eq('user_id', userId);

    if (logData) {
        const historyMap = {};
        logData.forEach(log => {
            const qid = String(log.question_id);
            if (!historyMap[qid]) {
                historyMap[qid] = { purchasedModels: [] };
            }
            if (!historyMap[qid].purchasedModels.includes(log.model)) {
                historyMap[qid].purchasedModels.push(log.model);
            }
        });
        setAiState(historyMap); 
    }
  };

  const checkAdminStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('role').eq('id', userId).single();
      if (!error) {
          if (data?.role === 'admin') { setIsAdmin(true); setIsRecruiter(true); }
          if (data?.role === 'recruiter') { setIsRecruiter(true); }
      }
    } catch (e) { console.error("Role check failed", e); }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return alert("Please enter a password");
    setResetLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert("Error updating password: " + error.message);
    else {
      alert("Password updated successfully!");
      setShowPasswordResetModal(false);
      setNewPassword('');
    }
    setResetLoading(false);
  };

  const handleDownloadData = async () => {
    if (!questions.length || !session) return;
    const exportData = questions.map(q => {
        const progress = userProgress[String(q.unique_id)];
        if (!progress) return null;
        return {
            question_id: q.id,
            unique_id: q.unique_id,
            type: q.type,
            topic: q.topic,
            subtopic: q.subtopic,
            question_text: q.question,
            official_solution: q.official_answer,
            user_score: progress.score,
            max_score: progress.max_score,
            user_notes: progress.notes || "",
            user_written_response: progress.user_response || "",
            user_selected_option_index: progress.selected_option,
            is_flagged: progress.is_flagged,
            timestamp: progress.created_at
        };
    }).filter(item => item !== null); 

    if (exportData.length === 0) {
        alert("No progress data found to export.");
        return;
    }
    try {
        await supabase.from('export_logs').insert({
            user_id: session.user.id,
            record_count: exportData.length,
            user_agent: navigator.userAgent
        });
    } catch (logError) {}

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my_progress_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleProgressPanel = () => {
      if (!showProgressPanel) { setShowUserStats(false); setFiltersOpen(false); }
      setShowProgressPanel(!showProgressPanel);
  };

  const toggleUserStats = () => {
      if (!showUserStats) { setShowProgressPanel(false); setFiltersOpen(false); }
      setShowUserStats(!showUserStats);
  };

  const handleQuickFilter = (topic, subtopic) => {
    setSelectedTopic(topic); setSelectedSubtopic(subtopic);
    setShowUserStats(false); setShowProgressPanel(false);
  };

  const cleanHtmlContent = (html) => {
    if (!html) return null;
    const textOnly = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return textOnly.length === 0 ? null : html;
  };

  // --- HANDLERS FOR PERSISTENCE ---
  const handleViewStateChange = (uniqueId, key, value) => {
    setViewState(prev => ({
      ...prev,
      [uniqueId]: {
        ...prev[uniqueId],
        [key]: value
      }
    }));
  };

  const handleTextChange = (questionId, newText) => {
    setUserProgress(prev => {
        const idStr = String(questionId);
        const existing = prev[idStr] || {};
        return {
            ...prev,
            [idStr]: {
                ...existing,
                question_id: idStr, 
                user_response: newText
            }
        };
    });
  };

  const handleAIRequest = async (questionData, modelId) => {
    const idStr = String(questionData.unique_id);
    if (aiState[idStr]?.loadingModel) return;

    setAiState(prev => ({
        ...prev,
        [idStr]: {
            ...prev[idStr],
            loadingModel: modelId,
            error: null
        }
    }));

    try {
        if (!session) throw new Error("Please login.");

        const response = await fetch('https://qzoreybelgjynenkwobi.supabase.co/functions/v1/gemini-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                question_id: questionData.unique_id,
                question: questionData.question,
                official_answer: questionData.official_answer,
                options: questionData.options,
                type: questionData.type,
                model: modelId
            })
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || "Server error");

        setAiState(prev => {
            const currentEntry = prev[idStr] || {};
            const prevPurchased = currentEntry.purchasedModels || [];
            
            return {
                ...prev,
                [idStr]: {
                    ...currentEntry,
                    loadingModel: null,
                    data: responseData.analysis,
                    cost: responseData.cost,
                    meta: responseData.tokens,
                    selectedModel: modelId,
                    purchasedModels: prevPurchased.includes(modelId) ? prevPurchased : [...prevPurchased, modelId]
                }
            };
        });

    } catch (err) {
        console.error(err);
        setAiState(prev => ({
            ...prev,
            [idStr]: {
                ...prev[idStr],
                loadingModel: null,
                error: err.message || "AI Error"
            }
        }));
    }
  };

  const handleToggleFlag = async (questionData, currentDraftText) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const currentProgress = userProgress[idString] || {};
    const newFlagStatus = !currentProgress.is_flagged;

    const rawText = currentDraftText !== undefined ? currentDraftText : (currentProgress.user_response || null);
    const textToSave = cleanHtmlContent(rawText);

    const payload = {
      user_id: session.user.id,
      question_id: idString,
      is_flagged: newFlagStatus,
      user_response: textToSave,
      score: currentProgress.score ?? null,
      max_score: currentProgress.max_score ?? null,
      selected_option: currentProgress.selected_option ?? null,
      notes: currentProgress.notes || null,
      ...(currentProgress.id ? { id: currentProgress.id } : {})
    };
    
    setUserProgress(prev => ({ ...prev, [idString]: payload }));
    
    await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' });
  };

  const handleInitiateCompletion = async (questionData, mcqSelection, saqResponse, viewMode = 'FULL') => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const existingEntry = userProgress[idString];
    
    const isCurrentlyCompleted = existingEntry && (existingEntry.score !== null || existingEntry.selected_option !== null);

    if (questionData.type === 'MCQ') {
       if (isCurrentlyCompleted && existingEntry.selected_option === mcqSelection) {
           const hasDataToKeep = (existingEntry.notes && cleanHtmlContent(existingEntry.notes) !== null) || 
                                 (existingEntry.user_response && cleanHtmlContent(existingEntry.user_response) !== null) ||
                                 existingEntry.is_flagged;

           if (hasDataToKeep) {
                const payload = { 
                    ...existingEntry, 
                    score: null, 
                    max_score: null, 
                    selected_option: null,
                    notes: existingEntry.notes, 
                    user_response: existingEntry.user_response,
                    is_flagged: existingEntry.is_flagged
                };
                setUserProgress(prev => ({ ...prev, [idString]: payload }));
                await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' });
           } else {
                const newProgress = { ...userProgress };
                delete newProgress[idString];
                setUserProgress(newProgress);
                await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
           }
           return;
       }

       const isCorrect = mcqSelection === questionData.correctAnswerIndex;
       const score = isCorrect ? 1 : 0;
       
       const payload = {
         user_id: session.user.id,
         question_id: idString,
         notes: existingEntry?.notes || null,
         user_response: existingEntry?.user_response || null, 
         score: score,
         max_score: 1, 
         selected_option: mcqSelection,
         is_flagged: existingEntry?.is_flagged || false
       };

       setUserProgress(prev => ({ ...prev, [idString]: { ...payload, id: existingEntry?.id } }));
       const { data, error } = await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' }).select();
       if (data && data.length > 0) setUserProgress(prev => ({ ...prev, [idString]: data[0] }));
       return; 
    }

    setPendingQuestion(questionData);
    setPendingMCQSelection(null);
    setModalViewMode(viewMode);
    setModalInitialData({ 
        user_response: saqResponse || '',
        score: null,
        max_score: null,
        notes: existingEntry?.notes || ''
    });
    setModalOpen(true);
  };

  const handleReviewNotes = (questionData, draftSaqResponse, viewMode = 'FULL') => {
    const idString = String(questionData.unique_id);
    const existingData = userProgress[idString];
    
    setPendingQuestion(questionData);
    setModalViewMode(viewMode); 

    let resolvedResponse = '';
    if (draftSaqResponse !== undefined && draftSaqResponse !== null) {
        resolvedResponse = draftSaqResponse;
    } else if (existingData && existingData.user_response) {
        resolvedResponse = existingData.user_response;
    }

    if (existingData) {
      setModalInitialData({ ...existingData, user_response: resolvedResponse });
    } else {
      setModalInitialData({
        notes: '',
        user_response: resolvedResponse,
        score: null,
        max_score: null,
        selected_option: null
      });
    }
    setModalOpen(true);
  };

  const handleConfirmCompletion = async (modalData) => {
    if (!session || !pendingQuestion) return;
    const idString = String(pendingQuestion.unique_id);
    const currentProgress = userProgress[idString] || {};

    let finalScore = modalData.score;
    if (pendingQuestion.type === 'MCQ') {
        if (pendingMCQSelection !== null) {
            const isCorrect = pendingMCQSelection === pendingQuestion.correctAnswerIndex;
            finalScore = isCorrect ? 1 : 0;
        } else if (modalInitialData && modalInitialData.score !== undefined) {
            finalScore = modalInitialData.score;
        }
    }

    const finalSelection = pendingQuestion.type === 'MCQ' 
        ? (pendingMCQSelection ?? modalInitialData?.selected_option) 
        : null;
    
    const cleanedNotes = cleanHtmlContent(modalData.notes);
    const cleanedResponse = cleanHtmlContent(modalData.user_response);

    const payload = {
      user_id: session.user.id,
      question_id: idString, 
      notes: cleanedNotes,
      user_response: cleanedResponse,
      score: finalScore,
      max_score: modalData.max_score, 
      selected_option: finalSelection,
      is_flagged: currentProgress.is_flagged || false
    };

    setModalOpen(false);
    setPendingQuestion(null);
    setPendingMCQSelection(null);

    const optimisticId = currentProgress.id; 
    setUserProgress(prev => ({ ...prev, [idString]: { ...payload, id: optimisticId } }));

    const { data, error } = await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' }).select();
    if (error) {
        alert(`Error saving: ${error.message}`);
        fetchUserProgress(session.user.id); 
    } else if (data && data.length > 0) {
        setUserProgress(prev => ({ ...prev, [idString]: data[0] }));
    }
  };

  const handleRedo = async (questionData) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const existingEntry = userProgress[idString];

    if (!existingEntry) return;

    // Reset score and selection, keep notes/response
    const payload = {
        ...existingEntry,
        user_id: session.user.id, 
        question_id: idString,
        score: null,
        max_score: null,
        selected_option: null,
        // user_response: null, 
        is_flagged: existingEntry.is_flagged
    };

    setUserProgress(prev => ({ ...prev, [idString]: payload }));
    await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' });
    
    // Also reset view state
    handleViewStateChange(idString, 'isRevealed', false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // --- COMPLETION CHECK ---
  const checkIsCompleted = (id) => {
    const p = userProgress[String(id)];
    if (!p) return false;
    const hasScore = p.score !== null && p.score !== undefined;
    const hasSelection = p.selected_option !== null && p.selected_option !== undefined;
    return hasScore || hasSelection;
  };
  // --------------------------------

  const checkIsFlagged = (id) => userProgress[String(id)]?.is_flagged === true;

  const filterCounts = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();
    const baseSet = questions.filter(q => {
       if (selectedType !== 'All' && q.type !== selectedType) return false;
       if (!qLower) return true;
       return (
          q.question?.toLowerCase().includes(qLower) ||
          q.official_answer?.toLowerCase().includes(qLower) ||
          q.id?.toLowerCase().includes(qLower) ||
          String(q.unique_id).toLowerCase().includes(qLower) || // Search by Unique ID
          q.ai_answer?.explanation?.toLowerCase().includes(qLower) ||
          (q.options && q.options.some(opt => opt.toLowerCase().includes(qLower)))
       );
    });
    const tCounts = {};
    baseSet.forEach(q => { tCounts[q.topic] = (tCounts[q.topic] || 0) + 1; });
    const sCounts = {};
    baseSet.forEach(q => {
        if (selectedTopic === 'All' || q.topic === selectedTopic) {
            sCounts[q.subtopic] = (sCounts[q.subtopic] || 0) + 1;
        }
    });
    return { tCounts, sCounts, totalMatchingSearch: baseSet.length };
  }, [questions, searchQuery, selectedType, selectedTopic]);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();
    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;
      if (qLower) {
        const match = 
          q.question?.toLowerCase().includes(qLower) ||
          q.official_answer?.toLowerCase().includes(qLower) ||
          q.id?.toLowerCase().includes(qLower) ||
          String(q.unique_id).toLowerCase().includes(qLower) || // Search by Unique ID
          q.ai_answer?.explanation?.toLowerCase().includes(qLower) ||
          (q.options && q.options.some(opt => opt.toLowerCase().includes(qLower)));
        if (!match) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      
      if (sortOrder === 'Random') {
          return a.randomSeed - b.randomSeed;
      }

      if (sortOrder === 'Notes') {
        const hasNotes = (qItem) => {
            const p = userProgress[String(qItem.unique_id)];
            if (!p || !p.notes) return false;
            return cleanHtmlContent(p.notes) !== null;
        };
        const aNotes = hasNotes(a);
        const bNotes = hasNotes(b);
        if (aNotes !== bNotes) return aNotes ? -1 : 1;
        return a.unique_id - b.unique_id;
      }

      if (sortOrder === 'Incorrect') {
        const getIncorrectStatus = (qItem) => {
            const p = userProgress[String(qItem.unique_id)];
            if (!p || p.score === null || p.score === undefined) return false;
            let max = p.max_score;
            if ((!max) && qItem.type === 'MCQ') max = 1;
            if (!max) return false; 
            return p.score < max;
        };
        const aInc = getIncorrectStatus(a);
        const bInc = getIncorrectStatus(b);
        if (aInc !== bInc) return aInc ? -1 : 1;
        return a.unique_id - b.unique_id;
      }
      if (sortOrder === 'Flagged') {
        const isAFlagged = checkIsFlagged(a.unique_id);
        const isBFlagged = checkIsFlagged(b.unique_id);
        if (isAFlagged !== isBFlagged) return isAFlagged ? -1 : 1;
        return a.unique_id - b.unique_id;
      }
      if (sortOrder === 'Completed' || sortOrder === 'Unfinished') {
        const isADone = checkIsCompleted(a.unique_id);
        const isBDone = checkIsCompleted(b.unique_id);
        if (isADone !== isBDone) {
          if (sortOrder === 'Completed') return isADone ? -1 : 1;
          if (sortOrder === 'Unfinished') return isADone ? 1 : -1;
        }
        return a.unique_id - b.unique_id;
      }

      if (sortOrder === 'Oldest' || sortOrder === 'Newest') {
        const getYearFromId = (idStr) => {
            if (!idStr || !idStr.startsWith('M')) return 0;
            const yy = parseInt(idStr.substring(1, 3), 10);
            if (isNaN(yy)) return 0;
            return yy < 50 ? 2000 + yy : 1900 + yy;
        };

        const yearA = getYearFromId(a.id);
        const yearB = getYearFromId(b.id);

        if (yearA !== yearB) {
            return sortOrder === 'Newest' ? yearB - yearA : yearA - yearB;
        }
        
        return sortOrder === 'Newest' 
            ? b.id.localeCompare(a.id, undefined, { numeric: true }) 
            : a.id.localeCompare(b.id, undefined, { numeric: true });
      }

      return a.unique_id - b.unique_id;
    });
  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder, userProgress, searchQuery]);

  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;

  const topicsList = Object.keys(filterCounts.tCounts).sort();
  const subtopicsList = Object.keys(filterCounts.sCounts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalQuestionsCount = filteredQuestions.length;
  const completedCount = filteredQuestions.filter(q => checkIsCompleted(q.unique_id)).length;
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 relative transition-[margin] duration-300 ease-in-out ${modalOpen ? 'md:mr-[600px]' : 'mr-0'}`}>
      <UpdateManager />
      <ReleaseNotesModal isOpen={showReleaseModal} onClose={handleCloseReleaseNotes} data={releaseNoteData} />
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
        user={session?.user} 
        isAdmin={isAdmin}
      />
      
      {showPasswordResetModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
             <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                   <KeyRound className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
                <p className="text-sm text-gray-500">Please enter your new password below.</p>
             </div>
             <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-teal-500" />
             <button onClick={handleUpdatePassword} disabled={resetLoading} className="w-full py-3 bg-teal-700 text-white font-bold rounded-lg hover:bg-teal-800 transition-colors flex justify-center">
                {resetLoading ? <Loader2 className="animate-spin" /> : "Save New Password"}
             </button>
          </div>
        </div>
      )}

      <CompletionModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleConfirmCompletion}
        question={pendingQuestion}
        type={pendingQuestion?.type}
        initialData={modalInitialData}
        viewMode={modalViewMode}
      />
      
      {showDashboard && <AdminDashboard onClose={() => setShowDashboard(false)} questions={questions} />}
      {showHistory && <VersionHistory onClose={() => setShowHistory(false)} />}
      {showNotesPanel && <NotesPanel onClose={() => setShowNotesPanel(false)} questions={questions} userProgress={userProgress} />}
      {showRecruiterDash && <RecruiterDashboard onClose={() => setShowRecruiterDash(false)} />}
      
      <div className="sticky top-0 z-40">
        <header className="bg-teal-700 text-white shadow-md relative">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
             <div className="flex items-center gap-3">
              <Stethoscope className="w-7 h-7 text-teal-200" />
              <div>
                <h1 className="text-lg font-bold">HKU M26 MBBS Finals</h1>
                <div className="flex items-center gap-2 text-[10px] text-teal-200 uppercase tracking-wider">
                  <span>Question Bank</span>
                  <span className="px-1.5 py-0.5 bg-teal-800 rounded text-teal-100 opacity-80 font-mono">v{APP_VERSION}</span>
                  <div className="ml-2 border-l border-teal-600 pl-2 flex gap-2 items-center">
                    <QuotaDisplay session={session}/>
                    <AIUsageDisplay session={session}/>
                    
                    {/* --- AI TOGGLE BUTTON --- */}
                    <button 
                        onClick={() => setAiEnabled(!aiEnabled)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
                            aiEnabled 
                            ? 'bg-violet-600 border-violet-400 text-white hover:bg-violet-500' 
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                        }`}
                        title={aiEnabled ? "AI Features Enabled" : "AI Features Disabled (Safe Mode)"}
                    >
                        {aiEnabled ? <Zap className="w-3 h-3 fill-current" /> : <ZapOff className="w-3 h-3" />}
                        <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                            {aiEnabled ? 'PROF. AI' : 'PROF. AI'}
                        </span>
                    </button>
                    {/* ------------------------ */}

                  </div>
                </div>
              </div>
            </div>
             <div className="flex items-center gap-2">
                {isRecruiter && (
                    <button onClick={() => setShowRecruiterDash(true)} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition shadow-sm border border-indigo-400 mr-2" title="Recruiter Dashboard"><Users className="w-5 h-5" /></button>
                )}
                {isAdmin && (
                    <button onClick={() => setShowDashboard(true)} className="p-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-full transition shadow-sm border border-indigo-500 mr-2"><Trophy className="w-5 h-5 text-yellow-300" /></button>
                )}
                <button onClick={() => setShowNotesPanel(true)} className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white mr-1" title="My Notes"><StickyNote className="w-5 h-5" /></button>
                <button onClick={handleDownloadData} className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white" title="Download My Data"><Download className="w-5 h-5" /></button>
                <button onClick={() => setShowFeedbackModal(true)} className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white mr-1" title="Report Bug / Suggestion"><MessageCircleWarning className="w-5 h-5" /></button>
                <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white mr-1"><GitCommit className="w-5 h-5" /></button>
                <div className="hidden md:block text-right border-l border-teal-600 pl-4 ml-2">
                    <p className="text-xs text-teal-100">Logged in as</p>
                    <p className="text-xs font-bold">{session.user.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-teal-600 rounded-full transition ml-1"><LogOut className="w-5 h-5" /></button>
             </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-200 shadow-sm relative">
           <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-grow flex items-center gap-3">
                <div onClick={toggleProgressPanel} className={`flex-grow flex flex-col justify-center cursor-pointer group p-2 -ml-2 rounded-lg transition-colors ${showProgressPanel ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span className={`${showProgressPanel ? 'text-indigo-600' : 'group-hover:text-indigo-600 transition-colors'}`}>{showProgressPanel ? 'Hide Progress' : 'View Progress Breakdown'}</span>
                      <span className="text-teal-600">{completedCount} / {totalQuestionsCount} ({progressPercentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-teal-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
                <button onClick={toggleUserStats} className={`p-2 rounded-lg border transition-all duration-200 ${showUserStats ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-600'}`}><BarChart3 className="w-5 h-5" /></button>
              </div>
              <button onClick={() => setFiltersOpen(!filtersOpen)} className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 text-sm font-semibold ${filtersOpen ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{filtersOpen ? 'Hide Filters' : 'Show Filters'}</span>
                {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            
            <div className="relative">
                <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${filtersOpen ? 'grid-rows-[1fr] opacity-100 mt-4 pb-2' : 'grid-rows-[0fr] opacity-0 mt-0 pb-0'}`}>
                  <div className="min-h-0 flex flex-col gap-3">
                    <div className="relative w-full">
                        <input type="text" placeholder="Search..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                        {searchInput && <button onClick={() => setSearchInput('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative">
                            <select value={selectedTopic} onChange={(e) => {setSelectedTopic(e.target.value); setSelectedSubtopic('All')}} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white truncate pr-8">
                              <option value="All">All Topics ({filterCounts.totalMatchingSearch})</option>
                              {topicsList.map(t => <option key={t} value={t}>{t} ({filterCounts.tCounts[t]})</option>)}
                            </select>
                            <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                        </div>
                        <div className="relative">
                            <select value={selectedSubtopic} onChange={(e) => setSelectedSubtopic(e.target.value)} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white truncate pr-8">
                              <option value="All">All Subtopics</option>
                              {subtopicsList.map(t => <option key={t} value={t}>{t} ({filterCounts.sCounts[t]})</option>)}
                            </select>
                            <BookOpen className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                        </div>
                        <div className="relative">
                            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white">
                              <option value="All">All Types</option>
                              <option value="MCQ">MCQ</option>
                              <option value="SAQ">SAQ</option>
                            </select>
                        </div>
                        <div className="relative">
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white">
                              <option value="Newest">Newest First</option>
                              <option value="Oldest">Oldest First</option>
                              <option value="Notes">With Notes First</option>
                              <option value="Random">Random Order</option>
                              <option value="Incorrect">Incorrect First</option>
                              <option value="Completed">Completed First</option>
                              <option value="Unfinished">Unfinished First</option>
                              <option value="Flagged">Flagged First</option>
                              <option value="Original">Original Order</option>
                            </select>
                            <ArrowUpDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                        </div>
                    </div>
                  </div>
                </div>
                <div className={`grid transition-all duration-500 ease-in-out ${showUserStats ? 'grid-rows-[1fr] opacity-100 border-t border-gray-100 shadow-lg' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="min-h-0 overflow-hidden bg-slate-50">
                        {showUserStats && <UserStats questions={questions} userProgress={userProgress} onFilterSelect={handleQuickFilter} />}
                    </div>
                </div>
                <div className={`grid transition-all duration-500 ease-in-out ${showProgressPanel ? 'grid-rows-[1fr] opacity-100 border-t border-gray-100 shadow-lg' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="min-h-0 overflow-hidden bg-slate-50">
                        {showProgressPanel && <ProgressPanel questions={questions} userProgress={userProgress} onFilterSelect={handleQuickFilter} />}
                    </div>
                </div>
            </div>
           </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 z-0">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-gray-400" /></div>
            <p className="text-gray-500 font-medium">No questions found matching your filters.</p>
          </div>
        ) : (
          <Virtuoso
            useWindowScroll
            data={filteredQuestions}
            initialTopMostItemIndex={initialScrollIndex}
            rangeChanged={({ startIndex }) => { window.localStorage.setItem('app_scrollIndex', startIndex); }}
            itemContent={(index, q) => {
                const idStr = String(q.unique_id);
                const isCompleted = checkIsCompleted(q.unique_id);
                const isFlagged = checkIsFlagged(q.unique_id);
                const progress = userProgress[idStr];
                
                const hasNotes = progress?.notes && cleanHtmlContent(progress.notes) !== null;
                const existingResponse = progress?.user_response || '';
                const score = progress?.score;
                const maxScore = progress?.max_score;

                // --- PERSISTENT STATE ---
                const isRevealedOverride = viewState[idStr]?.isRevealed || false;
                const currentAiState = aiState[idStr] || {};
                // -----------------------------

                return (
                    <div className="pb-6">
                        <QuestionCard 
                          key={q.unique_id} 
                          data={q} 
                          index={index} 
                          
                          isCompleted={isCompleted} 
                          isFlagged={isFlagged}
                          hasNotes={hasNotes}
                          existingResponse={existingResponse} 
                          score={score}
                          maxScore={maxScore}
                          initialSelection={progress ? progress.selected_option : null}

                          // --- PASSED STATE & HANDLERS ---
                          isRevealedOverride={isRevealedOverride}
                          onToggleReveal={(val) => handleViewStateChange(idStr, 'isRevealed', val)}
                          onTextChange={(val) => handleTextChange(idStr, val)}
                          aiState={currentAiState} 
                          onRequestAI={(modelId) => handleAIRequest(q, modelId)}
                          aiEnabled={aiEnabled} // <--- PASSED HERE
                          // -------------------------------
                          
                          onToggleComplete={(mcqSelection, saqResponse, viewMode) => handleInitiateCompletion(q, mcqSelection, saqResponse, viewMode)} 
                          onReviewNotes={(draft, viewMode) => handleReviewNotes(q, draft, viewMode)}
                          onToggleFlag={(draft) => handleToggleFlag(q, draft)}
                          onRedo={() => handleRedo(q)}
                        />
                    </div>
                );
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
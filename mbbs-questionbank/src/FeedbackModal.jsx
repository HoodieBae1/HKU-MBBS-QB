import React, { useState, useEffect } from 'react';
import { 
  X, Send, Bug, Lightbulb, MessageSquare, Loader2, CheckCircle2, 
  ThumbsUp, ChevronRight, MessageCircle, ArrowLeft, AlertCircle, Trash2 
} from 'lucide-react';
import { supabase } from './supabase';

const FeedbackModal = ({ isOpen, onClose, user, isAdmin = false }) => { 
  const [activeTab, setActiveTab] = useState('new'); 
  const [selectedFeedback, setSelectedFeedback] = useState(null); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold">Feedback & Roadmap</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button 
            onClick={() => { setActiveTab('new'); setSelectedFeedback(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'new' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Submit New
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Community & Status
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {activeTab === 'new' && <SubmitFeedbackForm user={user} onClose={onClose} onSwitchTab={() => setActiveTab('list')} />}
          
          {activeTab === 'list' && !selectedFeedback && (
            <FeedbackList user={user} onSelect={setSelectedFeedback} />
          )}

          {activeTab === 'list' && selectedFeedback && (
            <FeedbackDetail 
              user={user} 
              isAdmin={isAdmin}
              feedback={selectedFeedback} 
              onBack={() => setSelectedFeedback(null)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: SUBMIT FORM (Unchanged) ---
const SubmitFeedbackForm = ({ user, onClose, onSwitchTab }) => {
  const [type, setType] = useState('Bug');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        email: user?.email,
        type: type,
        message: message
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
        onSwitchTab(); 
      }, 1500);
    } catch (error) {
      console.error(error);
      alert('Failed to send feedback.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Feedback Received!</h3>
        <p className="text-gray-500 text-sm">Thanks for helping us improve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="grid grid-cols-3 gap-3">
        {['Bug', 'Suggestion', 'Other'].map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${type === t ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-teal-300 hover:bg-slate-50'}`}>
            {t === 'Bug' && <Bug className="w-6 h-6 mb-2" />}
            {t === 'Suggestion' && <Lightbulb className="w-6 h-6 mb-2" />}
            {t === 'Other' && <MessageSquare className="w-6 h-6 mb-2" />}
            <span className="text-xs font-bold uppercase tracking-wide">{t}</span>
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{type === 'Bug' ? 'Describe the issue:' : type === 'Suggestion' ? 'What feature should we add?' : 'Your Message:'}</label>
        <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please be as specific as possible..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm shadow-sm" />
      </div>
      <button disabled={loading} className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Feedback</>}
      </button>
    </form>
  );
};

// --- SUB-COMPONENT: FEEDBACK LIST ---
const FeedbackList = ({ user, onSelect }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState('All'); 
  // FIX: Default Sort is now 'Newest'
  const [sortOrder, setSortOrder] = useState('Newest'); 

  const fetchItems = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.from('feedback').select(`*, feedback_votes (user_id), feedback_comments (id, created_at)`);
      if (error) throw error;

      const processed = data.map(item => {
        const latestCommentDate = item.feedback_comments?.length > 0 ? Math.max(...item.feedback_comments.map(c => new Date(c.created_at).getTime())) : 0;
        const creationDate = new Date(item.created_at).getTime();
        const lastActivity = Math.max(creationDate, latestCommentDate);

        return {
            ...item,
            voteCount: item.feedback_votes ? item.feedback_votes.length : 0,
            hasVoted: item.feedback_votes ? item.feedback_votes.some(v => v.user_id === user?.id) : false,
            commentCount: item.feedback_comments ? item.feedback_comments.length : 0,
            lastActivity 
        };
      });
      setItems(processed);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filteredAndSortedItems = items
    .filter(item => {
        if (filterStatus === 'All') return true;
        return item.status === filterStatus;
    })
    .sort((a, b) => {
        if (sortOrder === 'Votes') {
            if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
            return b.lastActivity - a.lastActivity;
        } else {
            return b.lastActivity - a.lastActivity;
        }
    });

  const handleVote = async (e, item) => {
    e.stopPropagation();
    const isUnvoting = item.hasVoted;
    setItems(prev => prev.map(i => {
        if (i.id !== item.id) return i;
        return { ...i, voteCount: isUnvoting ? i.voteCount - 1 : i.voteCount + 1, hasVoted: !isUnvoting };
    }));
    try {
        if (isUnvoting) await supabase.from('feedback_votes').delete().match({ feedback_id: item.id, user_id: user.id });
        else await supabase.from('feedback_votes').insert({ feedback_id: item.id, user_id: user.id });
    } catch (err) { console.error("Vote failed", err); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  if (fetchError) return <div className="p-6 text-center text-red-500">Error loading data.</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center gap-2 shrink-0">
         <div className="flex bg-gray-100 p-1 rounded-lg">
            {['All', 'new', 'in_progress', 'completed'].map(status => (
                <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {status === 'All' ? 'All' : status === 'new' ? 'New' : status === 'in_progress' ? 'In Progress' : 'Done'}
                </button>
            ))}
         </div>
         <button onClick={() => setSortOrder(prev => prev === 'Votes' ? 'Newest' : 'Votes')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="text-gray-400">Sort:</span> {sortOrder === 'Votes' ? 'Top Voted' : 'Newest Activity'}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>No feedback found matching filters.</p></div>
        ) : (
            filteredAndSortedItems.map(item => (
                <div key={item.id} onClick={() => onSelect(item)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.type === 'Bug' ? 'bg-red-50 text-red-600 border-red-100' : item.type === 'Suggestion' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{item.type}</span>
                        <StatusBadge status={item.status} />
                        {sortOrder === 'Newest' && item.lastActivity > new Date(item.created_at).getTime() && <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5">• New Activity</span>}
                    </div>
                    <p className="text-gray-800 text-sm font-medium line-clamp-2 leading-relaxed">{item.message}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {item.commentCount} comments</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    </div>
                    <button onClick={(e) => handleVote(e, item)} className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[50px] transition-colors ${item.hasVoted ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:border-gray-300 group-hover:bg-white hover:text-indigo-500'}`}>
                        <ThumbsUp className={`w-4 h-4 mb-1 ${item.hasVoted ? 'fill-current' : ''}`} />
                        <span className="font-bold text-xs">{item.voteCount}</span>
                    </button>
                </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: FEEDBACK DETAIL & COMMENTS ---
const FeedbackDetail = ({ user, feedback, onBack, isAdmin }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [status, setStatus] = useState(feedback.status || 'new');
  const [isPosting, setIsPosting] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('feedback_comments')
      .select(`id, message, created_at, user_id, profiles:user_id (email, display_name)`) 
      .eq('feedback_id', feedback.id)
      .order('created_at', { ascending: true });

    if (error) console.error("Error fetching comments:", error);
    else setComments(data);
  };

  useEffect(() => { fetchComments(); }, [feedback]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPosting(true);
    try {
        const { error } = await supabase.from('feedback_comments').insert({ feedback_id: feedback.id, user_id: user.id, message: newComment });
        if (error) throw error;
        setNewComment('');
        await fetchComments(); 
    } catch (error) { alert("Failed to post comment. " + error.message); } finally { setIsPosting(false); }
  };

  // --- NEW: DELETE COMMENT ---
  const deleteComment = async (commentId) => {
      if (!window.confirm("Are you sure you want to delete this comment?")) return;
      const { error } = await supabase.from('feedback_comments').delete().eq('id', commentId);
      if (error) alert("Error deleting comment");
      else fetchComments();
  };

  const updateStatus = async (newStatus) => {
    setStatus(newStatus);
    const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', feedback.id);
    if (error) { alert("Failed to update status"); setStatus(feedback.status); }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
        <div className="flex-1">
           <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-gray-400 uppercase">#{feedback.id}</span><StatusBadge status={status} /></div>
        </div>
        {isAdmin && (
            <select value={status} onChange={(e) => updateStatus(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="new">New</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="closed">Closed</option>
            </select>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-b border-gray-200"><p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{feedback.message}</p></div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar">
        {comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center"><MessageSquare className="w-8 h-8 mb-2 opacity-20" />No comments yet. Start the discussion!</div>
        ) : (
            comments.map(c => {
                const profile = c.profiles || {}; 
                const displayName = profile.display_name || (profile.email ? profile.email.split('@')[0] : 'Unknown User');
                const initial = displayName[0]?.toUpperCase() || '?';
                const isMyComment = user.id === c.user_id;

                return (
                    <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 group">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 select-none">{initial}</div>
                        <div className="max-w-[85%] flex-1">
                            <div className="flex items-baseline justify-between mb-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-gray-700">{displayName}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                {(isMyComment || isAdmin) && (
                                    <button onClick={() => deleteComment(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm">{c.message}</div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      <form onSubmit={postComment} className="p-4 border-t border-gray-200 bg-white flex gap-2">
        <input autoFocus type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
        <button disabled={!newComment.trim() || isPosting} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

const StatusBadge = ({ status }) => {
    const styles = { new: 'bg-gray-100 text-gray-600 border-gray-200', in_progress: 'bg-blue-100 text-blue-700 border-blue-200', completed: 'bg-green-100 text-green-700 border-green-200', closed: 'bg-slate-200 text-slate-500 border-slate-300' };
    const labels = { new: 'New', in_progress: 'In Progress', completed: 'Resolved', closed: 'Closed' };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] || styles.new}`}>{labels[status] || status}</span>;
};

export default FeedbackModal;
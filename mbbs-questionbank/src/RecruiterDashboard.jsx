import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Users, Mail, Search, Edit2, Save, X, UserPlus, Loader2, ShieldAlert, RefreshCw, Send, Filter } from 'lucide-react';

const RecruiterDashboard = ({ onClose }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Invite State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Resend State
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    
    // 1. Get Current User and their Role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        setLoading(false);
        return;
    }

    // Fetch the current user's profile to check their role
    const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = myProfile?.role;
    setCurrentUserRole(role);

    // 2. Build Query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        inviter:invited_by (
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    // 3. APPLY RESTRICTION: 
    // If user is NOT an admin AND NOT a superrecruiter, only show users they invited.
    const hasFullAccess = role === 'admin' || role === 'superrecruiter';
    
    if (!hasFullAccess) {
        query = query.eq('invited_by', user.id);
    }
    
    const { data, error } = await query;
    
    if (!error) setProfiles(data);
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleEditClick = (profile) => {
    setEditingId(profile.id);
    setEditName(profile.display_name || '');
  };

  const handleSaveName = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: editName })
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setProfiles(profiles.map(p => p.id === id ? { ...p, display_name: editName } : p));
      setEditingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("You appear to be logged out. Please refresh the page.");
      }

      const response = await fetch('https://qzoreybelgjynenkwobi.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: inviteEmail,
          displayName: inviteName 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to invite user");
      }

      setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setInviteName('');
      setTimeout(() => {
          setShowInviteModal(false);
          fetchProfiles(); 
      }, 2000);

    } catch (err) {
      console.error("Invite Error:", err);
      setInviteMessage({ type: 'error', text: err.message });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (user) => {
    if (!confirm(`Resend invitation email to ${user.email}?`)) return;
    
    setResendingId(user.id);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('https://qzoreybelgjynenkwobi.supabase.co/functions/v1/resend-invite', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: user.email })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed");

        alert("Invite resent successfully!");
    } catch (e) {
        alert("Error resending: " + e.message);
    } finally {
        setResendingId(null);
    }
  };

  // --- FILTERING ---
  const filteredProfiles = profiles.filter(p => 
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isRestrictedUser = currentUserRole && currentUserRole !== 'admin' && currentUserRole !== 'superrecruiter';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-800 rounded-lg"><Users className="w-6 h-6 text-indigo-200" /></div>
          <div>
            <h1 className="text-xl font-bold">Recruiter Dashboard</h1>
            <p className="text-xs text-indigo-300">Manage Users & Invitations</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="max-w-7xl mx-auto p-6">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search by email or name..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-3">
                {isRestrictedUser && !loading && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                        <Filter className="w-3 h-3" />
                        Showing only your recruits
                    </div>
                )}
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Invite New User
                </button>
            </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3">User Email</th>
                        <th className="px-6 py-3">Display Name</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Invited By</th>
                        <th className="px-6 py-3">Joined</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                    ) : filteredProfiles.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No users found.</td></tr>
                    ) : (
                        filteredProfiles.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    {editingId === user.id ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none w-full"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-bold text-gray-800">{user.display_name || '-'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'superrecruiter' ? 'bg-pink-100 text-pink-700' :
                                        user.role === 'recruiter' ? 'bg-indigo-100 text-indigo-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.inviter ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">{user.inviter.display_name}</span>
                                            <span className="text-[10px] text-gray-400">{user.inviter.email}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* RESEND BUTTON */}
                                        <button 
                                            onClick={() => handleResendInvite(user)}
                                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                            title="Resend Invitation Email"
                                            disabled={resendingId === user.id}
                                        >
                                            {resendingId === user.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </button>

                                        {editingId === user.id ? (
                                            <>
                                                <button onClick={() => handleSaveName(user.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><Save className="w-4 h-4"/></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X className="w-4 h-4"/></button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleEditClick(user)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><Mail className="w-5 h-5"/> Invite User</h3>
                    <button onClick={() => setShowInviteModal(false)} className="hover:bg-indigo-700 p-1 rounded"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleInvite} className="p-6 space-y-4">
                    {inviteMessage && (
                        <div className={`p-3 rounded text-sm flex items-start gap-2 ${inviteMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {inviteMessage.type === 'error' && <ShieldAlert className="w-4 h-4 mt-0.5" />}
                            {inviteMessage.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required
                            placeholder="new.user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Display Name (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="John Doe"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">They will receive an email with a login link.</p>
                    </div>

                    <button 
                        disabled={inviteLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors flex justify-center items-center gap-2"
                    >
                        {inviteLoading ? <Loader2 className="animate-spin w-4 h-4"/> : 'Send Invitation'}
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default RecruiterDashboard;
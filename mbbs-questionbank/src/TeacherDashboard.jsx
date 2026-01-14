import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Users, Search, Eye, X, Loader2, ArrowRight, GraduationCap } from 'lucide-react';

const TeacherDashboard = ({ onClose, onImpersonate }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // REMOVED 'last_active_at' from the select string below
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at') 
      .neq('role', 'admin')
      .neq('role', 'teacher')
      .order('created_at', { ascending: false })
      .limit(100); 

    if (error) {
        console.error("Error fetching students:", error); // Added logging so you can see if something else breaks
    }

    if (!error) setStudents(data);
    setLoading(false);
  };

  const filteredStudents = students.filter(s => 
    (s.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (s.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="bg-emerald-900 text-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-800 rounded-lg"><GraduationCap className="w-6 h-6 text-emerald-200" /></div>
          <div>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
            <p className="text-xs text-emerald-300">Select a student to view their progress</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Search */}
        <div className="mb-6 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Search student by name or email..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3">Student Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Last Active</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan="5" className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600"/></td></tr>
                    ) : filteredStudents.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">No students found.</td></tr>
                    ) : (
                        filteredStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-emerald-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-800">
                                    {s.display_name || 'No Name Set'}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                    {s.email}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase border border-slate-200">{s.role}</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400">
                                    {/* Calculated Last Active removed because column doesn't exist */}
                                    {new Date(s.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => onImpersonate(s)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm uppercase tracking-wide"
                                    >
                                        <Eye className="w-3 h-3" /> View Progress
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
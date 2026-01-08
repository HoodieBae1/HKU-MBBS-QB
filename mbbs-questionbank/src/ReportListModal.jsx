import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { X, Loader2, AlertTriangle, Check, Ban, Clock, ExternalLink, Flag } from 'lucide-react';

const ReportListModal = ({ isOpen, onClose, onJumpToQuestion }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch reports, ordering by newest first
      const { data, error } = await supabase
        .from('question_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200"><Check className="w-3 h-3"/> Resolved</span>;
      case 'unresolvable':
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 decoration-gray-400 line-through"><Ban className="w-3 h-3"/> Unresolvable</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200"><Clock className="w-3 h-3"/> Pending</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Reported Questions</h2>
              <p className="text-xs text-slate-500">Community flagged issues</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Check className="w-12 h-12 mb-2 opacity-20" />
              <p>No reports found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 sticky top-0 border-b border-gray-200 shadow-sm">
                <tr>
                  <th className="px-6 py-3 w-32">Status</th>
                  <th className="px-6 py-3 w-32">ID</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 text-right">Date</th>
                  <th className="px-6 py-3 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr 
                    key={report.id} 
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    onClick={() => onJumpToQuestion(report.question_id)}
                  >
                    <td className="px-6 py-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {report.question_id}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="line-clamp-2" title={report.reason}>
                        {report.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs font-mono">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-indigo-100 rounded">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportListModal;
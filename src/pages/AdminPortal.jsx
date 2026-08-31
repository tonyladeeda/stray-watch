import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShieldCheck, Clock, Building, FileText, 
  Globe, Users, Check, X, ExternalLink, AlertTriangle
} from 'lucide-react';

export default function AdminPortal() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Hardcoded check for the MVP admin account
    if (session?.user?.email === 'asdempsey@gmail.com') {
      setIsAdmin(true);
      fetchApplications();
    } else {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rescue_partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching applications:", error);
    else setApplications(data || []);
    
    setLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const isVerified = newStatus === 'approved';
    
    const { error } = await supabase
      .from('rescue_partners')
      .update({ status: newStatus, is_verified: isVerified })
      .eq('id', id);

    if (!error) {
      setApplications(applications.map(app => 
        app.id === id ? { ...app, status: newStatus, is_verified: isVerified } : app
      ));
    } else {
      alert("Failed to update status.");
      console.error(error);
    }
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading portal...</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center mt-10">
        <AlertTriangle size={32} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-600 text-sm">You do not have administrator privileges to view this page.</p>
      </div>
    );
  }

  const filteredApps = applications.filter(app => app.status === activeTab);

  return (
    <div className="pb-24 font-sans text-slate-900 max-w-2xl mx-auto">
      {/* Admin Header */}
      <div className="bg-slate-900 p-5 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" /> StrayGuard Admin
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-1">Application Management Hub</p>
        
        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1 mt-4">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Pending ({applications.filter(a => a.status === 'pending').length})
          </button>
          <button 
            onClick={() => setActiveTab('approved')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'approved' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Approved ({applications.filter(a => a.status === 'approved').length})
          </button>
          <button 
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rejected' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Rejected ({applications.filter(a => a.status === 'rejected').length})
          </button>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {filteredApps.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border border-slate-200 shadow-sm mt-4">
            <p className="text-slate-500 font-bold text-sm">No {activeTab} applications found.</p>
          </div>
        ) : (
          filteredApps.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Building size={18} className="text-blue-600" /> {app.name}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Applied by: {app.email} • {app.applicant_role}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                  app.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                  app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                  'bg-rose-100 text-rose-800'
                }`}>
                  {app.status}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={12}/> EIN</span>
                    <p className="text-sm font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded inline-block">
                      {app.ein || 'Not Provided'}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe size={12}/> Website / Socials</span>
                    <a href={app.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                      View Link <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={12}/> References & Notes</span>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                    {app.reference_info || 'No references provided.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {activeTab === 'pending' && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(app.id, 'approved')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Approve Rescue
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                    className="flex-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold py-2 rounded-lg text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
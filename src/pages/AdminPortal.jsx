import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShieldCheck, Building, Heart, FileText, 
  Users, Check, X, AlertTriangle, Home
} from 'lucide-react';

export default function AdminPortal() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [portalView, setPortalView] = useState('fosters'); // 'rescues' or 'fosters'
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  
  // Data State
  const [rescueApps, setRescueApps] = useState([]);
  const [fosterApps, setFosterApps] = useState([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'asdempsey@gmail.com') {
      setIsAdmin(true);
      fetchApplications();
    } else {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    
    const [rescues, fosters] = await Promise.all([
      supabase.from('rescue_partners').select('*').order('created_at', { ascending: false }),
      supabase.from('foster_applications').select('*').order('created_at', { ascending: false })
    ]);

    if (rescues.data) setRescueApps(rescues.data);
    if (fosters.data) setFosterApps(fosters.data);
    
    setLoading(false);
  };

  const handleRescueUpdate = async (id, newStatus) => {
    const { error } = await supabase
      .from('rescue_partners')
      .update({ status: newStatus, is_verified: newStatus === 'approved' })
      .eq('id', id);

    if (!error) {
      setRescueApps(rescueApps.map(app => app.id === id ? { ...app, status: newStatus } : app));
    }
  };

  const handleFosterUpdate = async (id, userId, newStatus) => {
    // 1. Update the application ledger
    const { error: appError } = await supabase
      .from('foster_applications')
      .update({ status: newStatus })
      .eq('id', id);

    // 2. Publish or hide the directory profile
    const { error: dirError } = await supabase
      .from('directory_profiles')
      .update({ is_approved: newStatus === 'approved' })
      .eq('user_id', userId);

    if (!appError && !dirError) {
      setFosterApps(fosterApps.map(app => app.id === id ? { ...app, status: newStatus } : app));
    } else {
      alert("Failed to update status.");
    }
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading portal...</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center mt-10">
        <AlertTriangle size={32} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-600 text-sm">You do not have administrator privileges.</p>
      </div>
    );
  }

  const currentApps = portalView === 'rescues' ? rescueApps : fosterApps;
  const filteredApps = currentApps.filter(app => app.status === activeTab);

  return (
    <div className="pb-24 font-sans text-slate-900 max-w-2xl mx-auto">
      
      {/* Admin Header */}
      <div className="bg-slate-900 p-5 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" /> Stray Guard Admin
        </h1>
        
        {/* Main View Toggle */}
        <div className="flex gap-2 mt-4 mb-3">
          <button onClick={() => setPortalView('fosters')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${portalView === 'fosters' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <Heart size={16} /> Foster Queues
          </button>
          <button onClick={() => setPortalView('rescues')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${portalView === 'rescues' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <Building size={16} /> Rescue Queues
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
          {['pending', 'approved', 'rejected'].map(status => (
            <button 
              key={status} onClick={() => setActiveTab(status)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${activeTab === status ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-white'}`}
            >
              {status} ({currentApps.filter(a => a.status === status).length})
            </button>
          ))}
        </div>
      </div>

      <main className="p-4 space-y-4">
        {filteredApps.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border border-slate-200 shadow-sm mt-4">
            <p className="text-slate-500 font-bold text-sm">No {activeTab} {portalView} found.</p>
          </div>
        ) : (
          filteredApps.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    {portalView === 'rescues' ? <Building size={18} className="text-blue-600"/> : <Heart size={18} className="text-rose-600"/>} 
                    {app.name || app.full_name}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                  app.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                  app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {app.status}
                </span>
              </div>

              {/* Dynamic Content Based on Type */}
              <div className="p-4 space-y-4">
                {portalView === 'rescues' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">EIN</span>
                      <p className="text-sm font-mono bg-slate-50 px-2 py-1 rounded inline-block">{app.ein || 'None'}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">References</span>
                      <p className="text-sm text-slate-700">{app.reference_info || 'None provided'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Home size={12}/> Environment</span>
                        <p className="text-sm text-slate-700">{app.dwelling_type} ({app.rent_or_own})</p>
                        {app.rent_or_own === 'Rent' && (
                          <p className={`text-xs font-bold mt-1 ${app.landlord_permission ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {app.landlord_permission ? 'Landlord Approved' : 'No Landlord Proof'}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Yard Security</span>
                        <p className="text-sm text-slate-700">{app.fenced_yard ? `Fenced: ${app.fence_details}` : 'No Fence'}</p>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={12}/> Experience & Pets</span>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">{app.current_pets || 'No current pets listed.'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {activeTab === 'pending' && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => portalView === 'rescues' ? handleRescueUpdate(app.id, 'approved') : handleFosterUpdate(app.id, app.user_id, 'approved')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button 
                    onClick={() => portalView === 'rescues' ? handleRescueUpdate(app.id, 'rejected') : handleFosterUpdate(app.id, app.user_id, 'rejected')}
                    className="flex-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
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
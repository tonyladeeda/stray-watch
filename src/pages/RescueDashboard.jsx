import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Building, LayoutDashboard, PawPrint, Users, PlusCircle, 
  AlertTriangle, FileText, Inbox, ChevronRight, DollarSign,
  ShieldCheck, Heart, ClipboardList, Activity, MapPin, Settings, Home
} from 'lucide-react';

export default function RescueDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [rescueProfile, setRescueProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Metrics & State
  const [activeTab, setActiveTab] = useState('overview');
  const [roster, setRoster] = useState([]);
  const [stats, setStats] = useState({ totalAnimals: 0, newReports: 0, urgent: 0, pendingPlacement: 0 });
  const [finances, setFinances] = useState({ raised: 0, goal: 0 });
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Stripe account connected successfully.', time: '2h ago', unread: true },
    { id: 2, sender: 'Anthony D.', text: 'Is Buddy good with other dogs?', time: '5h ago', unread: true },
    { id: 3, sender: 'Local Shelter', text: 'Transfer documentation approved.', time: '1d ago', unread: false }
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) verifyAndFetchData(session.user.id);
      else setLoading(false);
    });
  }, []);

  const verifyAndFetchData = async (userId) => {
    setLoading(true);
    
    // 1. Verify Rescue via Team Members
    const { data: teamData } = await supabase
      .from('rescue_team_members')
      .select('rescue_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!teamData) return setLoading(false);

    const { data: rescueData } = await supabase
      .from('rescue_partners')
      .select('*')
      .eq('id', teamData.rescue_id)
      .single();

    if (!rescueData) return setLoading(false);
    setRescueProfile(rescueData);

    // 2. Fetch Animal Roster AND related Sightings (to get photos/location)
    const { data: animalData } = await supabase
      .from('animals')
      .select('*, sightings(image_url, image_urls, location)')
      .eq('handler_id', userId)
      .order('created_at', { ascending: false });

    if (animalData) {
      setRoster(animalData);
      
      const activeAnimals = animalData.filter(a => !a.is_archived);
      const totalGoal = activeAnimals.reduce((sum, a) => sum + parseFloat(a.funding_goal || 0), 0);
      const totalRaised = activeAnimals.reduce((sum, a) => sum + parseFloat(a.funds_raised || 0), 0);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newReports = activeAnimals.filter(a => new Date(a.created_at) > oneWeekAgo).length;
      const urgentCases = activeAnimals.filter(a => a.record_type === 'Shelter Urgent').length;

      setFinances({ raised: totalRaised, goal: totalGoal });
      setStats({
        totalAnimals: activeAnimals.length,
        newReports: newReports,
        urgent: urgentCases,
        pendingPlacement: 0 // Mocked until placement table is fully wired
      });
    }

    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Loading Workspace...</div>;
  
  if (!session || !rescueProfile) {
    return (
      <div className="p-8 text-center mt-10">
        <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 font-medium">This workspace is restricted to verified Rescue Partners.</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-slate-900 text-white font-bold py-3 px-6 rounded-xl">Return to Feed</button>
      </div>
    );
  }

  const percentFunded = finances.goal > 0 ? Math.min(100, Math.round((finances.raised / finances.goal) * 100)) : 0;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      
      {/* Workspace Header */}
      <div className="bg-indigo-900 text-white p-5 pb-12 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            {rescueProfile.avatar_url ? (
              <img src={rescueProfile.avatar_url} className="w-12 h-12 rounded-full border-2 border-indigo-400 object-cover bg-white" alt="Rescue" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-800 border-2 border-indigo-400 flex items-center justify-center">
                <Building size={24} className="text-indigo-200" />
              </div>
            )}
            <div>
              <h1 className="font-black text-xl tracking-tight leading-tight">{rescueProfile.name}</h1>
              <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold mt-1">
                <ShieldCheck size={14} className={rescueProfile.is_verified ? "text-emerald-400" : "text-slate-400"} />
                {rescueProfile.is_verified ? 'Verified 501(c)(3)' : 'Pending Verification'}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/settings')} className="p-2 bg-indigo-800 hover:bg-indigo-700 rounded-full transition-colors">
            <Settings size={20} className="text-indigo-200" />
          </button>
        </div>
      </div>

      <main className="p-4 space-y-5 -mt-6 relative z-30">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'roster' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity size={16} /> Roster
          </button>
          <button 
            onClick={() => setActiveTab('applications')}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'applications' ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList size={16} /> Foster Apps
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            
            {/* TOTAL ANIMALS */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-md flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Total Active Roster</span>
              <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{stats.totalAnimals}</span>
            </div>

            {/* QUICK STATS ROW */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center leading-tight mb-1 h-6">New<br/>Reports</span>
                <span className="text-2xl font-black text-slate-800">{stats.newReports}</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center leading-tight mb-1 h-6">Urgent<br/>Cases</span>
                <span className="text-2xl font-black text-rose-700">{stats.urgent}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider text-center leading-tight mb-1 h-6">Pending<br/>Apps</span>
                <span className="text-2xl font-black text-amber-700">{stats.pendingPlacement}</span>
              </div>
            </div>

            {/* FINANCE GOALS TRACKER */}
            <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                  <DollarSign size={16} className="text-emerald-500" /> Org Finance Tracker
                </h3>
                <span className="text-xs font-black text-emerald-600">{percentFunded}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 mb-2 border border-slate-200 overflow-hidden">
                <div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${percentFunded}%` }}></div>
              </div>
              <p className="text-xs font-bold text-slate-500">
                ${finances.raised.toLocaleString()} raised of${finances.goal.toLocaleString()} active goals
              </p>
            </div>

            {/* INBOX / MESSAGES */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm mb-3 border-b border-slate-100 pb-2">
                <Inbox size={16} className="text-slate-500" /> Recent Messages
              </h3>
              <div className="space-y-3">
                {messages.map(msg => (
                  <button key={msg.id} className="w-full text-left flex items-start justify-between group">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {msg.unread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>}
                        <span className={`text-sm font-bold ${msg.unread ? 'text-slate-800' : 'text-slate-600'}`}>{msg.sender}</span>
                      </div>
                      <p className={`text-xs truncate max-w-[220px] ${msg.unread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{msg.text}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-[10px]">{msg.time}</span>
                      <ChevronRight size={14} className="group-hover:text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="font-bold text-slate-800">Managed Animals</h2>
                <p className="text-xs text-slate-500">Your current operational roster.</p>
              </div>
              <Link to="/" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                Browse Feed
              </Link>
            </div>

            {roster.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">Your roster is empty</h3>
                <p className="text-sm text-slate-500 mb-4">Claim an animal from the community feed to manage their rescue journey.</p>
                <Link to="/" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                  View Feed
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {roster.map(animal => {
                  // NEW: Safely extract the joined images and location
                  const firstSighting = animal.sightings?.[0];
                  const imgUrl = firstSighting?.image_urls?.[0] || firstSighting?.image_url || null;
                  const loc = animal.location || firstSighting?.location || 'Location unknown';

                  return (
                    <Link key={animal.id} to={`/animal/${animal.id}`} className={`bg-white p-3 rounded-xl border shadow-sm flex gap-3 items-center group transition-colors ${animal.is_archived ? 'opacity-60 border-slate-200' : animal.record_type === 'Shelter Urgent' ? 'border-rose-200 hover:bg-rose-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 relative">
                        {imgUrl ? (
                          <img src={imgUrl} alt={animal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><PawPrint size={20} className="text-slate-300" /></div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-800 truncate pr-2">{animal.name || 'Unknown'}</h3>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${animal.is_archived ? 'bg-slate-100 text-slate-500' : animal.record_type === 'Shelter Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {animal.is_archived ? 'Archived' : animal.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mb-1.5">
                          <MapPin size={12} /> {loc}
                        </p>
                        
                        {/* Placement CTAs */}
                        <div className="flex gap-1.5">
                          {animal.available_for_foster && <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Heart size={10}/> Foster Needed</span>}
                          {animal.available_for_adoption && <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1"><Home size={10}/> Adoptable</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="px-1 mb-2">
              <h2 className="font-bold text-slate-800">Master Foster Applications</h2>
              <p className="text-xs text-slate-500">Review Fosters ready to open their homes.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <ClipboardList size={28} className="text-rose-500" />
              </div>
              <h3 className="font-black text-slate-800 mb-2 text-lg">Application Inbox</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                When community Fosters apply to help animals on your roster, their verified Master Applications will appear here for you to review instantly.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left relative overflow-hidden">
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <span className="bg-slate-800 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md">Coming Soon</span>
                </div>
                <div className="opacity-40 space-y-3 pointer-events-none">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-slate-700">Anthony Dempsey</p>
                      <p className="text-xs text-slate-500">Applied for: Buddy (Urgent)</p>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded">Pending Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
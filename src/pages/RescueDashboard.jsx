import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Building, LayoutDashboard, PawPrint, Users, PlusCircle, 
  AlertTriangle, FileText, Inbox, ChevronRight, DollarSign
} from 'lucide-react';

export default function RescueDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [rescueProfile, setRescueProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Metrics
  const [stats, setStats] = useState({ totalAnimals: 0, newReports: 0, urgent: 0, pendingPlacement: 0 });
  const [finances, setFinances] = useState({ raised: 0, goal: 0 });
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Stripe account connected successfully.', time: '2h ago', unread: true },
    { id: 2, sender: 'Alex M.', text: 'Is Buddy good with other dogs?', time: '5h ago', unread: true },
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
    
    // 1. Verify Rescue
    const { data: rescueData } = await supabase
      .from('rescue_partners')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .single();

    if (!rescueData) return setLoading(false);
    setRescueProfile(rescueData);

    // 2. Fetch Animal Data for Stats & Finances
    const { data: animalData } = await supabase
      .from('animals')
      .select('id, record_type, funding_goal, funds_raised, created_at')
      .eq('handler_id', userId);
      
    // 3. Fetch Pending Applications
    const { count: pendingCount } = await supabase
      .from('placement_applications')
      .select('*', { count: 'exact', head: true })
      .eq('rescue_id', rescueData.id)
      .eq('status', 'Pending');

    if (animalData) {
      // Calculate Financial Totals
      const totalGoal = animalData.reduce((sum, a) => sum + parseFloat(a.funding_goal || 0), 0);
      const totalRaised = animalData.reduce((sum, a) => sum + parseFloat(a.funds_raised || 0), 0);
      
      // Calculate Recent/Urgent
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newReports = animalData.filter(a => new Date(a.created_at) > oneWeekAgo).length;
      const urgentCases = animalData.filter(a => a.record_type === 'Shelter Urgent').length;

      setFinances({ raised: totalRaised, goal: totalGoal });
      setStats({
        totalAnimals: animalData.length,
        newReports: newReports,
        urgent: urgentCases,
        pendingPlacement: pendingCount || 0
      });
    }

    setLoading(false);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading landing page...</div>;
  if (!rescueProfile) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Access Restricted.</div>;

  const percentFunded = finances.goal > 0 ? Math.min(100, Math.round((finances.raised / finances.goal) * 100)) : 0;

  return (
    <div className="bg-slate-50 min-h-screen relative pb-20 max-w-md mx-auto border-x border-slate-200 font-sans text-slate-900 shadow-xl">
      
      {/* Header */}
      <header className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-2">
        <Building className="text-blue-600" size={20} />
        <h1 className="font-black text-lg tracking-tight truncate">{rescueProfile.name} Landing</h1>
      </header>

      <main className="p-4 space-y-4">
        
        {/* TOTAL ANIMALS (Master Stat) */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-md flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Total Active Roster</span>
          <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{stats.totalAnimals}</span>
        </div>

        {/* QUICK STATS ROW */}
        <div className="grid grid-cols-3 gap-3">
          <button className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
            <span className="text-xs font-bold text-slate-500 uppercase text-center leading-tight mb-2 h-6">New Reports</span>
            <span className="text-2xl font-black text-slate-800">{stats.newReports}</span>
          </button>
          
          <button className="bg-white p-3 rounded-xl border border-rose-200 shadow-sm flex flex-col items-center justify-center hover:border-rose-400 transition-colors">
            <span className="text-xs font-bold text-rose-500 uppercase text-center leading-tight mb-2 h-6">Urgent Cases</span>
            <span className="text-2xl font-black text-rose-700">{stats.urgent}</span>
          </button>
          
          <button className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm flex flex-col items-center justify-center hover:border-amber-400 transition-colors">
            <span className="text-xs font-bold text-amber-600 uppercase text-center leading-tight mb-2 h-6">Pending Placement</span>
            <span className="text-2xl font-black text-amber-700">{stats.pendingPlacement}</span>
          </button>
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
            ${finances.raised.toLocaleString()} raised of ${finances.goal.toLocaleString()} active goals
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

      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 flex justify-around items-center px-2 py-3 pb-safe z-50">
        <button onClick={() => navigate('/roster')} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-800">
          <PawPrint size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Animals</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 text-blue-600">
          <LayoutDashboard size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>
        <button onClick={() => navigate('/directory')} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-800">
          <Users size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Directory</span>
        </button>
        <button onClick={() => navigate('/intake')} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-800">
          <PlusCircle size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Add</span>
        </button>
      </nav>

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import { 
  Camera, Plus, Clock, X, Shield, PawPrint, 
  Bell, Settings as SettingsIcon, Bug, FileText, LogOut, Edit2, User
} from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Feed from './pages/Feed';
import Directory from './pages/Directory';
import AnimalProfile from './pages/AnimalProfile';
import ProfileSettings from './pages/ProfileSettings';
import Dashboard from './pages/Dashboard';
import AdminPortal from './pages/AdminPortal';
import RescueDashboard from './pages/RescueDashboard';
import ReportModal from './components/ReportModal';
import BottomNav from './components/BottomNav';
import FosterApplication from './pages/FosterApplication';
import MasterProfileWizard from './pages/MasterProfileWizard';
import RescueProfile from './pages/RescueProfile';

export default function App() {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState('Stray'); 
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const [pendingReportType, setPendingReportType] = useState(null);

  useEffect(() => {
    const handleSession = (currentSession) => {
      setSession(currentSession);
      
      if (currentSession) {
        if (!currentSession.user.user_metadata?.onboarding_complete) {
          setIsAuthModalOpen(true);
        } 
        else if (pendingReportType) {
          setReportType(pendingReportType);
          setIsReporting(true);
          setIsAuthModalOpen(false);
          setPendingReportType(null);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => subscription.unsubscribe();
  }, [pendingReportType]);

  const openReportModal = (type) => {
    setIsMenuOpen(false);
    
    if (!session) {
      setPendingReportType(type);
      setIsAuthModalOpen(true);
    } else {
      setReportType(type);
      setIsReporting(true);
    }
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  if (showAuth && !session) {
    return (
      <div className="relative max-w-md mx-auto min-h-screen bg-slate-50">
        <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 z-20 text-slate-500 bg-slate-200 rounded-full p-2 hover:bg-slate-300 transition-colors"><X size={20} /></button>
        <Auth />
      </div>
    );
  }

  const userMetadata = session?.user?.user_metadata || {};
  const avatarUrl = userMetadata.avatar_url || userMetadata.picture;
  const userInitial = userMetadata.first_name?.[0] || userMetadata.full_name?.[0] || session?.user?.email?.[0] || 'U';
  const userFullName = [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(' ') || userMetadata.full_name || userMetadata.name || 'User';
  
  // NEW: Determine route for their public profile
  const publicProfileRoute = userMetadata.account_type === 'Rescue' ? `/rescue/${session?.user?.id}` : `/profile`;

  return (
    <div className="max-w-md mx-auto bg-cyan-600 min-h-screen relative font-sans text-slate-900 shadow-2xl flex flex-col">
      <header className="h-16 bg-white px-4 border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between shadow-sm shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7">
            <Shield size={26} className="text-slate-800" strokeWidth={2} />
            <PawPrint size={12} className="absolute text-cyan-500 mt-0.5" fill="currentColor" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-cyan-500">Stray</span><span className="text-slate-900">Guard</span>
          </h1>
        </Link>

        {session ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
              Beta V1.0
            </span>
            <button className="text-slate-400 hover:text-slate-700 transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="rounded-full flex items-center justify-center transition-transform hover:scale-105 focus:ring-2 focus:ring-cyan-300 outline-none"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-cyan-500 shadow-sm bg-slate-100" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-cyan-50 border-2 border-cyan-500 flex items-center justify-center text-cyan-700 font-bold shadow-sm">
                    {userInitial.toUpperCase()}
                  </div>
                )}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                      <div className="pr-4">
                        <p className="font-bold text-slate-800 truncate">{userFullName}</p>
                        <p className="text-sm text-slate-500 truncate">{session.user.email}</p>
                      </div>
                      <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)} className="text-slate-400 hover:text-slate-600 mt-1 shrink-0">
                        <Edit2 size={16} />
                      </Link>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      {/* --- INJECTED PUBLIC PROFILE LINK --- */}
                      <Link to={publicProfileRoute} onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors">
                        <User size={18} className="text-slate-400" /> View Public Profile
                      </Link>
                      <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors">
                        <SettingsIcon size={18} className="text-slate-400" /> Settings
                      </Link>
                      <button onClick={() => { setIsProfileMenuOpen(false); alert('Feedback modal goes here'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors">
                        <Bug size={18} className="text-slate-400" /> Give Feedback
                      </button>
                    </div>
                    
                    <div className="p-2 border-t border-slate-100">
                      <button onClick={handleLogOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-sm transition-colors">
                        <LogOut size={18} /> Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-bold text-white bg-cyan-500 hover:bg-cyan-600 px-4 py-1.5 rounded-full shadow-sm transition-colors">
            Log In
          </button>
        )}
      </header>

      <main className="pb-24 min-h-[calc(100vh-4rem)] bg-slate-50 flex-grow">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPortal />} /> 
          <Route path="/rescue/:id?" element={<RescueProfile />} />
          <Route path="/rescue-workspace" element={<RescueDashboard />} />
          <Route path="/foster-application" element={<FosterApplication />} />
          <Route path="/foster-profile-setup" element={<MasterProfileWizard />} />
        </Routes>
      </main>

      {!isReporting && (
        <>
          {isMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 max-w-md mx-auto" onClick={() => setIsMenuOpen(false)} />}
          
          <div className="fixed bottom-24 right-4 sm:right-[calc(50%-224px+16px)] z-30 flex flex-col items-end gap-3">
            {isMenuOpen && (
              <div className="flex flex-col items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => openReportModal('Shelter Urgent')} className="flex items-center gap-3 bg-white hover:bg-rose-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100 transition-colors">
                  Post Urgent Shelter Dog <div className="bg-rose-100 text-rose-600 p-1.5 rounded-full"><Clock size={16} /></div>
                </button>
                <button onClick={() => openReportModal('Stray')} className="flex items-center gap-3 bg-white hover:bg-cyan-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100 transition-colors">
                  Report Stray Sighting <div className="bg-cyan-100 text-cyan-600 p-1.5 rounded-full"><Camera size={16} /></div>
                </button>
              </div>
            )}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className={`p-4 rounded-full shadow-lg font-bold transition-all duration-300 text-white ${isMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/40 hover:scale-105'}`}
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      <BottomNav />
      <ReportModal isOpen={isReporting} onClose={() => setIsReporting(false)} reportType={reportType} />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingReportType(null); 
        }} 
      />
    </div>
  );
}
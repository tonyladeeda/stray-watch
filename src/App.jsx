import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import { Camera, Plus, Clock, X } from 'lucide-react';
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
import DirectoryProfile from './pages/DirectoryProfile';
import FosterApplication from './pages/FosterApplication';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState('Stray'); 
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const openReportModal = (type) => {
    setReportType(type);
    setIsMenuOpen(false);
    setIsReporting(true);
  };

  if (showAuth && !session) {
    return (
      <div className="relative max-w-md mx-auto min-h-screen bg-slate-50">
        <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 z-20 text-slate-500 bg-slate-200 rounded-full p-2 hover:bg-slate-300 transition-colors"><X size={20} /></button>
        <Auth />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen relative font-sans text-slate-900 border-x border-slate-200 shadow-2xl">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Stray Watch</h1>
        {session ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Hi, {session.user.user_metadata?.first_name || 'User'}
            </Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg shadow-sm">
            Log In
          </button>
        )}
      </header>

      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/directory/:id" element={<DirectoryProfile />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPortal />} /> 
          <Route path="/rescue-workspace" element={<RescueDashboard />} />
          <Route path="/foster-application" element={<FosterApplication />} />
        </Routes>
      </main>

      {/* Floating Action Button & Menu */}
      {!isReporting && (
        <>
          {isMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 max-w-md mx-auto" onClick={() => setIsMenuOpen(false)} />}
          <div className="fixed bottom-24 right-4 sm:right-[calc(50%-224px+16px)] z-30 flex flex-col items-end gap-3">
            {isMenuOpen && (
              <div className="flex flex-col items-end gap-3 mb-2 transition-all">
                <button onClick={() => openReportModal('Shelter Urgent')} className="flex items-center gap-3 bg-white hover:bg-rose-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100">
                  Post Urgent Shelter Dog <div className="bg-rose-100 text-rose-600 p-1.5 rounded-full"><Clock size={16} /></div>
                </button>
                <button onClick={() => openReportModal('Stray')} className="flex items-center gap-3 bg-white hover:bg-blue-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100">
                  Report Stray Sighting <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full"><Camera size={16} /></div>
                </button>
              </div>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-4 rounded-full shadow-lg font-bold transition-all duration-300 text-white ${isMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'}`}>
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      <BottomNav />
      
      <ReportModal 
        isOpen={isReporting} 
        onClose={() => setIsReporting(false)} 
        reportType={reportType} 
      />
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
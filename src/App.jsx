import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Camera, Plus, Clock, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import BottomNav from './components/BottomNav';
import Feed from './pages/Feed';
import Directory from './pages/Directory';
import DirectoryProfile from './pages/DirectoryProfile';
import AnimalProfile from './pages/AnimalProfile';
import ProfileSettings from './pages/ProfileSettings';
import Dashboard from './pages/Dashboard';
import AdminPortal from './pages/AdminPortal';
import RescueDashboard from './pages/RescueDashboard';
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

  const [pendingReportType, setPendingReportType] = useState(null);
  const [userRescueId, setUserRescueId] = useState(null);

  useEffect(() => {
    const handleSession = async (currentSession) => {
      setSession(currentSession);

      if (currentSession) {
        if (!currentSession.user.user_metadata?.onboarding_complete) {
          setIsAuthModalOpen(true);
        } else if (pendingReportType) {
          setReportType(pendingReportType);
          setIsReporting(true);
          setIsAuthModalOpen(false);
          setPendingReportType(null);
        }

        const { data: teamData } = await supabase
          .from('rescue_team_members')
          .select('rescue_id')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();

        if (teamData) {
          setUserRescueId(teamData.rescue_id);
        } else {
          setUserRescueId(null);
        }
      } else {
        setUserRescueId(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
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
    navigate('/');
  };

  if (showAuth && !session) {
    return (
      <div className="relative max-w-md mx-auto min-h-screen bg-socal-sand">
        <button
          onClick={() => setShowAuth(false)}
          className="absolute top-6 right-6 z-20 text-slate-500 bg-socal-sand-border rounded-full p-2 hover:bg-slate-300 transition-colors"
        >
          <X size={20} />
        </button>
        <Auth />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-socal-sand min-h-screen relative font-sans text-socal-ink shadow-2xl flex flex-col">
      <Header
        session={session}
        userRescueId={userRescueId}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogOut={handleLogOut}
      />

      <main className="pb-24 min-h-[calc(100vh-4rem)] bg-socal-sand flex-grow">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/directory/:id" element={<DirectoryProfile />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/settings" element={<ProfileSettings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/rescue/:id?" element={<RescueProfile />} />
          <Route path="/rescue-dashboard" element={<RescueDashboard />} />
          <Route path="/foster-application" element={<FosterApplication />} />
          <Route path="/foster-profile-setup" element={<MasterProfileWizard />} />
        </Routes>
      </main>

      {!isReporting && (
        <>
          {isMenuOpen && (
            <div
              className="fixed inset-0 bg-socal-ink/40 backdrop-blur-sm z-20 max-w-md mx-auto"
              onClick={() => setIsMenuOpen(false)}
            />
          )}

          <div className="fixed bottom-24 right-4 sm:right-[calc(50%-224px+16px)] z-30 flex flex-col items-end gap-3">
            {isMenuOpen && (
              <div className="flex flex-col items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4">
                <button
                  onClick={() => openReportModal('Shelter Urgent')}
                  className="flex items-center gap-3 bg-white hover:bg-rose-50 text-socal-ink font-bold py-3 px-5 rounded-full shadow-lg border border-socal-sand-border transition-colors"
                >
                  Post Urgent Shelter Dog
                  <div className="bg-rose-100 text-rose-600 p-1.5 rounded-full">
                    <Clock size={16} />
                  </div>
                </button>
                <button
                  onClick={() => openReportModal('Stray')}
                  className="flex items-center gap-3 bg-white hover:bg-socal-orange-light text-socal-ink font-bold py-3 px-5 rounded-full shadow-lg border border-socal-sand-border transition-colors"
                >
                  Report Stray Sighting
                  <div className="bg-socal-orange-light text-socal-orange-dark p-1.5 rounded-full">
                    <Camera size={16} />
                  </div>
                </button>
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-4 rounded-full shadow-lg font-bold transition-all duration-300 text-white ${
                isMenuOpen
                  ? 'bg-socal-ink rotate-45'
                  : 'bg-socal-orange hover:bg-socal-orange-dark shadow-socal-orange/40 hover:scale-105'
              }`}
              aria-label="Report Animal"
            >
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
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import { Camera, Compass, HeartHandshake, X, CheckCircle2, MapPin, LayoutDashboard, User } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Feed from './pages/Feed';
import Directory from './pages/Directory';
import AnimalProfile from './pages/AnimalProfile';
import ProfileSettings from './pages/ProfileSettings';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [newReport, setNewReport] = useState({ location: '', notes: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setUserProfile(data);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!photoFile) {
      alert("Please take a photo to attach to this report.");
      return;
    }

    setIsSubmitting(true);

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('sighting-images')
      .upload(fileName, photoFile);

    if (uploadError) {
      alert('Upload blocked: ' + uploadError.message);
      setIsSubmitting(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('sighting-images')
      .getPublicUrl(fileName);

    const { data: animalData, error: animalError } = await supabase
      .from('animals')
      .insert([{ status: 'Spotted' }])
      .select()
      .single();

    if (animalError) {
      console.error('Error creating animal:', animalError);
      alert('Failed to create animal profile.');
      setIsSubmitting(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('sightings')
      .insert([
        {
          location: newReport.location || 'Current Location (GPS)',
          notes: newReport.notes,
          status: 'Spotted',
          image_url: publicUrlData.publicUrl,
          user_id: session ? session.user.id : null,
          animal_id: animalData.id
        }
      ]);

    if (dbError) {
      console.error('Error saving sighting:', dbError);
      alert('Failed to save report.');
    } else {
      setIsReporting(false);
      setNewReport({ location: '', notes: '' });
      setPhotoFile(null);
      
      if (!session) {
        const wantsToTrack = window.confirm(
          "Report submitted successfully!\n\nWould you like to create a free account to track this animal and get updates on its status?"
        );
        
        if (wantsToTrack) {
          setIsAuthModalOpen(true);
        } else {
          window.location.reload(); 
        }
      } else {
        window.location.reload(); 
      }
    }
    
    setIsSubmitting(false);
  };

  if (showAuth && !session) {
    return (
      <div className="relative max-w-md mx-auto min-h-screen bg-slate-50">
        <button 
          onClick={() => setShowAuth(false)} 
          className="absolute top-6 right-6 z-20 text-slate-500 bg-slate-200 rounded-full p-2 hover:bg-slate-300 transition-colors"
        >
          <X size={20} />
        </button>
        <Auth />
      </div>
    );
  }

  const displayAvatar = userProfile?.avatar_url || session?.user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen relative font-sans text-slate-900">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Stray Watch</h1>
        {session ? (
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-slate-400" />
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <Link 
                  to="/profile" 
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  Profile Settings
                </Link>
                <button 
                  onClick={async () => { 
                    setIsProfileMenuOpen(false);
                    await supabase.auth.signOut(); 
                    window.location.reload(); 
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-1.5 rounded-lg shadow-sm"
          >
            Log In
          </button>
        )}
      </header>

      <main className="pb-24" onClick={() => isProfileMenuOpen && setIsProfileMenuOpen(false)}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {!isReporting && (
        <button 
          onClick={() => setIsReporting(true)}
          className="fixed bottom-20 right-4 bg-rose-600 hover:bg-rose-700 transition-colors text-white p-4 rounded-full shadow-lg font-bold z-20 flex items-center gap-2"
        >
          <Camera size={24} />
          Report
        </button>
      )}

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-3 z-10 pb-6">
        <Link 
          to="/"
          className={`flex flex-col items-center gap-1 font-bold text-xs transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Compass size={24} />
          Sightings
        </Link>
        <Link 
          to="/directory"
          className={`flex flex-col items-center gap-1 font-bold text-xs transition-colors ${location.pathname === '/directory' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <HeartHandshake size={24} />
          Rescues
        </Link>
        {session && (
          <Link 
            to="/dashboard"
            className={`flex flex-col items-center gap-1 font-bold text-xs transition-colors ${location.pathname === '/dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard size={24} />
            Dashboard
          </Link>
        )}
      </nav>

      {isReporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex justify-center items-end max-w-md mx-auto transition-all">
          <div className="bg-white w-full rounded-t-2xl p-5 h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-800">Report Sighting</h2>
              <button onClick={() => { setIsReporting(false); setPhotoFile(null); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="space-y-5">
              
              <label className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer group block ${photoFile ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                {/* Note the added capture="environment" attribute below */}
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
                <div className={`flex flex-col items-center gap-2 font-bold ${photoFile ? 'text-green-600' : 'text-blue-600'}`}>
                  {photoFile ? <CheckCircle2 size={32} /> : <Camera size={32} className="text-slate-400 group-hover:text-blue-600 transition-colors" />}
                  {photoFile ? 'Photo Attached!' : 'Take Photo'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {photoFile ? photoFile.name : 'Take a live photo or choose from library'}
                </p>
              </label>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Location</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g. 4th & Traction" 
                    className="w-full border border-slate-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    value={newReport.location}
                    onChange={(e) => setNewReport({...newReport, location: e.target.value})}
                    required
                  />
                  <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes / Description</label>
                <textarea 
                  className="w-full border border-slate-300 p-3 rounded-lg h-28 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Collar color, direction they ran, behavior (scared, aggressive, injured)..."
                  value={newReport.notes}
                  onChange={(e) => setNewReport({...newReport, notes: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 transition-colors text-white font-bold py-3.5 rounded-xl shadow-md">
                  {isSubmitting ? 'Uploading...' : 'Post Sighting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
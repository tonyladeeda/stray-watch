import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import { Camera, Compass, HeartHandshake, X, CheckCircle2, MapPin, LayoutDashboard, Plus, Clock, Building } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Feed from './pages/Feed';
import Directory from './pages/Directory';
import AnimalProfile from './pages/AnimalProfile';
import ProfileSettings from './pages/ProfileSettings';
import Dashboard from './pages/Dashboard';
import { SHELTER_DIRECTORY } from './shelterData';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Reporting State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState('Stray'); // 'Stray' or 'Shelter Urgent'
  
  const [newReport, setNewReport] = useState({ 
    location: '', 
    notes: '', 
    lat: null, 
    lng: null,
    shelter_id: '',
    urgent_deadline: ''
  });
  
  const [photoFiles, setPhotoFiles] = useState([]); // Updated to handle multiple files
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openReportModal = (type) => {
    setReportType(type);
    setIsMenuOpen(false);
    setIsReporting(true);
    
    // Only fetch GPS for strays, shelter dogs don't need user GPS
    if (type === 'Stray' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewReport(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        (error) => console.warn('GPS Error:', error)
      );
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (photoFiles.length === 0) {
      alert("Please select at least one photo to attach to this report.");
      return;
    }

    setIsSubmitting(true);

    const uploadedUrls = [];
    
    // Loop through and upload multiple photos
    for (const file of photoFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sighting-images')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('sighting-images')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }

    if (uploadedUrls.length === 0) {
      alert("Failed to upload photos.");
      setIsSubmitting(false);
      return;
    }

    // Create the animal profile with appropriate flags
    const animalPayload = { 
      status: reportType === 'Stray' ? 'Spotted' : 'In-care',
      record_type: reportType,
      shelter_id: reportType === 'Shelter Urgent' ? newReport.shelter_id : null,
      urgent_deadline: reportType === 'Shelter Urgent' ? new Date(newReport.urgent_deadline).toISOString() : null
    };

    const { data: animalData, error: animalError } = await supabase
      .from('animals')
      .insert([animalPayload])
      .select()
      .single();

    if (animalError) {
      console.error('Error creating animal:', animalError);
      alert('Failed to create animal profile.');
      setIsSubmitting(false);
      return;
    }

    // Save the initial sighting/report
    const sightingPayload = {
      location: newReport.location || (reportType === 'Stray' ? 'Current Location (GPS)' : 'Shelter'),
      notes: newReport.notes,
      status: reportType === 'Stray' ? 'Spotted' : 'In-care',
      image_url: uploadedUrls[0], // Keep primary image for backwards compatibility
      image_urls: uploadedUrls, // Store the full array
      user_id: session ? session.user.id : null,
      animal_id: animalData.id,
      latitude: reportType === 'Stray' ? newReport.lat : null,
      longitude: reportType === 'Stray' ? newReport.lng : null
    };

    const { error: dbError } = await supabase
      .from('sightings')
      .insert([sightingPayload]);

    if (dbError) {
      console.error('Error saving sighting:', dbError);
      alert('Failed to save report.');
    } else {
      setIsReporting(false);
      setNewReport({ location: '', notes: '', lat: null, lng: null, shelter_id: '', urgent_deadline: '' });
      setPhotoFiles([]); // Clear multiple files state
      
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

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen relative font-sans text-slate-900">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Stray Watch</h1>
        {session ? (
          <div className="flex items-center gap-3">
            <Link 
              to="/profile" 
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline"
            >
              Hi, {session.user.user_metadata?.first_name || 'User'}
            </Link>
            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              Sign Out
            </button>
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

      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {/* Floating Action Button & Menu */}
      {!isReporting && (
        <>
          {/* Background Overlay when menu is open */}
          {isMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 max-w-md mx-auto"
              onClick={() => setIsMenuOpen(false)}
            />
          )}

          <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3">
            
            {/* The Menu Items */}
            {isMenuOpen && (
              <div className="flex flex-col items-end gap-3 mb-2 transition-all">
                <button 
                  onClick={() => openReportModal('Shelter Urgent')}
                  className="flex items-center gap-3 bg-white hover:bg-rose-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100 transition-colors"
                >
                  Post Urgent Shelter Dog
                  <div className="bg-rose-100 text-rose-600 p-1.5 rounded-full">
                    <Clock size={16} />
                  </div>
                </button>
                <button 
                  onClick={() => openReportModal('Stray')}
                  className="flex items-center gap-3 bg-white hover:bg-blue-50 text-slate-800 font-bold py-3 px-5 rounded-full shadow-lg border border-slate-100 transition-colors"
                >
                  Report Stray Sighting
                  <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full">
                    <Camera size={16} />
                  </div>
                </button>
              </div>
            )}

            {/* The Main + Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-4 rounded-full shadow-xl font-bold transition-all duration-300 flex items-center justify-center text-white ${isMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Plus size={28} />
            </button>
          </div>
        </>
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

      {/* Reporting Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex justify-center items-end max-w-md mx-auto transition-all">
          <div className="bg-white w-full rounded-t-2xl p-5 h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-800">
                {reportType === 'Stray' ? 'Report Sighting' : 'Post Urgent Dog'}
              </h2>
              <button onClick={() => { setIsReporting(false); setPhotoFiles([]); setNewReport({ location: '', notes: '', lat: null, lng: null, shelter_id: '', urgent_deadline: '' }); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="space-y-5">
              
              <label className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer group block ${photoFiles.length > 0 ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                {/* Changed to allow multiple file uploads */}
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
                />
                <div className={`flex flex-col items-center gap-2 font-bold ${photoFiles.length > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                  {photoFiles.length > 0 ? <CheckCircle2 size={32} /> : <Camera size={32} className="text-slate-400 group-hover:text-blue-600 transition-colors" />}
                  {photoFiles.length > 0 ? `${photoFiles.length} Photo(s) Attached!` : 'Add Photos'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {photoFiles.length > 0 ? 'Click to change selection' : (reportType === 'Stray' ? 'Take live photos or choose from library' : 'Upload shelter screenshots or photos')}
                </p>
              </label>

              {reportType === 'Shelter Urgent' ? (
                // --- SHELTER SPECIFIC FIELDS ---
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Shelter Location</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-rose-600 focus:border-transparent outline-none transition-all appearance-none text-sm text-slate-700 font-medium cursor-pointer"
                        value={newReport.location}
                        onChange={(e) => setNewReport({...newReport, location: e.target.value})}
                        required
                      >
                        <option value="" disabled>Select a shelter...</option>
                        {SHELTER_DIRECTORY.map(shelter => (
                          <option key={shelter.name} value={shelter.name}>{shelter.name}</option>
                        ))}
                      </select>
                      <Building size={18} className="absolute left-3 top-3.5 text-slate-400" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Shelter ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. A2069894" 
                        className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-rose-600 focus:border-transparent outline-none transition-all font-mono text-sm"
                        value={newReport.shelter_id}
                        onChange={(e) => setNewReport({...newReport, shelter_id: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-rose-600">Urgent Deadline</label>
                      {/* Removed step="900" attribute here */}
                      <input 
                        type="datetime-local"
                        className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-rose-600 focus:border-transparent outline-none transition-all text-sm text-slate-700 font-bold"
                        value={newReport.urgent_deadline}
                        onChange={(e) => setNewReport({...newReport, urgent_deadline: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                // --- STRAY SPECIFIC FIELDS ---
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Location</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="e.g. 4th & Traction" 
                      className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm text-slate-700 font-medium"
                      value={newReport.location}
                      onChange={(e) => setNewReport({...newReport, location: e.target.value})}
                      required
                    />
                    <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  </div>
                  {newReport.lat && (
                    <p className="text-xs text-green-600 mt-1.5 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Exact GPS Coordinates Captured
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes / Description</label>
                <textarea 
                  className={`w-full bg-slate-50 border border-slate-300 p-3 rounded-lg h-28 outline-none transition-all resize-none text-sm font-medium text-slate-700 ${reportType === 'Shelter Urgent' ? 'focus:ring-2 focus:ring-rose-600' : 'focus:ring-2 focus:ring-blue-600'}`}
                  placeholder={reportType === 'Stray' ? "Collar color, direction they ran, behavior..." : "Any context from the shelter, behavioral notes, specific pleas..."}
                  value={newReport.notes}
                  onChange={(e) => setNewReport({...newReport, notes: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className={`w-full transition-colors text-white font-bold py-3.5 rounded-xl shadow-md ${reportType === 'Shelter Urgent' ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'}`}>
                  {isSubmitting ? 'Uploading...' : (reportType === 'Stray' ? 'Post Sighting' : 'Post Urgent Notice')}
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
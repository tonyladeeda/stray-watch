import React, { useState, useEffect } from 'react';
import { MapPin, Camera, AlertCircle, CheckCircle2, Compass, HeartHandshake, X } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function StrayRescueMVP() {
  const [activeTab, setActiveTab] = useState('feed');
  const [isReporting, setIsReporting] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [newReport, setNewReport] = useState({ location: '', notes: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSightings();
  }, []);

  const fetchSightings = async () => {
    const { data, error } = await supabase
      .from('sightings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching sightings:', error);
    else setSightings(data);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!photoFile) {
      alert("Please take a photo to attach to this report.");
      return;
    }

    setIsSubmitting(true);

    // 1. Upload the image to Supabase Storage
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('sighting-images')
      .upload(fileName, photoFile);

    if (uploadError) {
  alert('Upload blocked by Supabase: ' + uploadError.message);
  setIsSubmitting(false);
  return;
}

    // 2. Get the public URL for the newly uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('sighting-images')
      .getPublicUrl(fileName);

    // 3. Save the sighting report with the real image URL to the database
    const { error: dbError } = await supabase
      .from('sightings')
      .insert([
        {
          location: newReport.location || 'Current Location (GPS)',
          notes: newReport.notes,
          status: 'Spotted',
          image_url: publicUrlData.publicUrl
        }
      ]);

    if (dbError) {
      console.error('Error saving sighting:', dbError);
      alert('Failed to save report.');
    } else {
      setIsReporting(false);
      setNewReport({ location: '', notes: '' });
      setPhotoFile(null);
      fetchSightings();
    }
    
    setIsSubmitting(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen relative font-sans text-slate-900">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">LA StrayWatch</h1>
        <button className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors">Sign In</button>
      </header>

      <main className="pb-24">
        {activeTab === 'feed' && (
          <div className="p-4 space-y-5">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-slate-700 tracking-tight">Recent Sightings</h2>
              <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-medium">Radius: 5mi</span>
            </div>
            
            {sightings.length === 0 && (
              <p className="text-center text-slate-500 mt-10">No sightings reported yet.</p>
            )}

            {sightings.map((sighting) => (
              <div key={sighting.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <img src={sighting.image_url} alt="Stray" className="w-full h-48 object-cover" />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-1">
                        <MapPin size={16} className="text-slate-400" />
                        {sighting.location}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 ml-5">{formatTime(sighting.created_at)}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
                      sighting.status === 'Spotted' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {sighting.status === 'Spotted' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      {sighting.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{sighting.notes}</p>
                  <button className="mt-4 text-sm font-semibold text-blue-600 w-full text-left hover:text-blue-700 transition-colors">
                    + Add Update / Match
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="p-4 space-y-4">
            <h2 className="font-bold text-slate-700 tracking-tight">Verified Rescues & Support</h2>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900">Downtown Dog Rescue</h3>
              <p className="text-sm text-slate-600 mb-4 mt-1">Focus: DTLA, low-income support, kennel intervention.</p>
              <div className="flex space-x-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-lg text-sm font-bold shadow-sm">Donate</button>
                <button className="flex-1 border border-slate-300 hover:bg-slate-50 transition-colors py-2 rounded-lg text-sm font-bold text-slate-700">Contact</button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900">LA Animal Rescue</h3>
              <p className="text-sm text-slate-600 mb-4 mt-1">Focus: Street rescues, severe medical cases.</p>
              <div className="flex space-x-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-lg text-sm font-bold shadow-sm">Donate</button>
                <button className="flex-1 border border-slate-300 hover:bg-slate-50 transition-colors py-2 rounded-lg text-sm font-bold text-slate-700">Contact</button>
              </div>
            </div>
          </div>
        )}
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
        <button 
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center gap-1 font-bold text-xs transition-colors ${activeTab === 'feed' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Compass size={24} />
          Sightings
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`flex flex-col items-center gap-1 font-bold text-xs transition-colors ${activeTab === 'directory' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <HeartHandshake size={24} />
          Rescues
        </button>
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
  <input 
    type="file" 
    accept="image/*" 
    className="hidden" 
    onChange={(e) => setPhotoFile(e.target.files[0])}
  />
  <div className={`flex flex-col items-center gap-2 font-bold ${photoFile ? 'text-green-600' : 'text-blue-600'}`}>
    {photoFile ? <CheckCircle2 size={32} /> : <Camera size={32} className="text-slate-400 group-hover:text-blue-600 transition-colors" />}
    {photoFile ? 'Photo Attached!' : 'Add Photo'}
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
                  {isSubmitting ? 'Uploading...' : 'Post Sighting Anonymously'}
                </button>
                <p className="text-xs text-center text-slate-500 mt-4 font-medium">You can create an account later to track this post.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
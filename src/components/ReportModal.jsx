import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, Camera, MapPin, Link as LinkIcon, Building, 
  CheckCircle2, Crosshair, Loader2, Heart 
} from 'lucide-react';

export default function ReportModal({ isOpen, onClose, reportType }) {
  const [session, setSession] = useState(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  
  const [photoFiles, setPhotoFiles] = useState([]);
  const [formData, setFormData] = useState({
    url: '', type: 'Dog', age: '', sex: '', color: '', size: '', location: '', notes: '', name: '', shelter_id: '', urgent_deadline: ''
  });

  // Derived State for Modal Modes
  const isShelter = reportType === 'Shelter Urgent';
  const isRescueIntake = reportType === 'Rescue Intake';
  const isStray = reportType === 'Stray';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutoFillURL = async () => {
    if (!formData.url) return alert("Please enter a shelter URL first.");
    setIsScraping(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev, shelter_id: 'A2069894', name: 'Buddy', type: 'Dog', age: 'Adult', sex: 'Male',
        color: 'Brown/White', size: 'Large', location: 'LA Animal Services - Chesterfield Square',
        notes: 'Needs immediate exit. Very sweet but deteriorating in the kennel environment.'
      }));
      setIsScraping(false);
    }, 1500);
  };

  const captureLiveLocation = () => {
    setIsFetchingGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, location: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}` }));
          setIsFetchingGPS(false);
        },
        (error) => {
          alert('GPS Error. Please enter location manually.');
          setIsFetchingGPS(false);
        }
      );
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return alert("You must be logged in to submit a report.");
    
    setIsSubmitting(true);

    try {
      const uploadedUrls = [];
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `sighting-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('sighting-images').upload(fileName, file);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('sighting-images').getPublicUrl(fileName);
          uploadedUrls.push(data.publicUrl);
        }
      }

      // Format Animal Payload based on Mode
      const animalPayload = {
        record_type: isShelter ? 'Shelter Urgent' : (isRescueIntake ? 'Rescue' : 'Stray'),
        status: isShelter || isRescueIntake ? 'In-care' : 'Spotted',
        name: formData.name || null,
        type: formData.type,
        sex: formData.sex,
        age: formData.age,
        size: formData.size,
        color: formData.color,
        notes: formData.notes,
        location: formData.location,
        shelter_id: formData.shelter_id || null,
        urgent_deadline: formData.urgent_deadline || null,
        handler_id: (isShelter || isRescueIntake) ? session.user.id : null,
        handler_email: (isShelter || isRescueIntake) ? session.user.email : null
      };

      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .insert([animalPayload])
        .select()
        .single();

      if (animalError) throw animalError;

      // Create Initial Post/Sighting Record
      const sightingPayload = {
        animal_id: animalData.id,
        user_id: session.user.id,
        location: formData.location,
        notes: formData.notes,
        image_urls: uploadedUrls,
        image_url: uploadedUrls[0] || null
      };

      const { error: sightingError } = await supabase
        .from('sightings')
        .insert([sightingPayload]);

      if (sightingError) throw sightingError;

      setStep('success');
    } catch (error) {
      alert("Error saving report: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1); 
    setPhotoFiles([]); 
    setFormData({
      url: '', type: 'Dog', age: '', sex: '', color: '', size: '', location: '', notes: '', name: '', shelter_id: '', urgent_deadline: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
      <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
            {isShelter && <span className="text-rose-600 flex items-center gap-2"><Building size={20}/> Shelter Alert</span>}
            {isRescueIntake && <span className="text-indigo-600 flex items-center gap-2"><Heart size={20}/> Add Rescue Animal</span>}
            {isStray && <span className="text-cyan-600 flex items-center gap-2"><Camera size={20}/> Report Sighting</span>}
          </h2>
          <button onClick={resetAndClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {isShelter && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-4">
                  <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Auto-Fill via Shelter URL</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <input type="url" name="url" placeholder="Paste shelter listing link..." value={formData.url} onChange={handleChange} className="w-full bg-white border border-rose-200 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                      <LinkIcon size={16} className="absolute left-3.5 top-3.5 text-rose-400" />
                    </div>
                    <button type="button" onClick={handleAutoFillURL} disabled={isScraping} className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold px-4 rounded-lg text-sm transition-colors flex items-center gap-1 shrink-0">
                      {isScraping ? <Loader2 size={16} className="animate-spin" /> : 'Auto-Fill'}
                    </button>
                  </div>
                </div>
              )}

              <label className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer group block ${photoFiles.length > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                <input type="file" accept="image/*" multiple capture={isStray ? "environment" : undefined} className="hidden" onChange={handlePhotoUpload} />
                <div className={`flex flex-col items-center gap-2 font-bold ${photoFiles.length > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {photoFiles.length > 0 ? <CheckCircle2 size={32} /> : <Camera size={32} className="text-slate-400 group-hover:scale-110 transition-transform" />}
                  {photoFiles.length > 0 ? `${photoFiles.length} Photo(s) Attached` : 'Add / Take Photo'}
                </div>
                {isStray && <p className="text-xs text-slate-500 mt-2">Location will be auto-extracted from photo data if available.</p>}
              </label>

              <div className="grid grid-cols-2 gap-4">
                {(isShelter || isRescueIntake) && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Animal Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Species</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sex</label>
                  <select name="sex" value={formData.sex} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Age Group</label>
                  <select name="age" value={formData.age} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="">Select...</option>
                    <option value="Puppy/Kitten">Puppy / Kitten</option>
                    <option value="Adult">Adult</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Size</label>
                  <select name="size" value={formData.size} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="">Select...</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Color / Markings</label>
                  <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>

              {/* LOCATION / SHELTER DATA BLOCK */}
              {isShelter && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shelter ID</label>
                      <input type="text" name="shelter_id" value={formData.shelter_id} onChange={handleChange} required className="w-full bg-white border border-slate-300 p-3 rounded-xl text-sm font-mono outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Deadline</label>
                      <input type="datetime-local" name="urgent_deadline" value={formData.urgent_deadline} onChange={handleChange} required className="w-full bg-white border border-rose-300 p-3 rounded-xl text-sm outline-none text-rose-700 font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shelter Location</label>
                    <div className="relative">
                      <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full bg-white border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none" />
                      <Building size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {isStray && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Seen Location *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="Cross streets or address..." className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                      <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                    <button type="button" onClick={captureLiveLocation} disabled={isFetchingGPS} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl transition-colors border border-slate-300 shrink-0" title="Get Current GPS">
                      {isFetchingGPS ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {isRescueIntake && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location / Foster City</label>
                  <div className="relative flex-grow">
                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Los Angeles, CA" className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {isStray ? 'Description / Notes' : 'Biography / Notes'}
                </label>
                <textarea 
                  name="notes" value={formData.notes} onChange={handleChange} required
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl h-24 outline-none transition-all resize-none text-sm focus:ring-2 focus:ring-slate-400"
                  placeholder={isStray ? "Collar details, direction headed..." : "Personality, medical needs, perfect home requirements..."}
                ></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-black py-4 rounded-xl shadow-md transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50
                  ${isShelter ? 'bg-rose-600 hover:bg-rose-700' : ''}
                  ${isRescueIntake ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  ${isStray ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                `}>
                  {isSubmitting ? <><Loader2 size={20} className="animate-spin"/> Saving...</> : (
                    isShelter ? 'Publish Shelter Alert' : (isRescueIntake ? 'Add to Profile' : 'Post Sighting')
                  )}
                </button>
              </div>
            </form>
          )}

          {/* SUCCESS SCREEN */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {isRescueIntake ? 'Animal Added!' : 'Report Logged!'}
              </h2>
              <p className="text-slate-600 leading-relaxed max-w-xs mx-auto mb-6">
                {isRescueIntake 
                  ? "They are now visible on your public profile and the discovery feed."
                  : `Local verified rescues and network members have been alerted to the ${formData.location || 'area'}. We will notify you if this animal is secured.`
                }
              </p>
              
              <button onClick={resetAndClose} className="mt-6 w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-md transition-all">
                {isRescueIntake ? 'Close' : 'Return to Feed'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}